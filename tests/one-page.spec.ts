import { expect, test } from "@playwright/test";
import { LEGACY_REDIRECTS, SECTION_IDS } from "./routes";

/**
 * The single-page site.
 *
 * In-page navigation is easy to get subtly wrong, and the failures are all
 * invisible to a mouse user: the scroll works, but focus is left behind, so a
 * keyboard user's next Tab resumes from the header and they never reach the
 * content they asked for. These cover that.
 */

test("every section anchor exists and is focusable", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  for (const id of SECTION_IDS) {
    const section = page.locator(`#${id}`);
    await expect(section, `#${id} is missing`).toHaveCount(1);
    // tabIndex -1 is what lets the nav move focus here without adding a tab stop.
    await expect(section).toHaveAttribute("tabindex", "-1");
    // A labelled landmark, so screen reader users can jump between sections.
    await expect(section).toHaveAttribute("aria-label", /.+/);
  }
});

test("the page has exactly one h1 and an ordered heading outline", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toHaveCount(1);

  // No level may be skipped, h1 to h3 with no h2 between breaks the outline.
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => Number(h.tagName[1])),
  );
  for (let i = 1; i < levels.length; i += 1) {
    expect(
      levels[i] - levels[i - 1],
      `heading jumps from h${levels[i - 1]} to h${levels[i]}`,
    ).toBeLessThanOrEqual(1);
  }
});

test("clicking a nav link moves focus into the section, not just the scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const nav = page.getByRole("navigation", { name: "Sections of this page" }).first();
  const care = nav.getByRole("button", { name: "Care", exact: true });
  await expect(async () => {
    if ((await care.getAttribute("aria-expanded")) === "true") return;
    await care.click();
    expect(await care.getAttribute("aria-expanded")).toBe("true");
  }).toPass();
  await nav.getByRole("link", { name: "A day", exact: true }).click();

  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId, "focus should land on the section").toBe("day");
});

test("the hero CTA scrolls to the contact section", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.locator("main").getByRole("link", { name: "Book a house tour" }).click();

  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId, "focus should land on the contact section").toBe("contact");
});

test("the active section is marked for assistive technology", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const nav = page.getByRole("navigation", { name: "Sections of this page" }).first();
  const care = nav.getByRole("button", { name: "Care", exact: true });
  await expect(async () => {
    if ((await care.getAttribute("aria-expanded")) === "true") return;
    await care.click();
    expect(await care.getAttribute("aria-expanded")).toBe("true");
  }).toPass();
  await nav.getByRole("link", { name: "Meals", exact: true }).click();
  // aria-current="location", not "page", there is only one page.
  // The Care disclosure is marked current while Meals, A day or Care is in view.
  await expect(
    page.locator('nav[aria-label="Sections of this page"] [aria-current="location"]').first(),
  ).toHaveText("Care");
});

test("old multi-page URLs redirect to their section", async ({ page }) => {
  for (const [from, to] of LEGACY_REDIRECTS) {
    const response = await page.goto(from, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${from} should not 404`).toBe(200);
    const url = new URL(page.url());
    expect(`${url.pathname}${url.hash}`, `${from} should land on ${to}`).toBe(to);
  }
});

test("all the content is present on the one page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const text = await page.locator("body").innerText();

  // One representative string from each of the merged pages.
  for (const needle of [
    "A Place to Feel at Home", // hero
    "family-like environment", // about
    "Medication management", // care
    "Good Morning", // day timeline
    "24-Hour Care", // day timeline, overnight
    "home-cooked meals", // meals
    "2215 Columbia Ave", // visit
    "Send this to Columbia Care", // contact form
    "Download our card", // footer business card
  ]) {
    expect(text, `"${needle}" is missing from the one-pager`).toContain(needle);
  }
});

test("back-to-top appears once the reader is well down the page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const button = page.getByRole("button", { name: /back to top/i });
  await expect(button).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, 3000));
  await expect(button).toBeVisible();
});
