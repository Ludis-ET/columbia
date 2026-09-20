"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HeartShield } from "@/components/brand/heart-shield";
import { MotionLift } from "@/components/motion/lift";
import { cn } from "@/lib/utils";

export interface CollapsibleReasonsProps {
  reasons: string[];
}

/**
 * Collapsible accordion/dropdown menu for the 4 reasons underneath "Who we are".
 *
 * Responsive behavior:
 * - On mobile (< 768px): Starts collapsed by default to save multiple screens of
 *   vertical scroll. Tapping the header smoothly drops down the 4 highlight cards.
 * - On desktop (>= 768px): Starts expanded by default so full content is immediately
 *   visible, while retaining the toggle button to collapse if desired.
 * - Initial state uses CSS classes (hidden md:block) to prevent any layout shifts or
 *   SSR hydration mismatches on first paint.
 */
export function CollapsibleReasons({ reasons }: CollapsibleReasonsProps) {
  const [userState, setUserState] = useState<boolean | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const contentId = useId();

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  if (reasons.length === 0) return null;

  const isOpen = userState !== null ? userState : isDesktop;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Dropdown toggle header */}
      <button
        type="button"
        onClick={() => setUserState(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="border-rule bg-paper-raise hover:border-sage group flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 text-left shadow-xs transition-all hover:shadow-sm sm:p-5"
      >
        <div className="flex items-center gap-3.5">
          <div className="bg-sage-wash text-sage-deep flex size-10 shrink-0 items-center justify-center rounded-lg">
            <HeartShield className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-ink font-sans text-base font-bold sm:text-lg">
                Why families choose our home
              </span>
              <span className="bg-sage-wash text-sage-deep hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-block">
                {reasons.length} highlights
              </span>
            </div>
            <p className="text-ink-soft text-xs sm:text-sm">
              {isOpen ? "Tap to collapse" : "Tap to view staff, home & care highlights"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sage-deep text-xs font-semibold sm:hidden">
            {isOpen ? "Hide" : "Show (4)"}
          </span>
          <div
            className={cn(
              "border-rule text-ink-soft group-hover:border-sage group-hover:text-sage-deep flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300",
              userState === null ? "rotate-0 md:rotate-180" : isOpen ? "rotate-180" : "rotate-0",
            )}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </div>
        </div>
      </button>

      {/* Collapsible content */}
      <div
        id={contentId}
        className={cn("mt-4", userState === null ? "hidden md:block" : isOpen ? "block" : "hidden")}
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {reasons.map((reason) => (
            <li key={reason}>
              <MotionLift>
                <div className="border-rule bg-paper-raise flex h-full items-start gap-3 rounded-lg border p-5">
                  <HeartShield className="text-sage-deep mt-0.5 size-6 shrink-0" />
                  <p className="text-ink font-semibold">{reason}</p>
                </div>
              </MotionLift>
            </li>
          ))}
        </ul>

        {/* Mobile bottom collapse shortcut */}
        <div className="mt-4 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={() => setUserState(false)}
            className="text-sage-deep hover:bg-sage-wash inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors"
          >
            <ChevronUp className="size-3.5" aria-hidden="true" />
            Collapse highlights
          </button>
        </div>
      </div>
    </div>
  );
}
