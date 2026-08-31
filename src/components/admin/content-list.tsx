"use client";

import { useActionState, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { AdminRow, RowControls, Toast } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveRow, type ActionResult } from "@/app/admin/actions";

/**
 * A list of content rows with show/hide, reorder, delete, and optional inline
 * text editing.
 *
 * Services, the daily schedule, testimonials, FAQs and team all have the same
 * shape, so they share this rather than repeating five near-identical screens.
 * `render` supplies the per-row detail that actually differs.
 *
 * When `editableFields` is supplied, each row gets an "Edit" expand button that
 * reveals an inline form using the generic `saveRow` action.
 */

export interface ContentRow {
  id: string;
  title: string;
  meta?: string;
  body?: string;
  published: boolean;
  /** Blocks publishing until true, consent / photo release. */
  blocked?: string;
  /** Raw DB values for pre-filling the inline edit form. */
  rawValues?: Record<string, string>;
}

export interface EditableField {
  name: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export function ContentList({
  table,
  rows,
  canDelete = false,
  canReorder = true,
  editableFields,
}: {
  table: string;
  rows: ContentRow[];
  canDelete?: boolean;
  canReorder?: boolean;
  editableFields?: EditableField[];
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [state, setState] = useState(rows);
  const [editingId, setEditingId] = useState<string | null>(null);

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
          <li key={row.id}>
            <AdminRow
              title={row.title}
              meta={row.meta}
              controls={
                <div className="flex items-center gap-2">
                  {editableFields ? (
                    <button
                      type="button"
                      onClick={() => setEditingId((id) => (id === row.id ? null : row.id))}
                      aria-expanded={editingId === row.id}
                      className="text-sage-deep inline-flex min-h-11 items-center gap-1.5 px-2 text-[0.875rem] font-semibold underline"
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                      {editingId === row.id ? "Close" : "Edit"}
                    </button>
                  ) : null}
                  <RowControls
                    table={table}
                    id={row.id}
                    published={row.published}
                    canReorder={canReorder}
                    canDelete={canDelete}
                    onResult={(r) => handle(row.id, !row.published, r)}
                  />
                </div>
              }
            >
              {row.body ? (
                <p className="text-stone max-w-[70ch] text-[0.9375rem]">{row.body}</p>
              ) : null}
              {row.blocked ? (
                <p className="mt-2 text-[0.875rem] text-[var(--warn)]">{row.blocked}</p>
              ) : null}

              {/* Inline edit form */}
              {editableFields && editingId === row.id ? (
                <InlineEditForm
                  table={table}
                  id={row.id}
                  fields={editableFields}
                  defaultValues={row.rawValues ?? {}}
                  onSaved={(r) => {
                    setResult(r);
                    if (r.ok) setEditingId(null);
                  }}
                />
              ) : null}
            </AdminRow>
          </li>
        ))}
      </ul>
    </>
  );
}

function InlineEditForm({
  table,
  id,
  fields,
  defaultValues,
  onSaved,
}: {
  table: string;
  id: string;
  fields: EditableField[];
  defaultValues: Record<string, string>;
  onSaved: (r: ActionResult) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRow, null);

  // Propagate result to parent on first non-null state
  const [lastState, setLastState] = useState<ActionResult | null>(null);
  if (state && state !== lastState) {
    setLastState(state);
    onSaved(state);
  }

  const fieldNames = fields.map((f) => f.name).join(",");

  return (
    <form
      action={action}
      className="border-rule mt-4 rounded border p-4"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
          e.preventDefault();
          (e.currentTarget as HTMLFormElement).requestSubmit();
        }
      }}
    >
      <input type="hidden" name="__table" value={table} />
      <input type="hidden" name="__id" value={id} />
      <input type="hidden" name="__fields" value={fieldNames} />

      <div className="grid gap-4">
        {fields.map((field) => (
          <div key={field.name} className="grid gap-1.5">
            <Label htmlFor={`edit-${id}-${field.name}`}>{field.label}</Label>
            {field.multiline ? (
              <Textarea
                id={`edit-${id}-${field.name}`}
                name={field.name}
                rows={3}
                defaultValue={defaultValues[field.name] ?? ""}
                placeholder={field.placeholder}
              />
            ) : (
              <Input
                id={`edit-${id}-${field.name}`}
                name={field.name}
                defaultValue={defaultValues[field.name] ?? ""}
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" size="dense" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Save
        </Button>
        <p className="text-stone text-[0.8125rem]">⌘S / Ctrl+S also saves</p>
      </div>
    </form>
  );
}
