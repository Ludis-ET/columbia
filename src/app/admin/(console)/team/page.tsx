import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { AddContentForm } from "@/components/admin/add-content-form";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Team" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "name", label: "Name" },
  { name: "role", label: "Role" },
  { name: "bio", label: "Short bio", multiline: true },
];

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
    rawValues: {
      name: String(r.name ?? ""),
      role: String(r.role ?? ""),
      bio: String(r.bio ?? ""),
    },
  }));

  return (
    <>
      <PageHeader
        title="Team"
        lead="People you are happy to name on the website. Only add someone who has agreed."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      <AddContentForm
        table="team"
        fields={[
          { name: "name", label: "Name" },
          { name: "role", label: "Role" },
          { name: "bio", label: "Short bio", multiline: true },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No team members yet">
          <p>
            Most owners start with the primary caregiver and add others once they have confirmed
            names and roles in writing.
          </p>
        </EmptyState>
      ) : (
        <ContentList table="team" rows={rows} canDelete editableFields={EDITABLE_FIELDS} />
      )}
    </>
  );
}
