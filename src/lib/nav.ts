/**
 * Footer navigation.
 *
 * The site is one page, so the "explore" links are anchors into it. Legal pages
 * remain separate routes, they are reference material, not part of the
 * narrative a family reads, and nobody wants a privacy policy inlined between
 * the gallery and the tour form.
 *
 * Section anchors themselves live in src/lib/sections.ts.
 */

export interface NavItem {
  href: string;
  label: string;
}

export const legalNav: NavItem[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/terms", label: "Terms" },
];
