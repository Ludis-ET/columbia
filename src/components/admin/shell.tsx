"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  CircleHelp,
  ExternalLink,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { navFor, type AdminNavItem } from "@/lib/admin-nav";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/inquiries": Inbox,
  "/admin/availability": Sparkles,
  "/admin/photos": ImageIcon,
  "/admin/services": Stethoscope,
  "/admin/schedule": CalendarDays,
  "/admin/testimonials": Users,
  "/admin/faqs": CircleHelp,
  "/admin/team": Users,
  "/admin/pages": LayoutDashboard,
  "/admin/settings": Settings,
};

/**
 * Admin chrome — ink sidebar, sage accents, room for photo grids.
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
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item.href);
        const badge = badgeFor(item);
        const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors",
                active
                  ? "bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_0_#7E9E52]"
                  : "text-white/72 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="size-[1.125rem] shrink-0 opacity-90" aria-hidden={true} />
              <span className="flex-1">{item.label}</span>
              {badge ? (
                <span className="label rounded-full bg-[#A93659] px-2 py-0.5 text-[0.625rem] text-white tabular-nums">
                  {badge}
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
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 bg-ink px-4 py-3 lg:hidden">
        <Monogram className="size-8 shrink-0" decorative />
        <span className="font-display font-semibold text-white">Admin</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="admin-nav"
          className="ml-auto inline-flex size-11 items-center justify-center rounded text-white"
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <aside
        id="admin-nav"
        hidden={!open}
        className="border-r border-white/10 bg-ink px-3 pb-6 lg:sticky lg:top-0 lg:!block lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:px-4 lg:py-5"
      >
        <div className="mb-6 hidden items-center gap-3 px-1 lg:flex">
          <Monogram className="size-10 shrink-0" decorative />
          <div className="leading-tight">
            <span className="font-display block text-[1.05rem] font-semibold text-white">
              Columbia Care
            </span>
            <span className="label block text-[0.625rem] text-white/55">Website admin</span>
          </div>
        </div>

        {nav}

        <div className="mt-8 border-t border-white/12 pt-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] text-white/70 hover:bg-white/8 hover:text-white"
          >
            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
            View the website
          </a>

          <div className="mt-3 rounded-md bg-white/6 px-3 py-3">
            <p className="label text-[0.625rem] text-white/45">Signed in as</p>
            <p className="mt-0.5 text-[0.8125rem] break-all text-white/85">{email}</p>
            <p className="label mt-1 text-[0.625rem] text-white/45 capitalize">{role}</p>
          </div>

          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[0.9375rem] text-white/70 hover:bg-white/8 hover:text-white"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:max-w-6xl lg:px-10 lg:py-10">
        {children}
      </main>
    </div>
  );
}
