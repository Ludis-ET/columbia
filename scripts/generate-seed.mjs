#!/usr/bin/env node
/**
 * Generates supabase/seed.sql from content/source-of-truth.json.
 *
 * The JSON stays the audit trail; the database is seeded from it. Generating
 * rather than hand-writing the SQL means the two cannot drift, and it means the
 * provenance rule survives the move to a database:
 *
 *   - Only ARTWORK / ARTWORK_CONFIRMED entries are seeded at all.
 *   - Those rows are inserted with published = true.
 *   - ASK_CLIENT entries are seeded as NULL columns or simply omitted, so the
 *     site renders nothing for them, exactly as it does today.
 *
 * Re-run after editing the JSON:  pnpm seed:generate
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";

const PUBLISHABLE = new Set(["ARTWORK", "ARTWORK_CONFIRMED"]);

const raw = JSON.parse(await readFile("content/source-of-truth.json", "utf8"));

/** Mirrors published() in src/lib/content.ts. */
function published(entry) {
  if (!entry || !PUBLISHABLE.has(entry.provenance)) return null;
  return entry.value ?? null;
}

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v === null || v === undefined ? "null" : String(v));
const arr = (v) =>
  !v || v.length === 0 ? "'{}'" : `array[${v.map((s) => q(s)).join(", ")}]::text[]`;
const intArr = (v) => (!v || v.length === 0 ? "'{}'" : `array[${v.join(", ")}]::integer[]`);

const out = [];
const w = (s = "") => out.push(s);

w("-- ============================================================================");
w("-- Columbia Care, seed data");
w("--");
w("-- GENERATED FILE. Do not edit by hand.");
w("--   source: content/source-of-truth.json");
w("--   regenerate: pnpm seed:generate");
w("--");
w("-- Only entries whose provenance is ARTWORK or ARTWORK_CONFIRMED appear here.");
w("-- Anything still ASK_CLIENT is seeded as NULL or omitted entirely, so the site");
w("-- renders nothing for it, see the rule in CLAUDE.md.");
w("-- ============================================================================");
w();
w("begin;");
w();

// --- site_settings ---------------------------------------------------------
const c = raw.contact;
const addr = published(c.address) ?? {};
w("-- site_settings: one row. Unconfirmed fields stay NULL and render nothing.");
w(`insert into site_settings (
  id, phone, phone_display, sms, fax, email,
  street_address, address_locality, address_region, postal_code, address_country,
  latitude, longitude, license_number, licensed_capacity, hours, location_line, service_area
) values (
  'singleton',
  ${q(published(c.phonePrimary))},   -- ASK_CLIENT q1, no number published yet
  ${q(published(c.phonePrimary))},
  ${q(published(c.sms))},
  ${q(published(c.fax))},
  ${q(published(c.email))},
  ${q(addr.streetAddress)}, ${q(addr.addressLocality)}, ${q(addr.addressRegion)},
  ${q(addr.postalCode)}, ${q(addr.addressCountry ?? "US")},
  ${num(published(c.geo)?.lat)}, ${num(published(c.geo)?.lng)},
  ${q(published(c.licenseNumber))},  -- ASK_CLIENT q3
  ${num(published(c.licensedCapacity))},
  ${q(published(c.hours))},
  ${q(published(c.locationLine))},
  ${arr(published(c.serviceArea))}   -- Everett only: the sole confirmed area
)
on conflict (id) do update set
  fax = excluded.fax, email = excluded.email,
  street_address = excluded.street_address, address_locality = excluded.address_locality,
  address_region = excluded.address_region, postal_code = excluded.postal_code,
  hours = excluded.hours, location_line = excluded.location_line,
  service_area = excluded.service_area;`);
w();

// --- availability ----------------------------------------------------------
w("-- availability: starts unset, so the badge renders nothing until the client sets it.");
w(`insert into availability (id, status) values ('singleton', 'unset')
on conflict (id) do nothing;`);
w();

// --- care_types ------------------------------------------------------------
const care = published(raw.careTypes) ?? [];
if (care.length) {
  w("-- care_types: the three brochure chips, verbatim.");
  w("insert into care_types (slug, title, short_title, icon, position, published) values");
  w(
    care
      .map(
        (t, i) => `  (${q(t.slug)}, ${q(t.title)}, ${q(t.shortTitle)}, ${q(t.icon)}, ${i}, true)`,
      )
      .join(",\n") + "\non conflict (slug) do update set",
  );
  w("  title = excluded.title, short_title = excluded.short_title,");
  w("  icon = excluded.icon, position = excluded.position, published = excluded.published;");
  w();
}

// --- services --------------------------------------------------------------
const services = published(raw.services) ?? [];
if (services.length) {
  w("-- services: the seven verbatim services plus the long-term-care chip.");
  w("-- `summary` is NULL, the client has not written descriptions (see q4).");
  w(
    "insert into services (slug, title, summary, icon, position, has_detail_page, related_schedule, published) values",
  );
  w(
    services
      .map(
        (s, i) =>
          `  (${q(s.slug)}, ${q(s.title)}, ${q(s.description)}, ${q(s.icon)}, ${i}, ${
            s.hasDetailPage ? "true" : "false"
          }, ${intArr(s.relatedSchedule)}, true)`,
      )
      .join(",\n") + "\non conflict (slug) do update set",
  );
  w("  title = excluded.title, icon = excluded.icon, position = excluded.position,");
  w("  has_detail_page = excluded.has_detail_page,");
  w("  related_schedule = excluded.related_schedule, published = excluded.published;");
  w();
}

// --- schedule_items --------------------------------------------------------
const schedule = published(raw.schedule) ?? [];
if (schedule.length) {
  w(`-- schedule_items: all ${schedule.length} day-timeline entries, verbatim.`);
  w(
    "insert into schedule_items (position, time_label, sort_minutes, title, body, bullets, icon, accent, published) values",
  );
  w(
    schedule
      .map(
        (s) =>
          `  (${s.position}, ${q(s.timeLabel)}, ${s.sortMinutes}, ${q(s.title)}, ${q(
            s.body,
          )}, ${arr(s.bullets)}, ${q(s.icon)}, ${q(s.accent)}, true)`,
      )
      .join(",\n") + "\non conflict (position) do update set",
  );
  w("  time_label = excluded.time_label, sort_minutes = excluded.sort_minutes,");
  w("  title = excluded.title, body = excluded.body, bullets = excluded.bullets,");
  w("  icon = excluded.icon, accent = excluded.accent, published = excluded.published;");
  w();
}

// --- every_day -------------------------------------------------------------
const everyDay = published(raw.everyDay) ?? [];
if (everyDay.length) {
  w("-- every_day: the 'Every Day at Columbia Care' list.");
  w("delete from every_day;");
  w("insert into every_day (title, icon, position, published) values");
  w(everyDay.map((e, i) => `  (${q(e.title)}, ${q(e.icon)}, ${i}, true)`).join(",\n") + ";");
  w();
}

// --- why_families ----------------------------------------------------------
const why = published(raw.whyFamilies) ?? [];
if (why.length) {
  w("-- why_families: the four brochure bullets.");
  w("delete from why_families;");
  w("insert into why_families (text, position, published) values");
  w(why.map((t, i) => `  (${q(t)}, ${i}, true)`).join(",\n") + ";");
  w();
}

// --- pages -----------------------------------------------------------------
const identity = raw.identity;
w("-- pages: titles and intros. SEO descriptions come from the artwork copy.");
const pages = [
  ["/", "Home", published(identity.tagline), published(identity.about)],
  ["/about", "About Us", published(identity.promise), published(identity.about)],
  ["/services", "Care & Services", null, published(identity.about)],
  ["/a-day-in-our-home", "A Day in Our Home", null, null],
  ["/our-home", "Our Home", null, null],
  ["/meals", "Meals & Dining", null, published(identity.meals)],
  ["/contact", "Contact & Book a House Tour", published(identity.tourCta), null],
];
w("insert into pages (slug, title, lead, seo_description, published) values");
w(
  pages
    .map(([slug, title, lead, seo]) => `  (${q(slug)}, ${q(title)}, ${q(lead)}, ${q(seo)}, true)`)
    .join(",\n") + "\non conflict (slug) do update set",
);
w("  title = excluded.title, lead = excluded.lead,");
w("  seo_description = excluded.seo_description, published = excluded.published;");
w();

// --- deliberately empty ----------------------------------------------------
w("-- testimonials, team, faqs and media are deliberately NOT seeded.");
w("-- The client has supplied no quotes (q14), no staff names (q7), no FAQ answers,");
w("-- and no full-resolution photographs (q9). Their sections render nothing until");
w("-- real rows exist. Never insert a sample row into any of them.");
w();
w("commit;");
w();

await mkdir("supabase", { recursive: true });
await writeFile("supabase/seed.sql", out.join("\n"), "utf8");

console.log("Wrote supabase/seed.sql");
console.log(`  care_types      ${care.length}`);
console.log(`  services        ${services.length}`);
console.log(`  schedule_items  ${schedule.length}`);
console.log(`  every_day       ${everyDay.length}`);
console.log(`  why_families    ${why.length}`);
console.log(`  pages           ${pages.length}`);
console.log("  testimonials/team/faqs/media: 0 (intentional)");
