import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Care types" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "title", label: "Full title" },
  { name: "short_title", label: "Short title on the card" },
  {
    name: "summary",
    label: "One or two sentences on the card",
    multiline: true,
    placeholder: "Short description shown on the homepage card.",
  },
  { name: "icon", label: "Icon name", placeholder: "house, heart, people…" },
];

export default async function CareTypesAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("care_types")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    meta: r.short_title as string,
    body: (r.summary as string | null) ?? undefined,
    published: r.published as boolean,
    rawValues: {
      title: String(r.title ?? ""),
      short_title: String(r.short_title ?? ""),
      summary: String(r.summary ?? ""),
      icon: String(r.icon ?? ""),
    },
  }));

  return (
    <>
      <PageHeader
        title="Care types"
        lead="The three cards at the top of the Care section on the homepage."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No care types yet">
          <p>
            The three brochure chips should be here. Run <code>pnpm db:seed</code> if this is empty.
          </p>
        </EmptyState>
      ) : (
        <ContentList
          table="care_types"
          rows={rows}
          canDelete={false}
          editableFields={EDITABLE_FIELDS}
        />
      )}
    </>
  );
}
