const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function start() {
  if (Number(process.versions.node.split(".")[0]) < 22) {
    throw new Error("Select Node.js 22 or newer in cPanel Setup Node.js App.");
  }
  process.env.NODE_ENV = "production";
  // cPanel environment variables take precedence over files in the app root.
  // Load these before the generated Next server changes the working directory.
  for (const name of [".env.production.local", ".env.local", ".env.production", ".env"]) {
    const filename = path.join(__dirname, name);
    if (fs.existsSync(filename)) process.loadEnvFile(filename);
  }

  const release = JSON.parse(fs.readFileSync(path.join(__dirname, "active-release.json"), "utf8"));
  if (typeof release.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(release.id)) {
    throw new Error("Invalid active-release.json. Redeploy a complete release.");
  }
  const directory = path.join(__dirname, "releases", release.id);
  const buildId = fs.readFileSync(path.join(directory, ".next", "BUILD_ID"), "utf8").trim();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(directory, ".next", "prerender-manifest.json"), "utf8"),
  );
  if (
    buildId !== release.buildId ||
    !["previewModeId", "previewModeSigningKey", "previewModeEncryptionKey"].every(
      (key) => typeof manifest.preview?.[key] === "string" && manifest.preview[key].length > 0,
    )
  ) {
    throw new Error("Incomplete Next.js release. Redeploy; do not edit generated manifests.");
  }

  process.env.DEPLOYMENT_ID = release.id;
  process.env.DEPLOYMENT_COMMIT = release.commit;
  process.env.HOSTNAME = process.env.CPANEL_BIND_HOST || "0.0.0.0";
  console.log(`[startup] Starting release ${release.id} (${buildId})`);
  // Keep Next's generated server and compiled config intact. Dynamic import
  // supports its ESM output without making the LiteSpeed entry point async.
  await import(pathToFileURL(path.join(directory, "server.js")).href);
}

start().catch((error) => {
  console.error("[startup] Columbia Care failed:", error);
  process.exit(1);
});
