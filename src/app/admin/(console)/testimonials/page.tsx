import { createClient } from "@/lib/db/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow } from "@/components/admin/content-list";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("testimonials")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const raw = (data ?? []) as Record<string, unknown>[];
  const rows: ContentRow[] = raw.map((r) => ({
    id: r.id as string,
    title: `“${(r.quote as string).slice(0, 80)}${(r.quote as string).length > 80 ? "…" : ""}”`,
    meta: [r.author as string, r.relationship as string | null].filter(Boolean).join(" · "),
    published: r.published as boolean,
    blocked: (r.consent_on_file as boolean)
      ? undefined
      : "Cannot be shown until you confirm you have written permission from the family.",
  }));

  return (
    <>
      <PageHeader
        title="Testimonials"
        lead="What families say about you. Only add a quote you have written permission to publish."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No testimonials yet">
          <p>
            The testimonials section does not appear on the website at all until there is a real
            quote here. That is deliberate — never write one yourself.
          </p>
          <p className="mt-3">
            The best time to ask is right after a family says something kind. Ask if you may put it
            on the website, and how they would like to be described — most prefer &ldquo;daughter of
            a resident&rdquo; to their own name.
          </p>
        </EmptyState>
      ) : (
        <ContentList table="testimonials" rows={rows} canDelete={true} />
      )}
    </>
  );
}
