import { SkipLink } from "@/components/site/skip-link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileCallBar } from "@/components/site/mobile-call-bar";
import { AccessibilityToolbar } from "@/components/site/accessibility-toolbar";
import { getSiteSettings } from "@/lib/db/queries";

/**
 * Public site chrome: header, footer, call bar, reading options.
 *
 * This is a SERVER component, and it must stay one.
 *
 * It replaced a client component that called usePathname() only to hide itself
 * under /admin. That component imported Footer, which is an async server
 * component, and pulling a server component into a client boundary turns it
 * into a client component. An async client component is not valid in React, so
 * hydration of this entire subtree failed silently, with no console error.
 *
 * The visible result was most of the website: the theme control and mobile menu
 * did nothing, and every scroll-reveal stayed at opacity 0, so the Care section
 * and the whole day timeline rendered blank.
 *
 * A route group does the same job with no client code at all. The admin console
 * lives outside this group and brings its own shell, so there is nothing to
 * branch on.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Resolved server-side so no child ever receives an unconfirmed value.
  const { phone, telHref: phoneHref, sms } = await getSiteSettings();

  return (
    <>
      <SkipLink />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileCallBar phone={phone} phoneHref={phoneHref} sms={sms} />
      <AccessibilityToolbar />
    </>
  );
}
