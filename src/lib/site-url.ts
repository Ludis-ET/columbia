/**
 * The site's canonical origin.
 *
 * Order matters: an explicit setting wins, then Vercel's deployment URL, then
 * localhost. Canonical tags and sitemaps pointing at a preview deployment is a
 * real SEO hazard, so set NEXT_PUBLIC_SITE_URL in production.
 */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ??
  "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
