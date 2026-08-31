import type { MediaRow } from "@/lib/db/database.types";

/**
 * Media library helpers.
 *
 * Photos carry a `placements` list — hero, meals, gallery categories, or any
 * combination. The legacy `category` column is kept in sync with the first
 * gallery category for older queries until everything reads placements.
 */

export const SECTION_SLOTS = ["hero", "meals"] as const;
export type SectionSlot = (typeof SECTION_SLOTS)[number];

export const GALLERY_CATEGORIES = [
  "Living areas",
  "Dining & kitchen",
  "Bedrooms",
  "Outdoors",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export const SECTION_SLOT_LABELS: Record<SectionSlot, string> = {
  hero: "Homepage hero",
  meals: "Meals section",
};

export type PlacementGroup = "site" | "gallery";

export interface PlacementOption {
  id: string;
  label: string;
  group: PlacementGroup;
}

/** Every tag an owner can attach to a photograph. */
export const PLACEMENT_OPTIONS: PlacementOption[] = [
  { id: "hero", label: SECTION_SLOT_LABELS.hero, group: "site" },
  { id: "meals", label: SECTION_SLOT_LABELS.meals, group: "site" },
  ...GALLERY_CATEGORIES.map((cat) => ({ id: cat, label: cat, group: "gallery" as const })),
];

export function isSectionSlot(value: string | null | undefined): value is SectionSlot {
  return value === "hero" || value === "meals";
}

export function isGalleryCategory(value: string): value is GalleryCategory {
  return (GALLERY_CATEGORIES as readonly string[]).includes(value);
}

export function isGalleryItem(category: string | null | undefined): boolean {
  if (!category) return true;
  return !isSectionSlot(category);
}

type PlacementSource = {
  placements?: string[] | null;
  category?: string | null;
};

/** Resolved placement list — falls back to legacy category when needed. */
export function getPlacements(row: PlacementSource): string[] {
  if (Array.isArray(row.placements) && row.placements.length > 0) {
    return row.placements;
  }
  if (row.category) return [row.category];
  return [];
}

export function hasPlacement(row: PlacementSource, placement: string): boolean {
  return getPlacements(row).includes(placement);
}

export function galleryPlacements(row: PlacementSource): string[] {
  return getPlacements(row).filter(isGalleryCategory);
}

export function appearsInGallery(row: PlacementSource): boolean {
  const placements = getPlacements(row);
  if (placements.some(isGalleryCategory)) return true;
  return placements.length === 0 || isGalleryItem(row.category);
}

export function primaryGalleryCategory(row: PlacementSource): string | null {
  const fromPlacements = galleryPlacements(row)[0];
  if (fromPlacements) return fromPlacements;
  if (row.category && isGalleryCategory(row.category)) return row.category;
  if (row.category && isGalleryItem(row.category)) return row.category;
  return null;
}

export function syncLegacyCategory(placements: string[]): string | null {
  return placements.find(isGalleryCategory) ?? null;
}

export function placementLabel(id: string): string {
  return PLACEMENT_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

/** Public Supabase Storage URL for a row's `storage_path`. */
export function mediaPublicUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/media/${storagePath}`;
}

export type AdminPhoto = MediaRow & { url: string | null };

/** Map database rows to admin UI shape (server-safe). */
export function mapAdminPhotos(rows: MediaRow[]): AdminPhoto[] {
  return rows.map((row) => ({
    ...row,
    placements: row.placements ?? (row.category ? [row.category] : []),
    url: mediaPublicUrl(row.storage_path),
  }));
}

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
