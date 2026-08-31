"use client";

import { useState } from "react";
import { PageEditor } from "@/components/admin/page-editor";
import { RowControls, Toast } from "@/components/admin/ui";
import type { ActionResult } from "@/app/admin/actions";

export function PagesAdminList({
  pages,
}: {
  pages: {
    id: string;
    slug: string;
    title: string;
    lead: string | null;
    seo_description: string | null;
    published: boolean;
  }[];
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [published, setPublished] = useState(
    () => new Map(pages.map((p) => [p.id, p.published])),
  );

  return (
    <>
      <Toast result={result} />
      <ul className="grid gap-3">
        {pages.map((page) => (
          <li key={page.id} className="border-rule bg-paper-raise rounded border">
            <div className="flex flex-wrap items-center justify-end gap-2 border-b px-4 py-2">
              <RowControls
                table="pages"
                id={page.id}
                published={published.get(page.id) ?? page.published}
                canReorder={false}
                canDelete={false}
                onResult={(r) => {
                  setResult(r);
                  if (r.ok) {
                    setPublished((prev) => {
                      const next = new Map(prev);
                      next.set(page.id, !(prev.get(page.id) ?? page.published));
                      return next;
                    });
                  }
                }}
              />
            </div>
            <PageEditor
              id={page.id}
              slug={page.slug}
              title={page.title}
              lead={page.lead}
              seoDescription={page.seo_description}
              asDiv
            />
          </li>
        ))}
      </ul>
    </>
  );
}
