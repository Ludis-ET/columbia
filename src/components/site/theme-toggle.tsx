"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { readPreference, writePreference } from "@/lib/preferences";
import { HouseMotion } from "@/components/motion/house";

type Theme = "light" | "dark" | "system";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Three-state theme control: light / system / dark.
 *
 * "System" is the default and stamps nothing on <html>, so the page follows
 * prefers-color-scheme. An explicit choice stamps data-theme, which beats the
 * media query in both directions, see globals.css.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const pillId = useId();

  useEffect(() => {
    setMounted(true);
    const stored = readPreference("theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    writePreference("theme", next === "system" ? null : next);
  }

  return (
    <HouseMotion>
      <div
        className={cn(
          "border-rule relative inline-flex items-center gap-0.5 rounded border p-0.5",
          className,
        )}
        role="group"
        aria-label="Colour theme"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = mounted && theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => apply(value)}
              aria-pressed={active}
              className={cn(
                "relative inline-flex size-9 items-center justify-center rounded-sm transition-colors",
                active ? "text-sage-deep" : "text-stone hover:text-ink",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={pillId}
                  className="bg-sage-wash absolute inset-0 rounded-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                />
              ) : null}
              <Icon className="relative size-4" aria-hidden="true" strokeWidth={1.9} />
              <span className="sr-only">{label}</span>
            </button>
          );
        })}
      </div>
    </HouseMotion>
  );
}
