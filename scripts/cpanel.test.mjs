import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { packageRelease } from "./package-cpanel.mjs";
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
