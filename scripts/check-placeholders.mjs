#!/usr/bin/env node
/**
 * Fails the build if placeholder imagery is still referenced.
 *
 * Advisory now (Phase 2 legitimately uses placeholders for the kitchen sink).
 * Becomes a hard gate in Phase 8: set LAUNCH_READY=1 in the production build
 * and this exits non-zero while any placeholder remains.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOTS = ["src", "content"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".md"]);
const NEEDLE = "/placeholder/";
const strict = process.env.LAUNCH_READY === "1";

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(entry.name))) yield path;
  }
}

const hits = [];
for (const root of ROOTS) {
  for await (const path of walk(root)) {
    const text = await readFile(path, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (line.includes(NEEDLE)) hits.push({ path, line: index + 1, text: line.trim() });
    });
  }
}

if (hits.length === 0) {
  console.log("✓ No placeholder imagery referenced.");
  process.exit(0);
}

const heading = strict
  ? `✗ ${hits.length} placeholder reference(s) remain, cannot ship.`
  : `! ${hits.length} placeholder reference(s) still in use (expected before Phase 8).`;

console.log(heading);
for (const hit of hits) {
  console.log(`  ${hit.path}:${hit.line}  ${hit.text.slice(0, 100)}`);
}

if (strict) {
  console.log("\nReplace these with real photographs of the home before launch.");
  console.log("See public/placeholder/manifest.json and docs/client-questions.md.");
}

process.exit(strict ? 1 : 0);
