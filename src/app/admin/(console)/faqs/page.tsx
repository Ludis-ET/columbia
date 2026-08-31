import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { AddContentForm } from "@/components/admin/add-content-form";
import { ContentList, type ContentRow, type EditableField } from "@/components/admin/content-list";

export const metadata = { title: "Questions & answers" };

const EDITABLE_FIELDS: EditableField[] = [
  { name: "question", label: "Question" },
  { name: "answer", label: "Answer", multiline: true },
  { name: "category", label: "Group (optional)", placeholder: "Admissions, daily life…" },
];

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
    meta: (r.category as string | null) ?? undefined,
    body: r.answer as string,
    published: r.published as boolean,
    rawValues: {
      question: String(r.question ?? ""),
      answer: String(r.answer ?? ""),
      category: String(r.category ?? ""),
    },
  }));

  return (
    <>
      <PageHeader
        title="Questions & answers"
        lead="Shown on the FAQ page when you publish them. Write answers in your own words."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      <AddContentForm
        table="faqs"
        fields={[
          { name: "question", label: "Question" },
          { name: "answer", label: "Answer", multiline: true },
          { name: "category", label: "Group (optional)" },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No questions yet">
          <p>
            Start with what families actually ask on a house tour: costs, visiting hours, what to
            bring. Add each question and your answer here.
          </p>
        </EmptyState>
      ) : (
        <ContentList table="faqs" rows={rows} canDelete editableFields={EDITABLE_FIELDS} />
      )}
    </>
  );
}
