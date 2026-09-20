import { createServer } from "node:http";
import { parse } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import next from "next";

// Use Node 22 built-in env file loader (zero extra dependencies)
const projectDir = path.dirname(fileURLToPath(import.meta.url));
for (const envFile of [".env", ".env.local"]) {
  const fullPath = path.join(projectDir, envFile);
  if (fs.existsSync(fullPath)) {
    if (typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(fullPath);
      } catch {}
    } else {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, "");
            if (!(key in process.env)) {
              process.env[key] = val;
            }
          }
        }
      } catch {}
    }
  }
}

// server.js is the production runner for cPanel (Phusion Passenger)
process.env.NODE_ENV = "production";
const dev = false;
const hostname = process.env.HOSTNAME || "localhost";
const rawPort = process.env.PORT || 3000;
const port = typeof rawPort === "string" && !isNaN(Number(rawPort)) ? Number(rawPort) : rawPort;

// When using middleware, hostname and port must be provided to next(...)
const app = next({ dev, dir: projectDir, hostname, port: typeof port === "number" ? port : 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      if (!res.headersSent) {
        console.error("Error occurred handling", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      } else {
        console.error("Error occurred after headers were sent for", req.url, err);
      }
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Columbia Care running on port ${port} (production)`);
  });
});
