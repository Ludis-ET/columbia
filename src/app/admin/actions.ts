"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getAdminProfile, recordAudit } from "@/lib/db/server";
import {
  getPlacements,
  isSectionSlot,
  MEDIA_MAX_BYTES,
  MEDIA_MIME_TYPES,
  syncLegacyCategory,
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
  care_types: ["/"],
  every_day: ["/"],
  why_families: ["/"],
  services: ["/", "/services"],
  schedule_items: ["/", "/a-day-in-our-home", "/meals", "/services"],
  media: ["/"],
  testimonials: ["/"],
  faqs: ["/", "/faq"],
  team: ["/"],
  pages: ["/", "/faq", "/admissions"],
  site_copy: ["/"],
  settings: ["/", "/contact", "/about", "/our-home", "/privacy", "/accessibility", "/terms"],
  announcements: ["/"],
  opening_hours: ["/", "/contact"],
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

const CREATABLE: Record<string, (formData: FormData) => Record<string, unknown>> = {
  testimonials: (formData) => ({
    quote: String(formData.get("quote") ?? "").trim(),
    author: String(formData.get("author") ?? "").trim(),
    relationship: String(formData.get("relationship") ?? "").trim() || null,
    consent_on_file: formData.get("consent_on_file") === "true",
    published: false,
  }),
  faqs: (formData) => ({
    question: String(formData.get("question") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim() || null,
    published: false,
  }),
  team: (formData) => ({
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    published: false,
  }),
};

/** Adds a row to a table the owner fills in over time. */
export async function createRow(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const table = String(formData.get("__table") ?? "");
  const build = CREATABLE[table];
  if (!build) return { ok: false, message: GENERIC_ERROR };

  const row = build(formData);
  if (table === "testimonials" && (!row.quote || !row.author)) {
    return { ok: false, message: "A quote and a name are both required." };
  }
  if (table === "faqs" && (!row.question || !row.answer)) {
    return { ok: false, message: "Both the question and the answer are required." };
  }
  if (table === "team" && !row.name) {
    return { ok: false, message: "A name is required." };
  }

  const { data: last } = await supabase
    .from(table)
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from(table).insert({
    ...row,
    position: (last?.position ?? -1) + 1,
  });

  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("create", table, null, row);
  revalidateFor(table);

  return { ok: true, message: "Added. It is hidden until you show it on the website." };
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

  const booleanFields = new Set(["consent_on_file", "contains_people", "release_on_file"]);

  const patch: Record<string, string | null | boolean> = {};
  for (const field of fields) {
    if (booleanFields.has(field)) {
      patch[field] = formData.get(field) === "true";
      continue;
    }
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
  const containsPeople = formData.get("contains_people") === "on";
  const releaseOnFile = formData.get("release_on_file") === "on";
  const placements = formData
    .getAll("placements")
    .map(String)
    .filter(Boolean);
  const category = syncLegacyCategory(placements);

  return { alt, caption, placements, category, containsPeople, releaseOnFile };
}

const MAX_BATCH_UPLOAD = 24;

async function uploadOnePhoto(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  file: File,
  meta: {
    alt: string;
    caption: string | null;
    placements: string[];
    category: string | null;
    containsPeople: boolean;
    releaseOnFile: boolean;
    position: number;
  },
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (file.size > MEDIA_MAX_BYTES) {
    return { ok: false, message: `"${file.name}" is over 8 MB.` };
  }

  if (!MEDIA_MIME_TYPES.includes(file.type as (typeof MEDIA_MIME_TYPES)[number])) {
    return { ok: false, message: `"${file.name}" is not a supported image type.` };
  }

  if (!meta.alt) {
    return { ok: false, message: `Every photo needs a description. "${file.name}" is missing one.` };
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.replace("image/", "");
  const path = `gallery/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[uploadPhoto] storage", uploadError.message);
    return { ok: false, message: `Could not upload "${file.name}". Try again.` };
  }

  const { error: insertError } = await supabase.from("media").insert({
    storage_path: path,
    alt: meta.alt,
    caption: meta.caption,
    category: meta.category,
    placements: meta.placements,
    contains_people: meta.containsPeople,
    release_on_file: meta.releaseOnFile,
    position: meta.position,
    published: false,
  });

  if (insertError) {
    await supabase.storage.from("media").remove([path]);
    if (insertError.message.includes("media_release_required")) {
      return {
        ok: false,
        message:
          "A photo shows a person without a signed release, so it cannot be saved yet.",
      };
    }
    return { ok: false, message: GENERIC_ERROR };
  }

  await recordAudit("create", "media", path, {
    placements: meta.placements,
    category: meta.category,
  });

  return { ok: true, path };
}

export async function uploadPhotos(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { ok: false, message: "Choose at least one photo to upload." };
  }

  if (files.length > MAX_BATCH_UPLOAD) {
    return {
      ok: false,
      message: `Upload up to ${MAX_BATCH_UPLOAD} photos at a time.`,
    };
  }

  const { placements, category, containsPeople, releaseOnFile } = photoFields(formData);

  const { data: last } = await supabase
    .from("media")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  let position = (last?.position ?? -1) + 1;
  let uploaded = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const alt =
      String(formData.get(`alt_${i}`) ?? formData.get("alt") ?? "").trim() ||
      altFromFilename(file.name);
    const captionRaw = String(formData.get(`caption_${i}`) ?? formData.get("caption") ?? "").trim();
    const caption = captionRaw || null;

    const result = await uploadOnePhoto(supabase, file, {
      alt,
      caption,
      placements,
      category,
      containsPeople,
      releaseOnFile,
      position,
    });

    if (!result.ok) {
      if (uploaded > 0) revalidateFor("media");
      return {
        ok: false,
        message:
          uploaded > 0
            ? `${result.message} (${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded before this one failed.)`
            : result.message,
      };
    }

    uploaded += 1;
    position += 1;
  }

  revalidateFor("media");

  return {
    ok: true,
    message:
      uploaded === 1 ? "1 photo uploaded." : `${uploaded} photos uploaded.`,
  };
}

/** @deprecated Use uploadPhotos — kept for stale bundles. */
export async function uploadPhoto(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    formData.delete("file");
    formData.append("files", file);
  }
  return uploadPhotos(_prev, formData);
}

function altFromFilename(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
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

  const { alt, caption, placements, category, containsPeople, releaseOnFile } = photoFields(formData);
  if (!alt) {
    return { ok: false, message: "Every photo needs a description for screen readers." };
  }

  const { error } = await supabase
    .from("media")
    .update({
      alt,
      caption,
      category,
      placements,
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

  await recordAudit("update", "media", id, { placements, category });
  revalidateFor("media");

  return { ok: true, message: "Photo updated." };
}

export async function togglePhotoPlacement(
  id: string,
  placement: string,
  enabled: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { data: row, error: readError } = await supabase
    .from("media")
    .select("placements, category")
    .eq("id", id)
    .maybeSingle();

  if (readError || !row) return { ok: false, message: GENERIC_ERROR };

  let placements = getPlacements(row);
  if (enabled) {
    if (!placements.includes(placement)) placements = [...placements, placement];
  } else {
    placements = placements.filter((p) => p !== placement);
  }

  const category = syncLegacyCategory(placements);

  const { error } = await supabase
    .from("media")
    .update({ placements, category })
    .eq("id", id);

  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("update", "media", id, { placements, category, toggle: placement, enabled });
  revalidateFor("media");

  const label =
    placement === "hero"
      ? "homepage hero"
      : placement === "meals"
        ? "meals section"
        : placement;

  return {
    ok: true,
    message: enabled ? `Added to ${label}.` : `Removed from ${label}.`,
  };
}

/** @deprecated Use togglePhotoPlacement — kept for any stale client bundles. */
export async function assignSectionPhoto(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const slot = String(formData.get("slot") ?? "");
  if (!id || !isSectionSlot(slot)) return { ok: false, message: GENERIC_ERROR };
  return togglePhotoPlacement(id, slot, true);
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

// ---------------------------------------------------------------------------
// Settings (handles JSONB + array fields that saveRow cannot)
// ---------------------------------------------------------------------------

export async function saveSettings(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const flat = [
    "phone",
    "sms",
    "fax",
    "email",
    "street_address",
    "address_locality",
    "address_region",
    "postal_code",
    "location_line",
    "license_number",
    "licensed_capacity",
    "hours",
  ];

  const patch: Record<string, unknown> = {};
  for (const field of flat) {
    const raw = String(formData.get(field) ?? "").trim();
    patch[field] = raw === "" ? null : raw;
  }

  // service_area — comma-separated input stored as text[]
  const serviceAreaRaw = String(formData.get("service_area") ?? "").trim();
  patch.service_area = serviceAreaRaw
    ? serviceAreaRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  // socials — individual named inputs assembled into JSONB
  const socialsKeys = ["facebook", "instagram", "google_maps"];
  const socials: Record<string, string> = {};
  for (const key of socialsKeys) {
    const val = String(formData.get(`socials_${key}`) ?? "").trim();
    if (val) socials[key] = val;
  }
  patch.socials = socials;
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase.from("site_settings").update(patch).eq("id", "singleton");

  if (error) return { ok: false, message: GENERIC_ERROR };

  await recordAudit("update", "site_settings", "singleton", { fields: Object.keys(patch) });
  revalidateFor("settings");

  return { ok: true, message: "Settings saved. The website will update within a minute." };
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export async function saveAnnouncement(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const id = String(formData.get("id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const ctaText = String(formData.get("cta_text") ?? "").trim() || null;
  const ctaHref = String(formData.get("cta_href") ?? "").trim() || null;
  const active = formData.get("active") === "on";

  if (!message) return { ok: false, message: "Enter a message for the announcement." };

  if (id) {
    const { error } = await supabase
      .from("announcements")
      .update({
        message,
        cta_text: ctaText,
        cta_href: ctaHref,
        active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { ok: false, message: GENERIC_ERROR };
  } else {
    const { error } = await supabase
      .from("announcements")
      .insert({ message, cta_text: ctaText, cta_href: ctaHref, active });
    if (error) return { ok: false, message: GENERIC_ERROR };
  }

  revalidateFor("announcements");
  return {
    ok: true,
    message: active
      ? "Announcement is live on the website."
      : "Announcement saved (not yet visible).",
  };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  revalidateFor("announcements");
  return { ok: true, message: "Announcement deleted." };
}

// ---------------------------------------------------------------------------
// Opening hours
// ---------------------------------------------------------------------------

export async function saveOpeningHours(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  const rows = DAYS.map((day, i) => ({
    day_of_week: i + 1,
    day_name: day,
    opens: String(formData.get(`${day}_opens`) ?? "").trim() || null,
    closes: String(formData.get(`${day}_closes`) ?? "").trim() || null,
    closed: formData.get(`${day}_closed`) === "on",
    note: String(formData.get(`${day}_note`) ?? "").trim() || null,
  }));

  // Upsert all 7 rows
  const { error } = await supabase
    .from("opening_hours")
    .upsert(rows, { onConflict: "day_of_week" });

  if (error) return { ok: false, message: GENERIC_ERROR };

  revalidateFor("opening_hours");
  return { ok: true, message: "Opening hours saved." };
}

// ---------------------------------------------------------------------------
// Inquiries — star + CSV export
// ---------------------------------------------------------------------------

export async function starInquiry(id: string, starred: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { error } = await supabase
    .from("inquiries")
    .update({ starred, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, message: GENERIC_ERROR };

  return { ok: true, message: starred ? "Starred." : "Unstarred." };
}

export async function exportInquiriesCSV(): Promise<{
  ok: boolean;
  csv?: string;
  message?: string;
}> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return { ok: false, message: GENERIC_ERROR };

  const headers = [
    "Name",
    "Email",
    "Phone",
    "Kind",
    "Status",
    "Message",
    "Relationship",
    "Created",
  ];
  const rows = data.map((r) =>
    [
      `"${String(r.name ?? "").replace(/"/g, '""')}"`,
      `"${String(r.email ?? "").replace(/"/g, '""')}"`,
      `"${String(r.phone ?? "").replace(/"/g, '""')}"`,
      `"${String(r.kind ?? "").replace(/"/g, '""')}"`,
      `"${String(r.status ?? "").replace(/"/g, '""')}"`,
      `"${String(r.message ?? "").replace(/"/g, '""')}"`,
      `"${String(r.relationship ?? "").replace(/"/g, '""')}"`,
      `"${new Date(r.created_at as string).toLocaleDateString("en-US")}"`,
    ].join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return { ok: true, csv };
}

// ---------------------------------------------------------------------------
// Bulk photo operations
// ---------------------------------------------------------------------------

export async function bulkPublishPhotos(ids: string[], published: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };
  if (ids.length === 0) return { ok: false, message: "No photos selected." };

  const { error } = await supabase.from("media").update({ published }).in("id", ids);

  if (error) return { ok: false, message: GENERIC_ERROR };

  revalidateFor("media");
  return {
    ok: true,
    message: published
      ? `${ids.length} photo${ids.length === 1 ? "" : "s"} now showing on the website.`
      : `${ids.length} photo${ids.length === 1 ? "" : "s"} hidden from the website.`,
  };
}

// ---------------------------------------------------------------------------
// Page copy
// ---------------------------------------------------------------------------

/**
 * Saves the words on the page.
 *
 * Only writes the entries the form reports as changed. That keeps a save from
 * clobbering something a second person edited in another tab, and keeps the
 * audit log to what actually moved.
 */
export async function saveCopy(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  if (!supabase) return { ok: false, message: GENERIC_ERROR };

  const changed = String(formData.get("__changed") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (changed.length === 0) return { ok: true, message: "Nothing had changed." };

  const { data: rows, error: readError } = await supabase
    .from("site_copy")
    .select("slug, kind")
    .in("slug", changed);

  if (readError || !rows) return { ok: false, message: GENERIC_ERROR };

  const kindBySlug = new Map(rows.map((r) => [r.slug as string, r.kind as string]));
  let saved = 0;

  for (const slug of changed) {
    const kind = kindBySlug.get(slug);
    if (!kind) continue;

    const raw = String(formData.get(slug) ?? "");
    const patch =
      kind === "list"
        ? {
            value: null,
            value_list: raw
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : { value: raw.trim() === "" ? null : raw.trim(), value_list: [] };

    const { error } = await supabase.from("site_copy").update(patch).eq("slug", slug);
    if (!error) saved += 1;
  }

  await recordAudit("update", "site_copy", null, { slugs: changed });

  // Copy appears on the home page and in the footer, which is on every page.
  revalidatePath("/", "layout");

  if (saved === 0) return { ok: false, message: GENERIC_ERROR };

  return {
    ok: true,
    message: `Saved ${saved} change${saved === 1 ? "" : "s"}. The website updates within a minute.`,
  };
}
