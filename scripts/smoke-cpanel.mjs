import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifySite } from "./verify-cpanel.mjs";

const source = fileURLToPath(new URL("../deploy-dist/", import.meta.url));
const release = JSON.parse(fs.readFileSync(path.join(source, "active-release.json"), "utf8"));
// Isolate the artifact so missing dependencies cannot resolve from the checkout.
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "columbia-cpanel-"));
let child;
let output = "";
try {
  // Test the actual upload format: no release directory is preinstalled.
  // The bootstrap must verify, unpack and start the compressed artifact itself.
  const archive = fileURLToPath(new URL("../cpanel-release.tar.gz", import.meta.url));
  fs.mkdirSync(path.join(temporary, "archives"));
  fs.copyFileSync(archive, path.join(temporary, "archives", release.id + ".tar.gz"));
  for (const file of ["server.js", "cpanel.cjs"]) {
    fs.copyFileSync(path.join(source, file), path.join(temporary, file));
  }
  const hash = createHash("sha256");
  for await (const block of fs.createReadStream(archive)) hash.update(block);
  release.archiveSha256 = hash.digest("hex");
  release.archiveBytes = fs.statSync(archive).size;
  fs.writeFileSync(path.join(temporary, "active-release.json"), JSON.stringify(release));
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  // Match lsnode.js: require() the entry point even though the repo uses ESM.
  // Also simulate hosting wrappers that do not copy custom promisify symbols.
  const bootstrap = [
    'const childProcess = require("node:child_process");',
    "const execFile = childProcess.execFile;",
    "childProcess.execFile = function (...args) { return execFile.apply(this, args); };",
    "require(process.argv[1]);",
  ].join("\n");
  child = spawn(
    process.execPath,
    ["--input-type=commonjs", "-e", bootstrap, path.join(temporary, "server.js")],
    {
      cwd: temporary,
      env: { ...process.env, PORT: String(port), CPANEL_BIND_HOST: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      output = (output + chunk).slice(-12000);
    });
  }
  await verifySite(`http://127.0.0.1:${port}`, release.id, release.commit, {
    timeout: 90000,
    alive: () => child.exitCode === null,
  });
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once("exit", resolve));
    child.kill();
    await exited;
  }
  fs.rmSync(temporary, { recursive: true, force: true });
}
