import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Why families choose us" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "text", label: "Reason", multiline: true },
];

export default async function WhyFamiliesAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("why_families")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.text as string,
    published: r.published as boolean,
    rawValues: {
      text: String(r.text ?? ""),
    },
  }));

  return (
    <>
      <PageHeader
        title="Why families choose us"
        lead="The four reasons shown in the About section on the homepage."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No reasons yet">
          <p>The four brochure bullets should appear here after <code>pnpm db:seed</code>.</p>
        </EmptyState>
      ) : (
        <ContentList
          table="why_families"
          rows={rows}
          canDelete={false}
          editableFields={EDITABLE_FIELDS}
        />
      )}
    </>
  );
}
