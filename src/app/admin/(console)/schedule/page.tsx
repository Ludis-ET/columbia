import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Daily schedule" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "time_label", label: "Time label", placeholder: 'e.g. "7:00 AM"' },
  { name: "title", label: "Activity title" },
  { name: "body", label: "Description", multiline: true },
];

export default async function ScheduleAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("schedule_items")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: `${r.time_label as string}  ${r.title as string}`,
    meta: undefined,
    body: r.body as string,
    published: r.published as boolean,
    rawValues: {
      time_label: String(r.time_label ?? ""),
      title: String(r.title ?? ""),
      body: String(r.body ?? ""),
    },
  }));

  return (
    <>
      <PageHeader
        title="Daily schedule"
        lead={`The day, hour by hour. This is what families read on \u201cA Day in Our Home\u201d.`}
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No schedule yet">
          <p>All thirteen entries from your infographic should be here.</p>
        </EmptyState>
      ) : (
        <ContentList
          table="schedule_items"
          rows={rows}
          canDelete={false}
          editableFields={EDITABLE_FIELDS}
        />
      )}
    </>
  );
}
