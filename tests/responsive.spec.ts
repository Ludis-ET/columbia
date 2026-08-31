import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

/**
 * Responsive pass.
 *
 * CLAUDE.md requires the layout to survive 320px width and 200% zoom with no
 * horizontal scroll. 320px is the real floor, an older phone with the system
 * text size turned up.
 */

const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

test.describe("no horizontal overflow", () => {
  for (const width of WIDTHS) {
    test(`at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} at ${width}px overflows by ${overflow}px`).toBeLessThanOrEqual(
          0,
        );
      }
    });
  }
});

test("survives 200% zoom without horizontal scroll", async ({ page }) => {
  // Emulating 200% zoom: halve the viewport, keep the same CSS pixel budget.
  await page.setViewportSize({ width: 640, height: 720 });
  for (const route of ["/", "/services", "/a-day-in-our-home", "/contact"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.documentElement.setAttribute("data-text-size", "largest"));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route} overflows at 200% zoom by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});
