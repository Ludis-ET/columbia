"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * The site's only scroll animation: a 12px rise and fade, 320ms, optionally
 * staggered. Deliberately restrained, CLAUDE.md allows exactly one
 * orchestrated motion moment (the day timeline) and near-static everywhere else.
 *
 * Motion is suppressed when EITHER the OS asks for reduced motion OR the visitor
 * chose "Reduced" in the accessibility toolbar. Motion's own hook covers the
 * first; useToolbarReducedMotion covers the second.
 */

/** Watches the data-motion attribute set by the accessibility toolbar. */
function useToolbarReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setReduced(root.getAttribute("data-motion") === "reduce");
    read();

    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => observer.disconnect();
  }, []);

  return reduced;
}

export function useAnyReducedMotion(): boolean {
  const system = useReducedMotion();
  const toolbar = useToolbarReducedMotion();
  return Boolean(system) || toolbar;
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  /** Seconds. Stagger siblings by 0.06 to match the house rhythm. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const reduced = useAnyReducedMotion();
  const Component = motion[as];

  if (reduced) {
    // Render the element with no animation at all rather than a 0ms one, so
    // nothing is ever mid-transition when a screen reader reaches it.
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}

/** Convenience wrapper: reveals children in sequence at the house 60ms stagger. */
export function RevealGroup({
  children,
  className,
  step = 0.06,
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
