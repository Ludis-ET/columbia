import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { PhotoManager } from "@/components/admin/photo-manager";
import { mapAdminPhotos } from "@/lib/media";
import type { MediaRow } from "@/lib/db/database.types";

export const metadata = { title: "Photos" };

export default async function PhotosAdminPage() {
  const supabase = await createClient();

  const [mediaResult, categoriesResult] = await Promise.all([
    supabase
      ?.from("media")
      .select("*")
      .order("position", { ascending: true }),
    supabase
      ?.from("gallery_categories")
      .select("name")
      .eq("published", true)
      .order("position", { ascending: true }),
  ]);

  const photos = mapAdminPhotos(((mediaResult?.data ?? []) as MediaRow[]));
  const categories = (categoriesResult?.data ?? []).map((r) => r.name as string);
  const live = photos.filter((p) => p.published).length;

  return (
    <>
      <PageHeader
        title="Photos & gallery"
        count={`${live} live · ${photos.length} total`}
      />
      <PhotoManager initialPhotos={photos} categories={categories} />
    </>
  );
}
