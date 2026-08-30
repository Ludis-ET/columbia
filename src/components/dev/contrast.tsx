"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Live contrast auditing for /specimen.
 *
 * Reads the resolved CSS custom properties from the document and computes WCAG
 * contrast ratios in the browser, so the numbers reflect whatever theme is
 * actually applied rather than a hardcoded table that can drift from the tokens.
 *
 * Development tooling — not shipped on any public route.
 */

function parseColor(value: string): [number, number, number] | null {
  const v = value.trim();

  const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return [
      parseInt(full.slice(0, 2), 16),
      parseInt(full.slice(2, 4), 16),
      parseInt(full.slice(4, 6), 16),
    ];
  }

  const rgb = v.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return [parts[0], parts[1], parts[2]];
    }
  }

  return null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg: string, bg: string): number | null {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) return null;
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Re-reads tokens whenever the theme changes, in either direction. */
function useTokens(names: string[]) {
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    const read = () => {
      const styles = getComputedStyle(document.documentElement);
      const next: Record<string, string> = {};
      for (const name of names) {
        next[name] = styles.getPropertyValue(name).trim();
      }
      setTokens(next);
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", read);
    };
    // `names` is a module-level constant array at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return tokens;
}

export interface ContrastPair {
  label: string;
  fg: string;
  bg: string;
  /** 7 for body text (AAA), 4.5 for everything else, 3 for non-text. */
  threshold: number;
}

export function ContrastTable({ pairs }: { pairs: ContrastPair[] }) {
  const names = Array.from(new Set(pairs.flatMap((p) => [p.fg, p.bg])));
  const tokens = useTokens(names);
  const ready = Object.keys(tokens).length > 0;

  return (
    <div className="border-rule overflow-x-auto border">
      <table className="w-full min-w-[34rem] text-left text-[0.9375rem]">
        <thead>
          <tr className="bg-paper-sunk border-rule-strong label text-stone border-b">
            <th className="px-3 py-2 font-medium">Pair</th>
            <th className="px-3 py-2 font-medium">Sample</th>
            <th className="px-3 py-2 text-right font-medium">Ratio</th>
            <th className="px-3 py-2 text-right font-medium">Needs</th>
            <th className="px-3 py-2 text-right font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => {
            const value = ready ? ratio(tokens[pair.fg], tokens[pair.bg]) : null;
            const passes = value !== null && value >= pair.threshold;
            return (
              <tr key={pair.label} className="border-rule border-b last:border-b-0">
                <td className="px-3 py-2 font-medium">{pair.label}</td>
                <td className="px-3 py-2">
                  <span
                    className="inline-block rounded px-3 py-1"
                    style={{ color: `var(${pair.fg})`, background: `var(${pair.bg})` }}
                  >
                    Aa quick sample
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {value === null ? "—" : `${value.toFixed(2)}:1`}
                </td>
                <td className="text-stone px-3 py-2 text-right font-mono tabular-nums">
                  {pair.threshold}:1
                </td>
                <td className="px-3 py-2 text-right">
                  <span
                    className={cn(
                      "label inline-block rounded px-2 py-0.5",
                      !ready
                        ? "text-stone"
                        : passes
                          ? "bg-sage-wash text-[var(--ok)]"
                          : "text-[var(--danger)]",
                    )}
                  >
                    {!ready ? "…" : passes ? "Pass" : "Fail"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
