import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Included every day" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "title", label: "What is included" },
  { name: "icon", label: "Icon name", placeholder: "shield, bowl, heart…" },
];

export default async function EveryDayAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("every_day")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    published: r.published as boolean,
    rawValues: {
      title: String(r.title ?? ""),
      icon: String(r.icon ?? ""),
    },
  }));

  return (
    <>
      <PageHeader
        title="Included every day"
        lead={`The round chips under "Included every single day" on the homepage.`}
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="Nothing listed yet">
          <p>All seven items from your infographic should be here after seeding.</p>
        </EmptyState>
      ) : (
        <ContentList
          table="every_day"
          rows={rows}
          canDelete={false}
          editableFields={EDITABLE_FIELDS}
        />
      )}
    </>
  );
}
