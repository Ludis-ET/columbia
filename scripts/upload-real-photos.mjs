#!/usr/bin/env node
/**
 * scripts/upload-real-photos.mjs
 *
 * One-time script: uploads all real Columbia Care photos from
 * C:\Users\kiflay mehari\Pictures\colubia\ into Supabase Storage
 * (bucket: media, path: gallery/<uuid>.<ext>) and inserts media rows.
 *
 * Images are compressed with sharp to stay under Supabase's 50MB storage
 * object limit (free tier). Each image is resized to max 2400px wide and
 * JPEG-compressed at quality 80.
 *
 * Run from the project root:
 *   node scripts/upload-real-photos.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { join, extname, basename } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PHOTOS_ROOT = "C:\\Users\\kiflay mehari\\Pictures\\colubia";

/** Max dimension for long side after resize. */
const MAX_DIM = 2400;
/** JPEG quality for output. */
const JPEG_QUALITY = 82;
/** Hard limit in bytes — Supabase free tier storage object limit. */
const MAX_BYTES = 45 * 1024 * 1024;

const FOLDER_MAP = {
  backyard:   ["Outdoors"],
  bedroom:    ["Bedrooms"],
  dining:     ["Dining & kitchen"],
  Entrance:   ["Entrance"],
  Kitchen:    ["Dining & kitchen"],
  Livingroom: ["Living areas"],
  Restroom:   ["Restroom"],
};

let heroAssigned = false;
let mealsAssigned = false;

const SUPPORTED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {}
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function altFromFilename(filename, folder) {
  const base = basename(filename, extname(filename))
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const folderLabel = folder.replace(/([a-z])([A-Z])/g, "$1 $2");
  const pretty = base ? base.charAt(0).toUpperCase() + base.slice(1) : folderLabel;
  return `Columbia Care ${folderLabel} — ${pretty}`;
}

function captionFromFolder(folder) {
  const captions = {
    backyard:   "The backyard",
    bedroom:    "A bedroom",
    dining:     "The dining room",
    Entrance:   "The entrance",
    Kitchen:    "The kitchen",
    Livingroom: "The living room",
    Restroom:   "The restroom",
  };
  return captions[folder] ?? folder;
}

async function compressImage(inputBuffer) {
  const img = sharp(inputBuffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  let pipeline = img;
  if (w > MAX_DIM || h > MAX_DIM) {
    pipeline = pipeline.resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true });
  }

  const compressed = await pipeline.jpeg({ quality: JPEG_QUALITY, progressive: true }).toBuffer();
  return compressed;
}

async function getMaxPosition() {
  const { data } = await supabase
    .from("media")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? -1) + 1;
}

async function uploadPhoto(filePath, folder, position) {
  const filename = basename(filePath);

  let rawBuffer;
  try {
    rawBuffer = await readFile(filePath);
  } catch (err) {
    console.error(`  ✗ Cannot read ${filename}: ${err.message}`);
    return false;
  }

  if (rawBuffer.length === 0) {
    console.log(`  ⚠ Skipping ${filename} (0 bytes)`);
    return false;
  }

  if (rawBuffer.length > MAX_BYTES) {
    console.log(`  🔄 Compressing ${filename} (${(rawBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);
  }

  let buffer;
  try {
    buffer = await compressImage(rawBuffer);
    console.log(`  → Compressed to ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.error(`  ✗ Compression failed for ${filename}: ${err.message}`);
    return false;
  }

  const storagePath = `gallery/${randomUUID()}.jpg`;

  const basePlacements = [...(FOLDER_MAP[folder] ?? [])];
  if (folder === "Livingroom" && !heroAssigned) {
    basePlacements.push("hero");
    heroAssigned = true;
  }
  if ((folder === "dining" || folder === "Kitchen") && !mealsAssigned) {
    basePlacements.push("meals");
    mealsAssigned = true;
  }

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: false });

  if (uploadError) {
    console.error(`  ✗ Storage upload failed for ${filename}: ${uploadError.message}`);
    return false;
  }

  const galleryPlacements = basePlacements.filter((p) => p !== "hero" && p !== "meals");
  const category = galleryPlacements[0] ?? null;

  const { error: insertError } = await supabase.from("media").insert({
    storage_path: storagePath,
    alt: altFromFilename(filename, folder),
    caption: captionFromFolder(folder),
    category,
    placements: basePlacements,
    contains_people: false,
    release_on_file: false,
    position,
    published: true,
    featured: false,
  });

  if (insertError) {
    await supabase.storage.from("media").remove([storagePath]);
    console.error(`  ✗ DB insert failed for ${filename}: ${insertError.message}`);
    return false;
  }

  console.log(`  ✓ ${filename} → ${storagePath} [${basePlacements.join(", ")}]`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Columbia Care — uploading real photos to Supabase\n");

  const { data: existing } = await supabase.from("media").select("id").limit(1);
  if (existing && existing.length > 0) {
    console.log("ℹ  Media table already has rows — uploading additional photos.\n");
  }

  let position = await getMaxPosition();
  let uploaded = 0;
  let skipped = 0;

  const folders = readdirSync(PHOTOS_ROOT).filter((f) => {
    try {
      return statSync(join(PHOTOS_ROOT, f)).isDirectory();
    } catch {
      return false;
    }
  });

  for (const folder of folders) {
    const folderPath = join(PHOTOS_ROOT, folder);
    console.log(`\n📁 ${folder}/`);

    const files = readdirSync(folderPath).filter((f) => {
      const ext = extname(f).toLowerCase();
      return SUPPORTED_EXTS.has(ext);
    });

    for (const file of files) {
      const filePath = join(folderPath, file);
      const ok = await uploadPhoto(filePath, folder, position);
      if (ok) {
        uploaded++;
        position++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`\n✅ Done — ${uploaded} uploaded, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
