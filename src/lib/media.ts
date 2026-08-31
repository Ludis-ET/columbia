/**
 * Media library helpers.
 *
 * Section slots (hero, meals) use reserved `category` values. Everything else
 * is gallery content filterable by the public Gallery component.
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

export function isSectionSlot(value: string | null | undefined): value is SectionSlot {
  return value === "hero" || value === "meals";
}

export function isGalleryItem(category: string | null | undefined): boolean {
  return !isSectionSlot(category);
}

/** Public Supabase Storage URL for a row's `storage_path`. */
export function mediaPublicUrl(storagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/media/${storagePath}`;
}

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const MEDIA_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
