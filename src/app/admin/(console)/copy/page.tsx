import { createClient } from "@/lib/db/server";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { CopyEditor } from "@/components/admin/copy-editor";
import type { SiteCopyRow } from "@/lib/db/database.types";

export const metadata = { title: "Words on the page" };

export default async function CopyAdminPage() {
  const supabase = await createClient();
  const { data, error } = (await supabase
    ?.from("site_copy")
    .select("*")
    .order("position", { ascending: true })) ?? { data: [], error: null };

  const rows = (data ?? []) as SiteCopyRow[];

  return (
    <>
      <PageHeader
        title="Words on the page"
        lead="Everything a visitor reads, grouped the way it appears on the website. Changes go live within a minute."
        count={`${rows.length} entries`}
      />

      {rows.length === 0 ? (
        <EmptyState title="Not set up yet">
          <p>
            The words on your website are still built into the code, which means they cannot be
            edited here yet.
          </p>
          <p className="mt-3">
            To switch it on: run <code>supabase/apply-site-copy.sql</code> in the Supabase SQL
            editor, then <code>pnpm db:seed:copy</code>. Nothing on the website changes, it just
            becomes editable.
          </p>
          {error ? <p className="mt-3 text-[0.875rem]">Reported: {error.message}</p> : null}
        </EmptyState>
      ) : (
        <CopyEditor rows={rows} />
      )}
    </>
  );
}
