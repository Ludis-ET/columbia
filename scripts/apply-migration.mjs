/**
 * apply-migration.mjs
 *
 * Applies supabase/migrations/0004_admin_refinement.sql directly via the
 * Supabase REST API (no CLI required).
 *
 * Run: node scripts/apply-migration.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- config ----------------------------------------------------------------
const SUPABASE_URL = "https://wmxvickqaxkuaatftput.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndteHZpY2txYXhrdWFhdGZ0cHV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODEzNDgxMCwiZXhwIjoyMTAzNzEwODEwfQ.TasgRJzqyrk2NyQYilWMpn1SNQH0EKJSpZ6X0gsrEZs";
// ---------------------------------------------------------------------------

const sql = readFileSync(
  join(__dirname, "..", "supabase", "migrations", "0004_admin_refinement.sql"),
  "utf8",
);

console.log("Applying migration 0004_admin_refinement.sql …");

const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    apikey: SERVICE_ROLE_KEY,
  },
  body: JSON.stringify({ query: sql }),
});

if (!res.ok) {
  // The exec_sql RPC may not exist — fall back to the pg endpoint
  console.warn("exec_sql RPC not available, trying pg REST endpoint …");

  // Split into individual statements and run them one by one via pg
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let failed = false;
  for (const stmt of statements) {
    const r = await fetch(`${SUPABASE_URL}/pg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: stmt }),
    });
    if (!r.ok) {
      const body = await r.text();
      // Skip "already exists" errors — migration is idempotent
      if (body.includes("already exists") || body.includes("duplicate")) {
        process.stdout.write(".");
        continue;
      }
      console.error(`\nFailed on statement:\n${stmt}\n\nError: ${body}`);
      failed = true;
      break;
    }
    process.stdout.write(".");
  }
  console.log(failed ? "\n❌ Migration failed." : "\n✅ Migration applied.");
  process.exit(failed ? 1 : 0);
}

const body = await res.json().catch(() => res.text());
console.log("✅ Migration applied successfully.", body);
