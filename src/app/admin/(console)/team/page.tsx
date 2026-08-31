import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow } from "@/components/admin/content-list";

export const metadata = { title: "Team" };

export default async function TeamAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("team")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.name as string,
    meta: (r.role as string | null) ?? undefined,
    body: (r.bio as string | null) ?? undefined,
    published: r.published as boolean,
  }));

  return (
    <>
      <PageHeader
        title="Team"
        lead="The people who care for residents. Only add someone who is happy to be named."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No team members yet">
          <p>
            After real photographs of the home, a warm photo of the person who runs it is the
            strongest thing you can put on a care home website.
          </p>
          <p className="mt-3">Only add someone who has agreed to appear.</p>
        </EmptyState>
      ) : (
        <ContentList table="team" rows={rows} canDelete={true} />
      )}
    </>
  );
}
