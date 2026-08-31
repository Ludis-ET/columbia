"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  CheckSquare,
  Eye,
  EyeOff,
  Home,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Pencil,
  Search,
  Square,
  Tag,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  bulkDeletePhotos,
  bulkPublishPhotos,
  bulkTagPhotos,
  deletePhoto,
  togglePhotoPlacement,
  togglePublished,
  updatePhoto,
  uploadPhotos,
  type ActionResult,
} from "@/app/admin/actions";
import { AdminCard } from "@/components/admin/cards";
import { AdminIconButton, Toast } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GALLERY_CATEGORIES,
  getPlacements,
  hasPlacement,
  PLACEMENT_OPTIONS,
  type AdminPhoto,
} from "@/lib/media";
import { cn } from "@/lib/utils";

const FILTER_TABS = [
  { id: "all", label: "All photos", icon: LayoutGrid },
  { id: "hero", label: "Hero", icon: Home },
  { id: "meals", label: "Meals", icon: UtensilsCrossed },
  ...GALLERY_CATEGORIES.map((cat) => ({ id: cat, label: cat, icon: ImageIcon })),
  { id: "uncategorised", label: "Untagged", icon: ImageIcon },
] as const;

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  title = "Delete photo",
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="admin-scrim fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-paper-raise border-rule w-full max-w-sm rounded-xl border p-6 shadow-xl">
        <h2 id="confirm-title" className="mb-3 font-semibold">
          {title}
        </h2>
        <p className="text-stone mb-5 text-[0.9375rem]">{message}</p>
        <div className="flex gap-3">
          <Button variant="destructive" onClick={onConfirm} className="flex-1">
            {confirmLabel}
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
// Main library
// ---------------------------------------------------------------------------

export function PhotoManager({ initialPhotos }: { initialPhotos: AdminPhoto[] }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [editing, setEditing] = useState<AdminPhoto | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | "bulk" | null>(null);
  const [tagMode, setTagMode] = useState<"add" | "remove">("add");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => a.position - b.position),
    [photos],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: photos.length };
    for (const tab of FILTER_TABS) {
      if (tab.id === "all") continue;
      if (tab.id === "uncategorised") {
        counts.uncategorised = photos.filter((p) => getPlacements(p).length === 0).length;
        continue;
      }
      counts[tab.id] = photos.filter((p) => hasPlacement(p, tab.id)).length;
    }
    return counts;
  }, [photos]);

  const visiblePhotos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedPhotos.filter((photo) => {
      if (activeFilter === "uncategorised") {
        if (getPlacements(photo).length > 0) return false;
      } else if (activeFilter !== "all") {
        if (!hasPlacement(photo, activeFilter)) return false;
      }
      if (!q) return true;
      const haystack = `${photo.caption ?? ""} ${photo.alt}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sortedPhotos, activeFilter, query]);

  const liveCount = photos.filter((p) => p.published).length;

  function announce(result: ActionResult) {
    setToast(result);
    if (result.ok) setTimeout(() => setToast(null), 4000);
  }

  function refreshPhoto(id: string, patch: Partial<AdminPhoto>) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
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

  function selectAllVisible() {
    setSelected(new Set(visiblePhotos.map((p) => p.id)));
    setSelectMode(true);
  }

  function clearSelection() {
    setSelected(new Set());
    setSelectMode(false);
  }

  function runBulkDelete() {
    const ids = Array.from(selected);
    run(
      () => bulkDeletePhotos(ids),
      () => {
        setPhotos((prev) => prev.filter((p) => !selected.has(p.id)));
        if (editing && selected.has(editing.id)) setEditing(null);
        clearSelection();
      },
    );
  }

  function bulkToggleTag(placement: string) {
    const ids = Array.from(selected);

    run(
      () => bulkTagPhotos(ids, [placement], tagMode),
      () => {
        setPhotos((prev) =>
          prev.map((p) => {
            if (!selected.has(p.id)) return p;
            let placements = getPlacements(p);
            if (tagMode === "add") {
              if (!placements.includes(placement)) placements = [...placements, placement];
            } else {
              placements = placements.filter((item) => item !== placement);
            }
            return { ...p, placements };
          }),
        );
      },
    );
  }

  /** Tags shared by every selected photo — shown as active in bulk tag mode. */
  const sharedTags = useMemo(() => {
    if (selected.size === 0) return new Set<string>();
    const ids = Array.from(selected);
    const first = photos.find((p) => p.id === ids[0]);
    if (!first) return new Set<string>();
    return new Set(
      getPlacements(first).filter((tag) =>
        ids.every((id) => {
          const photo = photos.find((p) => p.id === id);
          return photo && hasPlacement(photo, tag);
        }),
      ),
    );
  }, [photos, selected]);

  function runBulk(publishedVal: boolean) {
    run(
      () => bulkPublishPhotos(Array.from(selected), publishedVal),
      () => {
        setPhotos((prev) =>
          prev.map((p) => (selected.has(p.id) ? { ...p, published: publishedVal } : p)),
        );
        clearSelection();
      },
    );
  }

  function togglePlacement(id: string, placement: string, enabled: boolean) {
    run(
      () => togglePhotoPlacement(id, placement, enabled),
      () => {
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const current = getPlacements(p);
            const placements = enabled
              ? current.includes(placement)
                ? current
                : [...current, placement]
              : current.filter((item) => item !== placement);
            return { ...p, placements };
          }),
        );
      },
    );
  }

  return (
    <div className="grid gap-8">
      <Toast result={toast} />

      {confirmDelete ? (
        <ConfirmDialog
          title={confirmDelete === "bulk" ? "Delete selected photos" : "Delete photo"}
          message={
            confirmDelete === "bulk"
              ? `Delete ${selected.size} photo${selected.size === 1 ? "" : "s"} from your library and storage? This cannot be undone.`
              : "This will permanently delete the photo from your library and storage. This cannot be undone."
          }
          onConfirm={() => {
            if (confirmDelete === "bulk") {
              setConfirmDelete(null);
              runBulkDelete();
              return;
            }
            const id = confirmDelete;
            setConfirmDelete(null);
            run(
              () => deletePhoto(id),
              () => {
                removePhoto(id);
                if (editing?.id === id) setEditing(null);
              },
            );
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}

      <UploadZone />

      <section aria-labelledby="library-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="library-heading" className="text-h3 font-sans font-bold">
              Your library
            </h2>
            <p className="text-stone mt-1 text-[0.9375rem]">
              {liveCount} live on the website · {photos.length} in your library
            </p>
          </div>
          <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
            <Search
              className="text-stone pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search captions and descriptions…"
              className="border-rule-strong bg-paper-raise min-h-11 pl-9"
              aria-label="Search photos"
            />
          </div>
        </div>

        <div className="border-rule bg-paper-raise mb-5 flex flex-wrap items-center gap-2 rounded-xl border p-2">
          <div
            className="flex flex-1 flex-wrap gap-1"
            role="tablist"
            aria-label="Filter library"
          >
            {FILTER_TABS.filter(({ id }) => id === "all" || (filterCounts[id] ?? 0) > 0).map(
              ({ id, label, icon: Icon }) => {
                const active = activeFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveFilter(id)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-[0.875rem] transition-all",
                      active
                        ? "bg-ink text-paper font-semibold shadow-sm"
                        : "text-stone hover:bg-sage-wash hover:text-sage-deep",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
                    {label}
                    <span
                      className={cn(
                        "tabular-nums text-[0.75rem]",
                        active ? "text-paper/75" : "text-stone",
                      )}
                    >
                      {filterCounts[id] ?? 0}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectMode) clearSelection();
              else setSelectMode(true);
            }}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-[0.875rem] transition-colors",
              selectMode
                ? "border-sage bg-sage-wash text-sage-deep font-semibold"
                : "border-rule text-stone hover:border-sage/60",
            )}
          >
            {selectMode ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            {selectMode ? "Selecting…" : "Select"}
          </button>
        </div>

        {selectMode ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={visiblePhotos.length === 0}
              className="text-sage-deep hover:text-ink inline-flex min-h-10 items-center text-[0.875rem] font-semibold underline disabled:opacity-50"
            >
              Select all {activeFilter === "all" ? "" : "visible"} ({visiblePhotos.length})
            </button>
            {selected.size > 0 ? (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-stone hover:text-ink inline-flex min-h-10 items-center text-[0.875rem] underline"
              >
                Clear selection
              </button>
            ) : null}
          </div>
        ) : null}

        {selectMode && selected.size > 0 ? (
          <div className="bg-sage-wash border-sage mb-5 grid gap-4 rounded-xl border px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sage-deep font-semibold">{selected.size} selected</span>
              <Button size="dense" onClick={() => runBulk(true)} disabled={pending}>
                Show on website
              </Button>
              <Button size="dense" variant="outline" onClick={() => runBulk(false)} disabled={pending}>
                Hide
              </Button>
              <Button
                size="dense"
                variant="destructive"
                onClick={() => setConfirmDelete("bulk")}
                disabled={pending}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-stone hover:text-ink ml-auto inline-flex min-h-10 items-center gap-1"
              >
                <X className="size-4" aria-hidden="true" />
                Done
              </button>
            </div>

            <div className="border-sage/40 border-t pt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tag className="text-sage-deep size-4" aria-hidden="true" />
                  <p className="font-semibold">Tag selected photos</p>
                </div>
                <div
                  className="border-rule inline-flex rounded-lg border p-0.5"
                  role="group"
                  aria-label="Tag mode"
                >
                  <button
                    type="button"
                    aria-pressed={tagMode === "add"}
                    onClick={() => setTagMode("add")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors",
                      tagMode === "add"
                        ? "bg-paper-raise text-sage-deep shadow-sm"
                        : "text-stone hover:text-ink",
                    )}
                  >
                    Add tags
                  </button>
                  <button
                    type="button"
                    aria-pressed={tagMode === "remove"}
                    onClick={() => setTagMode("remove")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors",
                      tagMode === "remove"
                        ? "bg-paper-raise text-sage-deep shadow-sm"
                        : "text-stone hover:text-ink",
                    )}
                  >
                    Remove tags
                  </button>
                </div>
              </div>
              <p className="text-stone mb-3 text-[0.8125rem]">
                {tagMode === "add"
                  ? "Tap a tag to add it to every selected photo."
                  : "Tap a tag to remove it from every selected photo."}
                {sharedTags.size > 0
                  ? " Tags on all selected photos appear filled in."
                  : null}
              </p>
              <PlacementPicker
                selected={sharedTags}
                onToggle={bulkToggleTag}
                disabled={pending}
                compact
              />
            </div>
          </div>
        ) : null}

        {photos.length === 0 ? (
          <AdminCard className="border-dashed p-12 text-center">
            <ImageIcon className="text-stone mx-auto mb-3 size-12" aria-hidden="true" />
            <p className="text-stone text-[1.05rem]">Your library is empty.</p>
            <p className="text-stone mt-1 text-[0.9375rem]">
              Upload a photograph above — it will appear here instantly.
            </p>
          </AdminCard>
        ) : visiblePhotos.length === 0 ? (
          <AdminCard className="border-dashed p-10 text-center">
            <p className="text-stone">No photos match this filter.</p>
          </AdminCard>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visiblePhotos.map((photo) => (
              <li key={photo.id}>
                <PhotoTile
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
                  onTogglePlacement={togglePlacement}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing ? <EditDialog photo={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload zone
// ---------------------------------------------------------------------------

interface PendingUpload {
  id: string;
  file: File;
  preview: string;
  alt: string;
  caption: string;
}

function altFromFilename(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function UploadZone() {
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedPlacements, setSelectedPlacements] = useState<Set<string>>(new Set());
  const [containsPeople, setContainsPeople] = useState(false);
  const [releaseOnFile, setReleaseOnFile] = useState(false);
  const [uploading, startUpload] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const active = pending.find((p) => p.id === activeId) ?? pending[0] ?? null;

  const clearPending = useCallback(() => {
    setPending((current) => {
      for (const item of current) URL.revokeObjectURL(item.preview);
      return [];
    });
    setActiveId(null);
  }, []);

  useEffect(() => () => clearPending(), [clearPending]);

  const addFiles = useCallback((list: FileList | File[], append = false) => {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (incoming.length === 0) return;

    setPending((current) => {
      const kept = append ? current : (current.forEach((i) => URL.revokeObjectURL(i.preview)), []);
      const room = Math.max(0, 24 - kept.length);
      const slice = incoming.slice(0, room);
      const nextItems = slice.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        alt: altFromFilename(file.name),
        caption: "",
      }));
      const merged = [...kept, ...nextItems];
      setActiveId((prev) =>
        prev && merged.some((p) => p.id === prev) ? prev : (merged[0]?.id ?? null),
      );
      return merged;
    });
  }, []);

  function updatePending(id: string, patch: Partial<Pick<PendingUpload, "alt" | "caption">>) {
    setPending((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function removePending(id: string) {
    setPending((current) => {
      const target = current.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      const next = current.filter((p) => p.id !== id);
      setActiveId((prev) => {
        if (prev !== id) return prev;
        return next[0]?.id ?? null;
      });
      return next;
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files, pending.length > 0);
  }

  function toggleUploadPlacement(id: string) {
    setSelectedPlacements((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function submitUpload() {
    if (pending.length === 0) return;

    const missingAlt = pending.find((p) => !p.alt.trim());
    if (missingAlt) {
      setToast({
        ok: false,
        message: `Add a description for "${missingAlt.file.name}" before uploading.`,
      });
      setActiveId(missingAlt.id);
      return;
    }

    startUpload(async () => {
      let uploaded = 0;

      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        setUploadProgress({ done: i + 1, total: pending.length });

        const fd = new FormData();
        fd.append("files", item.file);
        fd.append("alt_0", item.alt.trim());
        if (item.caption.trim()) fd.append("caption_0", item.caption.trim());
        selectedPlacements.forEach((placement) => fd.append("placements", placement));
        if (containsPeople) fd.set("contains_people", "on");
        if (releaseOnFile) fd.set("release_on_file", "on");

        const result = await uploadPhotos(null, fd);
        if (!result.ok) {
          setUploadProgress(null);
          setToast({
            ok: false,
            message:
              uploaded > 0
                ? `${result.message} (${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded before this one failed.)`
                : result.message,
          });
          if (uploaded > 0) window.location.reload();
          return;
        }

        uploaded += 1;
      }

      setUploadProgress(null);
      setToast({
        ok: true,
        message: uploaded === 1 ? "1 photo uploaded." : `${uploaded} photos uploaded.`,
      });
      clearPending();
      setSelectedPlacements(new Set());
      setContainsPeople(false);
      setReleaseOnFile(false);
      window.location.reload();
    });
  }

  return (
    <section aria-labelledby="upload-heading">
      <Toast result={toast} />

      <div className="mb-4">
        <h2 id="upload-heading" className="font-display text-h2 text-ink">
          Add to your library
        </h2>
        <p className="text-stone mt-1 max-w-[52ch] text-[0.9375rem]">
          Drop one or many photographs, preview them large, then upload together. Tag for the hero,
          meals, or gallery — you can refine each photo later.
        </p>
      </div>

      <AdminCard className="overflow-hidden p-0 shadow-md">
        <div className="grid xl:grid-cols-[1.25fr_1fr]">
          <div
            role="button"
            tabIndex={0}
            aria-label="Drop photos here or press Enter to browse files"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "relative flex min-h-[22rem] flex-col border-b xl:min-h-[28rem] xl:border-r xl:border-b-0",
              "bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--sage-wash)_90%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_80%,color-mix(in_srgb,var(--sage)_12%,transparent),transparent_50%)]",
              dragOver && "ring-sage bg-sage-wash/80 ring-2 ring-inset",
            )}
          >
            {active ? (
              <div className="flex flex-1 flex-col p-4 sm:p-6">
                <div className="border-rule relative min-h-[14rem] flex-1 overflow-hidden rounded-xl border bg-[#0a0f13]/5 shadow-inner sm:min-h-[18rem] xl:min-h-[20rem]">
                  <Image
                    src={active.preview}
                    alt=""
                    fill
                    unoptimized
                    className="object-contain p-1"
                    sizes="(max-width: 1280px) 100vw, 60vw"
                    priority
                  />
                </div>

                {pending.length > 1 ? (
                  <ul
                    className="mt-4 flex gap-2 overflow-x-auto pb-1"
                    aria-label="Selected photos"
                  >
                    {pending.map((item) => {
                      const selected = item.id === active.id;
                      return (
                        <li key={item.id} className="shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveId(item.id)}
                            aria-pressed={selected}
                            className={cn(
                              "border-rule relative size-16 overflow-hidden rounded-lg border transition-all sm:size-20",
                              selected && "ring-sage ring-2 ring-offset-2",
                            )}
                          >
                            <Image
                              src={item.preview}
                              alt=""
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="80px"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{active.file.name}</p>
                    <p className="text-stone text-[0.8125rem]">
                      {(active.file.size / (1024 * 1024)).toFixed(1)} MB
                      {pending.length > 1 ? ` · ${pending.length} photos selected` : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePending(active.id)}
                    className="text-stone hover:text-ink inline-flex min-h-10 items-center gap-1 text-[0.875rem] underline"
                  >
                    <X className="size-4" aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12">
                <div
                  className={cn(
                    "flex size-16 items-center justify-center rounded-full border shadow-sm transition-transform",
                    dragOver ? "border-sage bg-paper scale-105" : "border-rule bg-paper-raise",
                  )}
                >
                  <Upload className="text-sage-deep size-7" aria-hidden="true" strokeWidth={1.6} />
                </div>
                <div className="text-center">
                  <p className="font-display text-[1.35rem] font-semibold">
                    {dragOver ? "Release to add photos" : "Drop photos here"}
                  </p>
                  <p className="text-stone mt-1 text-[0.875rem]">
                    JPEG, PNG, WebP or AVIF · up to 8 MB each · 24 at a time
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="border-rule bg-paper-raise text-sage-deep hover:border-sage inline-flex min-h-11 items-center rounded-lg border px-5 text-[0.9375rem] font-semibold shadow-sm transition-colors"
                >
                  Browse files
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              id="photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="grid gap-5 p-6 lg:p-8">
            {pending.length === 0 ? (
              <p className="text-stone text-[0.9375rem]">
                Choose photos on the left to add descriptions and tags before uploading.
              </p>
            ) : (
              <>
                {pending.length === 1 ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="upload-alt-0">
                        Description for screen readers <span className="text-stone">(required)</span>
                      </Label>
                      <Input
                        id="upload-alt-0"
                        value={pending[0].alt}
                        onChange={(e) => updatePending(pending[0].id, { alt: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="upload-caption-0">Caption (optional)</Label>
                      <Input
                        id="upload-caption-0"
                        value={pending[0].caption}
                        onChange={(e) => updatePending(pending[0].id, { caption: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <fieldset className="border-rule rounded-lg border p-4">
                    <legend className="px-1 text-[0.875rem] font-semibold">
                      Descriptions for each photo
                    </legend>
                    <ul className="mt-3 grid max-h-64 gap-3 overflow-y-auto pr-1">
                      {pending.map((item, index) => (
                        <li key={item.id} className="grid gap-2 sm:grid-cols-[4.5rem_1fr]">
                          <div className="border-rule relative size-16 overflow-hidden rounded-md border sm:size-[4.5rem]">
                            <Image
                              src={item.preview}
                              alt=""
                              fill
                              unoptimized
                              className="object-cover"
                              sizes="72px"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`upload-alt-${index}`} className="text-[0.8125rem]">
                              Photo {index + 1} · {item.file.name}
                            </Label>
                            <Input
                              id={`upload-alt-${index}`}
                              value={item.alt}
                              onChange={(e) => updatePending(item.id, { alt: e.target.value })}
                              required
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </fieldset>
                )}

                <fieldset>
                  <legend className="label text-stone mb-2">Where should these appear?</legend>
                  <p className="text-stone mb-3 text-[0.8125rem]">
                    Applied to every photo in this batch. Change individual photos later in the
                    library.
                  </p>
                  <PlacementPicker
                    selected={selectedPlacements}
                    onToggle={toggleUploadPlacement}
                    disabled={uploading}
                  />
                </fieldset>

                <fieldset className="border-rule rounded-lg border p-4">
                  <legend className="px-1 text-[0.875rem] font-semibold">Privacy</legend>
                  <div className="mt-2 grid gap-2">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[0.9375rem]">
                      <input
                        type="checkbox"
                        checked={containsPeople}
                        onChange={(e) => setContainsPeople(e.target.checked)}
                        className="size-4"
                      />
                      These photos show a person
                    </label>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[0.9375rem]">
                      <input
                        type="checkbox"
                        checked={releaseOnFile}
                        onChange={(e) => setReleaseOnFile(e.target.checked)}
                        className="size-4"
                      />
                      Signed photo release on file
                    </label>
                  </div>
                </fieldset>

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={uploading || pending.length === 0}
                    onClick={submitUpload}
                    className="w-full sm:w-auto"
                  >
                    {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                    {uploading && uploadProgress
                      ? `Uploading ${uploadProgress.done} of ${uploadProgress.total}…`
                      : uploading
                        ? "Uploading…"
                        : pending.length === 1
                          ? "Add to library"
                          : `Add ${pending.length} photos`}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={clearPending}
                  >
                    Clear
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </AdminCard>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Photo tile
// ---------------------------------------------------------------------------

function PhotoTile({
  photo,
  pending,
  selectMode,
  selected,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
  onTogglePlacement,
}: {
  photo: AdminPhoto;
  pending: boolean;
  selectMode: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onTogglePlacement: (id: string, placement: string, enabled: boolean) => void;
}) {
  const blocked = photo.contains_people && !photo.release_on_file;
  const placements = getPlacements(photo);

  return (
    <article
      className={cn(
        "border-rule bg-paper-raise group overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md",
        selected && "ring-sage ring-2 ring-offset-2",
      )}
    >
      <div className="bg-sage-wash relative aspect-[4/3] overflow-hidden">
        {photo.url ? (
          <Image
            src={photo.url}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="280px"
          />
        ) : (
          <div className="text-stone flex h-full items-center justify-center text-[0.875rem]">
            Preview unavailable
          </div>
        )}

        <div className="from-ink/70 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-3 pt-10">
          <p className="line-clamp-1 text-[0.875rem] font-semibold text-white">
            {photo.caption || "Untitled"}
          </p>
        </div>

        <span
          className={cn(
            "label absolute top-2 left-2 rounded-md px-2 py-1 text-[0.6875rem] shadow-sm",
            photo.published ? "bg-sage text-paper" : "bg-paper text-stone border-rule border",
          )}
        >
          {photo.published ? "Live" : "Hidden"}
        </span>

        {selectMode ? (
          <button
            type="button"
            onClick={onSelect}
            className="absolute inset-0 flex items-start justify-end p-2"
            aria-label={selected ? "Deselect photo" : "Select photo"}
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-md border-2 transition-colors",
                selected
                  ? "border-sage bg-sage text-white"
                  : "border-white/80 bg-black/20 backdrop-blur-sm",
              )}
            >
              {selected ? <CheckSquare className="size-4" /> : null}
            </span>
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 p-3">
        <p className="text-stone line-clamp-2 text-[0.8125rem] leading-snug">{photo.alt}</p>

        {blocked ? (
          <p className="text-[0.8125rem] text-[var(--warn)]">Needs a signed release</p>
        ) : null}

        <PlacementPicker
          selected={new Set(placements)}
          onToggle={(id) => onTogglePlacement(photo.id, id, !placements.includes(id))}
          disabled={pending || selectMode}
          compact
        />

        {!selectMode ? (
          <div className="flex flex-wrap gap-1 border-t border-[color-mix(in_srgb,var(--rule)_70%,transparent)] pt-2">
            <AdminIconButton label="Edit details" onClick={onEdit} disabled={pending}>
              <Pencil className="size-4" aria-hidden="true" />
            </AdminIconButton>
            <button
              type="button"
              disabled={pending || blocked}
              onClick={onToggle}
              className={cn(
                "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-[0.8125rem] font-semibold",
                photo.published
                  ? "border-sage bg-sage-wash text-sage-deep"
                  : "border-rule text-stone hover:text-ink",
              )}
            >
              {photo.published ? (
                <Eye className="size-4" aria-hidden="true" />
              ) : (
                <EyeOff className="size-4" aria-hidden="true" />
              )}
              {photo.published ? "On site" : "Show on site"}
            </button>
            <AdminIconButton label="Delete" onClick={onDelete} disabled={pending} destructive>
              <Trash2 className="size-4" aria-hidden="true" />
            </AdminIconButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Placement picker (shared upload + tiles + edit)
// ---------------------------------------------------------------------------

function PlacementPicker({
  selected,
  onToggle,
  disabled,
  compact,
  name,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
  compact?: boolean;
  name?: string;
}) {
  const site = PLACEMENT_OPTIONS.filter((p) => p.group === "site");
  const gallery = PLACEMENT_OPTIONS.filter((p) => p.group === "gallery");

  return (
    <div className={cn("grid gap-2", compact ? "gap-1.5" : "gap-3")}>
      {!compact ? (
        <>
          <PlacementGroup label="On the home page" options={site} {...{ selected, onToggle, disabled, name }} />
          <PlacementGroup label="In the gallery" options={gallery} {...{ selected, onToggle, disabled, name }} />
        </>
      ) : (
        <div className="flex flex-wrap gap-1">
          {PLACEMENT_OPTIONS.map((option) => (
            <PlacementChip
              key={option.id}
              option={option}
              active={selected.has(option.id)}
              onClick={() => onToggle(option.id)}
              disabled={disabled}
              name={name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlacementGroup({
  label,
  options,
  selected,
  onToggle,
  disabled,
  name,
}: {
  label: string;
  options: typeof PLACEMENT_OPTIONS;
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div>
      <p className="label text-stone mb-1.5 text-[0.625rem]">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <PlacementChip
            key={option.id}
            option={option}
            active={selected.has(option.id)}
            onClick={() => onToggle(option.id)}
            disabled={disabled}
            name={name}
          />
        ))}
      </div>
    </div>
  );
}

function PlacementChip({
  option,
  active,
  onClick,
  disabled,
  name,
}: {
  option: (typeof PLACEMENT_OPTIONS)[number];
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <>
      {name && active ? <input type="hidden" name={name} value={option.id} /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "inline-flex min-h-8 items-center rounded-full border px-2.5 text-[0.75rem] font-semibold transition-colors",
          active
            ? "border-sage bg-sage-wash text-sage-deep"
            : "border-rule text-stone hover:border-sage/60 hover:text-sage-deep",
          compactSize(option.id),
        )}
      >
        {option.label}
      </button>
    </>
  );
}

function compactSize(id: string): string {
  if (id === "hero" || id === "meals") return "";
  return "max-w-full truncate";
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

function EditDialog({ photo, onClose }: { photo: AdminPhoto; onClose: () => void }) {
  const [state, action, saving] = useActionState(updatePhoto, null);
  const [placements, setPlacements] = useState<Set<string>>(new Set(getPlacements(photo)));

  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state]);

  return (
    <div
      className="admin-scrim fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-photo-title"
    >
      <AdminCard className="max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 shadow-xl">
        <h2 id="edit-photo-title" className="text-h3 mb-4 font-sans font-bold">
          Photo details
        </h2>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="id" value={photo.id} />
          {Array.from(placements).map((p) => (
            <input key={p} type="hidden" name="placements" value={p} />
          ))}

          {photo.url ? (
            <div className="border-rule relative aspect-video overflow-hidden rounded-lg border">
              <Image src={photo.url} alt="" fill className="object-cover" sizes="480px" />
            </div>
          ) : null}

          <Field
            id="edit-alt"
            name="alt"
            label="Description for screen readers"
            required
            defaultValue={photo.alt}
          />
          <Field
            id="edit-caption"
            name="caption"
            label="Caption"
            defaultValue={photo.caption ?? ""}
          />

          <fieldset>
            <legend className="label text-stone mb-2">Appearances on the website</legend>
            <PlacementPicker
              selected={placements}
              onToggle={(id) =>
                setPlacements((prev) => {
                  const s = new Set(prev);
                  if (s.has(id)) s.delete(id);
                  else s.add(id);
                  return s;
                })
              }
              disabled={saving}
            />
          </fieldset>

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

// ---------------------------------------------------------------------------
// Shared fields
// ---------------------------------------------------------------------------

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
    <fieldset className="border-rule rounded-lg border p-4">
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
