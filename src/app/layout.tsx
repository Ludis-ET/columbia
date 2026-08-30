import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { SkipLink } from "@/components/site/skip-link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { themeScript } from "@/components/site/theme-toggle";
import { contact, identity, published, siteName, telHref } from "@/lib/content";

const description =
  published(identity.about) ??
  "An adult family home in Everett, Washington providing 24-hour care in a family-like environment.";

export const metadata: Metadata = {
  title: {
    default: `${siteName} | Everett, WA`,
    template: `%s — Columbia Care Adult Family Home | Everett, WA`,
  },
  description,
  applicationName: siteName,
  formatDetection: { telephone: true, address: true },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#10171C" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolved server-side so the header never receives an unconfirmed value.
  const phone = published(contact.phonePrimary);
  const phoneHref = telHref();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies a stored theme before first paint — avoids a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${fontVariables} flex min-h-dvh flex-col antialiased`}>
        <SkipLink />
        <Header phone={phone} phoneHref={phoneHref} />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
