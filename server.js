import { createServer } from "node:http";
import { parse } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import next from "next";

// Ensure environment variables from .env / .env.local are loaded from the exact project directory
const projectDir = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(projectDir);

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;
const app = next({ dev, dir: projectDir });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Columbia Care running on port ${port}`);
  });
});
