"use client";

import { useActionState, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, GripVertical, Pencil, Plus, Trash2, X, Check } from "lucide-react";
import {
  createGalleryCategory,
  deleteGalleryCategory,
  renameGalleryCategory,
  reorderGalleryCategory,
  type ActionResult,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/admin/ui";
import { AdminCard } from "@/components/admin/cards";
import { cn } from "@/lib/utils";

interface CategoryRow {
  id: string;
  name: string;
  position: number;
  published: boolean;
  photoCount: number;
}

// ---------------------------------------------------------------------------
// Add form
// ---------------------------------------------------------------------------

function AddCategoryForm({
  onSuccess,
}: {
  onSuccess: (name: string) => void;
}) {
  const [result, action, pending] = useActionState(
    async (prev: ActionResult | null, formData: FormData) => {
      const res = await createGalleryCategory(prev, formData);
      if (res.ok) {
        const name = String(formData.get("name") ?? "").trim();
        onSuccess(name);
      }
      return res;
    },
    null,
  );

  return (
    <form action={action} className="flex gap-2 items-end">
      <div className="flex-1">
        <Label htmlFor="new-category-name" className="mb-1 block text-xs">
          New category name
        </Label>
        <Input
          id="new-category-name"
          name="name"
          placeholder="e.g. Garden"
          maxLength={60}
          required
          className="h-9"
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="shrink-0"
        id="btn-add-category"
      >
        <Plus className="size-4 mr-1" />
        Add
      </Button>
      {result && (
        <Toast result={result} />
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Rename inline editor
// ---------------------------------------------------------------------------

function RenameInline({
  id,
  currentName,
  onDone,
}: {
  id: string;
  currentName: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState(currentName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (value.trim() === currentName) { onDone(); return; }
    startTransition(async () => {
      const res = await renameGalleryCategory(id, value);
      if (res.ok) {
        onDone();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="flex flex-1 items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); submit(); }
          if (e.key === "Escape") onDone();
        }}
        className="h-8 flex-1"
        autoFocus
        maxLength={60}
        id={`rename-input-${id}`}
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="text-sage hover:text-sage-deep"
        aria-label="Save name"
        id={`btn-save-rename-${id}`}
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-stone hover:text-ink"
        aria-label="Cancel rename"
        id={`btn-cancel-rename-${id}`}
      >
        <X className="size-4" />
      </button>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single row
// ---------------------------------------------------------------------------

function CategoryRow({
  cat,
  isFirst,
  isLast,
  onDelete,
  onReorder,
}: {
  cat: CategoryRow;
  isFirst: boolean;
  isLast: boolean;
  onDelete: (id: string, name: string) => void;
  onReorder: (id: string, dir: "up" | "down") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleReorder(dir: "up" | "down") {
    startTransition(async () => {
      await reorderGalleryCategory(cat.id, dir);
      onReorder(cat.id, dir);
    });
  }

  return (
    <li
      className={cn(
        "border-rule flex items-center gap-3 rounded border bg-paper p-3 transition-opacity",
        pending && "opacity-50",
      )}
    >
      <GripVertical className="text-stone size-4 shrink-0" aria-hidden />

      {/* Name / editor */}
      {editing ? (
        <RenameInline
          id={cat.id}
          currentName={cat.name}
          onDone={() => setEditing(false)}
        />
      ) : (
        <span className="flex-1 font-medium">{cat.name}</span>
      )}

      {/* Photo count badge */}
      {cat.photoCount > 0 && (
        <span className="text-stone bg-paper-raise border-rule rounded-full border px-2 py-0.5 text-xs">
          {cat.photoCount} photo{cat.photoCount !== 1 ? "s" : ""}
        </span>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => handleReorder("up")}
            disabled={isFirst || pending}
            className="hover:text-ink text-stone disabled:opacity-30 p-1"
            aria-label={`Move ${cat.name} up`}
            id={`btn-move-up-${cat.id}`}
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => handleReorder("down")}
            disabled={isLast || pending}
            className="hover:text-ink text-stone disabled:opacity-30 p-1"
            aria-label={`Move ${cat.name} down`}
            id={`btn-move-down-${cat.id}`}
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="hover:text-ink text-stone p-1"
            aria-label={`Rename ${cat.name}`}
            id={`btn-rename-${cat.id}`}
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(cat.id, cat.name)}
            className="hover:text-destructive text-stone p-1"
            aria-label={`Delete ${cat.name}`}
            id={`btn-delete-cat-${cat.id}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm
// ---------------------------------------------------------------------------

function DeleteConfirm({
  name,
  photoCount,
  onConfirm,
  onCancel,
  pending,
}: {
  name: string;
  photoCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div
      className="admin-scrim fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cat-delete-title"
    >
      <div className="bg-paper-raise border-rule w-full max-w-sm rounded-xl border p-6 shadow-xl">
        <h2 id="cat-delete-title" className="mb-3 font-semibold">
          Delete &ldquo;{name}&rdquo;?
        </h2>
        <p className="text-stone mb-2 text-[0.9375rem]">
          This will remove the category from the gallery filter.
        </p>
        {photoCount > 0 && (
          <p className="text-amber-700 dark:text-amber-400 mb-4 text-[0.9375rem]">
            ⚠ {photoCount} photo{photoCount !== 1 ? "s are" : " is"} tagged with this
            category — they will become untagged but will not be deleted.
          </p>
        )}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
            className="flex-1"
            id="btn-confirm-delete-category"
          >
            Delete category
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GalleryCategoryManager({
  initialCategories,
}: {
  initialCategories: CategoryRow[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; photoCount: number } | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function handleAdded(name: string) {
    showToast(`Category "${name}" added.`, true);
    // Refresh will happen via revalidatePath — for optimistic feel, just reload
    window.location.reload();
  }

  function handleReorder(_id: string, _dir: "up" | "down") {
    // Revalidation handles the actual data — reload to reflect new order
    window.location.reload();
  }

  function handleDeleteRequest(id: string, name: string) {
    const cat = categories.find((c) => c.id === id);
    setDeleteTarget({ id, name, photoCount: cat?.photoCount ?? 0 });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      const res = await deleteGalleryCategory(deleteTarget.id);
      setDeleteTarget(null);
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        showToast(res.message, true);
      } else {
        showToast(res.message, false);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <AdminCard>
        <h2 className="mb-4 font-semibold">Add a category</h2>
        <AddCategoryForm onSuccess={handleAdded} />
      </AdminCard>

      {/* Category list */}
      <AdminCard>
        <h2 className="mb-4 font-semibold">
          Current categories
          <span className="text-stone ml-2 text-sm font-normal">
            ({categories.length})
          </span>
        </h2>

        {categories.length === 0 ? (
          <p className="text-stone text-[0.9375rem]">No categories yet. Add one above.</p>
        ) : (
          <ul className="space-y-2" aria-label="Gallery categories">
            {categories.map((cat, i) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                isFirst={i === 0}
                isLast={i === categories.length - 1}
                onDelete={handleDeleteRequest}
                onReorder={handleReorder}
              />
            ))}
          </ul>
        )}
      </AdminCard>

      {/* Delete confirm dialog */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          photoCount={deleteTarget.photoCount}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          pending={deletePending}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast result={toast} />
      )}
    </div>
  );
}
