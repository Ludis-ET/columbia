import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { PagesAdminList } from "@/components/admin/pages-admin-list";

export const metadata = { title: "Pages" };

export default async function PagesAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("pages")
    .select("*")
    .order("slug", { ascending: true })) ?? { data: [] };

  const pages = (data ?? []) as {
    id: string;
    slug: string;
    title: string;
    lead: string | null;
    seo_description: string | null;
    published: boolean;
  }[];

  return (
    <>
      <PageHeader
        title="Pages"
        lead="Headings and search descriptions for each page. Most of your site is on the homepage; these matter for Google and for any separate routes."
        count={`${pages.filter((p) => p.published).length} of ${pages.length} showing`}
      />

      {pages.length === 0 ? (
        <EmptyState title="No pages yet">
          <p>Seven page records should exist after seeding.</p>
        </EmptyState>
      ) : (
        <PagesAdminList pages={pages} />
      )}
    </>
  );
}
