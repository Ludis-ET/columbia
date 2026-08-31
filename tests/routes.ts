/**
 * Shared route lists for the test suite.
 *
 * Not a spec file, Playwright refuses to let spec files import one another,
 * and this needs to be shared by the a11y, responsive and content suites.
 */

/**
 * Every publicly reachable, indexable route.
 *
 * The marketing site is a single page; the legal pages stay separate because
 * they are reference material rather than part of the narrative.
 */
export const PUBLIC_ROUTES = ["/", "/privacy", "/accessibility", "/terms"];

/** Anchors on the one-pager, and the old routes that now redirect to them. */
export const SECTION_IDS = ["about", "care", "day", "home", "meals", "visit", "contact"];

export const LEGACY_REDIRECTS: [string, string][] = [
  ["/about", "/#about"],
  ["/services", "/#care"],
  ["/a-day-in-our-home", "/#day"],
  ["/our-home", "/#home"],
  ["/meals", "/#meals"],
  ["/contact", "/#contact"],
  ["/services/memory-care", "/#care"],
];

/** Internal review pages, built, but noindex and excluded from the sitemap. */
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
  "/admin/copy",
  "/admin/photos",
  "/admin/services",
  "/admin/care-types",
  "/admin/every-day",
  "/admin/why-families",
  "/admin/schedule",
  "/admin/testimonials",
  "/admin/faqs",
  "/admin/team",
  "/admin/pages",
  "/admin/settings",
];
