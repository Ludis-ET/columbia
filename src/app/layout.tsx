import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { SkipLink } from "@/components/site/skip-link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileCallBar } from "@/components/site/mobile-call-bar";
import { AccessibilityToolbar } from "@/components/site/accessibility-toolbar";
import { preferencesScript } from "@/lib/preferences";
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
  // Resolved server-side so no child ever receives an unconfirmed value.
  const phone = published(contact.phonePrimary);
  const phoneHref = telHref();
  const sms = published(contact.sms);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies stored theme and reader preferences before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body className={`${fontVariables} flex min-h-dvh flex-col antialiased`}>
        <SkipLink />
        <Header phone={phone} phoneHref={phoneHref} />
        <main id="main" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <Footer />
        <MobileCallBar phone={phone} phoneHref={phoneHref} sms={sms} />
        <AccessibilityToolbar />
      </body>
    </html>
  );
}
