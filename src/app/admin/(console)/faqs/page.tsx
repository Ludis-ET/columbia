import { createClient } from "@/lib/db/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow } from "@/components/admin/content-list";

export const metadata = { title: "Questions & answers" };

export default async function FaqsAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("faqs")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.question as string,
    body: r.answer as string,
    published: r.published as boolean,
  }));

  return (
    <>
      <PageHeader
        title="Questions & answers"
        lead="Answers to what families ask most. The Questions page appears once there is at least one."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No questions yet">
          <p>
            The Questions page is hidden until you add at least one answer, so nobody lands on an
            empty page.
          </p>
          <p className="mt-3">
            Start with what families ask on the phone: what it costs, who you can care for, whether
            you take Medicaid, and what happens if someone&rsquo;s needs change.
          </p>
        </EmptyState>
      ) : (
        <ContentList table="faqs" rows={rows} canDelete={true} />
      )}
    </>
  );
}
