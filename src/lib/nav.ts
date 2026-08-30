/**
 * Site navigation.
 *
 * Only Tier 1 routes appear here — the pages buildable entirely from the
 * client's artwork. Tier 2 (Admissions, FAQ, care-fit quiz, Resources) is added
 * as the answers in docs/client-questions.md come back.
 */

export interface NavItem {
  href: string;
  label: string;
}

export const primaryNav: NavItem[] = [
  { href: "/about", label: "About Us" },
  { href: "/services", label: "Care & Services" },
  { href: "/a-day-in-our-home", label: "A Day in Our Home" },
  { href: "/our-home", label: "Our Home" },
  { href: "/meals", label: "Meals" },
  { href: "/contact", label: "Contact" },
];

export const legalNav: NavItem[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/terms", label: "Terms" },
];
