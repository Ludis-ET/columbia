import type { MetadataRoute } from "next";
import { getServicesWithPages } from "@/lib/db/queries";
import { siteUrl } from "@/lib/site-url";

/**
 * Sitemap.
 *
 * Lists only pages that actually render. The admin console and the two internal
 * review pages are excluded, and the Tier 2 routes (/admissions, /faq) stay out
 * until their content exists — submitting a URL that 404s wastes crawl budget
 * and looks broken in Search Console.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const core: { path: string; priority: number; frequency: "weekly" | "monthly" }[] = [
    { path: "/", priority: 1.0, frequency: "weekly" },
    { path: "/contact", priority: 0.9, frequency: "monthly" },
    { path: "/services", priority: 0.8, frequency: "monthly" },
    { path: "/a-day-in-our-home", priority: 0.8, frequency: "monthly" },
    { path: "/our-home", priority: 0.7, frequency: "monthly" },
    { path: "/about", priority: 0.7, frequency: "monthly" },
    { path: "/meals", priority: 0.6, frequency: "monthly" },
    { path: "/privacy", priority: 0.2, frequency: "monthly" },
    { path: "/accessibility", priority: 0.2, frequency: "monthly" },
    { path: "/terms", priority: 0.2, frequency: "monthly" },
  ];

  const services = await getServicesWithPages();

  return [
    ...core.map((entry) => ({
      url: `${siteUrl}${entry.path}`,
      lastModified: now,
      changeFrequency: entry.frequency,
      priority: entry.priority,
    })),
    ...services.map((service) => ({
      url: `${siteUrl}/services/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
