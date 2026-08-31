import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES, GATED_ROUTES, INTERNAL_ROUTES, PUBLIC_ROUTES } from "./routes";

/**
 * SEO surface.
 *
 * The structured-data assertions matter most: JSON-LD is read by machines and
 * shown in search results as fact, so an invented phone number there reaches a
 * family before they ever open the site.
 */

test("robots.txt disallows the console and internal pages", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /specimen");
  expect(body).toContain("Disallow: /kitchen-sink");
  expect(body).toContain("Sitemap:");
});

test("the sitemap lists every public page and nothing else", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

  for (const route of PUBLIC_ROUTES) {
    expect(urls, `${route} missing from the sitemap`).toContain(route);
  }
  for (const route of [...ADMIN_ROUTES, ...INTERNAL_ROUTES, ...GATED_ROUTES]) {
    expect(urls, `${route} must not be in the sitemap`).not.toContain(route);
  }
});

test("structured data omits every unconfirmed fact", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(raw).toBeTruthy();

  const data = JSON.parse(raw!);
  expect(data["@type"]).toBe("AssistedLivingFacility");
  expect(data.name).toBe("Columbia Care Adult Family Home");

  // Absent because the client has not confirmed them. An absent property is
  // honest; a guessed one is published to Google as fact.
  // Published through admin Settings. Still unconfirmed by the client (q1), but
  // the structured data must now match the database rather than be absent.
  expect(data.telephone).toBe("206-499-0849");
  expect(data.numberOfRooms, "capacity is unconfirmed (q3)").toBeUndefined();
  expect(data.priceRange, "rates are unconfirmed (q6)").toBeUndefined();
  expect(data.makesOffer, "availability is unset").toBeUndefined();

  // Only Everett is confirmed.
  const areas = (data.areaServed ?? []).map((a: { name: string }) => a.name);
  expect(areas).toEqual(["Everett"]);

  // Confirmed values that SHOULD be there.
  expect(data.faxNumber).toBe("425-212-9108");
  expect(data.email).toBe("columbiacareafh@gmail.com");
  expect(data.address.streetAddress).toBe("2215 Columbia Ave");
});

test("no JSON-LD anywhere contains a placeholder", async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    for (const block of blocks) {
      expect(block, `${route} JSON-LD contains a placeholder`).not.toMatch(/TBC|TBD|null|XXXX/i);
      JSON.parse(block); // must be valid JSON
    }
  }
});

test("every public page has a canonical and a unique title", async ({ page }) => {
  const titles = new Set<string>();
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const title = await page.title();
    expect(title.length, `${route} has no title`).toBeGreaterThan(10);
    expect(titles.has(title), `${route} duplicates the title "${title}"`).toBe(false);
    titles.add(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  }
});
