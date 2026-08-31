"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { primaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Site header.
 *
 * `phone` and `phoneHref` are passed in from a server component that has
 * already run them through published(). They are null until the client confirms
 * which number to publish, and when they are null the call affordances render
 * nothing at all — no placeholder number, ever.
 */
export function Header({ phone, phoneHref }: { phone: string | null; phoneHref: string | null }) {
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on navigation.
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
          aria-label="Columbia Care Adult Family Home — home"
        >
          <Monogram className={cn("transition-all", condensed ? "size-9" : "size-11")} decorative />
          {/* Wordmark hides below md: at the largest reader text size it plus the
              CTA plus the menu button overflow a 640px viewport. The monogram
              alone still identifies the home, and the link keeps its aria-label. */}
          <span className="hidden leading-tight md:block">
            <span className="font-display text-ink block text-[1.05rem] font-semibold">
              Columbia Care
            </span>
            <span className="label text-stone block text-[0.6875rem]">Adult Family Home</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {primaryNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "hover:text-sage-deep inline-flex items-center rounded px-3 py-2 text-[0.95rem] transition-colors",
                      active ? "text-sage-deep font-semibold" : "text-ink-soft",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {/* Below lg the toggle lives in the mobile menu instead — keeping both
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

          <Link
            href="/contact"
            className="bg-ink text-paper hover:bg-sage-deep hidden min-h-12 items-center rounded px-4 font-semibold transition-colors sm:inline-flex"
          >
            Book a house tour
          </Link>

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
        <nav aria-label="Primary, mobile" className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <ul className="flex flex-col">
            {primaryNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center rounded px-2 text-[1.05rem]",
                      active ? "text-sage-deep font-semibold" : "text-ink-soft",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-rule mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <ThemeToggle />
            <Link
              href="/contact"
              className="bg-ink text-paper inline-flex min-h-12 items-center rounded px-4 font-semibold"
            >
              Book a house tour
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
