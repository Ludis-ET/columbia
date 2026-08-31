import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { PhotoManager } from "@/components/admin/photo-manager";
import { mapAdminPhotos } from "@/lib/media";
import type { MediaRow } from "@/lib/db/database.types";

export const metadata = { title: "Photos" };

export default async function PhotosAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("media")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const photos = mapAdminPhotos((data ?? []) as MediaRow[]);
  const live = photos.filter((p) => p.published).length;

  return (
    <>
      <PageHeader
        title="Photos & gallery"
        count={`${live} live · ${photos.length} total`}
      />
      <PhotoManager initialPhotos={photos} />
    </>
  );
}
