const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createHash } = require("node:crypto");
const { execFile } = require("node:child_process");
// Some hosting runtimes wrap execFile without Node's util.promisify.custom
// symbol. A generic promisifier then returns stdout alone instead of the
// { stdout, stderr } object. Use the callback contract explicitly.
function runFile(file, args, options) {
  return new Promise((resolve, reject) => {
    execFile(file, args, { ...options, encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        stdout: Buffer.isBuffer(stdout) ? stdout.toString("utf8") : (stdout ?? ""),
        stderr: Buffer.isBuffer(stderr) ? stderr.toString("utf8") : (stderr ?? ""),
      });
    });
  });
}

function validateRelease(directory, release) {
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
  return buildId;
}

async function ensureRelease(directory, release) {
  // Already extracted releases, including older deployments, start immediately.
  if (fs.existsSync(directory)) return;
  if (
    !/^[a-f0-9]{64}$/.test(release.archiveSha256 ?? "") ||
    !Number.isSafeInteger(release.archiveBytes) ||
    release.archiveBytes <= 0
  ) {
    throw new Error("Release directory is missing and archive metadata is invalid. Redeploy.");
  }
  const archive = path.join(__dirname, "archives", release.id + ".tar.gz");
  if (fs.statSync(archive).size !== release.archiveBytes) {
    throw new Error("Release archive size mismatch. Redeploy the complete archive.");
  }
  const hash = createHash("sha256");
  for await (const block of fs.createReadStream(archive)) hash.update(block);
  if (hash.digest("hex") !== release.archiveSha256) {
    throw new Error("Release archive checksum mismatch. Redeploy the complete archive.");
  }

  console.log(`[startup] Extracting verified release ${release.id}`);
  const parent = path.dirname(directory);
  fs.mkdirSync(parent, { recursive: true });
  // Every worker gets its own staging folder. Only a complete, validated release
  // is renamed into place; a concurrent worker can safely finish first.
  const staging = fs.mkdtempSync(path.join(parent, ".unpack-"));
  const options = { windowsHide: true, timeout: 120000, maxBuffer: 16 * 1024 * 1024 };
  try {
    const { stdout } = await runFile("tar", ["-tzf", archive], options);
    if (!stdout.trim()) {
      throw new Error("tar returned an empty archive listing; extraction refused.");
    }
    const prefix = "./releases/" + release.id;
    const roots = new Set([
      "./",
      "./server.js",
      "./cpanel.cjs",
      "./active-release.json",
      "./releases/",
    ]);
    for (const entry of stdout.trimEnd().split(/\r?\n/)) {
      if (
        entry.includes("\\") ||
        entry.split("/").includes("..") ||
        !(roots.has(entry) || entry === prefix || entry.startsWith(prefix + "/"))
      ) {
        throw new Error("Unexpected path in release archive; extraction refused.");
      }
    }
    await runFile(
      "tar",
      ["-xzf", archive, "-C", staging, "--no-same-owner", "--no-same-permissions", "--", prefix],
      options,
    );
    const extracted = path.join(staging, "releases", release.id);
    validateRelease(extracted, release);
    try {
      fs.renameSync(extracted, directory);
    } catch (error) {
      if (!fs.existsSync(directory)) throw error;
      validateRelease(directory, release);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("The hosting environment must provide the tar command to extract releases.", {
        cause: error,
      });
    }
    throw error;
  } finally {
    // This unique temporary directory was created above by this process.
    fs.rmSync(staging, { recursive: true, force: true });
  }
  console.log(`[startup] Release ${release.id} extracted and validated`);
}

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
  await ensureRelease(directory, release);
  const buildId = validateRelease(directory, release);

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
