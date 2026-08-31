"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { navFor, type AdminNavItem } from "@/lib/admin-nav";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

/**
 * Admin chrome: ink-navy sidebar, same brand, denser than the public site.
 *
 * The sidebar is navy in every theme — it is a working tool, and a fixed dark
 * rail keeps the content area unambiguous. Everything inside the content area
 * still themes normally.
 */
export function AdminShell({
  role,
  email,
  newInquiries,
  children,
}: {
  role: "owner" | "editor";
  email: string;
  newInquiries: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = navFor(role);

  const badgeFor = (item: AdminNavItem) =>
    item.badge === "newInquiries" && newInquiries > 0 ? newInquiries : null;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const nav = (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(item.href);
        const badge = badgeFor(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-between gap-2 rounded px-3 text-[0.9375rem] transition-colors",
                active
                  ? "border-l-2 border-[#7E9E52] bg-white/12 pl-2.5 font-semibold text-white"
                  : "text-white/70 hover:bg-white/8 hover:text-white",
              )}
            >
              {item.label}
              {badge ? (
                <span className="label rounded-full bg-[#A93659] px-1.5 py-0.5 text-[0.625rem] text-white">
                  {badge}
                  <span className="sr-only"> unanswered</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="bg-paper-sunk flex min-h-dvh flex-col lg:flex-row">
      {/* Mobile bar — the owner really does update availability from a phone. */}
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-[#10254A] px-4 py-2 lg:hidden">
        <Monogram className="size-8 shrink-0" decorative />
        <span className="font-display font-semibold text-white">Columbia Care</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="ml-auto inline-flex size-11 items-center justify-center rounded text-white"
        >
          {open ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <aside
        id="admin-nav"
        hidden={!open}
        className="bg-[#10254A] px-3 pb-4 lg:sticky lg:top-0 lg:!block lg:h-dvh lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:px-3 lg:py-4"
      >
        <div className="mb-4 hidden items-center gap-2.5 px-2 lg:flex">
          <Monogram className="size-9 shrink-0" decorative />
          <span className="leading-tight">
            <span className="font-display block font-semibold text-white">Columbia Care</span>
            <span className="label block text-[0.625rem] text-white/60">Website admin</span>
          </span>
        </div>

        {nav}

        <div className="mt-6 border-t border-white/15 pt-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-2 rounded px-3 text-[0.9375rem] text-white/70 hover:text-white"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View the website
            <span className="sr-only"> (opens in a new tab)</span>
          </a>

          <p className="px-3 pt-3 text-[0.75rem] break-all text-white/50">{email}</p>

          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-[0.9375rem] text-white/70 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}
