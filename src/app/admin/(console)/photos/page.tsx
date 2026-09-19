import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { PhotoManager } from "@/components/admin/photo-manager";
import { mapAdminPhotos } from "@/lib/media";
import type { MediaRow } from "@/lib/db/database.types";

import { galleryImages } from "@/lib/images";

export const metadata = { title: "Photos" };

export default async function PhotosAdminPage() {
  const supabase = await createClient();

  const [mediaResult, categoriesResult] = await Promise.all([
    supabase?.from("media").select("*").order("position", { ascending: true }),
    supabase
      ?.from("gallery_categories")
      .select("name")
      .eq("published", true)
      .order("position", { ascending: true }),
  ]);

  let photos = mapAdminPhotos((mediaResult?.data ?? []) as MediaRow[]);

  // If the database has no photos yet, seamlessly populate with the authentic site photos
  if (photos.length === 0) {
    photos = galleryImages.map((img, idx) => ({
      id: `fallback-${idx + 1}`,
      storage_path: img.src,
      url: img.src,
      alt: img.alt,
      caption: img.caption ?? null,
      category: img.category ?? null,
      placements: img.category ? [img.category] : [],
      width: null,
      height: null,
      blur_data_url: null,
      contains_people: false,
      release_on_file: false,
      position: idx,
      featured: idx === 0,
      published: true,
    }));
  }

  const dbCategories = (categoriesResult?.data ?? []).map((r) => r.name as string);
  const categories =
    dbCategories.length > 0
      ? dbCategories
      : ["Living areas", "Dining & kitchen", "Bedrooms", "Outdoors", "Entrance", "Restroom"];

  const live = photos.filter((p) => p.published).length;

  return (
    <>
      <PageHeader title="Photos & gallery" count={`${live} live · ${photos.length} total`} />
      <PhotoManager initialPhotos={photos} categories={categories} />
    </>
  );
}
