import { createClient } from "@/lib/db/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { ContentList, type ContentRow } from "@/components/admin/content-list";
import type { MediaRow } from "@/lib/db/database.types";

export const metadata = { title: "Photos" };

export default async function PhotosAdminPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("media")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [] };

  const media = (data ?? []) as MediaRow[];

  const rows: ContentRow[] = media.map((m) => ({
    id: m.id,
    title: m.caption || m.storage_path.split("/").pop() || "Photo",
    meta: [m.category, m.contains_people ? "shows a person" : null].filter(Boolean).join(" · "),
    body: `Description for screen readers: ${m.alt}`,
    published: m.published,
    blocked:
      m.contains_people && !m.release_on_file
        ? "Shows a person, so it needs a signed release on file before it can go on the website."
        : undefined,
  }));

  return (
    <>
      <PageHeader
        title="Photos"
        lead="Pictures of the home. Every one needs a short description so people using a screen reader know what it shows."
        count={`${rows.filter((r) => r.published).length} of ${rows.length} showing`}
      />

      {rows.length === 0 ? (
        <EmptyState title="No photos uploaded yet">
          <p>
            The website is currently showing placeholder pictures of a different house. They are
            clearly marked and get replaced with real photographs of Columbia Care before launch.
          </p>
          <p className="mt-3">
            Uploading is wired up in the next phase, together with the tour request form. When it
            lands, two rules are enforced by the database itself, not just by this screen:
          </p>
          <ul className="mt-3 grid gap-1 text-left">
            <li>· A photo cannot be saved without a description for screen readers.</li>
            <li>
              · A photo showing a person cannot be published without a signed release on file.
            </li>
          </ul>
        </EmptyState>
      ) : (
        <ContentList table="media" rows={rows} canDelete />
      )}
    </>
  );
}
