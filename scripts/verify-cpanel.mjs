import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

async function request(base, pathname) {
  const url = new URL(pathname, base);
  url.searchParams.set("deployment_check", String(Date.now()));
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "Cache-Control": "no-cache" },
    redirect: "follow",
  });
  assert(response.status === 200, `${pathname} returned HTTP ${response.status}`);
  return response;
}

export async function verifySite(
  base,
  release,
  commit,
  { timeout = 180000, alive = () => true } = {},
) {
  const deadline = Date.now() + timeout;
  let lastError;
  do {
    assert(alive(), "Production process exited before readiness");
    try {
      const healthResponse = await request(base, "/api/health");
      assert(
        /application\/json/.test(healthResponse.headers.get("content-type")),
        "Health is not JSON",
      );
      const health = await healthResponse.json();
      assert(health.status === "ok", "Process is not ready");
      assert(health.release === release, `Serving release ${health.release}, expected ${release}`);
      assert(health.commit === commit, "Serving an unexpected commit");
      const homepage = await request(base, "/");
      assert(/text\/html/.test(homepage.headers.get("content-type")), "Homepage is not HTML");
      const html = await homepage.text();
      assert(/Columbia Care/i.test(html), "Homepage is missing the site identity");
      const assets = [
        ...html.matchAll(/(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g),
      ].map((match) => match[1].replaceAll("&amp;", "&"));
      for (const extension of [".js", ".css"]) {
        const asset = assets.find((entry) => new URL(entry, base).pathname.endsWith(extension));
        assert(asset, `Homepage has no ${extension} asset`);
        const response = await request(base, asset);
        const contentType = response.headers.get("content-type") || "";
        assert(
          extension === ".css" ? /text\/css/.test(contentType) : /javascript/.test(contentType),
          `Incorrect content type for ${asset}: ${contentType}`,
        );
        assert((await response.arrayBuffer()).byteLength > 0, "Empty static asset");
      }
      await request(base, "/admin/login");
      console.log(`Verified release ${release}: health, homepage, JS, CSS and admin login`);
      return;
    } catch (error) {
      lastError = error;
      if (Date.now() >= deadline) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } while (Date.now() < deadline);
  throw new Error(`Deployment did not become healthy: ${lastError?.message}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, release, commit] = process.argv.slice(2);
  assert(base && release && commit, "Usage: node scripts/verify-cpanel.mjs URL RELEASE COMMIT");
  await verifySite(base, release, commit);
}
