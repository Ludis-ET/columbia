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
  /** Owner-only sections. Editors do not see these. */
  ownerOnly?: boolean;
  /** Shown as a count badge, resolved by the layout. */
  badge?: "newInquiries";
}

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inquiries", label: "Enquiries", badge: "newInquiries" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/schedule", label: "Daily schedule" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/faqs", label: "Questions & answers" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/settings", label: "Settings", ownerOnly: true },
];

export function navFor(role: "owner" | "editor"): AdminNavItem[] {
  return adminNav.filter((item) => !item.ownerOnly || role === "owner");
}
