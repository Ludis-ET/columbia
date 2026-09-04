/**
 * The one-page site's sections.
 *
 * Single source of truth for the anchor nav, the scroll-spy, the skip targets
 * and the redirects from the old multi-page routes. Adding a section here wires
 * it into all four.
 *
 * `navLabel` is what appears in the header, kept short, because at the largest
 * reader text size a long label set will not fit.
 */

export interface SiteSection {
  id: string;
  navLabel: string;
  /** Announced heading for the section landmark. */
  title: string;
  /**
   * Shown in the header nav. Contact is excluded: the "Book a house tour"
   * button sits right beside the nav and goes to the same place, so listing it
   * twice is redundant, and at 1024px the pair overflowed the bar.
   */
  inHeaderNav?: boolean;
  /** The old route this replaced, redirected to the anchor. */
  legacyPath?: string;
}

export const sections: SiteSection[] = [
  {
    id: "about",
    navLabel: "About",
    title: "About our home",
    legacyPath: "/about",
    inHeaderNav: true,
  },
  {
    id: "care",
    navLabel: "Care",
    title: "Care and services",
    legacyPath: "/services",
    inHeaderNav: true,
  },
  {
    id: "day",
    navLabel: "A day",
    title: "A day in our home",
    legacyPath: "/a-day-in-our-home",
    inHeaderNav: true,
  },
  {
    id: "home",
    navLabel: "Our home",
    title: "Our home",
    legacyPath: "/our-home",
    inHeaderNav: true,
  },
  {
    id: "meals",
    navLabel: "Meals",
    title: "Meals and dining",
    legacyPath: "/meals",
    inHeaderNav: true,
  },
  { id: "visit", navLabel: "Find us", title: "Where to find us", inHeaderNav: true },
  {
    id: "contact",
    navLabel: "Book a tour",
    title: "Book a house tour",
    legacyPath: "/contact",
    inHeaderNav: false,
  },
];

/** Old multi-page routes → anchors on the one-pager. */
export const legacyRedirects = sections
  .filter((s) => s.legacyPath)
  .map((s) => ({ source: s.legacyPath!, destination: `/#${s.id}` }));

/** Service detail pages folded into the Care section. */
export const legacyServiceRedirect = { source: "/services/:slug", destination: "/#care" };

/** Sections shown in the header nav. Contact is reached by the CTA button. */
export const headerNavSections = sections.filter((s) => s.inHeaderNav);

export type HeaderNavItem =
  | { type: "link"; section: SiteSection }
  | { type: "group"; label: string; sections: SiteSection[] };

function sectionById(id: string): SiteSection {
  const found = sections.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown section: ${id}`);
  return found;
}

/**
 * Desktop header: Care, A day and Meals sit in one disclosure so the bar
 * stays short at 1024px. Mobile still lists every destination.
 */
export const headerNavItems: HeaderNavItem[] = [
  { type: "link", section: sectionById("about") },
  {
    type: "group",
    label: "Care",
    sections: [sectionById("care"), sectionById("day"), sectionById("meals")],
  },
  { type: "link", section: sectionById("home") },
  { type: "link", section: sectionById("visit") },
];
