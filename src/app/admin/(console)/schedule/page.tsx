import { createClient } from "@/lib/db/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow } from "@/components/admin/content-list";

export const metadata = { title: "Daily schedule" };

export default async function ScheduleAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("schedule_items")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: `${r.time_label as string} — ${r.title as string}`,
    meta: undefined,
    body: r.body as string,
    published: r.published as boolean,
  }));

  return (
    <>
      <PageHeader
        title="Daily schedule"
        lead="The day, hour by hour. This is what families read on “A Day in Our Home”."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No schedule yet">
          <p>All thirteen entries from your infographic should be here.</p>
        </EmptyState>
      ) : (
        <ContentList table="schedule_items" rows={rows} canDelete={true} />
      )}
    </>
  );
}
