import { createServer } from "node:http";
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

const MIME_TYPES = {
  ".js": "application/javascript; charset=UTF-8",
  ".mjs": "application/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=UTF-8",
  ".xml": "application/xml; charset=UTF-8",
};

function serveStaticFile(res, filePath, immutable = false) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stat.size);
    if (immutable) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const rawUrl = req.url || "/";

      // 1. Directly serve Next.js immutable build assets (/_next/static/...)
      // Bypasses Next.js internal router cache so newly deployed chunks on disk
      // never 500 during or before application restarts.
      if (rawUrl.startsWith("/_next/static/")) {
        const subPath = rawUrl.slice("/_next/static/".length).split("?")[0];
        const safePath = path.normalize(subPath).replace(/^(\.\.[\/\\])+/, "");
        const filePath = path.join(projectDir, ".next", "static", safePath);

        if (serveStaticFile(res, filePath, true)) {
          return;
        }

        // Return clean 404 if file is not on disk, rather than throwing a 500
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=UTF-8");
        res.end("Static asset not found");
        return;
      }

      // 2. Directly serve public folder assets if they match (/favicon.ico, /images/..., etc.)
      if (
        !rawUrl.startsWith("/_next/") &&
        !rawUrl.startsWith("/api/") &&
        !rawUrl.startsWith("/admin")
      ) {
        const cleanPath = rawUrl.split("?")[0].replace(/^\/+/, "");
        if (cleanPath) {
          const safePublicPath = path.normalize(cleanPath).replace(/^(\.\.[\/\\])+/, "");
          const publicFilePath = path.join(projectDir, "public", safePublicPath);
          if (fs.existsSync(publicFilePath) && serveStaticFile(res, publicFilePath, false)) {
            return;
          }
        }
      }

      // 3. Delegate SSR pages, dynamic routes, and Server Actions to Next.js
      await handle(req, res);
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
