"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import { houseTransition } from "@/lib/motion";
import { useHouseReducedMotion } from "@/components/motion/house";
import { REVEAL_STAGGER } from "@/lib/reveal";

/**
 * Section scroll reveal, in `motion`, without the failure mode.
 *
 * Server HTML is visible (`initial={false}`, armed only after mount). If React
 * never hydrates, the section stays on screen. Reduced motion and a 3s rescue
 * timeout both force the visible state, so a family can never lose Care, the
 * day timeline, or the tour form to a stuck animation.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Seconds. Stagger siblings with `index * REVEAL_STAGGER`. */
  delay?: number;
  className?: string;
}) {
  const reduce = useHouseReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const [armed, setArmed] = useState(false);
  const [rescue, setRescue] = useState(false);

  useEffect(() => {
    if (reduce) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setArmed(true));
    });
    const timer = window.setTimeout(() => setRescue(true), 3000);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [reduce]);

  const hidden = armed && !reduce && !inView && !rescue;

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={false}
      animate={hidden ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      transition={{ ...houseTransition, delay: hidden ? 0 : delay }}
    >
      {children}
    </motion.div>
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
