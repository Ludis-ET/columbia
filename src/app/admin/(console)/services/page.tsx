import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow } from "@/components/admin/content-list";

export const metadata = { title: "Services" };

export default async function ServicesAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("services")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    meta: (r.has_detail_page as boolean) ? "Has its own page" : "Listed only",
    body: (r.summary as string | null) ?? undefined,
    published: r.published as boolean,
  }));

  return (
    <>
      <PageHeader
        title="Services"
        lead="The care and services shown on the website. These came from your brochure."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No services yet">
          <p>
            Your seven services should be here. If this is empty, the database seed did not run.
          </p>
        </EmptyState>
      ) : (
        <ContentList table="services" rows={rows} canDelete={false} />
      )}
    </>
  );
}
