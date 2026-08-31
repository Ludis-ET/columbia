import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The tour request form.
 *
 * These tests are deliberately NON-MUTATING. A genuine submission writes a row
 * to the client's live enquiry inbox, so the only success path exercised here
 * is the honeypot one — which returns the same confirmation to a bot but never
 * inserts anything. Everything else is validation, which also never inserts.
 *
 * Testing the real insert belongs in a seeded staging project, not against the
 * inbox the owner actually reads.
 */

const FORM = "/contact";

test("the form is properly labelled and reachable", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel(/your name/i)).toBeVisible();
  await expect(page.getByLabel(/phone number/i)).toBeVisible();
  await expect(page.getByLabel(/email address/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /send this to columbia care/i })).toBeVisible();
});

test("an empty submission is rejected and the error is announced", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /send this to columbia care/i }).click();

  // Announced in an assertive live region, not signalled by colour alone.
  const alert = page.locator('form [aria-live="assertive"]');
  await expect(alert).toContainText(/check the highlighted fields/i, { timeout: 15000 });

  const nameError = page.getByText(/please tell us your name/i);
  await expect(nameError).toBeVisible();
});

test("a name with no way to reply is refused", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/your name/i).fill("Test Person");
  await page.getByRole("button", { name: /send this to columbia care/i }).click();

  await expect(page.getByText(/either a phone number or an email address/i)).toBeVisible({
    timeout: 15000,
  });
});

test("a badly formatted email is caught", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/your name/i).fill("Test Person");
  await page.getByLabel(/email address/i).fill("not-an-email");
  await page.getByRole("button", { name: /send this to columbia care/i }).click();

  await expect(page.getByText(/check that email address/i)).toBeVisible({ timeout: 15000 });
});

/**
 * Phone-format tolerance is covered by src/lib/forms/tour-request.test.ts.
 * It lives there rather than here because an end-to-end submission writes a real
 * row to the client's enquiry inbox, and a unit test over the shared schema is
 * both faster and more thorough.
 */

test("the honeypot swallows bots without saving anything", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });

  // The field is off-screen and aria-hidden; a bot fills it, a person cannot.
  await page.locator('input[name="company"]').fill("SpamCo");
  await page.getByLabel(/your name/i).fill("Bot Submission");
  await page.getByLabel(/phone number/i).fill("5555555555");
  await page.getByRole("button", { name: /send this to columbia care/i }).click();

  // Answers as if it worked — telling a bot it was caught only helps it adapt.
  await expect(page.getByRole("status")).toContainText(/thank you/i, { timeout: 15000 });
});

test("the honeypot is hidden from assistive technology", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });
  const honeypot = page.locator('input[name="company"]');
  await expect(honeypot).toHaveAttribute("tabindex", "-1");
  const hiddenFromAt = await honeypot.evaluate((el) => Boolean(el.closest('[aria-hidden="true"]')));
  expect(hiddenFromAt, "honeypot must sit inside an aria-hidden container").toBe(true);
});

test("no axe violations on the form, including its error state", async ({ page }) => {
  await page.goto(FORM, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /send this to columbia care/i }).click();
  await expect(page.locator('form [aria-live="assertive"]')).toContainText(
    /check the highlighted/i,
    {
      timeout: 15000,
    },
  );

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  if (results.violations.length) console.log(JSON.stringify(results.violations, null, 2));
  expect(results.violations).toEqual([]);
});
