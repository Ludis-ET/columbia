"use client";

import { usePathname } from "next/navigation";
import { SkipLink } from "@/components/site/skip-link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileCallBar } from "@/components/site/mobile-call-bar";
import { AccessibilityToolbar } from "@/components/site/accessibility-toolbar";

/**
 * Public marketing chrome — header, footer, call bar, a11y toolbar.
 * Omitted entirely under /admin so the console uses its own shell.
 */
export function SiteChrome({
  phone,
  phoneHref,
  sms,
  children,
}: {
  phone: string | null;
  phoneHref: string | null;
  sms: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return children;
  }

  return (
    <>
      <SkipLink />
      <Header phone={phone} phoneHref={phoneHref} />
      <main id="main" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileCallBar phone={phone} phoneHref={phoneHref} sms={sms} />
      <AccessibilityToolbar />
    </>
  );
}
