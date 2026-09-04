"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { houseTransition } from "@/lib/motion";

/**
 * Reduced motion is on if the OS asks, or if the reader picked Reduced in
 * Reading options (`data-motion="reduce"`). MotionConfig then collapses every
 * descendant animation to an instant state change.
 */
export function useHouseReducedMotion(): boolean {
  const os = useReducedMotion();
  const [pref, setPref] = useState(false);

  useEffect(() => {
    const read = () => document.documentElement.getAttribute("data-motion") === "reduce";
    setPref(read());
    const observer = new MutationObserver(() => setPref(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    return () => observer.disconnect();
  }, []);

  return Boolean(os || pref);
}

export function HouseMotion({ children }: { children: ReactNode }) {
  const reduce = useHouseReducedMotion();

  return (
    <MotionConfig reducedMotion={reduce ? "always" : "never"} transition={houseTransition}>
      {children}
    </MotionConfig>
  );
}
