"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { houseTransition } from "@/lib/motion";
import { useHouseReducedMotion } from "@/components/motion/house";

/**
 * A 3px rise on hover. Content is visible without JavaScript; this only
 * polishes pointer interaction. Reduced motion disables the lift.
 */
export function MotionLift({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useHouseReducedMotion();

  return (
    <motion.div
      className={cn("h-full", className)}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={houseTransition}
    >
      {children}
    </motion.div>
  );
}
