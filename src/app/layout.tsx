import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { HashScroll } from "@/components/site/hash-scroll";
import { SiteChrome } from "@/components/site/site-chrome";
import { preferencesScript } from "@/lib/preferences";
import { identity, published, siteName } from "@/lib/content";
import { getSiteSettings } from "@/lib/db/queries";
import { OrganisationJsonLd } from "@/components/seo/structured-data";
import { siteUrl } from "@/lib/site-url";

const description =
  published(identity.about) ??
  "An adult family home in Everett, Washington providing 24-hour care in a family-like environment.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Everett, WA`,
    template: `%s, Columbia Care Adult Family Home | Everett, WA`,
  },
  description,
  applicationName: siteName,
  formatDetection: { telephone: true, address: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName,
    locale: "en_US",
    url: siteUrl,
    title: `${siteName} | Everett, WA`,
    description,
  },
  twitter: { card: "summary_large_image", title: siteName, description },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#10171C" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved server-side so no child ever receives an unconfirmed value.
  const { phone, telHref: phoneHref, sms } = await getSiteSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies stored theme and reader preferences before first paint. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: preferencesScript }} />
        {/* Emitted from live data, and only for fields the client has confirmed, a guessed phone number here would be shown as fact in search results. */}
        <OrganisationJsonLd />
      </head>
      <body className={`${fontVariables} flex min-h-dvh flex-col antialiased`}>
        <HashScroll />
        <SiteChrome phone={phone} phoneHref={phoneHref} sms={sms}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
