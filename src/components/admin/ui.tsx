"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteRow, reorder, togglePublished, type ActionResult } from "@/app/admin/actions";

/**
 * Shared admin list primitives.
 *
 * Every screen in the console is some flavour of "list of rows, each of which
 * can be shown/hidden, reordered, edited or deleted" — so that lives here once.
 *
 * Two rules run through all of it:
 *   - Plain language. "Show on the website", never "published: true".
 *   - Optimistic feel, honest result: the toast names what actually changed,
 *     and constraint failures come back in the owner's words.
 */

export function PageHeader({
  title,
  lead,
  count,
  action,
}: {
  title: string;
  lead?: string;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-rule mb-6 flex flex-wrap items-end justify-between gap-4 border-b pb-4">
      <div>
        <h1 className="text-h2">{title}</h1>
        {lead ? <p className="text-stone mt-1 max-w-[60ch]">{lead}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {count ? <span className="label text-stone">{count}</span> : null}
        {action}
      </div>
    </header>
  );
}

/** Announces the result of the last action. */
export function Toast({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <div
      aria-live="polite"
      className={cn(
        "mb-4 rounded border px-4 py-3 text-[0.9375rem]",
        result.ok
          ? "border-sage bg-sage-wash text-sage-deep"
          : "border-[var(--danger)] text-[var(--danger)]",
      )}
    >
      {result.message}
    </div>
  );
}

/**
 * Empty state.
 *
 * Deliberately explains what good content looks like rather than just saying
 * "nothing here". For testimonials especially, the empty state is where the
 * owner learns how to ask a family for a quote — which is more useful than a
 * shrug, and steers them away from writing one themselves.
 */
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-rule bg-paper-raise rounded border border-dashed p-8 text-center">
      <h2 className="text-h3 mb-2 font-sans font-bold">{title}</h2>
      <div className="text-stone mx-auto max-w-[52ch]">{children}</div>
    </div>
  );
}

export interface RowAction {
  table: string;
  id: string;
  published?: boolean;
  canReorder?: boolean;
  canDelete?: boolean;
  onResult: (result: ActionResult) => void;
}

/** Show/hide, move up/down and delete controls for one row. */
export function RowControls({
  table,
  id,
  published,
  canReorder = true,
  canDelete = false,
  onResult,
}: RowAction) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      onResult(await fn());
    });

  return (
    <div className="flex shrink-0 items-center gap-1">
      {pending ? (
        <Loader2 className="text-stone mr-1 size-4 animate-spin" aria-hidden="true" />
      ) : null}

      {published !== undefined ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => togglePublished(table, id, !published))}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded border px-3 text-[0.875rem] font-semibold",
            published
              ? "border-sage bg-sage-wash text-sage-deep"
              : "border-rule text-stone hover:text-ink",
          )}
        >
          {published ? (
            <Eye className="size-4" aria-hidden="true" />
          ) : (
            <EyeOff className="size-4" aria-hidden="true" />
          )}
          {published ? "On the website" : "Hidden"}
        </button>
      ) : null}

      {canReorder ? (
        <>
          <IconButton
            label="Move up"
            disabled={pending}
            onClick={() => run(() => reorder(table, id, "up"))}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Move down"
            disabled={pending}
            onClick={() => run(() => reorder(table, id, "down"))}
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </IconButton>
        </>
      ) : null}

      {canDelete ? (
        confirming ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteRow(table, id))}
              className="inline-flex min-h-11 items-center gap-1 rounded border border-[var(--danger)] px-3 text-[0.875rem] font-semibold text-[var(--danger)]"
            >
              <Check className="size-4" aria-hidden="true" />
              Really delete
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-stone min-h-11 px-2 text-[0.875rem] underline"
            >
              Cancel
            </button>
          </span>
        ) : (
          <IconButton label="Delete" disabled={pending} onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
          </IconButton>
        )
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border-rule text-stone hover:text-ink inline-flex size-11 items-center justify-center rounded border disabled:opacity-50"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

/** A single row in an admin list. */
export function AdminRow({
  title,
  meta,
  children,
  controls,
}: {
  title: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  controls?: ReactNode;
}) {
  return (
    <li className="border-rule bg-paper-raise rounded border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          {meta ? <div className="text-stone mt-0.5 text-[0.875rem]">{meta}</div> : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
        {controls}
      </div>
    </li>
  );
}
