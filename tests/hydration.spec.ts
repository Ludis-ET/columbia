import { expect, test } from "@playwright/test";

/**
 * Hydration and content visibility.
 *
 * These exist because a client component once imported an async server
 * component, which silently broke hydration for the whole public site. The
 * markup stayed perfect, so axe, the content checks and the responsive suite all
 * passed while the theme control did nothing and 34 elements sat invisible.
 *
 * The lesson: asserting on the DOM is not enough. These assert on BEHAVIOUR.
 */

test("client components hydrate and respond", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1200);

  // Theme control is the cheapest proof that a handler runs.
  await page.getByRole("button", { name: "Dark", exact: true }).first().click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")), {
      timeout: 5000,
    })
    .toBe("dark");

  // And that the choice survives a reload, which proves the pre-paint script too.
  await page.reload({ waitUntil: "load" });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
    .toBe("dark");
});

test("the mobile menu opens", async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 900 });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: /open menu/i }).click();
  await expect(page.locator('button[aria-expanded="true"]')).toHaveCount(1);
});

test("reading options opens", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: /reading options/i }).click();
  await expect(page.getByRole("dialog", { name: /reading options/i })).toBeVisible();
});

test("no content is left invisible once the page has been read", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  // Scroll the whole page the way a reader would. Elements below the fold are
  // SUPPOSED to still be hidden, so the assertion only makes sense once
  // everything has had its chance to enter the viewport.
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }),
      y,
    );
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(900);

  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll("[data-reveal]")]
      .filter((el) => Number(getComputedStyle(el as HTMLElement).opacity) < 0.9)
      .map((el) => `${el.tagName} "${(el.textContent || "").trim().slice(0, 40)}"`)
      .slice(0, 6),
  );

  expect(hidden, "content stayed invisible after the whole page was scrolled").toEqual([]);
});

test("content is visible even when the reveal script never runs", async ({ page }) => {
  // The failure mode that broke the site: if the mechanism dies, content must
  // still be readable. Simulate it by stripping the class that arms the CSS.
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => document.documentElement.classList.remove("reveal-ready"));
  await page.waitForTimeout(300);

  const hidden = await page.evaluate(
    () =>
      [...document.querySelectorAll("[data-reveal]")].filter(
        (el) => Number(getComputedStyle(el as HTMLElement).opacity) < 0.9,
      ).length,
  );
  expect(hidden, "content must be visible when the reveal never arms").toBe(0);
});
