import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { GalleryCategoryManager } from "@/components/admin/gallery-category-manager";

export const metadata = { title: "Gallery Categories" };

export default async function GalleryCategoriesAdminPage() {
  const supabase = await createClient();

  // Fetch all categories
  const { data: categoryRows } = (await supabase
    ?.from("gallery_categories")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  // Count photos per category by fetching all placements
  const { data: mediaRows } = (await supabase
    ?.from("media")
    .select("placements, category")) ?? { data: [] };

  const photoCounts: Record<string, number> = {};
  for (const row of mediaRows ?? []) {
    const placements: string[] = (row.placements as string[]) ?? (row.category ? [row.category] : []);
    for (const p of placements) {
      if (p !== "hero" && p !== "meals") {
        photoCounts[p] = (photoCounts[p] ?? 0) + 1;
      }
    }
  }

  const categories = (categoryRows ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    position: c.position as number,
    published: c.published as boolean,
    photoCount: photoCounts[c.name as string] ?? 0,
  }));

  const total = categories.length;

  return (
    <>
      <PageHeader
        title="Gallery categories"
        count={`${total} ${total === 1 ? "category" : "categories"}`}
      />
      <GalleryCategoryManager initialCategories={categories} />
    </>
  );
}
