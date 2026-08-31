import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The console holds families' phone numbers and care details. It is
        // already authenticated and noindex; this is belt and braces.
        disallow: ["/admin", "/admin/", "/specimen", "/kitchen-sink"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
