"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAdminProfile, recordAudit } from "@/lib/db/server";
import {
  isSectionSlot,
  MEDIA_MAX_BYTES,
  MEDIA_MIME_TYPES,
  type SectionSlot,
} from "@/lib/media";

/**
 * Admin server actions.
 *
 * Every one of these runs as the signed-in user, so RLS is what authorises the
 * write. `requireAdmin()` is a guard for clear error messages, not the security
 * boundary, a caller who slips past it still gets nothing back from Postgres.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
}

const GENERIC_ERROR = "Something went wrong saving that. Please try again.";

async function requireAdmin() {
  const profile = await getAdminProfile();
  if (!profile) throw new Error("Not signed in as an admin.");
  return profile;
}

/**
 * Public routes affected by a given kind of content change.
 *
 * Publishing revalidates exactly what it touches rather than the whole site, so
 * a photo change does not rebuild the entire marketing site.
 */
const AFFECTED: Record<string, string[]> = {
  availability: ["/"],
  services: ["/", "/services"],
  schedule_items: ["/", "/a-day-in-our-home", "/meals", "/services"],
  media: ["/"],
  testimonials: ["/"],
  faqs: ["/faq"],
  team: ["/about"],
  settings: ["/", "/contact", "/about", "/our-home", "/privacy", "/accessibility", "/terms"],
  pages: ["/"],
};

function revalidateFor(entity: string) {
  for (const path of AFFECTED[entity] ?? ["/"]) revalidatePath(path);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { ok: false, message: "Enter your email address and password." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "The database is not configured." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately vague: saying which half was wrong tells an attacker whether
    // an account exists.
    return { ok: false, message: "That email address and password do not match." };
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function sendMagicLink(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Enter your email address first." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "The database is not configured." };

  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });

  // Always the same answer, whether or not the address exists, otherwise this
  // becomes a way to discover who has an account.
  return {
    ok: true,
    message: "If that address can sign in, a link is on its way. Check your email.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Availability, the one the owner touches most
// ---------------------------------------------------------------------------

export async function saveAvailability(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const profile = await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const status = String(formData.get("status") ?? "unset");
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await supabase
    .from("availability")
    .update({ status, note, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq("id", "singleton");

  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("update", "availability", "singleton", { status, note });
  revalidateFor("availability");

  const LABELS: Record<string, string> = {
    unset: "hidden from the website",
    accepting: "Accepting new residents",
    limited: "Limited availability",
    waitlist: "Joining a waitlist",
    full: "Currently full",
  };

  return { ok: true, message: `Availability updated, now showing ${LABELS[status]}.` };
}

// ---------------------------------------------------------------------------
// Generic row operations
// ---------------------------------------------------------------------------

/** Flips a row's published flag. Used by every list screen. */
export async function togglePublished(
  table: string,
  id: string,
  published: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { error } = await supabase.from(table).update({ published }).eq("id", id);

  if (error) {
    // The database enforces consent and photo-release rules with CHECK
    // constraints, so surface those in the owner's language rather than as a
    // Postgres error string.
    if (error.message.includes("media_release_required")) {
      return {
        ok: false,
        message:
          "This photo shows a person, so it needs a signed release on file before it can go on the website.",
      };
    }
    if (error.message.includes("testimonial_consent_required")) {
      return {
        ok: false,
        message: "Tick “we have written permission” before showing this on the website.",
      };
    }
    return { ok: false, message: GENERIC_ERROR };
  }

  await recordAudit(published ? "publish" : "unpublish", table, id);
  revalidateFor(table);

  return {
    ok: true,
    message: published ? "Now showing on the website." : "Hidden from the website.",
  };
}

/** Moves a row up or down within its list. */
export async function reorder(
  table: string,
  id: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { data: rows } = await supabase
    .from(table)
    .select("id, position")
    .order("position", { ascending: true });

  if (!rows) return { ok: false, message: GENERIC_ERROR };

  const index = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) {
    return { ok: false, message: "Already at the end of the list." };
  }

  const a = rows[index];
  const b = rows[swapWith];

  await supabase.from(table).update({ position: b.position }).eq("id", a.id);
  await supabase.from(table).update({ position: a.position }).eq("id", b.id);

  await recordAudit("reorder", table, id, { direction });
  revalidateFor(table);

  return { ok: true, message: "Order updated." };
}

export async function deleteRow(table: string, id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("delete", table, id);
  revalidateFor(table);

  return { ok: true, message: "Deleted." };
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export async function updateInquiry(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new");
  const notes = String(formData.get("owner_notes") ?? "").trim() || null;

  const { error } = await supabase
    .from("inquiries")
    .update({ status, owner_notes: notes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("update", "inquiries", id, { status });
  return { ok: true, message: "Enquiry updated." };
}

// ---------------------------------------------------------------------------
// Free-text content saves
// ---------------------------------------------------------------------------

/** Updates a single row from a form. Column list is fixed per table by caller. */
export async function saveRow(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const table = String(formData.get("__table") ?? "");
  const id = String(formData.get("__id") ?? "");
  const fields = String(formData.get("__fields") ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  if (!table || !id || fields.length === 0) return { ok: false, message: GENERIC_ERROR };

  const patch: Record<string, string | null> = {};
  for (const field of fields) {
    const value = String(formData.get(field) ?? "").trim();
    patch[field] = value === "" ? null : value;
  }

  const { error } = await supabase.from(table).update(patch).eq("id", id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("update", table, id, patch);
  revalidateFor(table);

  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

function photoFields(formData: FormData) {
  const alt = String(formData.get("alt") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim() || null;
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = categoryRaw === "" ? null : categoryRaw;
  const containsPeople = formData.get("contains_people") === "on";
  const releaseOnFile = formData.get("release_on_file") === "on";

  return { alt, caption, category, containsPeople, releaseOnFile };
}

async function clearSectionSlot(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, slot: SectionSlot, exceptId?: string) {
  let query = supabase.from("media").update({ category: null }).eq("category", slot);
  if (exceptId) query = query.neq("id", exceptId);
  await query;
}

export async function uploadPhoto(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a photo to upload." };
  }

  if (file.size > MEDIA_MAX_BYTES) {
    return { ok: false, message: "Photos must be under 8 MB." };
  }

  if (!MEDIA_MIME_TYPES.includes(file.type as (typeof MEDIA_MIME_TYPES)[number])) {
    return { ok: false, message: "Use a JPEG, PNG, WebP or AVIF photo." };
  }

  const { alt, caption, category, containsPeople, releaseOnFile } = photoFields(formData);
  if (!alt) {
    return { ok: false, message: "Every photo needs a description for screen readers." };
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.replace("image/", "");
  const path = `gallery/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[uploadPhoto] storage", uploadError.message);
    return { ok: false, message: "Could not upload that photo. Try again." };
  }

  if (category && isSectionSlot(category)) {
    await clearSectionSlot(supabase, category);
  }

  const { data: last } = await supabase
    .from("media")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (last?.position ?? -1) + 1;

  const { error: insertError } = await supabase.from("media").insert({
    storage_path: path,
    alt,
    caption,
    category,
    contains_people: containsPeople,
    release_on_file: releaseOnFile,
    position,
    published: false,
  });

  if (insertError) {
    await supabase.storage.from("media").remove([path]);
    if (insertError.message.includes("media_release_required")) {
      return {
        ok: false,
        message:
          "This photo shows a person, so it needs a signed release on file before it can go on the website.",
      };
    }
    return { ok: false, message: GENERIC_ERROR };
  }

  await recordAudit("create", "media", path, { category });
  revalidateFor("media");

  return { ok: true, message: "Photo uploaded." };
}

export async function updatePhoto(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: GENERIC_ERROR };

  const { alt, caption, category, containsPeople, releaseOnFile } = photoFields(formData);
  if (!alt) {
    return { ok: false, message: "Every photo needs a description for screen readers." };
  }

  if (category && isSectionSlot(category)) {
    await clearSectionSlot(supabase, category, id);
  }

  const { error } = await supabase
    .from("media")
    .update({
      alt,
      caption,
      category,
      contains_people: containsPeople,
      release_on_file: releaseOnFile,
    })
    .eq("id", id);

  if (error) {
    if (error.message.includes("media_release_required")) {
      return {
        ok: false,
        message:
          "This photo shows a person, so it needs a signed release on file before it can go on the website.",
      };
    }
    return { ok: false, message: GENERIC_ERROR };
  }

  await recordAudit("update", "media", id, { category });
  revalidateFor("media");

  return { ok: true, message: "Photo updated." };
}

export async function assignSectionPhoto(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const id = String(formData.get("id") ?? "");
  const slot = String(formData.get("slot") ?? "");
  if (!id || !isSectionSlot(slot)) return { ok: false, message: GENERIC_ERROR };

  await clearSectionSlot(supabase, slot, id);

  const { error } = await supabase.from("media").update({ category: slot }).eq("id", id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("update", "media", id, { category: slot });
  revalidateFor("media");

  return { ok: true, message: `Now used in the ${slot === "hero" ? "homepage hero" : "meals section"}.` };
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { data: row } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  if (row?.storage_path) {
    await supabase.storage.from("media").remove([row.storage_path as string]);
  }

  await recordAudit("delete", "media", id);
  revalidateFor("media");

  return { ok: true, message: "Photo deleted." };
}
