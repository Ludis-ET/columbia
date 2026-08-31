import { createClient } from "@/lib/db/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { PageEditor } from "@/components/admin/page-editor";

export const metadata = { title: "Pages" };

interface PageRow {
  id: string;
  slug: string;
  title: string;
  lead: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
}

export default async function PagesAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase?.from("pages").select("*").order("slug")) ?? { data: [] };
  const pages = (data ?? []) as PageRow[];

  return (
    <>
      <PageHeader
        title="Pages"
        lead="The heading and search-engine description for each page of the website."
        count={`${pages.length} pages`}
      />

      {pages.length === 0 ? (
        <EmptyState title="No pages yet">
          <p>If this is empty, the database seed did not run.</p>
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {pages.map((page) => (
            <PageEditor
              key={page.id}
              id={page.id}
              slug={page.slug}
              title={page.title}
              lead={page.lead}
              seoDescription={page.seo_description}
            />
          ))}
        </ul>
      )}
    </>
  );
}
