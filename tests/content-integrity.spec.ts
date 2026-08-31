import { expect, test } from "@playwright/test";
import { GATED_ROUTES, INTERNAL_ROUTES, PUBLIC_ROUTES } from "./routes";

/**
 * The content rule, enforced against the rendered HTML.
 *
 * CLAUDE.md forbids publishing any fact the client has not confirmed. This
 * suite checks the actual output rather than trusting that `published()` was
 * called correctly at every call site, a component that hardcodes a phone
 * number or a bed count would sail past the type system.
 *
 * When the client confirms a value, move it to ARTWORK_CONFIRMED in
 * source-of-truth.json and delete the matching line from FORBIDDEN.
 */

/** Strings that must NOT appear anywhere, because nothing confirms them. */
const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /206-499-0849/, why: "phone number is not confirmed (q1)" },
  { pattern: /\(425\)\s*212-XXXX/i, why: "masked placeholder number from the artwork" },
  { pattern: /\btel:/, why: "no call link until a number is confirmed (q1)" },
  { pattern: /\bsix[- ]bed\b/i, why: "capacity is not stated in the artwork (q3)" },
  {
    pattern: /\b6 (beds|bedrooms|residents)\b/i,
    why: "capacity is not stated in the artwork (q3)",
  },
  { pattern: /\bMukilteo\b|\bLynnwood\b|\bMarysville\b/i, why: "only Everett is confirmed (q10)" },
  { pattern: /\bMedicaid\b|\bCOPES\b|Aid & Attendance/i, why: "payment types not confirmed (q6)" },
  { pattern: /\brespite\b|\bhospice\b/i, why: "service not listed in the artwork (q4)" },
  { pattern: /licen[sc]e (number|#)\s*[:#]?\s*\w/i, why: "licence number not supplied (q3)" },
  { pattern: /\bComing soon\b/i, why: "empty sections must render nothing" },
  { pattern: /\bLorem ipsum\b/i, why: "no filler copy, ever" },
  { pattern: /\bTBC\b|\bTBD\b/i, why: "no placeholder markers in published copy" },
];

/** Strings that MUST appear, proving confirmed content really is published. */
const REQUIRED_SOMEWHERE: { pattern: RegExp; label: string }[] = [
  { pattern: /2215 Columbia Ave/, label: "street address" },
  { pattern: /columbiacareafh@gmail\.com/, label: "email" },
  { pattern: /425-212-9108/, label: "fax" },
  { pattern: /Everett/, label: "city" },
];

test("no unconfirmed facts appear on any public page", async ({ page }) => {
  const failures: string[] = [];

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const html = await page.content();

    for (const { pattern, why } of FORBIDDEN) {
      if (pattern.test(html)) {
        failures.push(`${route}: matched ${pattern} ${why}`);
      }
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
});

test("confirmed contact details are actually published", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  const html = await page.content();

  for (const { pattern, label } of REQUIRED_SOMEWHERE) {
    expect(pattern.test(html), `${label} missing from /contact`).toBe(true);
  }
});

test("gated Tier 2 pages return 404 until their data exists", async ({ page }) => {
  for (const route of GATED_ROUTES) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${route} should 404 while its content is unconfirmed`).toBe(404);
  }
});

test("internal review pages are noindex", async ({ page }) => {
  for (const route of INTERNAL_ROUTES) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots, `${route} must be noindex`).toContain("noindex");
  }
});

test("public pages are indexable", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots ?? "index").not.toContain("noindex");
});
