#!/usr/bin/env node
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

// Check gallery_categories
const { data: cats, error: catsErr } = await sb.from("gallery_categories").select("name,position").order("position");
if (catsErr) {
  console.log("gallery_categories TABLE MISSING:", catsErr.message);
  console.log("\nYou need to run the migration manually in Supabase SQL editor.");
  console.log("File: supabase/migrations/0008_gallery_categories.sql");
} else {
  console.log("✓ gallery_categories table exists with categories:", cats.map(c => c.name).join(", "));
}

// Check media count
const { count } = await sb.from("media").select("id", { count: "exact", head: true });
console.log(`✓ media table has ${count} rows`);

// Show sample of uploaded photos
const { data: sample } = await sb.from("media").select("alt, placements, published").order("position").limit(5);
console.log("\nFirst 5 media rows:");
sample?.forEach(r => console.log(` - ${r.alt} | published:${r.published} | placements:${r.placements?.join(",")}`));
