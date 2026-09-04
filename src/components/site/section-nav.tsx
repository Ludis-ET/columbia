"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { scrollToSection } from "@/lib/anchor-nav";
import { headerNavItems, sections, type SiteSection } from "@/lib/sections";
import { cn } from "@/lib/utils";

/**
 * Anchor navigation with scroll-spy.
 *
 * ACCESSIBILITY NOTES, because in-page nav is easy to get wrong:
 *
 *   - Clicking a link MOVES FOCUS to the section, not just the scroll position.
 *     Without that, a keyboard user's next Tab continues from the header and
 *     they never actually reach the content they asked for.
 *   - The active link is marked with aria-current="location" (not "page",
 *     there is only one page). Screen readers announce it; sighted users get an
 *     underline as well as colour.
 *   - The Care control is a disclosure of links, not a menu of actions, so the
 *     destinations stay real <a href="#…"> anchors.
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
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function go(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    if (!document.getElementById(id)) return;

    event.preventDefault();
    clickedAt.current = Date.now();
    setActive(id);
    scrollToSection(id);
    onNavigate?.();
  }

  if (orientation === "vertical") {
    return (
      <ul className={cn("flex flex-col", className)}>
        {headerNavItems.map((item) =>
          item.type === "link" ? (
            <li key={item.section.id}>
              <NavAnchor
                section={item.section}
                active={active === item.section.id}
                onGo={go}
                stacked
              />
            </li>
          ) : (
            <li key={item.label} className="flex flex-col">
              <p className="label text-stone px-2 pt-2 pb-1">{item.label}</p>
              <ul>
                {item.sections.map((section) => (
                  <li key={section.id}>
                    <NavAnchor
                      section={section}
                      label={section.id === "care" ? section.title : section.navLabel}
                      active={active === section.id}
                      onGo={go}
                      stacked
                      inset
                    />
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
    );
  }

  return (
    <ul className={cn("flex items-center gap-0.5", className)}>
      {headerNavItems.map((item) =>
        item.type === "link" ? (
          <li key={item.section.id}>
            <NavAnchor section={item.section} active={active === item.section.id} onGo={go} />
          </li>
        ) : (
          <li key={item.label}>
            <CareDisclosure
              label={item.label}
              sections={item.sections}
              activeId={active}
              onGo={go}
            />
          </li>
        ),
      )}
    </ul>
  );
}

function NavAnchor({
  section,
  label,
  active,
  onGo,
  stacked = false,
  inset = false,
}: {
  section: SiteSection;
  label?: string;
  active: boolean;
  onGo: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
  stacked?: boolean;
  inset?: boolean;
}) {
  return (
    <a
      href={`#${section.id}`}
      onClick={(e) => onGo(e, section.id)}
      aria-current={active ? "location" : undefined}
      className={cn(
        "inline-flex items-center rounded transition-colors",
        stacked ? "min-h-12 w-full px-2 text-[1.05rem]" : "min-h-12 px-2.5 text-[0.95rem]",
        inset && "pl-6",
        active
          ? "text-sage-deep font-semibold underline decoration-2 underline-offset-8"
          : "text-ink-soft hover:text-sage-deep",
      )}
    >
      {label ?? section.navLabel}
    </a>
  );
}

function CareDisclosure({
  label,
  sections: items,
  activeId,
  onGo,
}: {
  label: string;
  sections: SiteSection[];
  activeId: string | null;
  onGo: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const groupActive = items.some((s) => s.id === activeId);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (wrapRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-current={groupActive ? "location" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-12 items-center gap-1 rounded px-2.5 text-[0.95rem] transition-colors",
          groupActive
            ? "text-sage-deep font-semibold underline decoration-2 underline-offset-8"
            : "text-ink-soft hover:text-sage-deep",
        )}
      >
        {label}
        <ChevronDown className={cn("size-4 shrink-0", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <ul
          id={listId}
          className="border-rule bg-paper absolute top-full left-0 z-50 min-w-44 rounded border py-1 shadow-sm"
        >
          {items.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={(e) => {
                  onGo(e, section.id);
                  setOpen(false);
                }}
                aria-current={activeId === section.id ? "location" : undefined}
                className={cn(
                  "flex min-h-12 items-center px-3 text-[0.95rem]",
                  activeId === section.id
                    ? "text-sage-deep font-semibold"
                    : "text-ink-soft hover:text-sage-deep",
                )}
              >
                {section.id === "care" ? section.title : section.navLabel}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
