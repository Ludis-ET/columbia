import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility gate.
 *
 * CLAUDE.md sets WCAG 2.2 AA as a CI gate rather than an aspiration, so this
 * fails the build on any violation. Body text additionally targets 7:1 (AAA),
 * which is verified visually on /specimen — axe checks the AA floor here.
 */

const ROUTES = ["/", "/specimen", "/kitchen-sink", "/nope-404"];

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, url: string) {
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
  await page.emulateMedia({ colorScheme: "dark" });
  const results = await scan(page, "/kitchen-sink");
  expect(results.violations).toEqual([]);
});

test("no axe violations at largest text and high contrast", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-text-size", "largest");
    document.documentElement.setAttribute("data-contrast", "high");
  });
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test("page does not scroll horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ["/", "/kitchen-sink"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});

test("skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toHaveText(/skip to main content/i);
  await expect(focused).toHaveAttribute("href", "#main");
});
