import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { INTERNAL_ROUTES, PUBLIC_ROUTES } from "./routes";

/**
 * Accessibility gate.
 *
 * CLAUDE.md sets WCAG 2.2 AA as a CI gate rather than an aspiration, so this
 * fails the build on any violation. Body text additionally targets 7:1 (AAA),
 * which is verified visually on /specimen, axe checks the AA floor here.
 */

const ROUTES = [...PUBLIC_ROUTES, ...INTERNAL_ROUTES, "/nope-404"];

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, url: string) {
  // Reveals start at opacity 0. Axe then samples faded text against the band
  // behind it and reports contrast failures that a reader never sees. Reduced
  // motion is the accessible state: content is visible on first paint.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

for (const route of ROUTES) {
  test(`no axe violations: ${route}`, async ({ page }) => {
    const results = await scan(page, route);

    if (results.violations.length > 0) {
      console.log(
        JSON.stringify(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.map((n) => n.html.slice(0, 160)),
          })),
          null,
          2,
        ),
      );
    }

    expect(results.violations).toEqual([]);
  });
}

test("no axe violations in dark theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  for (const route of ["/", "/a-day-in-our-home", "/kitchen-sink"]) {
    const results = await scan(page, route);
    expect(results.violations, `${route} in dark theme`).toEqual([]);
  }
});

test("no axe violations at largest text and high contrast", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/services", "/contact"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-text-size", "largest");
      document.documentElement.setAttribute("data-contrast", "high");
    });
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations, `${route} at largest text + high contrast`).toEqual([]);
  }
});

test("skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveText(/skip to main content/i);
  await expect(focused).toHaveAttribute("href", "#main");
});

test("every page has exactly one h1", async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const count = await page.locator("h1").count();
    expect(count, `${route} should have exactly one h1, found ${count}`).toBe(1);
  }
});
