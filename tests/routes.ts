/**
 * Shared route lists for the test suite.
 *
 * Not a spec file — Playwright refuses to let spec files import one another,
 * and this needs to be shared by the a11y, responsive and content suites.
 */

/** Every publicly reachable, indexable route. */
export const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/services",
  "/services/long-term-care",
  "/services/memory-care",
  "/services/personal-care",
  "/services/medication-management",
  "/a-day-in-our-home",
  "/our-home",
  "/meals",
  "/contact",
  "/privacy",
  "/accessibility",
  "/terms",
];

/** Internal review pages — built, but noindex and excluded from the sitemap. */
export const INTERNAL_ROUTES = ["/specimen", "/kitchen-sink"];

/**
 * Tier 2 routes whose shells exist but whose content is still gated on client
 * answers. These must 404 until source-of-truth.json is filled in.
 */
export const GATED_ROUTES = ["/admissions", "/faq"];

/**
 * Admin console. Signed-out visitors must be redirected to the login screen,
 * and none of these may ever be indexable.
 */
export const ADMIN_ROUTES = [
  "/admin",
  "/admin/inquiries",
  "/admin/availability",
  "/admin/photos",
  "/admin/services",
  "/admin/schedule",
  "/admin/testimonials",
  "/admin/faqs",
  "/admin/team",
  "/admin/pages",
  "/admin/settings",
];
