"use client";

import { useEffect, useRef, useState } from "react";
import { scrollToSection } from "@/lib/anchor-nav";
import { headerNavSections, sections } from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * Anchor navigation with scroll-spy.
 *
 * ACCESSIBILITY NOTES, because in-page nav is easy to get wrong:
 *
 *   - Clicking a link MOVES FOCUS to the section, not just the scroll position.
 *     Without that, a keyboard user's next Tab continues from the header and
 *     they never actually reach the content they asked for.
 *   - The active link is marked with aria-current="location" (not "page", *     there is only one page). Screen readers announce it; sighted users get an
 *     underline as well as colour.
 *   - Smooth scrolling is a CSS concern, and globals.css disables it under
 *     prefers-reduced-motion and the toolbar's Reduced setting.
 *   - The observer only updates a local highlight. It never moves focus or
 *     announces anything, so scrolling does not spam assistive tech.
 */
export function SectionNav({
  className,
  onNavigate,
  orientation = "horizontal",
}: {
  className?: string;
  onNavigate?: () => void;
  orientation?: "horizontal" | "vertical";
}) {
  // The horizontal header bar drops Contact (the CTA button covers it); the
  // stacked mobile menu has room for everything.
  const items = orientation === "horizontal" ? headerNavSections : sections;
  const [active, setActive] = useState<string | null>(null);
  const clickedAt = useRef(0);

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Ignore observer noise for a beat after a click, so the highlight does
        // not flicker through every section the smooth scroll passes over.
        if (Date.now() - clickedAt.current < 700) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) setActive(visible[0].target.id);
      },
      // Bias the band toward the upper third: a section counts as "current"
      // once its heading is comfortably on screen, not when its last pixel is.
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (!document.getElementById(id)) return;

    event.preventDefault();
    clickedAt.current = Date.now();
    setActive(id);
    scrollToSection(id);
    onNavigate?.();
  }

  return (
    <ul
      className={cn(
        orientation === "horizontal" ? "flex items-center gap-0.5" : "flex flex-col",
        className,
      )}
    >
      {items.map((section) => {
        const isActive = active === section.id;
        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              onClick={(e) => handleClick(e, section.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "inline-flex items-center rounded transition-colors",
                orientation === "horizontal"
                  ? "px-2.5 py-2 text-[0.95rem]"
                  : "min-h-12 w-full px-2 text-[1.05rem]",
                isActive
                  ? "text-sage-deep font-semibold underline decoration-2 underline-offset-8"
                  : "text-ink-soft hover:text-sage-deep",
              )}
            >
              {section.navLabel}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
