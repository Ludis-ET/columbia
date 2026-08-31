"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import {
  CheckSquare,
  ImageIcon,
  Loader2,
  Pencil,
  Square,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  assignSectionPhoto,
  bulkPublishPhotos,
  deletePhoto,
  togglePublished,
  updatePhoto,
  uploadPhoto,
  type ActionResult,
} from "@/app/admin/actions";
import { AdminCard, AdminSection } from "@/components/admin/cards";
import { AdminIconButton, Toast } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GALLERY_CATEGORIES,
  SECTION_SLOT_LABELS,
  SECTION_SLOTS,
  isSectionSlot,
  type AdminPhoto,
  type SectionSlot,
} from "@/lib/media";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Confirm dialog (replaces window.confirm for delete actions)
// ---------------------------------------------------------------------------

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-paper-raise border-rule w-full max-w-sm rounded-xl border p-6 shadow-xl">
        <h2 id="confirm-title" className="mb-3 font-semibold">
          Delete photo
        </h2>
        <p className="text-stone mb-5 text-[0.9375rem]">{message}</p>
        <div className="flex gap-3">
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            Delete
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
// Main photo manager
// ---------------------------------------------------------------------------

export function PhotoManager({ initialPhotos }: { initialPhotos: AdminPhoto[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [editing, setEditing] = useState<AdminPhoto | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Bulk selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const slots = useMemo(() => {
    const map: Record<SectionSlot, AdminPhoto | null> = { hero: null, meals: null };
    for (const photo of photos) {
      if (photo.category === "hero") map.hero = photo;
      if (photo.category === "meals") map.meals = photo;
    }
    return map;
  }, [photos]);

  const galleryPhotos = useMemo(
    () => photos.filter((p) => !isSectionSlot(p.category)).sort((a, b) => a.position - b.position),
    [photos],
  );

  // Category counts for filter tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: galleryPhotos.length };
    for (const cat of GALLERY_CATEGORIES) {
      counts[cat] = galleryPhotos.filter((p) => p.category === cat).length;
    }
    counts["uncategorised"] = galleryPhotos.filter((p) => !p.category).length;
    return counts;
  }, [galleryPhotos]);

  const visiblePhotos = useMemo(() => {
    if (activeCategory === "all") return galleryPhotos;
    if (activeCategory === "uncategorised") return galleryPhotos.filter((p) => !p.category);
    return galleryPhotos.filter((p) => p.category === activeCategory);
  }, [galleryPhotos, activeCategory]);

  function announce(result: ActionResult) {
    setToast(result);
    // Auto-dismiss success toasts after 4 s
    if (result.ok) setTimeout(() => setToast(null), 4000);
  }

  function refreshPhoto(id: string, patch: Partial<AdminPhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  function run(fn: () => Promise<ActionResult>, onOk?: () => void) {
    start(async () => {
      const result = await fn();
      announce(result);
      if (result.ok) onOk?.();
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function runBulk(publishedVal: boolean) {
    run(
      () => bulkPublishPhotos(Array.from(selected), publishedVal),
      () => {
        setPhotos((prev) =>
          prev.map((p) => (selected.has(p.id) ? { ...p, published: publishedVal } : p)),
        );
        setSelected(new Set());
        setSelectMode(false);
      },
    );
  }

  return (
    <div className="grid gap-8">
      <Toast result={toast} />

      {confirmDelete ? (
        <ConfirmDialog
          message="This will permanently delete the photo from your library and storage. This cannot be undone."
          onConfirm={() => {
            const id = confirmDelete;
            setConfirmDelete(null);
            run(() => deletePhoto(id), () => {
              removePhoto(id);
              if (editing?.id === id) setEditing(null);
            });
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}

      {/* Upload — top of page, always visible */}
      <AdminSection
        title="Upload a photo"
        lead="JPEG, PNG, WebP or AVIF, up to 8 MB. Every photo needs alt text before it can be saved."
      >
        <UploadForm />
      </AdminSection>

      {/* Section slots */}
      <AdminSection
        title="Section images"
        lead="These two photographs appear outside the gallery — at the top of the home page and beside the meals text."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {SECTION_SLOTS.map((slot) => (
            <SectionSlotCard
              key={slot}
              slot={slot}
              photo={slots[slot]}
              photos={photos}
              pending={pending}
              onAssign={(id) =>
                run(() => assignSectionPhoto(null, form({ id, slot })), () => {
                  setPhotos((prev) =>
                    prev.map((p) => {
                      if (p.category === slot) return { ...p, category: null };
                      if (p.id === id) return { ...p, category: slot };
                      return p;
                    }),
                  );
                })
              }
              onClear={() => {
                if (!slots[slot]) return;
                const p = slots[slot]!;
                run(() => updatePhoto(null, photoForm(p, { category: null })), () =>
                  refreshPhoto(p.id, { category: null }),
                );
              }}
            />
          ))}
        </div>
      </AdminSection>

      {/* Gallery with category tabs */}
      <AdminSection
        title="Gallery"
        lead={`${galleryPhotos.filter((p) => p.published).length} of ${galleryPhotos.length} showing on the website`}
      >
        {/* Category filter tabs */}
        {galleryPhotos.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Filter by category"
            >
              {[
                { id: "all", label: "All" },
                ...GALLERY_CATEGORIES.map((c) => ({ id: c, label: c })),
                { id: "uncategorised", label: "Uncategorised" },
              ]
                .filter(({ id }) => id === "all" || (categoryCounts[id] ?? 0) > 0)
                .map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activeCategory === id}
                    onClick={() => setActiveCategory(id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.875rem] transition-colors",
                      activeCategory === id
                        ? "border-sage bg-sage-wash text-sage-deep font-semibold"
                        : "border-rule text-stone hover:border-sage/60",
                    )}
                  >
                    {label}
                    <span className="tabular-nums text-[0.75rem]">
                      ({categoryCounts[id] ?? 0})
                    </span>
                  </button>
                ))}
            </div>

            {/* Bulk select toggle */}
            <button
              type="button"
              onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[0.875rem] transition-colors",
                selectMode
                  ? "border-sage bg-sage-wash text-sage-deep font-semibold"
                  : "border-rule text-stone hover:border-sage/60",
              )}
            >
              {selectMode ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
              {selectMode ? "Selecting…" : "Select"}
            </button>
          </div>
        ) : null}

        {/* Bulk action bar */}
        {selectMode && selected.size > 0 ? (
          <div className="bg-sage-wash border-sage mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
            <span className="text-sage-deep font-semibold">
              {selected.size} selected
            </span>
            <Button size="dense" onClick={() => runBulk(true)} disabled={pending}>
              Publish all
            </Button>
            <Button size="dense" variant="outline" onClick={() => runBulk(false)} disabled={pending}>
              Hide all
            </Button>
            <button
              type="button"
              onClick={() => { setSelected(new Set()); setSelectMode(false); }}
              className="text-stone ml-auto hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Cancel selection</span>
            </button>
          </div>
        ) : null}

        {galleryPhotos.length === 0 ? (
          <AdminCard className="border-dashed p-10 text-center">
            <ImageIcon className="text-stone mx-auto mb-3 size-10" aria-hidden="true" />
            <p className="text-stone">Upload photos above to build the gallery.</p>
          </AdminCard>
        ) : visiblePhotos.length === 0 ? (
          <AdminCard className="border-dashed p-10 text-center">
            <p className="text-stone">No photos in this category yet.</p>
          </AdminCard>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visiblePhotos.map((photo) => (
              <li key={photo.id}>
                <PhotoCard
                  photo={photo}
                  pending={pending}
                  selectMode={selectMode}
                  selected={selected.has(photo.id)}
                  onSelect={() => toggleSelect(photo.id)}
                  onEdit={() => setEditing(photo)}
                  onToggle={() =>
                    run(
                      () => togglePublished("media", photo.id, !photo.published),
                      () => refreshPhoto(photo.id, { published: !photo.published }),
                    )
                  }
                  onDelete={() => setConfirmDelete(photo.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {editing ? (
        <EditDialog photo={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function photoForm(photo: AdminPhoto, overrides: { category?: string | null } = {}) {
  const fd = new FormData();
  fd.set("id", photo.id);
  fd.set("alt", photo.alt);
  fd.set("caption", photo.caption ?? "");
  const category =
    overrides.category === null ? "" : (overrides.category ?? photo.category ?? "");
  fd.set("category", category);
  if (photo.contains_people) fd.set("contains_people", "on");
  if (photo.release_on_file) fd.set("release_on_file", "on");
  return fd;
}

function form(entries: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.set(key, value);
  return fd;
}

function SectionSlotCard({
  slot,
  photo,
  photos,
  pending,
  onAssign,
  onClear,
}: {
  slot: SectionSlot;
  photo: AdminPhoto | null;
  photos: AdminPhoto[];
  pending: boolean;
  onAssign: (id: string) => void;
  onClear: () => void;
}) {
  const Icon = slot === "hero" ? ImageIcon : UtensilsCrossed;
  const choices = photos.filter((p) => !isSectionSlot(p.category) || p.category === slot);

  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="relative aspect-[16/10] bg-sage-wash">
        {photo?.url ? (
          <Image src={photo.url} alt="" fill className="object-cover" sizes="400px" />
        ) : (
          <div className="text-stone flex h-full flex-col items-center justify-center gap-2">
            <Icon className="size-8" aria-hidden="true" />
            <span className="text-[0.875rem]">Placeholder showing</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-4">
          <p className="font-display text-lg font-semibold text-white">
            {SECTION_SLOT_LABELS[slot]}
          </p>
          {photo ? (
            <p className="text-[0.8125rem] text-white/80">
              {photo.published ? "Live on the website" : "Hidden — turn on below"}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <Label htmlFor={`slot-${slot}`} className="text-[0.875rem]">
          Choose from your library
        </Label>
        <select
          id={`slot-${slot}`}
          disabled={pending || choices.length === 0}
          defaultValue={photo?.id ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            if (id) onAssign(id);
          }}
          className="border-rule-strong bg-paper min-h-11 w-full rounded border px-3 text-[0.9375rem]"
        >
          <option value="">Select a photo…</option>
          {choices.map((p) => (
            <option key={p.id} value={p.id}>
              {p.caption || p.alt.slice(0, 48)}
            </option>
          ))}
        </select>
        {photo ? (
          <button
            type="button"
            disabled={pending}
            onClick={onClear}
            className="text-stone hover:text-ink text-left text-[0.875rem] underline"
          >
            Remove from this section
          </button>
        ) : null}
      </div>
    </AdminCard>
  );
}

function UploadForm() {
  const [state, action, uploading] = useActionState(uploadPhoto, null);

  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state]);

  return (
    <AdminCard>
      <form action={action} className="grid gap-4">
        {state && !state.ok ? (
          <p className="text-[0.9375rem] text-[var(--danger)]" role="alert">
            {state.message}
          </p>
        ) : null}
        <div className="border-rule bg-sage-wash/60 flex flex-col items-center justify-center gap-3 rounded border border-dashed px-6 py-10">
          <Upload className="text-sage-deep size-8" aria-hidden="true" />
          <Label htmlFor="photo-file" className="text-sage-deep cursor-pointer font-semibold underline">
            Choose a photo
          </Label>
          <Input id="photo-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="max-w-xs" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="upload-alt" name="alt" label="Description for screen readers" required />
          <Field id="upload-caption" name="caption" label="Caption (optional)" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="upload-category">Where does this go?</Label>
          <select
            id="upload-category"
            name="category"
            defaultValue=""
            className="border-rule-strong bg-paper min-h-11 rounded border px-3"
          >
            <option value="">Gallery only</option>
            <option value="hero">Homepage hero</option>
            <option value="meals">Meals section</option>
            {GALLERY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                Gallery — {cat}
              </option>
            ))}
          </select>
        </div>

        <PrivacyFields idPrefix="upload" />

        <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
          {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Upload photo
        </Button>
      </form>
    </AdminCard>
  );
}

function PhotoCard({
  photo,
  pending,
  selectMode,
  selected,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
}: {
  photo: AdminPhoto;
  pending: boolean;
  selectMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const blocked = photo.contains_people && !photo.release_on_file;

  return (
    <AdminCard
      className={cn(
        "overflow-hidden p-0 transition-all",
        selected && "ring-2 ring-sage ring-offset-2",
      )}
    >
      <div className="relative aspect-[4/3] bg-sage-wash">
        {photo.url ? (
          <Image src={photo.url} alt="" fill className="object-cover" sizes="320px" />
        ) : (
          <div className="text-stone flex h-full items-center justify-center text-[0.875rem]">
            Preview unavailable
          </div>
        )}
        <span
          className={cn(
            "label absolute top-2 left-2 rounded px-2 py-1 text-[0.6875rem]",
            photo.published ? "bg-sage text-paper" : "bg-paper text-stone border-rule border",
          )}
        >
          {photo.published ? "Live" : "Hidden"}
        </span>

        {/* Bulk select overlay */}
        {selectMode ? (
          <button
            type="button"
            onClick={onSelect}
            className="absolute inset-0 flex items-end justify-end p-2"
            aria-label={selected ? "Deselect photo" : "Select photo"}
          >
            <span className={cn(
              "flex size-6 items-center justify-center rounded border-2 transition-colors",
              selected
                ? "border-sage bg-sage text-white"
                : "border-white bg-white/30 backdrop-blur-sm",
            )}>
              {selected ? <CheckSquare className="size-4" /> : null}
            </span>
          </button>
        ) : null}
      </div>
      <div className="grid gap-2 p-4">
        <p className="line-clamp-1 font-semibold">{photo.caption || "Untitled"}</p>
        <p className="text-stone line-clamp-2 text-[0.8125rem]">{photo.alt}</p>
        {photo.category && !isSectionSlot(photo.category) ? (
          <p className="label text-sage-deep text-[0.6875rem]">{photo.category}</p>
        ) : null}
        {blocked ? (
          <p className="text-[0.8125rem] text-[var(--warn)]">Needs a signed release</p>
        ) : null}
        {!selectMode ? (
          <div className="mt-1 flex flex-wrap gap-1">
            <AdminIconButton label="Edit" onClick={onEdit} disabled={pending}>
              <Pencil className="size-4" aria-hidden="true" />
            </AdminIconButton>
            <button
              type="button"
              disabled={pending || blocked}
              onClick={onToggle}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded border px-3 text-[0.8125rem] font-semibold",
                photo.published
                  ? "border-sage bg-sage-wash text-sage-deep"
                  : "border-rule text-stone",
              )}
            >
              {photo.published ? "On site" : "Show on site"}
            </button>
            <AdminIconButton label="Delete" onClick={onDelete} disabled={pending} destructive>
              <Trash2 className="size-4" aria-hidden="true" />
            </AdminIconButton>
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}

function EditDialog({ photo, onClose }: { photo: AdminPhoto; onClose: () => void }) {
  const [state, action, saving] = useActionState(updatePhoto, null);

  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-photo-title"
    >
      <AdminCard className="max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 shadow-xl">
        <h2 id="edit-photo-title" className="text-h3 mb-4 font-sans font-bold">
          Edit photo
        </h2>
        <form
          action={action}
          className="grid gap-4"
          onSubmit={() => {
            /* result handled below */
          }}
        >
          <input type="hidden" name="id" value={photo.id} />
          <Field id="edit-alt" name="alt" label="Description for screen readers" required defaultValue={photo.alt} />
          <Field id="edit-caption" name="caption" label="Caption" defaultValue={photo.caption ?? ""} />

          <div className="grid gap-1.5">
            <Label htmlFor="edit-category">Placement</Label>
            <select
              id="edit-category"
              name="category"
              defaultValue={photo.category ?? ""}
              className="border-rule-strong bg-paper min-h-11 rounded border px-3"
            >
              <option value="">Gallery only</option>
              <option value="hero">Homepage hero</option>
              <option value="meals">Meals section</option>
              {GALLERY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  Gallery — {cat}
                </option>
              ))}
            </select>
          </div>

          <PrivacyFields
            idPrefix="edit"
            containsPeople={photo.contains_people}
            releaseOnFile={photo.release_on_file}
          />

          {state && !state.ok ? (
            <p className="text-[0.9375rem] text-[var(--danger)]">{state.message}</p>
          ) : null}
          {state?.ok ? (
            <p className="text-sage-deep text-[0.9375rem]" role="status">
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save changes
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {state?.ok ? "Close" : "Cancel"}
            </Button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  required,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-stone font-normal"> (required)</span> : null}
      </Label>
      <Input id={id} name={name} required={required} defaultValue={defaultValue} />
    </div>
  );
}

function PrivacyFields({
  idPrefix,
  containsPeople,
  releaseOnFile,
}: {
  idPrefix: string;
  containsPeople?: boolean;
  releaseOnFile?: boolean;
}) {
  return (
    <fieldset className="border-rule rounded border p-4">
      <legend className="px-1 text-[0.875rem] font-semibold">Privacy</legend>
      <div className="mt-2 grid gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[0.9375rem]">
          <input
            id={`${idPrefix}-contains`}
            type="checkbox"
            name="contains_people"
            defaultChecked={containsPeople}
            className="size-4"
          />
          This photo shows a person
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[0.9375rem]">
          <input
            id={`${idPrefix}-release`}
            type="checkbox"
            name="release_on_file"
            defaultChecked={releaseOnFile}
            className="size-4"
          />
          Signed photo release on file
        </label>
      </div>
    </fieldset>
  );
}
