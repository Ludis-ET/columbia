#!/usr/bin/env node
/**
 * Bundles the migrations and the seed into supabase/apply.sql, one file the
 * client (or you) can paste into the Supabase SQL Editor in a single go.
 *
 * Applying schema needs a secret key or the database password, neither of which
 * belongs in this repo. The publishable key in .env.local can read and insert
 * under RLS, but it cannot create tables. So the bundle exists to make the
 * manual step a single paste rather than four.
 *
 * Safe to re-run: the schema is IF NOT EXISTS / DROP POLICY IF EXISTS, and the
 * seed is ON CONFLICT DO UPDATE.
 *
 *   pnpm seed:generate && pnpm db:bundle
 */

import { readFile, writeFile } from "node:fs/promises";

const PROJECT_REF = "wmxvickqaxkuaatftput";

const parts = [
  "supabase/migrations/0001_schema.sql",
  "supabase/migrations/0002_storage.sql",
  "supabase/migrations/0003_rate_limit.sql",
  "supabase/migrations/0004_admin_refinement.sql",
  "supabase/migrations/0005_site_copy.sql",
  "supabase/migrations/0006_media_placements.sql",
  "supabase/migrations/0007_care_summaries.sql",
  "supabase/seed.sql",
];

const header = `-- ============================================================================
-- Columbia Care, ONE-PASTE SETUP
--
-- Paste this whole file into the Supabase SQL Editor and run it:
--   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new
--
-- Safe to re-run. Schema uses IF NOT EXISTS, seed uses ON CONFLICT.
-- GENERATED FILE, regenerate with: pnpm seed:generate && pnpm db:bundle
-- ============================================================================

`;

const bodies = await Promise.all(parts.map((p) => readFile(p, "utf8")));
await writeFile("supabase/apply.sql", header + bodies.join("\n\n"), "utf8");

console.log("Wrote supabase/apply.sql");
for (const p of parts) console.log(`  + ${p}`);
