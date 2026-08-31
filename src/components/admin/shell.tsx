"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Heart,
  ImageIcon,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  PenLine,
  Settings,
  Sparkles,
  Stethoscope,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { AdminFooter } from "@/components/admin/footer";
import { Monogram } from "@/components/brand/monogram";
import { HeartShield } from "@/components/brand/heart-shield";
import { adminNav, navGroupsFor, type AdminNavItem } from "@/lib/admin-nav";
import { inquiryCountLabel, type InquiryCounts } from "@/lib/db/inquiry-counts";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/inquiries": Inbox,
  "/admin/availability": Sparkles,
  "/admin/copy": PenLine,
  "/admin/photos": ImageIcon,
  "/admin/services": Stethoscope,
  "/admin/care-types": Heart,
  "/admin/every-day": ListChecks,
  "/admin/why-families": Heart,
  "/admin/schedule": CalendarDays,
  "/admin/testimonials": Users,
  "/admin/announcements": Megaphone,
  "/admin/hours": Clock,
  "/admin/settings": Settings,
};

/** The 4 most-used actions shown in the mobile bottom tab bar. */
const MOBILE_TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inquiries", label: "Enquiries", icon: Inbox },
  { href: "/admin/photos", label: "Gallery", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function currentPageTitle(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";
  const match = adminNav.find((item) => item.href !== "/admin" && pathname.startsWith(item.href));
  return match?.label ?? "Admin";
}

/**
 * Admin chrome — fixed sidebar, grouped navigation, warm content canvas.
 */
export function AdminShell({
  role,
  email,
  inquiryCounts,
  children,
}: {
  role: "owner" | "editor";
  email: string;
  inquiryCounts: InquiryCounts;
  children: React.ReactNode;
}) {
  const { new: newInquiries, total: totalInquiries } = inquiryCounts;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = navGroupsFor(role);
  const pageTitle = currentPageTitle(pathname);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const badgeFor = (item: AdminNavItem) =>
    item.badge === "newInquiries" && newInquiries > 0 ? newInquiries : null;

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="label mb-2 px-3 text-[0.625rem] tracking-[0.14em] text-white/45 uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const badge = badgeFor(item);
                const Icon = NAV_ICONS[item.href] ?? LayoutDashboard;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] transition-all",
                        active
                          ? "bg-white/14 font-semibold text-white shadow-[inset_3px_0_0_0_#9BBF6A]"
                          : "text-white/75 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                          active
                            ? "bg-[#9BBF6A]/20 text-[#C8E4A0]"
                            : "bg-white/6 text-white/70 group-hover:bg-white/10",
                        )}
                      >
                        <Icon className="size-4" aria-hidden={true} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {badge ? (
                        <span
                          className="label rounded-full bg-[#A93659] px-2 py-0.5 text-[0.625rem] text-white tabular-nums"
                          title={inquiryCountLabel(badge, "new")}
                        >
                          {badge}
                        </span>
                      ) : item.href === "/admin/inquiries" && totalInquiries > 0 ? (
                        <span className="label text-[0.625rem] text-white/45 tabular-nums">
                          {totalInquiries}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  function SidebarFooter() {
    return (
      <div className="mt-auto border-t border-white/10 pt-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-white/75 transition-colors hover:bg-white/8 hover:text-white"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
          View the website
        </a>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/6 p-3">
          <div className="flex items-start gap-2.5">
            <HeartShield className="mt-0.5 size-6 shrink-0 text-[#9BBF6A]" />
            <div className="min-w-0">
              <p className="label text-[0.625rem] text-white/45">Signed in</p>
              <p className="mt-0.5 truncate text-[0.8125rem] font-medium text-white/90">{email}</p>
              <p className="label mt-0.5 text-[0.625rem] text-white/45 capitalize">{role}</p>
            </div>
          </div>
        </div>

        <form action={signOut} className="mt-2">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[0.9375rem] text-white/75 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-paper-sunk min-h-dvh lg:flex">
      {/* Mobile top bar */}
      <header className="border-rule bg-paper/95 sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="text-ink inline-flex size-11 items-center justify-center rounded-lg"
        >
          <Menu className="size-5" aria-hidden="true" />
          <span className="sr-only">Open menu</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="label text-sage-deep text-[0.625rem]">Columbia Care</p>
          <p className="text-ink truncate font-semibold">{pageTitle}</p>
        </div>
        {newInquiries > 0 ? (
          <Link
            href="/admin/inquiries"
            className="label rounded-full bg-[#A93659] px-2.5 py-1 text-[0.6875rem] text-white tabular-nums"
            title={inquiryCountLabel(newInquiries, "need-reply")}
          >
            {inquiryCountLabel(newInquiries, "new")}
          </Link>
        ) : totalInquiries > 0 ? (
          <Link
            href="/admin/inquiries"
            className="label text-sage-deep rounded-full border border-sage/30 bg-sage-wash px-2.5 py-1 text-[0.6875rem] tabular-nums"
          >
            {inquiryCountLabel(totalInquiries)}
          </Link>
        ) : null}
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" id="admin-drawer">
          <button
            type="button"
            className="admin-scrim absolute inset-0 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="admin-sidebar relative flex h-full w-[min(100%,18rem)] min-h-0 flex-col px-4 py-5 shadow-2xl">
            <div className="mb-6 flex shrink-0 items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Monogram className="size-9 shrink-0" decorative />
                <span className="font-display font-semibold text-white">Columbia Care</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-11 items-center justify-center rounded-lg text-white/80"
              >
                <X className="size-5" aria-hidden="true" />
                <span className="sr-only">Close menu</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="shrink-0">
              <SidebarFooter />
            </div>
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="admin-sidebar hidden w-72 shrink-0 flex-col border-r border-white/10 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <Monogram className="size-10 shrink-0" decorative />
            <div className="leading-tight">
              <span className="font-display block text-[1.05rem] font-semibold text-white">
                Columbia Care
              </span>
              <span className="label block text-[0.625rem] text-white/50">Website admin</span>
            </div>
          </div>
          {newInquiries > 0 ? (
            <Link
              href="/admin/inquiries"
              className="mt-4 flex items-center gap-2 rounded-lg border border-[#A93659]/40 bg-[#A93659]/15 px-3 py-2 text-[0.8125rem] text-white transition-colors hover:bg-[#A93659]/25"
            >
              <Inbox className="size-4 shrink-0" aria-hidden="true" />
              <span>{inquiryCountLabel(newInquiries, "need-reply")}</span>
            </Link>
          ) : totalInquiries > 0 ? (
            <Link
              href="/admin/inquiries"
              className="mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-[0.8125rem] text-white/85 transition-colors hover:bg-white/10"
            >
              <Inbox className="size-4 shrink-0" aria-hidden="true" />
              <span>{inquiryCountLabel(totalInquiries)} in your inbox</span>
            </Link>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <NavLinks />
          </div>
          <div className="shrink-0">
            <SidebarFooter />
          </div>
        </div>
      </aside>

      {/* Main canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-rule bg-paper/80 hidden border-b px-8 py-4 lg:block">
          <p className="label text-sage-deep mb-1">You are here</p>
          <h1 className="text-h3 font-sans font-bold">{pageTitle}</h1>
        </div>
        <main
          id="main"
          className="relative mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:min-h-[calc(100dvh-5.5rem)] lg:px-10 lg:py-8 lg:pb-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--sage-wash)_85%,transparent),transparent)]"
          />
          <div className="relative">{children}</div>
        </main>
        <AdminFooter />
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Quick navigation"
        className="border-rule bg-paper/95 fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t backdrop-blur lg:hidden"
      >
        {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          const isInquiries = href === "/admin/inquiries";
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.6875rem] font-medium transition-colors",
                active ? "text-sage-deep" : "text-stone",
              )}
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {isInquiries && newInquiries > 0 ? (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#A93659] text-[0.5rem] font-bold text-white tabular-nums">
                    {newInquiries > 9 ? "9+" : newInquiries}
                  </span>
                ) : null}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
