#!/usr/bin/env node
/**
 * scripts/clean-placeholders.mjs
 * 
 * Removes old placeholder media rows (the ones with paths in /placeholder/)
 * and any rows with alt text containing "Placeholder:" from the media table.
 * These were seeded from the file fallback before real photos were uploaded.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Find rows that aren't real uploads (don't have gallery/ prefix in storage_path,
// OR have alt text that contains "Placeholder:")
const { data: allRows } = await sb.from("media").select("id, storage_path, alt");

const toDelete = (allRows ?? []).filter(r => 
  // Old placeholder paths (absolute paths starting with /placeholder or no path)
  !r.storage_path.startsWith("gallery/") ||
  r.alt?.includes("Placeholder:")
);

if (toDelete.length === 0) {
  console.log("No placeholder rows found. All clean!");
} else {
  console.log(`Found ${toDelete.length} placeholder rows to remove:`);
  for (const r of toDelete) {
    console.log(`  - ${r.alt} (${r.storage_path})`);
  }

  const ids = toDelete.map(r => r.id);
  const { error } = await sb.from("media").delete().in("id", ids);
  if (error) {
    console.error("Error deleting rows:", error.message);
  } else {
    console.log(`\n✓ Deleted ${toDelete.length} placeholder rows.`);
  }

  // Remove storage objects that aren't in the gallery/ bucket path
  const storagePaths = toDelete
    .filter(r => r.storage_path.startsWith("gallery/"))
    .map(r => r.storage_path);
  if (storagePaths.length > 0) {
    await sb.storage.from("media").remove(storagePaths);
  }
}

// Show final count
const { count } = await sb.from("media").select("id", { count: "exact", head: true });
console.log(`\nMedia table now has ${count} rows.`);
