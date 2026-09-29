import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { getSupabase } from "@/lib/db/client";
import { getSiteSettings } from "@/lib/db/queries";
import { sendEnquiryEmails } from "@/lib/email/send";
import { verifyTurnstile } from "@/lib/forms/turnstile";
import { normalisePhone, tourRequestSchema } from "@/lib/forms/tour-request";

export interface TourFormState {
  status: "idle" | "success" | "error";
  message: string;
  /** Field-level messages, keyed by field name. */
  errors?: Record<string, string>;
}

const GENERIC_ERROR =
  "Something went wrong sending that. Please try again, or call us instead, we would much rather hear from you.";

/** 4252129108 → (425) 212-9108. Display only; the database stores digits. */
function formatPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Shared tour request processor for both the Server Action and the /api/inquiries route.
 */
export async function processTourSubmission(
  formData: FormData,
  requestHost?: string,
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

  const supabase = (await createClient().catch(() => null)) ?? getSupabase();
  if (!supabase) {
    console.error("[tour] Supabase is not configured, enquiry LOST:", data.name);
    return { status: "error", message: GENERIC_ERROR };
  }

  const phone = data.phone ? normalisePhone(data.phone) : null;
  const email = data.email || null;

  // 4. Rate limit: refuse an identical submission within five minutes.
  try {
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
  } catch (rpcError) {
    console.warn("[tour] rate limit RPC check threw, proceeding anyway:", rpcError);
  }

  // 5. Save. From here the lead is safe whatever else fails.
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

  try {
    revalidatePath("/admin/inquiries");
    revalidatePath("/admin");
    revalidatePath("/admin", "layout");
  } catch (revalidateError) {
    console.warn("[tour] path revalidation failed:", revalidateError);
  }

  // 6. Email, best effort. Never blocks the confirmation.
  try {
    const settings = await getSiteSettings();
    const host = requestHost ?? "columbiacareafh.com";
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
    console.warn("[tour] enquiry saved but email failed:", emailError);
  }

  return {
    status: "success",
    message: "Thank you, we have your message and will be in touch soon.",
  };
}
