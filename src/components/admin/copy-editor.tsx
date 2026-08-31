"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/admin/ui";
import { saveCopy, type ActionResult } from "@/app/admin/actions";
import type { SiteCopyRow } from "@/lib/db/database.types";
import { cn } from "@/lib/utils";

/**
 * Editing the words on the page.
 *
 * Grouped by the section a visitor sees, not by database order, so the owner can
 * find "the sentence under the big heading" without knowing any slugs.
 *
 * Entries taken verbatim from the client's own brochure and infographic are
 * marked. That is the content rule made visible: nobody should reword the home's
 * own description by accident, and if they do, they should know they did.
 */
export function CopyEditor({ rows }: { rows: SiteCopyRow[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveCopy, null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((r) => [
        r.slug,
        r.kind === "list" ? (r.value_list ?? []).join("\n") : (r.value ?? ""),
      ]),
    ),
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, SiteCopyRow[]>();
    for (const row of rows) {
      const list = grouped.get(row.section) ?? [];
      list.push(row);
      grouped.set(row.section, list);
    }
    return [...grouped.entries()];
  }, [rows]);

  const original = useMemo(
    () =>
      Object.fromEntries(
        rows.map((r) => [
          r.slug,
          r.kind === "list" ? (r.value_list ?? []).join("\n") : (r.value ?? ""),
        ]),
      ),
    [rows],
  );

  const changed = rows.filter((r) => values[r.slug] !== original[r.slug]).map((r) => r.slug);

  return (
    <form action={action}>
      <Toast result={state} />

      {/* Only the entries that actually changed are submitted, so a save never
          overwrites something another person edited in a different tab. */}
      <input type="hidden" name="__changed" value={changed.join(",")} />

      <div className="grid gap-8">
        {sections.map(([section, entries]) => (
          <fieldset key={section} className="border-rule bg-paper-raise rounded border p-5">
            <legend className="label text-sage-deep px-2">{section}</legend>

            <div className="grid gap-5">
              {entries.map((row) => {
                const id = `copy-${row.slug}`;
                const isChanged = values[row.slug] !== original[row.slug];
                const isList = row.kind === "list";

                return (
                  <div key={row.slug} className="grid gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label htmlFor={id}>{row.label}</Label>
                      {row.source === "artwork" ? (
                        <span
                          className="label border-sage text-sage-deep bg-sage-wash rounded-full border px-2 py-0.5 text-[0.625rem]"
                          title="Taken word for word from the brochure or infographic"
                        >
                          Your own words
                        </span>
                      ) : null}
                      {isChanged ? (
                        <button
                          type="button"
                          onClick={() =>
                            setValues((prev) => ({ ...prev, [row.slug]: original[row.slug] }))
                          }
                          className="text-stone hover:text-ink inline-flex items-center gap-1 text-[0.8125rem] underline"
                        >
                          <RotateCcw className="size-3" aria-hidden="true" />
                          Undo
                        </button>
                      ) : null}
                    </div>

                    {isList ? (
                      <ListField
                        id={id}
                        name={row.slug}
                        value={values[row.slug] ?? ""}
                        onChange={(v) => setValues((prev) => ({ ...prev, [row.slug]: v }))}
                      />
                    ) : row.kind === "long" ? (
                      <Textarea
                        id={id}
                        name={row.slug}
                        rows={4}
                        value={values[row.slug] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [row.slug]: e.target.value }))
                        }
                        aria-describedby={row.help ? `${id}-help` : undefined}
                        className={cn(isChanged && "border-sage")}
                      />
                    ) : (
                      <Input
                        id={id}
                        name={row.slug}
                        value={values[row.slug] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({ ...prev, [row.slug]: e.target.value }))
                        }
                        aria-describedby={row.help ? `${id}-help` : undefined}
                        className={cn(isChanged && "border-sage")}
                      />
                    )}

                    {row.help ? (
                      <p id={`${id}-help`} className="text-stone text-[0.875rem]">
                        {row.help}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Sticky so the owner never has to scroll back up to save. */}
      <div className="border-rule bg-paper/95 sticky bottom-0 mt-6 flex flex-wrap items-center gap-4 border-t py-4 backdrop-blur">
        <Button type="submit" disabled={pending || changed.length === 0}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {changed.length === 0
            ? "Nothing to save"
            : `Save ${changed.length} change${changed.length === 1 ? "" : "s"}`}
        </Button>
        <span className="text-stone text-[0.9375rem]">The website updates within a minute.</span>
      </div>
    </form>
  );
}

/**
 * The values strip. One item per line, which is far easier to explain than a
 * comma-separated field and impossible to get subtly wrong.
 */
function ListField({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const items = value.split("\n").filter((s) => s.trim() !== "");

  return (
    <div className="grid gap-2">
      <Textarea
        id={id}
        name={name}
        rows={Math.max(3, items.length + 1)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="One per line"
      />
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="bg-sage-wash text-sage-deep label inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem]"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((_, j) => j !== i).join("\n"))}
                className="hover:text-ink"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-stone text-[0.875rem]">
        One per line. This is how they appear on the site.
      </p>
    </div>
  );
}
