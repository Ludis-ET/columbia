"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { AnchorLink } from "@/components/site/anchor-link";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { SectionNav } from "@/components/site/section-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Site header.
 *
 * The site is one page, so the nav is anchors with a scroll-spy rather than
 * routes. On the legal pages, which are still separate, the anchors would
 * point nowhere, so they become links back to the home page instead.
 *
 * `phone` and `phoneHref` come from a server component that has already run
 * them through the content gate. They are null until the client confirms which
 * number to publish, and when null the call affordances render nothing at all.
 */
export function Header({ phone, phoneHref }: { phone: string | null; phoneHref: string | null }) {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const pathname = usePathname();

  const onePager = pathname === "/";

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "bg-paper/95 border-rule sticky top-0 z-50 border-b backdrop-blur transition-shadow",
        condensed && "shadow-sm",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 py-3"
          aria-label="Columbia Care Adult Family Home, home"
        >
          <Monogram className={cn("transition-all", condensed ? "size-9" : "size-11")} decorative />
          {/* Wordmark hides below md: at the largest reader text size it plus the
              CTA plus the menu button overflow a 640px viewport. */}
          <span className="hidden leading-tight md:block">
            <span className="font-display text-ink block text-[1.05rem] font-semibold">
              Columbia Care
            </span>
            <span className="label text-stone block text-[0.6875rem]">Adult Family Home</span>
          </span>
        </Link>

        <nav aria-label="Sections of this page" className="ml-auto hidden lg:block">
          {onePager ? (
            <SectionNav />
          ) : (
            <Link href="/" className="text-ink-soft hover:text-sage-deep px-3 py-2 text-[0.95rem]">
              Back to the home page
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Below lg the toggle lives in the mobile menu instead, keeping both
              overflows the bar at the largest reader text size. */}
          <ThemeToggle className="hidden lg:inline-flex" />

          {phone && phoneHref ? (
            <a
              href={phoneHref}
              className="text-ink-soft hover:text-sage-deep hidden items-center gap-2 rounded px-2 py-2 font-medium xl:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" strokeWidth={2} />
              {phone}
            </a>
          ) : null}

          <AnchorLink
            sectionId="contact"
            // Tighter horizontal padding between lg and xl: the nav, toggle and
            // this button together were 5px over a 1024px viewport. Height stays
            // at 48px, the target-size floor is not negotiable, the padding is.
            className={cn(
              buttonVariants({ size: "default" }),
              "hidden px-4 sm:inline-flex xl:px-6",
            )}
          >
            Book a house tour
          </AnchorLink>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="text-ink inline-flex size-12 items-center justify-center rounded lg:hidden"
          >
            {open ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <div id="mobile-nav" hidden={!open} className="border-rule bg-paper-raise border-t lg:hidden">
        <nav
          aria-label="Sections of this page, mobile"
          className="mx-auto max-w-6xl px-4 py-3 sm:px-6"
        >
          {onePager ? (
            <SectionNav orientation="vertical" onNavigate={() => setOpen(false)} />
          ) : (
            <Link href="/" className="text-ink-soft flex min-h-12 items-center px-2 text-[1.05rem]">
              Back to the home page
            </Link>
          )}

          <div className="border-rule mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <ThemeToggle />
            <AnchorLink
              sectionId="contact"
              onNavigate={() => setOpen(false)}
              className={buttonVariants({ size: "default" })}
            >
              Book a house tour
            </AnchorLink>
          </div>
        </nav>
      </div>
    </header>
  );
}
