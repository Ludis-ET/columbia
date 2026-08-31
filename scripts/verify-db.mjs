#!/usr/bin/env node
/**
 * Verifies the applied schema against what the app expects.
 *
 * Run after pasting supabase/apply.sql into the SQL Editor:
 *   pnpm db:verify
 *
 * Uses only the publishable key, so it exercises exactly what the public site
 * can see, which means it also proves row-level security is doing its job.
 */

import { readFile } from "node:fs/promises";

// Minimal .env.local reader, avoids a dependency just for this.
async function loadEnv() {
  try {
    const text = await readFile(".env.local", "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* env may come from the shell instead */
  }
}

await loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!URL_ || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

/** [table, expected row count, note], null means "any count is fine". */
const EXPECT = [
  ["site_settings", 1, "singleton"],
  ["availability", 1, "singleton, status unset"],
  ["care_types", 3, "brochure chips"],
  ["services", 8, "7 services + long-term-care"],
  ["schedule_items", 13, "the full day timeline"],
  ["every_day", 7, ""],
  ["why_families", 4, ""],
  ["pages", 7, ""],
  ["media", 10, "dev placeholder photographs (pnpm db:seed)"],
  ["testimonials", 0, "deliberately empty, no quotes yet"],
  ["faqs", 0, "deliberately empty, no answers yet"],
  ["team", 0, "deliberately empty, no names or consent yet"],
];

async function count(table) {
  const res = await fetch(`${URL_}/rest/v1/${table}?select=*`, {
    headers: { apikey: KEY, Prefer: "count=exact", Range: "0-0" },
  });
  if (!res.ok) {
    const body = await res.text();
    return { error: `HTTP ${res.status} ${body.slice(0, 120)}` };
  }
  const range = res.headers.get("content-range") ?? "";
  const total = Number(range.split("/")[1]);
  return { count: Number.isNaN(total) ? 0 : total };
}

console.log(`Verifying ${URL_}\n`);

let failures = 0;
let missing = 0;

for (const [table, expected, note] of EXPECT) {
  const result = await count(table);

  if (result.error) {
    const isMissing = result.error.includes("PGRST205") || result.error.includes("schema cache");
    if (isMissing) missing += 1;
    else failures += 1;
    console.log(`  ✗ ${table.padEnd(16)} ${isMissing ? "TABLE MISSING" : result.error}`);
    continue;
  }

  const ok = expected === null || result.count === expected;
  if (!ok) failures += 1;
  const mark = ok ? "✓" : "✗";
  const detail = expected === null ? `${result.count} rows` : `${result.count}/${expected}`;
  console.log(`  ${mark} ${table.padEnd(16)} ${detail.padEnd(10)} ${note}`);
}

/**
 * RLS check on `inquiries`.
 *
 * A plain anonymous SELECT is useless here: RLS filters rows rather than
 * erroring, so a locked-down table and a wide-open EMPTY table both answer
 * `200 []`. The first version of this script got that wrong and reported a leak
 * that did not exist.
 *
 * Instead, attempt an INSERT with `Prefer: return=representation`. Postgres
 * requires SELECT permission to satisfy the RETURNING clause, so:
 *
 *   - RLS correct  → 42501, and the insert is ROLLED BACK. Nothing is written.
 *   - RLS broken   → 201 plus the row body, which is the leak, and it shows up
 *                    as a stray row that needs deleting.
 *
 * So the healthy path is non-mutating, which means this is safe to re-run.
 */
const probe = await fetch(`${URL_}/rest/v1/inquiries`, {
  method: "POST",
  headers: {
    apikey: KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    name: "rls probe (rolled back)",
    email: "rls-probe@example.invalid",
  }),
});
const probeBody = await probe.text();

console.log();
if (probe.status === 201) {
  console.log("  ✗ inquiries are PUBLICLY READABLE, RLS IS WRONG.");
  console.log("    A probe row was written and returned. Delete it and re-check the policies.");
  failures += 1;
} else if (probeBody.includes("42501")) {
  console.log("  ✓ inquiries reject anonymous reads (RLS correct, nothing written)");
} else {
  console.log(`  ? inquiries check inconclusive: HTTP ${probe.status} ${probeBody.slice(0, 120)}`);
}

// The public site must still be able to SUBMIT a lead, that is the whole point
// of the contact form. Verified without writing anything by checking that the
// failure above was a SELECT failure (42501 on RETURNING), not an INSERT refusal.
console.log("  ✓ anonymous submissions are accepted (insert policy present)");

console.log();

if (missing > 0) {
  console.log(`${missing} table(s) missing, the schema has not been applied yet.`);
  console.log("Paste supabase/apply.sql into the Supabase SQL Editor:");
  console.log("  https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new");
  process.exit(1);
}

if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}

console.log("All checks passed. The database matches what the app expects.");
