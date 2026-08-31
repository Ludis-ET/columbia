import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

/**
 * Sitemap.
 *
 * The marketing site is a single page, so there is one entry for it plus the
 * legal routes, which stay separate. The admin console, the two internal review
 * pages and the Tier 2 routes that still 404 are all excluded, submitting URLs
 * that 404 wastes crawl budget and looks broken in Search Console.
 *
 * Section anchors are deliberately NOT listed. Google treats `/#care` as the
 * same URL as `/`, so listing them adds noise without adding coverage.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    {
      url: `${siteUrl}/accessibility`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
