#!/usr/bin/env node
/**
 * scripts/sync-local-photos.mjs
 *
 * Copies and web-optimizes photos from C:\Users\kiflay mehari\Pictures\colubia
 * into public/photos/ for local fast static serving and fallback.
 */

import { readdirSync, statSync, mkdirSync } from "node:fs";
import { join, extname, basename } from "node:path";
import sharp from "sharp";

const SOURCE_ROOT = "C:\\Users\\kiflay mehari\\Pictures\\colubia";
const DEST_ROOT = "public/photos";

mkdirSync(DEST_ROOT, { recursive: true });

const FOLDER_PREFIXES = {
  Livingroom: "living-room",
  dining: "dining",
  Kitchen: "kitchen",
  bedroom: "bedroom",
  backyard: "backyard",
  Entrance: "entrance",
  Restroom: "restroom",
};

async function run() {
  const folders = Object.keys(FOLDER_PREFIXES);
  let totalCopied = 0;

  for (const folder of folders) {
    const folderPath = join(SOURCE_ROOT, folder);
    const prefix = FOLDER_PREFIXES[folder];

    let files;
    try {
      files = readdirSync(folderPath);
    } catch (e) {
      console.warn(`Could not read ${folderPath}:`, e.message);
      continue;
    }

    let idx = 1;
    for (const file of files) {
      const filePath = join(folderPath, file);
      const stat = statSync(filePath);
      if (stat.size === 0 || !/\.(jpg|jpeg|png)$/i.test(file)) continue;

      const outName = `${prefix}-${idx}.jpg`;
      const outPath = join(DEST_ROOT, outName);

      console.log(`Processing ${folder}/${file} -> ${outName} (${(stat.size / 1024 / 1024).toFixed(1)}MB -> web)`);

      await sharp(filePath)
        .rotate() // auto-orient from EXIF
        .resize({ width: 1920, height: 1440, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(outPath);

      idx++;
      totalCopied++;
    }
  }

  console.log(`\nSuccessfully processed and copied ${totalCopied} photos to ${DEST_ROOT}/`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
