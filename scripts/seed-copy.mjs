#!/usr/bin/env node
/**
 * Seeds site_copy from content/source-of-truth.json.
 *
 * Run once after creating the table, and again any time the labels or grouping
 * change:
 *
 *   pnpm db:seed:copy
 *
 * NEVER OVERWRITES WORDING. On a re-run it refreshes the label, help text,
 * section and ordering, but leaves `value` and `value_list` exactly as they are.
 * Once the owner rewords something in the admin console, that wording is theirs.
 * Pass --reset to force everything back to the artwork baseline.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const RESET = process.argv.includes("--reset");

async function loadEnv() {
  try {
    const text = await readFile(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* env may come from the shell */
  }
}

await loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const raw = JSON.parse(await readFile("content/source-of-truth.json", "utf8"));
const PUBLISHABLE = new Set(["ARTWORK", "ARTWORK_CONFIRMED"]);

/** Mirrors published() in src/lib/content.ts. */
function published(entry) {
  if (!entry || !PUBLISHABLE.has(entry.provenance)) return null;
  return entry.value ?? null;
}

const id = raw.identity;

/**
 * `source` records where the words came from:
 *   artwork   the client's own brochure or infographic, verbatim
 *   editorial written for the site, safe to reword
 * The admin screen surfaces that so nobody edits the client's own words by
 * accident.
 */
const ROWS = [
  [
    "hero_tagline",
    "Hero",
    "Main headline",
    "The first thing a family reads.",
    "short",
    "artwork",
    published(id.tagline),
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

  [
    "promise",
    "Promise strip",
    "Promise",
    "The band under the hero.",
    "short",
    "artwork",
    published(id.promise),
  ],
  [
    "values",
    "Promise strip",
    "Values",
    "Shown as small capitals beneath the promise.",
    "list",
    "artwork",
    published(id.values),
  ],

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
    published(id.about),
  ],

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
    published(id.meals),
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
    published(id.tourCta),
  ],
  [
    "closing_line",
    "Contact",
    "Handwritten closing line",
    "Set in the script face. Keep it short.",
    "short",
    "artwork",
    published(id.closingLine),
  ],
];

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: readError } = await supabase.from("site_copy").select("slug");

if (readError) {
  console.error("Could not read site_copy. Has the table been created?");
  console.error("Paste supabase/apply-site-copy.sql into the Supabase SQL Editor first.\n");
  console.error(readError.message);
  process.exit(1);
}

const known = new Set((existing ?? []).map((r) => r.slug));

let inserted = 0;
let refreshed = 0;

for (const [slug, section, label, help, kind, source, value] of ROWS) {
  const isList = kind === "list";

  const meta = {
    slug,
    section,
    label,
    help,
    kind,
    source,
    position: ROWS.findIndex((r) => r[0] === slug),
  };
  const content = {
    value: isList ? null : value,
    value_list: isList ? (value ?? []) : [],
    published: true,
  };

  if (!known.has(slug) || RESET) {
    const { error } = await supabase
      .from("site_copy")
      .upsert({ ...meta, ...content }, { onConflict: "slug" });
    if (error) {
      console.error(`  ${slug}: ${error.message}`);
      continue;
    }
    inserted += 1;
  } else {
    // Refresh presentation only. The owner's wording is left alone.
    const { error } = await supabase.from("site_copy").update(meta).eq("slug", slug);
    if (error) {
      console.error(`  ${slug}: ${error.message}`);
      continue;
    }
    refreshed += 1;
  }
}

console.log(`site_copy seeded.`);
console.log(`  ${inserted} written${RESET ? " (reset to the artwork baseline)" : ""}`);
console.log(`  ${refreshed} left as edited, labels refreshed`);
if (!RESET && refreshed > 0) {
  console.log(`\nRe-run with --reset to force every entry back to the artwork wording.`);
}
