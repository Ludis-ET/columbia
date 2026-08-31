import type { Metadata } from "next";

/**
 * Shared /admin wrapper.
 *
 * DELIBERATELY DOES NO AUTH CHECK. The login screen lives at /admin/login, so a
 * layout that redirected unauthenticated visitors would redirect the login page
 * to itself in an infinite loop, which is exactly what happened before this was
 * split.
 *
 * The auth check lives one level down in (console)/layout.tsx, a route group
 * that covers every screen except login. Route groups do not appear in URLs, so
 * the paths are unchanged.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s, Columbia Care admin" },
  robots: { index: false, follow: false, nocache: true },
};

/** Nothing under /admin is ever cached or statically rendered. */
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin className="min-h-dvh">
      {children}
    </div>
  );
}
