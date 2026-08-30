"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { readPreference, writePreference } from "@/lib/preferences";

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
 * media query in both directions — see globals.css.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

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
    <div
      className={cn("border-rule inline-flex items-center gap-0.5 rounded border p-0.5", className)}
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
              "inline-flex size-9 items-center justify-center rounded-sm transition-colors",
              active ? "bg-sage-wash text-sage-deep" : "text-stone hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden="true" strokeWidth={1.9} />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
