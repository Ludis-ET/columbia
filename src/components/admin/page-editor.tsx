"use client";

import { useActionState, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/admin/ui";
import { saveRow, type ActionResult } from "@/app/admin/actions";

/**
 * Editor for one page's heading and search description.
 *
 * Shows a live Google-result preview with a character counter, because the
 * owner has no other way to know that a 300-character description gets cut off.
 * The counter warns rather than blocks — a long description is a shame, not an
 * error.
 */
export function PageEditor({
  id,
  slug,
  title,
  lead,
  seoDescription,
}: {
  id: string;
  slug: string;
  title: string;
  lead: string | null;
  seoDescription: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState(seoDescription ?? "");
  const [heading, setHeading] = useState(title);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRow, null);

  const tooLong = desc.length > 160;

  return (
    <li className="border-rule bg-paper-raise rounded border">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-stone font-mono text-[0.8125rem]">{slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={slug}
            target="_blank"
            rel="noopener noreferrer"
            className="border-rule hover:border-sage inline-flex min-h-11 items-center gap-2 rounded border px-3 text-[0.875rem] font-semibold"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View
            <span className="sr-only"> {title} on the website (opens in a new tab)</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-sage-deep min-h-11 px-2 text-[0.875rem] font-semibold underline"
          >
            {open ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-rule border-t p-4">
          <Toast result={state} />

          <form action={action} className="grid gap-4">
            <input type="hidden" name="__table" value="pages" />
            <input type="hidden" name="__id" value={id} />
            <input type="hidden" name="__fields" value="title,lead,seo_description" />

            <div className="grid gap-1.5">
              <Label htmlFor={`title-${id}`}>Page heading</Label>
              <Input
                id={`title-${id}`}
                name="title"
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`lead-${id}`}>Opening line</Label>
              <Textarea id={`lead-${id}`} name="lead" rows={2} defaultValue={lead ?? ""} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`desc-${id}`}>What Google shows underneath</Label>
              <Textarea
                id={`desc-${id}`}
                name="seo_description"
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                aria-describedby={`desc-help-${id}`}
              />
              <p
                id={`desc-help-${id}`}
                className={
                  tooLong ? "text-[0.875rem] text-[var(--warn)]" : "text-stone text-[0.875rem]"
                }
              >
                {desc.length} characters.{" "}
                {tooLong
                  ? "Google usually cuts off around 160 — the rest will not be seen."
                  : "Around 150 works best."}
              </p>
            </div>

            <div className="border-rule bg-paper rounded border p-4">
              <p className="label text-stone mb-2">How this looks in Google</p>
              <p className="text-[0.8125rem] text-[var(--accent-blue-on)]">
                columbiacareafh.com{slug === "/" ? "" : slug}
              </p>
              <p className="text-[1.05rem] font-semibold text-[var(--accent-violet-on)]">
                {heading} — Columbia Care Adult Family Home | Everett, WA
              </p>
              <p className="text-stone text-[0.9375rem]">
                {desc ? (tooLong ? desc.slice(0, 160) + "…" : desc) : "No description set."}
              </p>
            </div>

            <Button type="submit" size="dense" disabled={pending} className="justify-self-start">
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
