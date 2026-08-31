"use client";

import { useState } from "react";
import { AdminRow, RowControls, Toast } from "@/components/admin/ui";
import type { ActionResult } from "@/app/admin/actions";

/**
 * A list of content rows with show/hide, reorder and delete.
 *
 * Services, the daily schedule, testimonials, FAQs and team all have the same
 * shape, so they share this rather than repeating five near-identical screens.
 * `render` supplies the per-row detail that actually differs.
 */

export interface ContentRow {
  id: string;
  title: string;
  meta?: string;
  body?: string;
  published: boolean;
  /** Blocks publishing until true, consent / photo release. */
  blocked?: string;
}

export function ContentList({
  table,
  rows,
  canDelete = false,
  canReorder = true,
}: {
  table: string;
  rows: ContentRow[];
  canDelete?: boolean;
  canReorder?: boolean;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [state, setState] = useState(rows);

  function handle(id: string, published: boolean, r: ActionResult) {
    setResult(r);
    // Only flip locally when the server actually accepted it, the database
    // rejects publishing an unconsented testimonial or an unreleased photo, and
    // the UI must not pretend otherwise.
    if (r.ok) {
      setState((prev) => prev.map((row) => (row.id === id ? { ...row, published } : row)));
    }
  }

  return (
    <>
      <Toast result={result} />
      <ul className="grid gap-3">
        {state.map((row) => (
          <AdminRow
            key={row.id}
            title={row.title}
            meta={row.meta}
            controls={
              <RowControls
                table={table}
                id={row.id}
                published={row.published}
                canReorder={canReorder}
                canDelete={canDelete}
                onResult={(r) => handle(row.id, !row.published, r)}
              />
            }
          >
            {row.body ? (
              <p className="text-stone max-w-[70ch] text-[0.9375rem]">{row.body}</p>
            ) : null}
            {row.blocked ? (
              <p className="mt-2 text-[0.875rem] text-[var(--warn)]">{row.blocked}</p>
            ) : null}
          </AdminRow>
        ))}
      </ul>
    </>
  );
}
