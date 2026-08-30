"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

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
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") setTheme(stored);
    } catch {
      // Private browsing or blocked site data — system default is fine.
    }
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", next);
    }
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // Nothing to do — the choice still applies for this page view.
    }
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

/**
 * Applies the stored theme before first paint so there is no flash of the wrong
 * theme. Rendered in <head>; deliberately tiny and dependency-free.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
