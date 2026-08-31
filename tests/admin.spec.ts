import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES } from "./routes";

/**
 * Admin access control.
 *
 * Middleware does the redirect, but RLS is the real boundary: even a forged
 * cookie gets an empty result set from Postgres. These tests cover the visible
 * behaviour: signed-out visitors never reach a console screen, and nothing
 * under /admin is ever indexable.
 */

test("signed-out visitors are redirected to the login screen", async ({ page }) => {
  for (const route of ADMIN_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname, `${route} should redirect to login`).toBe("/admin/login");
  }
});

test("no admin content leaks to a signed-out visitor", async ({ page }) => {
  // Sentinels must appear ONLY inside the authenticated shell. "Website admin"
  // is not one: it is the subtitle on the login screen too, so following the
  // redirect finds it legitimately.
  const CONSOLE_ONLY = ["Sign out", "Enquiry pipeline", "View the website", "Availability"];

  for (const route of ADMIN_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const html = await page.content();
    for (const sentinel of CONSOLE_ONLY) {
      expect(html, `${route} leaked console content: "${sentinel}"`).not.toContain(sentinel);
    }
  }
});

test("the login screen is reachable and noindex", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Columbia Care" })).toBeVisible();
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toContain("noindex");
});

test("the login form is usable by keyboard and properly labelled", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await page.getByLabel("Email address").fill("nobody@example.invalid");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Vague on purpose: must not reveal whether the account exists.
  await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 15000 });
});
