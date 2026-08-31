#!/usr/bin/env node
/**
 * Seeds Supabase from content/source-of-truth.json and uploads development
 * placeholder photographs to Storage.
 *
 * Resets content tables to the artwork baseline and replaces the media library
 * with the placeholder set the public site used before Phase 8.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 *
 *   pnpm db:seed
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLACEHOLDER_DIR = join(ROOT, "public", "placeholder");

const PUBLISHABLE = new Set(["ARTWORK", "ARTWORK_CONFIRMED"]);

/** @param {unknown} entry */
function published(entry) {
  if (!entry || typeof entry !== "object" || !("provenance" in entry)) return null;
  if (!PUBLISHABLE.has(/** @type {{ provenance: string }} */ (entry).provenance)) return null;
  return /** @type {{ value?: unknown }} */ (entry).value ?? null;
}

async function loadEnv() {
  try {
    const text = await readFile(join(ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* env may come from the shell */
  }
}

/**
 * Placeholder library — mirrors src/lib/images.ts.
 * storage_path is stable so re-runs upsert cleanly.
 */
const MEDIA_SEED = [
  {
    storage_path: "seed/hero-living-room.jpg",
    file: "living-room.jpg",
    category: "hero",
    alt: "A shared sitting room with striped sofas, bookshelves and a fireplace",
    caption: null,
    position: 0,
  },
  {
    storage_path: "seed/meals-table-setting.jpg",
    file: "table-setting.jpg",
    category: "meals",
    alt: "A table laid with linen, stacked plates and a small autumn arrangement",
    caption: null,
    position: 1,
  },
  {
    storage_path: "seed/gallery-living-room.jpg",
    file: "living-room.jpg",
    category: "Living areas",
    alt: "A shared sitting room with striped sofas, bookshelves and a fireplace",
    caption: "The sitting room",
    position: 2,
  },
  {
    storage_path: "seed/gallery-sitting-room.jpg",
    file: "sitting-room.jpg",
    category: "Living areas",
    alt: "A wood-panelled sitting room with large windows onto the garden",
    caption: "Looking out over the garden",
    position: 3,
  },
  {
    storage_path: "seed/gallery-quiet-corner.jpg",
    file: "quiet-corner.jpg",
    category: "Living areas",
    alt: "A pale blue loveseat with cushions beside a sunny window",
    caption: "A quiet corner",
    position: 4,
  },
  {
    storage_path: "seed/gallery-dining-room.jpg",
    file: "dining-room.jpg",
    category: "Dining & kitchen",
    alt: "A wooden dining table and chairs beside French doors onto the garden",
    caption: "Where we eat together",
    position: 5,
  },
  {
    storage_path: "seed/gallery-table-setting.jpg",
    file: "table-setting.jpg",
    category: "Dining & kitchen",
    alt: "A table laid with linen, stacked plates and a small autumn arrangement",
    caption: "Set for a meal",
    position: 6,
  },
  {
    storage_path: "seed/gallery-bedroom.jpg",
    file: "bedroom.jpg",
    category: "Bedrooms",
    alt: "A made bed beside an open window with flowers on the balcony rail",
    caption: "A resident's room",
    position: 7,
  },
  {
    storage_path: "seed/gallery-patio.jpg",
    file: "patio.jpg",
    category: "Outdoors",
    alt: "Two wooden patio chairs on a paved terrace facing a planted border at dusk",
    caption: "The patio",
    position: 8,
  },
  {
    storage_path: "seed/gallery-garden.jpg",
    file: "garden.jpg",
    category: "Outdoors",
    alt: "Rose bushes in flower along the front of a house, beside a covered porch",
    caption: "The garden in summer",
    position: 9,
  },
];

await loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const raw = JSON.parse(await readFile(join(ROOT, "content", "source-of-truth.json"), "utf8"));
const contact = raw.contact;
const addr = published(contact.address) ?? {};

console.log("Seeding Columbia Care database…\n");

// --- site_settings -----------------------------------------------------------
const phone = published(contact.phonePrimary);
const { error: settingsError } = await supabase.from("site_settings").upsert(
  {
    id: "singleton",
    phone,
    phone_display: phone,
    sms: published(contact.sms),
    fax: published(contact.fax),
    email: published(contact.email),
    street_address: addr.streetAddress ?? null,
    address_locality: addr.addressLocality ?? null,
    address_region: addr.addressRegion ?? null,
    postal_code: addr.postalCode ?? null,
    address_country: addr.addressCountry ?? "US",
    latitude: published(contact.geo)?.lat ?? null,
    longitude: published(contact.geo)?.lng ?? null,
    license_number: published(contact.licenseNumber),
    licensed_capacity: published(contact.licensedCapacity),
    hours: published(contact.hours),
    location_line: published(contact.locationLine),
    service_area: published(contact.serviceArea) ?? [],
    updated_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);
if (settingsError) throw new Error(`site_settings: ${settingsError.message}`);
console.log("  ✓ site_settings");

// --- availability ------------------------------------------------------------
await supabase
  .from("availability")
  .upsert({ id: "singleton", status: "unset" }, { onConflict: "id" });
console.log("  ✓ availability");

// --- care_types --------------------------------------------------------------
const careTypes = published(raw.careTypes) ?? [];
if (careTypes.length) {
  const { error } = await supabase.from("care_types").upsert(
    careTypes.map((t, i) => ({
      slug: t.slug,
      title: t.title,
      short_title: t.shortTitle,
      icon: t.icon,
      position: i,
      published: true,
    })),
    { onConflict: "slug" },
  );
  if (error) throw new Error(`care_types: ${error.message}`);
}
console.log(`  ✓ care_types (${careTypes.length})`);

// --- services ----------------------------------------------------------------
const services = published(raw.services) ?? [];
if (services.length) {
  const { error } = await supabase.from("services").upsert(
    services.map((s, i) => ({
      slug: s.slug,
      title: s.title,
      summary: s.description,
      icon: s.icon,
      position: i,
      has_detail_page: s.hasDetailPage ?? false,
      related_schedule: s.relatedSchedule ?? [],
      published: true,
    })),
    { onConflict: "slug" },
  );
  if (error) throw new Error(`services: ${error.message}`);
}
console.log(`  ✓ services (${services.length})`);

// --- schedule_items ----------------------------------------------------------
const schedule = published(raw.schedule) ?? [];
if (schedule.length) {
  const { error } = await supabase.from("schedule_items").upsert(
    schedule.map((s) => ({
      position: s.position,
      time_label: s.timeLabel,
      sort_minutes: s.sortMinutes,
      title: s.title,
      body: s.body,
      bullets: s.bullets ?? [],
      icon: s.icon,
      accent: s.accent,
      published: true,
    })),
    { onConflict: "position" },
  );
  if (error) throw new Error(`schedule_items: ${error.message}`);
}
console.log(`  ✓ schedule_items (${schedule.length})`);

// --- every_day ---------------------------------------------------------------
await supabase.from("every_day").delete().gte("position", 0);
const everyDay = published(raw.everyDay) ?? [];
if (everyDay.length) {
  const { error } = await supabase.from("every_day").insert(
    everyDay.map((e, i) => ({
      title: e.title,
      icon: e.icon,
      position: i,
      published: true,
    })),
  );
  if (error) throw new Error(`every_day: ${error.message}`);
}
console.log(`  ✓ every_day (${everyDay.length})`);

// --- why_families ------------------------------------------------------------
await supabase.from("why_families").delete().gte("position", 0);
const whyFamilies = published(raw.whyFamilies) ?? [];
if (whyFamilies.length) {
  const { error } = await supabase.from("why_families").insert(
    whyFamilies.map((text, i) => ({
      text,
      position: i,
      published: true,
    })),
  );
  if (error) throw new Error(`why_families: ${error.message}`);
}
console.log(`  ✓ why_families (${whyFamilies.length})`);

// --- pages -------------------------------------------------------------------
const identity = raw.identity;
const pages = [
  ["/", "Home", published(identity.tagline), published(identity.about)],
  ["/about", "About Us", published(identity.promise), published(identity.about)],
  ["/services", "Care & Services", null, published(identity.about)],
  ["/a-day-in-our-home", "A Day in Our Home", null, null],
  ["/our-home", "Our Home", null, null],
  ["/meals", "Meals & Dining", null, published(identity.meals)],
  ["/contact", "Contact & Book a House Tour", published(identity.tourCta), null],
];
const { error: pagesError } = await supabase.from("pages").upsert(
  pages.map(([slug, title, lead, seo_description]) => ({
    slug,
    title,
    lead,
    seo_description,
    published: true,
  })),
  { onConflict: "slug" },
);
if (pagesError) throw new Error(`pages: ${pagesError.message}`);
console.log(`  ✓ pages (${pages.length})`);

// --- media: wipe and re-upload placeholders ----------------------------------
const { data: existingMedia } = await supabase.from("media").select("id, storage_path");
if (existingMedia?.length) {
  const paths = existingMedia.map((r) => r.storage_path).filter(Boolean);
  if (paths.length) {
    await supabase.storage.from("media").remove(paths);
  }
  await supabase
    .from("media")
    .delete()
    .in(
      "id",
      existingMedia.map((r) => r.id),
    );
  console.log(`  · cleared ${existingMedia.length} existing media row(s)`);
}

for (const item of MEDIA_SEED) {
  const bytes = await readFile(join(PLACEHOLDER_DIR, item.file));
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(item.storage_path, bytes, { contentType: "image/jpeg", upsert: true });
  if (uploadError) throw new Error(`storage ${item.storage_path}: ${uploadError.message}`);

  const { error: insertError } = await supabase.from("media").insert({
    storage_path: item.storage_path,
    alt: item.alt,
    caption: item.caption,
    category: item.category,
    contains_people: false,
    release_on_file: false,
    position: item.position,
    published: true,
  });
  if (insertError) throw new Error(`media ${item.storage_path}: ${insertError.message}`);
}

console.log(`  ✓ media (${MEDIA_SEED.length} placeholder photographs)`);
console.log("\nDone. Restart the dev server or wait for revalidation, then refresh / and /admin.");
