import type { ReactNode } from "react";
import { REVEAL_STAGGER } from "@/lib/reveal";

/**
 * The site's one scroll animation: a 12px rise and fade, 320ms, optionally
 * staggered.
 *
 * This is a SERVER component and ships no JavaScript. It only marks the element
 * with `data-reveal`; the hidden state, the transition and the observer all live
 * in CSS plus one small inlined script (src/lib/reveal.ts), so a React problem
 * can never leave content invisible again. See the note in that file.
 *
 * Reduced motion is handled at the source: the script does not arm the hidden
 * state at all when the OS or the Reading options panel asks for less motion,
 * so the content is simply there with no transition.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  /** Seconds. Stagger siblings with `index * REVEAL_STAGGER`. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  return (
    <Component
      data-reveal=""
      suppressHydrationWarning
      className={className}
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
    >
      {children}
    </Component>
  );
}

/** Reveals children in sequence at the house 60ms stagger. */
export function RevealGroup({
  children,
  className,
  step = REVEAL_STAGGER,
}: {
  children: ReactNode[];
  className?: string;
  step?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <Reveal key={index} delay={index * step}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
