"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Accessibility, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HouseMotion } from "@/components/motion/house";
import { houseTransition } from "@/lib/motion";
import {
  readPreference,
  writePreference,
  type PreferenceKey,
  type PreferenceValue,
} from "@/lib/preferences";

/**
 * Reader controls: text size, contrast, motion, and an easier-reading font.
 *
 * A signature feature rather than a compliance afterthought, the primary
 * readers are older adults, so putting these in reach is a usability decision.
 * Everything persists per visitor and is re-applied before paint on the next
 * visit (see lib/preferences.ts).
 */

interface Choice {
  label: string;
  value: PreferenceValue;
}

interface Group {
  key: PreferenceKey;
  legend: string;
  hint?: string;
  choices: Choice[];
}

const GROUPS: Group[] = [
  {
    key: "textSize",
    legend: "Text size",
    choices: [
      { label: "Normal", value: null },
      { label: "Large", value: "large" },
      { label: "Largest", value: "largest" },
    ],
  },
  {
    key: "contrast",
    legend: "Contrast",
    choices: [
      { label: "Normal", value: null },
      { label: "High", value: "high" },
    ],
  },
  {
    key: "motion",
    legend: "Animation",
    hint: "Your device setting is respected automatically.",
    choices: [
      { label: "Normal", value: null },
      { label: "Reduced", value: "reduce" },
    ],
  },
  {
    key: "readingFont",
    legend: "Reading font",
    hint: "Atkinson Hyperlegible keeps similar letters distinct.",
    choices: [
      { label: "Default", value: null },
      { label: "Easier reading", value: "hyperlegible" },
    ],
  },
];

export function AccessibilityToolbar() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, PreferenceValue>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const next: Record<string, PreferenceValue> = {};
    for (const group of GROUPS) next[group.key] = readPreference(group.key);
    setPrefs(next);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  function choose(key: PreferenceKey, value: PreferenceValue) {
    writePreference(key, value);
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function resetAll() {
    for (const group of GROUPS) writePreference(group.key, null);
    setPrefs({});
  }

  const changed = GROUPS.some((group) => prefs[group.key]);

  return (
    <HouseMotion>
      <div className="fixed bottom-20 left-4 z-50 sm:bottom-4 print:hidden">
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Reading options"
              initial={{ y: 8 }}
              animate={{ y: 0 }}
              exit={{ y: 8 }}
              transition={houseTransition}
              className="border-rule-strong bg-paper-raise mb-3 w-[min(20rem,calc(100vw-2rem))] rounded border p-4 shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[1.05rem] font-bold">Reading options</h2>
                  <p className="text-stone text-[0.875rem] leading-snug">
                    These stay set on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="text-stone hover:text-ink -mt-1 -mr-1 inline-flex size-9 shrink-0 items-center justify-center rounded"
                >
                  <X className="size-5" aria-hidden="true" />
                  <span className="sr-only">Close reading options</span>
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {GROUPS.map((group) => (
                  <fieldset key={group.key}>
                    <legend className="label text-stone mb-1.5">{group.legend}</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {group.choices.map((choice) => {
                        const active = (prefs[group.key] ?? null) === choice.value;
                        return (
                          <button
                            key={choice.label}
                            type="button"
                            onClick={() => choose(group.key, choice.value)}
                            aria-pressed={active}
                            className={cn(
                              "min-h-11 rounded border px-3 text-[0.9375rem] transition-colors",
                              active
                                ? "border-sage bg-sage-wash text-sage-deep font-semibold"
                                : "border-rule text-ink-soft hover:border-rule-strong",
                            )}
                          >
                            {choice.label}
                          </button>
                        );
                      })}
                    </div>
                    {group.hint ? (
                      <p className="text-stone mt-1.5 text-[0.8125rem] leading-snug">
                        {group.hint}
                      </p>
                    ) : null}
                  </fieldset>
                ))}
              </div>

              {changed ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-sage-deep mt-4 min-h-11 text-[0.9375rem] font-semibold underline"
                >
                  Reset to defaults
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "border-rule-strong bg-paper-raise text-ink inline-flex min-h-12 items-center gap-2 rounded-full border py-2 pr-4 pl-3 font-semibold shadow-md transition-colors",
            "hover:border-sage hover:text-sage-deep",
          )}
        >
          <Accessibility className="size-5" aria-hidden="true" strokeWidth={2} />
          <span className="text-[0.9375rem]">Reading options</span>
        </button>
      </div>
    </HouseMotion>
  );
}
