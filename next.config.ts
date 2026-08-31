import type { NextConfig } from "next";
import { legacyRedirects, legacyServiceRedirect } from "./src/lib/sections";

const nextConfig: NextConfig = {
  async redirects() {
    // The site was multi-page during development. Anything that linked or
    // bookmarked those URLs lands on the right section instead of a 404, and
    // any search equity they picked up transfers.
    return [
      ...legacyRedirects.map((r) => ({ ...r, permanent: true })),
      { ...legacyServiceRedirect, permanent: true },
    ];
  },

  images: {
    remotePatterns: [
      // Photographs served from Supabase Storage once real ones are uploaded.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
