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
  phone = excluded.phone, phone_display = excluded.phone_display,
  sms = excluded.sms, fax = excluded.fax, email = excluded.email,
  street_address = excluded.street_address, address_locality = excluded.address_locality,
  address_region = excluded.address_region, postal_code = excluded.postal_code,
  hours = excluded.hours, location_line = excluded.location_line,
  service_area = excluded.service_area,
  updated_at = now();`);
w();

// --- availability ----------------------------------------------------------
w("-- availability: starts unset, so the badge renders nothing until the client sets it.");
w(`insert into availability (id, status) values ('singleton', 'unset')
on conflict (id) do nothing;`);
w();

// --- care_types ------------------------------------------------------------
const care = published(raw.careTypes) ?? [];
if (care.length) {
  w("-- care_types: the three brochure chips, verbatim, with artwork-derived summaries.");
  w("insert into care_types (slug, title, short_title, summary, icon, position, published) values");
  w(
    care
      .map(
        (t, i) =>
          `  (${q(t.slug)}, ${q(t.title)}, ${q(t.shortTitle)}, ${q(t.description ?? null)}, ${q(t.icon)}, ${i}, true)`,
      )
      .join(",\n") + "\non conflict (slug) do update set",
  );
  w("  title = excluded.title, short_title = excluded.short_title,");
  w("  summary = excluded.summary, icon = excluded.icon, position = excluded.position,");
  w("  published = excluded.published;");
  w();
}

// --- services --------------------------------------------------------------
const services = published(raw.services) ?? [];
if (services.length) {
  w("-- services: seven published offerings. long-term-care is unpublished (duplicates a care type).");
  w(
    "insert into services (slug, title, summary, icon, position, has_detail_page, related_schedule, published) values",
  );
  w(
    services
      .map((s, i) => {
        const isPublished = s.published !== false;
        return `  (${q(s.slug)}, ${q(s.title)}, ${q(s.description)}, ${q(s.icon)}, ${i}, ${
          s.hasDetailPage ? "true" : "false"
        }, ${intArr(s.relatedSchedule)}, ${isPublished ? "true" : "false"})`;
      })
      .join(",\n") + "\non conflict (slug) do update set",
  );
  w("  title = excluded.title, summary = excluded.summary, icon = excluded.icon,");
  w("  position = excluded.position, has_detail_page = excluded.has_detail_page,");
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

// --- site_copy -------------------------------------------------------------
// Everything the owner can reword. Artwork entries are the client's own words,
// verbatim; editorial entries were written for the site. The `source` column
// keeps that distinction visible in the admin screen.
const copy = [
  // Hero
  [
    "hero_tagline",
    "Hero",
    "Main headline",
    "The first thing a family reads.",
    "short",
    "artwork",
    published(identity.tagline),
  ],
  [
    "hero_lead",
    "Hero",
    "Line under the headline",
    null,
    "short",
    "editorial",
    "An adult family home in Everett, Washington.",
  ],

  // Promise strip
  [
    "promise",
    "Promise strip",
    "Promise",
    "The band under the hero.",
    "short",
    "artwork",
    published(identity.promise),
  ],
  [
    "values",
    "Promise strip",
    "Values",
    "Shown as small capitals beneath the promise.",
    "list",
    "artwork",
    published(identity.values),
  ],

  // About
  [
    "about_eyebrow",
    "About",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Who we are",
  ],
  ["about_heading", "About", "Heading", null, "short", "editorial", "A family-like environment"],
  [
    "about_body",
    "About",
    "About paragraph",
    "Your description of the home.",
    "long",
    "artwork",
    published(identity.about),
  ],

  // Care
  [
    "care_eyebrow",
    "Care",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Care & services",
  ],
  ["care_heading", "Care", "Heading", null, "short", "editorial", "What we do, every day"],
  [
    "care_included_heading",
    "Care",
    "Heading above the daily list",
    null,
    "short",
    "editorial",
    "Included every single day",
  ],

  // A day
  [
    "day_eyebrow",
    "A day",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Morning to night",
  ],
  ["day_heading", "A day", "Heading", null, "short", "editorial", "A day in our home"],
  [
    "day_lead",
    "A day",
    "Introduction",
    null,
    "long",
    "editorial",
    "Families always ask what the days actually look like. Here is the whole of one, from the first good morning to the last safety check.",
  ],

  // Our home
  [
    "home_eyebrow",
    "Our home",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Our home",
  ],
  ["home_heading", "Our home", "Heading", null, "short", "editorial", "Come and look around"],
  [
    "home_lead",
    "Our home",
    "Introduction",
    null,
    "short",
    "editorial",
    "A real house on a quiet street, not a facility.",
  ],
  [
    "home_note",
    "Our home",
    "Note under the gallery",
    null,
    "short",
    "editorial",
    "Photographs show the shared areas of the home. To see everything, come and visit.",
  ],

  // Meals
  [
    "meals_eyebrow",
    "Meals",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Meals & dining",
  ],
  ["meals_heading", "Meals", "Heading", null, "short", "editorial", "Home-cooked, every day"],
  [
    "meals_body",
    "Meals",
    "Meals paragraph",
    "Your description of the food.",
    "long",
    "artwork",
    published(identity.meals),
  ],
  [
    "meals_note",
    "Meals",
    "Note under the paragraph",
    null,
    "long",
    "editorial",
    "Does your loved one have a special diet, a food they cannot eat, or a favourite meal? Tell us and we will talk it through.",
  ],

  // Find us
  [
    "visit_eyebrow",
    "Find us",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Find us",
  ],
  [
    "visit_heading",
    "Find us",
    "Heading",
    null,
    "short",
    "editorial",
    "Close to home, easy to reach",
  ],

  // Contact
  [
    "contact_eyebrow",
    "Contact",
    "Small label above the heading",
    null,
    "short",
    "editorial",
    "Book a house tour",
  ],
  ["contact_heading", "Contact", "Heading", null, "short", "editorial", "Come and see the home"],
  [
    "contact_lead",
    "Contact",
    "Introduction",
    null,
    "long",
    "editorial",
    "Tell us a little about your loved one and what they need. There is no pressure and no obligation, and most families visit two or three homes before they decide.",
  ],
  [
    "contact_cta",
    "Contact",
    "Line beside the heart badge",
    "Your own wording from the brochure.",
    "short",
    "artwork",
    published(identity.tourCta),
  ],
  [
    "closing_line",
    "Contact",
    "Handwritten closing line",
    "Set in the script face. Keep it short.",
    "short",
    "artwork",
    published(identity.closingLine),
  ],
];

w("-- site_copy: every editable word on the page, seeded from the artwork file.");
w(
  "insert into site_copy (slug, section, label, help, kind, source, value, value_list, position, published) values",
);
w(
  copy
    .map(([slug, section, label, help, kind, source, value], i) => {
      const isList = kind === "list";
      return (
        `  (${q(slug)}, ${q(section)}, ${q(label)}, ${q(help)}, ${q(kind)}, ${q(source)}, ` +
        `${isList ? "null" : q(value)}, ${isList ? arr(value) : "'{}'"}, ${i}, true)`
      );
    })
    .join(",\n") + "\non conflict (slug) do update set",
);
w("  section = excluded.section, label = excluded.label, help = excluded.help,");
w("  kind = excluded.kind, source = excluded.source, position = excluded.position;");
w("-- NOTE: `value` is deliberately NOT overwritten on conflict. Re-running the");
w("-- seed refreshes the labels and grouping without discarding anything the");
w("-- owner has since reworded in the admin console.");
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
console.log(`  site_copy       ${copy.length}`);
console.log("  testimonials/team/faqs/media: 0 (intentional)");
