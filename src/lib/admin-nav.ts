/**
 * Admin console navigation.
 *
 * Ordered by how often the owner actually touches it, not alphabetically or by
 * data model. They log in perhaps twice a month, almost always to change
 * availability or answer an enquiry, so those sit at the top.
 *
 * Labels are in the owner's language, not the schema's: "Photos", not "Media
 * assets"; "Show on the website", not "published".
 */

export interface AdminNavItem {
  href: string;
  label: string;
  group: "today" | "content" | "site";
  /** Owner-only sections. Editors do not see these. */
  ownerOnly?: boolean;
  /** Shown as a count badge, resolved by the layout. */
  badge?: "newInquiries";
}

export const ADMIN_NAV_GROUPS = [
  { id: "today" as const, label: "Today" },
  { id: "content" as const, label: "Website content" },
  { id: "site" as const, label: "Site settings" },
];

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", group: "today" },
  { href: "/admin/inquiries", label: "Enquiries", group: "today", badge: "newInquiries" },
  { href: "/admin/availability", label: "Availability", group: "today" },
  { href: "/admin/copy", label: "Words on the page", group: "content" },
  { href: "/admin/photos", label: "Photos & gallery", group: "content" },
  { href: "/admin/services", label: "Services", group: "content" },
  { href: "/admin/care-types", label: "Care types", group: "content" },
  { href: "/admin/every-day", label: "Included every day", group: "content" },
  { href: "/admin/why-families", label: "Why families choose us", group: "content" },
  { href: "/admin/schedule", label: "Daily schedule", group: "content" },
  { href: "/admin/testimonials", label: "Testimonials", group: "content" },
  { href: "/admin/announcements", label: "Announcements", group: "site", ownerOnly: true },
  { href: "/admin/hours", label: "Opening hours", group: "site", ownerOnly: true },
  { href: "/admin/settings", label: "Settings", group: "site", ownerOnly: true },
];

export function navFor(role: "owner" | "editor"): AdminNavItem[] {
  return adminNav.filter((item) => !item.ownerOnly || role === "owner");
}

/** Nav items grouped for the sidebar. */
export function navGroupsFor(role: "owner" | "editor") {
  const items = navFor(role);
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}
