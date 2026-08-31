import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A section of the one-page site.
 *
 * `tabIndex={-1}` and `scroll-mt` are what make in-page navigation actually
 * work: the first lets SectionNav move focus here so a keyboard user lands in
 * the content rather than continuing from the header, the second stops the
 * sticky header from covering the heading after a jump.
 *
 * Every section is a labelled landmark, so a screen reader user can move
 * between them directly, which on a long single page matters more than it does
 * on a set of short ones.
 */
export function AnchorSection({
  id,
  title,
  children,
  ground = "paper",
  className,
  bleed = false,
}: {
  id: string;
  /** Names the landmark. Usually rendered as the visible h2 by the caller. */
  title: string;
  children: ReactNode;
  ground?: "paper" | "wash" | "ink";
  className?: string;
  /** Full-bleed sections manage their own horizontal padding. */
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-label={title}
      className={cn(
        // Clears the sticky header after an anchor jump.
        "scroll-mt-20 py-16 outline-none sm:py-24",
        ground === "wash" && "bg-sage-wash",
        ground === "ink" && "bg-ink text-paper",
        className,
      )}
    >
      {bleed ? children : <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>}
    </section>
  );
}
