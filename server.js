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
    try {
      process.loadEnvFile(fullPath);
    } catch {
      // ignore parsing errors or already loaded
    }
  }
}

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev, dir: projectDir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Columbia Care running on port ${port}`);
  });
});
