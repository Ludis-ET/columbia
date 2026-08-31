import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { AddContentForm } from "@/components/admin/add-content-form";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Testimonials" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "quote", label: "What they said", multiline: true },
  { name: "author", label: "Name" },
  { name: "relationship", label: "Relationship", placeholder: "Daughter, son, niece…" },
  {
    name: "consent_on_file",
    label: "We have written permission to show this on the website",
    checkbox: true,
  },
];

export default async function TestimonialsAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("testimonials")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: r.author as string,
    meta: (r.relationship as string | null) ?? undefined,
    body: r.quote as string,
    published: r.published as boolean,
    blocked: r.consent_on_file
      ? undefined
      : "Tick written permission before this can go on the website.",
    rawValues: {
      quote: String(r.quote ?? ""),
      author: String(r.author ?? ""),
      relationship: String(r.relationship ?? ""),
      consent_on_file: r.consent_on_file ? "true" : "false",
    },
  }));

  return (
    <>
      <PageHeader
        title="Testimonials"
        lead="Quotes from families. Ask for written permission before you show one here."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      <AddContentForm
        table="testimonials"
        fields={[
          { name: "quote", label: "What they said", multiline: true },
          { name: "author", label: "Name" },
          { name: "relationship", label: "Relationship (optional)" },
          {
            name: "consent_on_file",
            label: "Written permission is already on file",
            checkbox: true,
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No testimonials yet">
          <p>
            When a family offers a kind word, ask them to put it in an email or a short note you
            can keep on file. Paste the quote here once you have permission. Never write one
            yourself.
          </p>
        </EmptyState>
      ) : (
        <ContentList
          table="testimonials"
          rows={rows}
          canDelete
          editableFields={EDITABLE_FIELDS}
        />
      )}
    </>
  );
}
