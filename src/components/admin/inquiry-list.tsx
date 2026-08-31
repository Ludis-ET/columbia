"use client";

import { useActionState, useState } from "react";
import { Loader2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/admin/ui";
import { updateInquiry, type ActionResult } from "@/app/admin/actions";
import type { InquiryRow, InquiryStatus } from "@/lib/db/database.types";
import { cn } from "@/lib/utils";

/**
 * The enquiry inbox.
 *
 * This screen holds families' phone numbers and details about a relative's
 * care needs, so it is the most sensitive thing in the console. RLS keeps it
 * admin-only; the UI keeps it calm — one row per enquiry, expandable, with
 * click-to-call and click-to-email so the owner can respond in one tap.
 */

const STATUSES: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "toured", label: "Toured" },
  { value: "moved_in", label: "Moved in" },
  { value: "closed", label: "Closed" },
];

function when(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "long" });
}

export function InquiryList({ inquiries }: { inquiries: InquiryRow[] }) {
  const [filter, setFilter] = useState<InquiryStatus | "all">("all");
  const visible = filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          All ({inquiries.length})
        </FilterChip>
        {STATUSES.map((s) => {
          const n = inquiries.filter((i) => i.status === s.value).length;
          if (n === 0) return null;
          return (
            <FilterChip
              key={s.value}
              active={filter === s.value}
              onClick={() => setFilter(s.value)}
            >
              {s.label} ({n})
            </FilterChip>
          );
        })}
      </div>

      <ul className="grid gap-3">
        {visible.map((inquiry) => (
          <InquiryCard key={inquiry.id} inquiry={inquiry} />
        ))}
      </ul>
    </>
  );
}

function InquiryCard({ inquiry }: { inquiry: InquiryRow }) {
  const [open, setOpen] = useState(inquiry.status === "new");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateInquiry,
    null,
  );

  return (
    <li
      className={cn(
        "bg-paper-raise rounded border",
        inquiry.status === "new" ? "border-[var(--danger)]" : "border-rule",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-semibold">{inquiry.name}</p>
          <p className="text-stone text-[0.875rem]">
            {when(inquiry.created_at)}
            {inquiry.kind === "tour" ? " · asked for a house tour" : ""}
            {inquiry.relationship ? ` · ${inquiry.relationship}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {inquiry.phone ? (
            <a
              href={`tel:${inquiry.phone.replace(/\D/g, "")}`}
              className="border-rule hover:border-sage inline-flex min-h-11 items-center gap-2 rounded border px-3 text-[0.875rem] font-semibold"
            >
              <Phone className="size-4" aria-hidden="true" />
              {inquiry.phone}
            </a>
          ) : null}
          {inquiry.email ? (
            <a
              href={`mailto:${inquiry.email}`}
              className="border-rule hover:border-sage inline-flex min-h-11 items-center gap-2 rounded border px-3 text-[0.875rem] font-semibold"
            >
              <Mail className="size-4" aria-hidden="true" />
              Email
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-sage-deep min-h-11 px-2 text-[0.875rem] font-semibold underline"
          >
            {open ? "Close" : "Open"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-rule border-t p-4">
          {inquiry.message ? (
            <blockquote className="bg-paper border-sage mb-4 rounded border-l-2 p-3">
              {inquiry.message}
            </blockquote>
          ) : null}

          {inquiry.preferred_times?.length ? (
            <p className="text-stone mb-4 text-[0.9375rem]">
              Prefers: {inquiry.preferred_times.join(", ")}
            </p>
          ) : null}

          <Toast result={state} />

          <form action={action} className="grid gap-4">
            <input type="hidden" name="id" value={inquiry.id} />

            <fieldset>
              <legend className="label text-stone mb-2">Where this has got to</legend>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <label
                    key={s.value}
                    className="border-rule has-checked:border-sage has-checked:bg-sage-wash has-checked:text-sage-deep inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[0.9375rem] has-checked:font-semibold"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      defaultChecked={inquiry.status === s.value}
                      className="sr-only"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-1.5">
              <Label htmlFor={`notes-${inquiry.id}`}>Your private notes</Label>
              <Textarea
                id={`notes-${inquiry.id}`}
                name="owner_notes"
                rows={3}
                defaultValue={inquiry.owner_notes ?? ""}
                placeholder="Only you can see this."
              />
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-full border px-4 text-[0.9375rem]",
        active ? "border-sage bg-sage-wash text-sage-deep font-semibold" : "border-rule text-stone",
      )}
    >
      {children}
    </button>
  );
}
