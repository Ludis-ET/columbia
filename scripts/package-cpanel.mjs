import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function validateManifest(directory) {
  const buildId = fs.readFileSync(path.join(directory, ".next", "BUILD_ID"), "utf8").trim();
  assert(buildId, "Missing production BUILD_ID");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, ".next", "prerender-manifest.json"), "utf8"),
  );
  for (const key of ["previewModeId", "previewModeSigningKey", "previewModeEncryptionKey"]) {
    assert(
      typeof manifest.preview?.[key] === "string" && manifest.preview[key].length > 0,
      `Missing generated preview.${key}; rebuild instead of patching the manifest`,
    );
  }
  assert(fs.statSync(path.join(directory, ".next", "server")).isDirectory());
  return buildId;
}

export function packageRelease(root, id, commit) {
  assert(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(id), "Invalid release ID");
  assert(/^[a-f0-9]{40}$/.test(commit), "Expected a full Git commit SHA");
  const standalone = path.join(root, ".next", "standalone");
  validateManifest(root);
  assert(fs.existsSync(path.join(standalone, "server.js")), "Build with output: standalone first");
  const output = path.join(root, "deploy-dist");
  // The only removed path is this fixed generated directory inside root.
  fs.rmSync(output, { recursive: true, force: true });
  const release = path.join(output, "releases", id);
  fs.mkdirSync(release, { recursive: true });
  fs.cpSync(standalone, release, {
    recursive: true,
    dereference: true,
    // Next traces local env files too. Never distribute credentials in artifacts.
    filter: (source) => !/^\.env(?:\.|$)/.test(path.basename(source)),
  });
  fs.cpSync(path.join(root, ".next", "static"), path.join(release, ".next", "static"), {
    recursive: true,
    dereference: true,
  });
  if (fs.existsSync(path.join(root, "public"))) {
    fs.cpSync(path.join(root, "public"), path.join(release, "public"), {
      recursive: true,
      dereference: true,
    });
  }
  const buildId = validateManifest(release);
  assert(
    fs.readFileSync(path.join(release, ".next", "prerender-manifest.json"), "utf8") ===
      fs.readFileSync(path.join(root, ".next", "prerender-manifest.json"), "utf8"),
    "Packaged prerender manifest differs from the build",
  );
  for (const file of ["server.js", "cpanel.cjs"]) {
    fs.copyFileSync(path.join(root, file), path.join(output, file));
  }
  fs.writeFileSync(
    path.join(output, "active-release.json"),
    JSON.stringify({ id, commit, buildId }) + "\n",
  );
  console.log(`Packaged release ${id} (build ${buildId}) without environment files`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  packageRelease(
    root,
    process.env.RELEASE_ID || "local",
    process.env.GITHUB_SHA || "0000000000000000000000000000000000000000",
  );
}
