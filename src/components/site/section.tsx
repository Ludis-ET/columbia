import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Section shell. Sections are separated by alternating grounds rather than card
 * shadows, see CLAUDE.md.
 */
export function Section({
  children,
  ground = "paper",
  className,
  id,
  labelledBy,
}: {
  children: ReactNode;
  ground?: "paper" | "wash" | "ink";
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "py-16 sm:py-24",
        ground === "wash" && "bg-sage-wash",
        ground === "ink" && "bg-ink text-paper",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

/**
 * Section heading with an optional mono eyebrow.
 *
 * `eyebrow` is a label, not a heading, it stays a <p> so the heading outline
 * remains honest for screen readers.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  align = "start",
  level = 2,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string | null;
  id?: string;
  align?: "start" | "center";
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <div className={cn("mb-10", align === "center" && "mx-auto max-w-3xl text-center", className)}>
      {eyebrow ? <p className="label text-sage-deep mb-3">{eyebrow}</p> : null}
      <Heading id={id} className={level === 2 ? "text-h2" : "text-h3"}>
        {title}
      </Heading>
      {lead ? (
        <p
          className={cn(
            "text-lead text-ink-soft mt-4 max-w-[62ch]",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

/** Running text at a comfortable measure. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("max-w-[68ch] space-y-4 [&_a]:underline [&_a]:underline-offset-2", className)}
    >
      {children}
    </div>
  );
}
