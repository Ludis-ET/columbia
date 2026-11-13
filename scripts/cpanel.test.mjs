import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { archiveRelease, packageRelease } from "./package-cpanel.mjs";
import { createHash } from "node:crypto";
import { verifySite } from "./verify-cpanel.mjs";

const commit = "a".repeat(40);
const project = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.stringify({
  version: 4,
  routes: { "/": { initialRevalidateSeconds: false } },
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: "generated-id",
    previewModeSigningKey: "generated-signing-key",
    previewModeEncryptionKey: "generated-encryption-key",
  },
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "columbia-package-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function write(name, value) {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  }
  write(".next/BUILD_ID", "test-build");
  write(".next/prerender-manifest.json", manifest);
  write(".next/server/route.js", "");
  write(".next/static/test.css", "body{}");
  write("public/favicon.svg", "<svg/>");
  write(".next/standalone/.next/BUILD_ID", "test-build");
  write(".next/standalone/.next/prerender-manifest.json", manifest);
  write(".next/standalone/.next/server/route.js", "");
  write(".next/standalone/package.json", '{"type":"module"}');
  write(
    ".next/standalone/server.js",
    [
      'import fs from "node:fs";',
      'fs.writeFileSync("started.json", JSON.stringify({',
      "release: process.env.DEPLOYMENT_ID, setting: process.env.CPANEL_TEST_SETTING",
      "}));",
    ].join("\n"),
  );
  write(".next/standalone/.env", "DO_NOT_SHIP=secret");
  write(".next/standalone/.env.production.local", "DO_NOT_SHIP=another-secret");
  for (const file of ["server.js", "cpanel.cjs"]) {
    fs.copyFileSync(path.join(project, file), path.join(root, file));
  }
  return { root, write };
}

test("package keeps generated preview keys and includes static assets, without env files", (t) => {
  const { root } = fixture(t);
  const output = packageRelease(root, "test-release", commit);
  const release = path.join(output, "releases", "test-release");
  assert.equal(
    fs.readFileSync(path.join(release, ".next/prerender-manifest.json"), "utf8"),
    manifest,
  );
  assert.equal(fs.readFileSync(path.join(release, ".next/static/test.css"), "utf8"), "body{}");
  assert(fs.existsSync(path.join(release, "public/favicon.svg")));
  assert(!fs.existsSync(path.join(release, ".env")));
  assert(!fs.existsSync(path.join(release, ".env.production.local")));
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(output, "active-release.json"))).commit,
    commit,
  );
});

test("invalid build manifests are rejected without synthesizing preview keys", (t) => {
  const { root, write } = fixture(t);
  const broken = '{"version":4,"routes":{}}';
  write(".next/prerender-manifest.json", broken);
  assert.throws(() => packageRelease(root, "test-release", commit), /Missing generated preview/);
  assert.equal(fs.readFileSync(path.join(root, ".next/prerender-manifest.json"), "utf8"), broken);
});

test("rejects traversal in a release ID", (t) => {
  const { root } = fixture(t);
  assert.throws(() => packageRelease(root, "../outside", commit), /Invalid release ID/);
});

test("LiteSpeed require can load the ESM-root bootstrap, with cPanel env precedence", (t) => {
  const { root } = fixture(t);
  const output = packageRelease(root, "test-release", commit);
  fs.writeFileSync(path.join(output, "package.json"), '{"type":"module"}');
  fs.writeFileSync(path.join(output, ".env"), "CPANEL_TEST_SETTING=file-value\n");
  const result = spawnSync(
    process.execPath,
    ["--input-type=commonjs", "-e", "require(process.argv[1])", path.join(output, "server.js")],
    { cwd: output, encoding: "utf8", env: { ...process.env, CPANEL_TEST_SETTING: "cpanel-value" } },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(output, "started.json"))), {
    release: "test-release",
    setting: "cpanel-value",
  });
});

test("startup rejects an incomplete uploaded release instead of altering its manifest", (t) => {
  const { root } = fixture(t);
  const output = packageRelease(root, "test-release", commit);
  const filename = path.join(output, "releases/test-release/.next/prerender-manifest.json");
  fs.writeFileSync(filename, "{}");
  const result = spawnSync(
    process.execPath,
    ["--input-type=commonjs", "-e", "require(process.argv[1])", path.join(output, "server.js")],
    { cwd: output, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Incomplete Next.js release/);
  assert.equal(fs.readFileSync(filename, "utf8"), "{}");
  assert(!fs.existsSync(path.join(output, "started.json")));
});

async function serve(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

test("HTTP 200 from an old release does not count as a successful deployment", async (t) => {
  const base = await serve(t, (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", release: "old-release", commit }));
  });
  await assert.rejects(
    verifySite(base, "new-release", commit, { timeout: 0 }),
    /Serving release old-release, expected new-release/,
  );
});

test("HTTP 200 HTML in place of a JavaScript chunk fails deployment verification", async (t) => {
  const base = await serve(t, (req, res) => {
    if (req.url.startsWith("/api/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", release: "new-release", commit }));
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        '<h1>Columbia Care</h1><script src="/_next/static/app.js"></script><link href="/_next/static/app.css">',
      );
    }
  });
  await assert.rejects(
    verifySite(base, "new-release", commit, { timeout: 0 }),
    /Incorrect content type/,
  );
});

function archiveFixture(t, change = () => {}) {
  const { root } = fixture(t);
  const output = packageRelease(root, "test-release", commit);
  change(output);
  const archive = path.join(root, "release.tar.gz");
  archiveRelease(output, archive);
  const bytes = fs.readFileSync(archive);
  const pointer = JSON.parse(fs.readFileSync(path.join(output, "active-release.json"), "utf8"));
  pointer.archiveSha256 = createHash("sha256").update(bytes).digest("hex");
  pointer.archiveBytes = bytes.length;
  fs.mkdirSync(path.join(output, "archives"));
  const uploaded = path.join(output, "archives", "test-release.tar.gz");
  fs.copyFileSync(archive, uploaded);
  fs.writeFileSync(path.join(output, "active-release.json"), JSON.stringify(pointer));
  // Match cPanel's first start after the upload: only the archive is present.
  fs.rmSync(path.join(output, "releases"), { recursive: true, force: true });
  return { output, uploaded };
}

function startFixture(output) {
  return spawnSync(
    process.execPath,
    ["--input-type=commonjs", "-e", "require(process.argv[1])", path.join(output, "server.js")],
    { cwd: output, encoding: "utf8" },
  );
}

test("cold startup unpacks the archive, and restarts reuse the extracted release", (t) => {
  const { output, uploaded } = archiveFixture(t);
  const first = startFixture(output);
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /extracted and validated/);
  assert(fs.existsSync(path.join(output, "releases/test-release/.next/BUILD_ID")));
  assert(fs.existsSync(path.join(output, "started.json")));
  // A restart must not depend on re-downloading or re-extracting the archive.
  fs.unlinkSync(uploaded);
  const second = startFixture(output);
  assert.equal(second.status, 0, second.stderr);
  assert.doesNotMatch(second.stdout, /Extracting/);
});

test("a truncated archive is rejected before extracting a release", (t) => {
  const { output, uploaded } = archiveFixture(t);
  fs.appendFileSync(uploaded, "truncated-transfer-marker");
  const result = startFixture(output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /archive size mismatch/);
  assert(!fs.existsSync(path.join(output, "releases/test-release")));
  assert(!fs.existsSync(path.join(output, "started.json")));
});

test("same-size archive corruption fails SHA-256 verification", (t) => {
  const { output, uploaded } = archiveFixture(t);
  const bytes = fs.readFileSync(uploaded);
  bytes[0] ^= 1;
  fs.writeFileSync(uploaded, bytes);
  const result = startFixture(output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /archive checksum mismatch/);
  assert(!fs.existsSync(path.join(output, "releases/test-release")));
});

test("unexpected archive paths are refused and staging directories are removed", (t) => {
  const { output } = archiveFixture(t, (directory) => {
    fs.writeFileSync(path.join(directory, "unexpected.txt"), "outside the release tree");
  });
  const result = startFixture(output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unexpected path/);
  assert(!fs.existsSync(path.join(output, "releases/test-release")));
  assert.equal(fs.readdirSync(path.join(output, "releases")).length, 0);
});

test("invalid unpacked manifests are rejected before promotion", (t) => {
  const { output } = archiveFixture(t, (directory) => {
    fs.writeFileSync(
      path.join(directory, "releases/test-release/.next/prerender-manifest.json"),
      "{}",
    );
  });
  const result = startFixture(output);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Incomplete Next.js release/);
  assert(!fs.existsSync(path.join(output, "releases/test-release")));
  assert.equal(fs.readdirSync(path.join(output, "releases")).length, 0);
});

test("concurrent cPanel workers promote only a complete extracted release", async (t) => {
  const { output } = archiveFixture(t);
  const run = () =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--input-type=commonjs", "-e", "require(process.argv[1])", path.join(output, "server.js")],
        { cwd: output, stdio: ["ignore", "ignore", "pipe"] },
      );
      let stderr = "";
      child.stderr.on("data", (block) => {
        stderr += block;
      });
      child.once("error", reject);
      child.once("close", (status) => resolve({ status, stderr }));
    });
  const results = await Promise.all([run(), run()]);
  for (const result of results) assert.equal(result.status, 0, result.stderr);
  assert(fs.existsSync(path.join(output, "releases/test-release/.next/BUILD_ID")));
  assert.deepEqual(fs.readdirSync(path.join(output, "releases")), ["test-release"]);
});
