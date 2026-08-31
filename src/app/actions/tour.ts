"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { getSiteSettings } from "@/lib/db/queries";
import { sendEnquiryEmails } from "@/lib/email/send";
import { verifyTurnstile } from "@/lib/forms/turnstile";
import { normalisePhone, tourRequestSchema } from "@/lib/forms/tour-request";

/**
 * Tour request submission.
 *
 * ORDER OF OPERATIONS IS DELIBERATE:
 *
 *   1. Honeypot, free, catches naive bots, no network call.
 *   2. Zod parse, the same schema the browser used, re-run on the server.
 *   3. Turnstile, one network call, only for submissions that look real.
 *   4. Rate limit, cheap DB check against recent identical submissions.
 *   5. INSERT, the lead is now safe.
 *   6. Email, best effort. Failure here never loses the lead.
 *
 * Step 5 before step 6 is the whole point: if Resend is down, the family still
 * sees a confirmation and the owner still finds the enquiry in the inbox.
 */

export interface TourFormState {
  status: "idle" | "success" | "error";
  message: string;
  /** Field-level messages, keyed by field name. */
  errors?: Record<string, string>;
}

const GENERIC_ERROR =
  "Something went wrong sending that. Please try again, or call us instead, we would much rather hear from you.";

export async function submitTourRequest(
  _prev: TourFormState,
  formData: FormData,
): Promise<TourFormState> {
  // 1. Honeypot. Real people never see this field.
  if (String(formData.get("company") ?? "") !== "") {
    // Answer as if it worked. Telling a bot it was caught only helps it adapt.
    return { status: "success", message: "Thank you, we have your message." };
  }

  // 2. Validate with the same schema the browser used.
  const parsed = tourRequestSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    relationship: formData.get("relationship") ?? "",
    message: formData.get("message") ?? "",
    preferredTimes: formData.getAll("preferredTimes").map(String),
    company: formData.get("company") ?? "",
    turnstileToken: formData.get("cf-turnstile-response") ?? "",
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors,
    };
  }

  const data = parsed.data;

  // 3. Spam check. Fails open when unconfigured, see lib/forms/turnstile.ts.
  const human = await verifyTurnstile(data.turnstileToken);
  if (!human) {
    return {
      status: "error",
      message:
        "We couldn't complete the security check. Please try again, or call us, we would rather hear from you than lose your message.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    console.error("[tour] Supabase is not configured, enquiry LOST:", data.name);
    return { status: "error", message: GENERIC_ERROR };
  }

  const phone = data.phone ? normalisePhone(data.phone) : null;
  const email = data.email || null;

  // 4. Rate limit: refuse an identical submission within five minutes. Covers
  //    the common case of an anxious person double-tapping Send, and blunts a
  //    naive flood without storing anyone's IP address.
  //
  //    Goes through has_recent_inquiry() rather than a SELECT. Anonymous
  //    visitors cannot read `inquiries` correctly, since it holds other
  //    families' details, so a plain SELECT here would always return empty and
  //    the guard would silently never fire. The function is SECURITY DEFINER and
  //    returns only a boolean. See supabase/migrations/0003_rate_limit.sql.
  const { data: isDuplicate } = await supabase.rpc("has_recent_inquiry", {
    p_name: data.name,
    p_minutes: 5,
  });

  if (isDuplicate === true) {
    return {
      status: "success",
      message: "Thank you, we already have your message and will be in touch.",
    };
  }

  // 5. Save. From here the lead is safe whatever else fails.
  //
  // NO .select() ON THIS INSERT. A visitor is anonymous, and RLS grants them
  // INSERT but not SELECT on `inquiries` deliberately, since the table holds
  // other families' phone numbers. Postgres needs SELECT permission to satisfy
  // a RETURNING clause, so adding .select() here makes every genuine submission
  // fail with "new row violates row-level security policy". The row is written
  // fine without it.
  const { error } = await supabase.from("inquiries").insert({
    kind: "tour",
    name: data.name,
    email,
    phone,
    message: data.message || null,
    relationship: data.relationship || null,
    preferred_times: data.preferredTimes,
    source: "website tour form",
    status: "new",
  });

  if (error) {
    console.error("[tour] insert failed:", error.message);
    return { status: "error", message: GENERIC_ERROR };
  }

  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  revalidatePath("/admin", "layout");

  // 6. Email, best effort. Never blocks the confirmation.
  try {
    const settings = await getSiteSettings();
    const host = (await headers()).get("host") ?? "columbiacareafh.com";
    const protocol = host.startsWith("localhost") ? "http" : "https";

    await sendEnquiryEmails({
      name: data.name,
      email,
      phone: phone ? formatPhone(phone) : null,
      relationship: data.relationship || null,
      message: data.message || null,
      preferredTimes: data.preferredTimes,
      adminUrl: `${protocol}://${host}/admin/inquiries`,
      addressLine: settings.addressLine,
      locationLine: settings.locationLine,
    });
  } catch (emailError) {
    // Already saved. Log and move on.
    console.warn("[tour] enquiry saved but email failed:", emailError);
  }

  return {
    status: "success",
    message: "Thank you, we have your message and will be in touch soon.",
  };
}

/** 4252129108 → (425) 212-9108. Display only; the database stores digits. */
function formatPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
