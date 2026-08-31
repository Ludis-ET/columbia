"use client";

import { useActionState, useState, useTransition } from "react";
import { Download, Loader2, Mail, Phone, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/admin/ui";
import {
  exportInquiriesCSV,
  starInquiry,
  updateInquiry,
  type ActionResult,
} from "@/app/admin/actions";
import type { InquiryRow, InquiryStatus } from "@/lib/db/database.types";
import { cn } from "@/lib/utils";

/**
 * The enquiry inbox — upgraded with search, date/kind/status filters,
 * star pinning, quick-reply, and CSV export.
 */

const STATUSES: { value: InquiryStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "toured", label: "Toured" },
  { value: "moved_in", label: "Moved in" },
  { value: "closed", label: "Closed" },
];

const KIND_LABELS: Record<string, string> = {
  tour: "Tour request",
  contact: "General contact",
  packet: "Info packet",
};

const DATE_FILTERS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
] as const;

type DateFilter = (typeof DATE_FILTERS)[number]["id"];

function when(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "long" });
}

function cutoffForFilter(f: DateFilter): number {
  if (f === "7d") return Date.now() - 7 * 86_400_000;
  if (f === "30d") return Date.now() - 30 * 86_400_000;
  return 0;
}

export function InquiryList({ inquiries: initial }: { inquiries: InquiryRow[] }) {
  const [inquiries, setInquiries] = useState(initial);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [exportPending, startExport] = useTransition();
  const [toastResult, setToastResult] = useState<ActionResult | null>(null);

  const cutoff = cutoffForFilter(dateFilter);

  const visible = inquiries.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (kindFilter !== "all" && i.kind !== kindFilter) return false;
    if (dateFilter !== "all" && new Date(i.created_at).getTime() < cutoff) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = [i.name, i.email, i.phone].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Starred pinned to top
  const sorted = [...visible].sort((a, b) => {
    const aStarred = (a as InquiryRow & { starred?: boolean }).starred ? 1 : 0;
    const bStarred = (b as InquiryRow & { starred?: boolean }).starred ? 1 : 0;
    return bStarred - aStarred;
  });

  function handleExport() {
    startExport(async () => {
      const result = await exportInquiriesCSV();
      if (!result.ok || !result.csv) {
        setToastResult({ ok: false, message: result.message ?? "Export failed." });
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setToastResult({ ok: true, message: "CSV downloaded." });
      setTimeout(() => setToastResult(null), 4000);
    });
  }

  function toggleStar(id: string, currentlyStarred: boolean) {
    startExport(async () => {
      await starInquiry(id, !currentlyStarred);
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, starred: !currentlyStarred } as InquiryRow & { starred: boolean } : i,
        ),
      );
    });
  }

  return (
    <>
      <Toast result={toastResult} />

      {/* Toolbar */}
      <div className="mb-5 grid gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="text-stone absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="border-rule-strong bg-paper w-full rounded border py-2 pl-9 pr-4 text-[0.9375rem] outline-none focus:border-sage"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-stone absolute top-1/2 right-3 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Filter chips row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Status filter */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
            <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All ({inquiries.length})
            </FilterChip>
            {STATUSES.map((s) => {
              const n = inquiries.filter((i) => i.status === s.value).length;
              if (n === 0) return null;
              return (
                <FilterChip
                  key={s.value}
                  active={statusFilter === s.value}
                  onClick={() => setStatusFilter(s.value)}
                >
                  {s.label} ({n})
                </FilterChip>
              );
            })}
          </div>

          <span className="text-stone/40 hidden text-[0.875rem] sm:block">·</span>

          {/* Kind filter */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind">
            {["all", "tour", "contact", "packet"].map((k) => (
              <FilterChip key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
                {k === "all" ? "Any type" : KIND_LABELS[k]}
              </FilterChip>
            ))}
          </div>

          <span className="text-stone/40 hidden text-[0.875rem] sm:block">·</span>

          {/* Date filter */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by date">
            {DATE_FILTERS.map((d) => (
              <FilterChip key={d.id} active={dateFilter === d.id} onClick={() => setDateFilter(d.id)}>
                {d.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-stone text-[0.875rem]">
            {sorted.length} {sorted.length === 1 ? "enquiry" : "enquiries"} shown
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={exportPending}
            className="border-rule hover:border-sage inline-flex items-center gap-2 rounded border px-3 py-1.5 text-[0.875rem] font-semibold transition-colors disabled:opacity-50"
          >
            {exportPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-4" aria-hidden="true" />
            )}
            Export CSV
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-stone text-[0.9375rem]">No enquiries match your filters.</p>
      ) : (
        <ul className="grid gap-3">
          {sorted.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onToggleStar={() =>
                toggleStar(
                  inquiry.id,
                  (inquiry as InquiryRow & { starred?: boolean }).starred ?? false,
                )
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

function InquiryCard({
  inquiry,
  onToggleStar,
}: {
  inquiry: InquiryRow;
  onToggleStar: () => void;
}) {
  const [open, setOpen] = useState(inquiry.status === "new");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateInquiry,
    null,
  );

  const starred = (inquiry as InquiryRow & { starred?: boolean }).starred ?? false;

  // Quick-reply mailto template
  const mailto = inquiry.email
    ? `mailto:${inquiry.email}?subject=${encodeURIComponent(`Re: Your enquiry — Columbia Care`)}&body=${encodeURIComponent(`Dear ${inquiry.name},\n\nThank you for reaching out to Columbia Care. We'd love to tell you more about our home...\n\nWarm regards,\nColumbia Care Family Home`)}`
    : null;

  return (
    <li
      className={cn(
        "bg-paper-raise rounded border transition-all",
        inquiry.status === "new" ? "border-[var(--danger)]" : "border-rule",
        starred && "shadow-sm ring-1 ring-[#e8c84a]/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {/* Star button */}
          <button
            type="button"
            onClick={onToggleStar}
            aria-label={starred ? "Unstar enquiry" : "Star enquiry"}
            className={cn(
              "mt-0.5 shrink-0 transition-colors",
              starred ? "text-[#c9a600]" : "text-stone hover:text-[#c9a600]",
            )}
          >
            <Star className={cn("size-4", starred && "fill-current")} aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{inquiry.name}</p>
              {inquiry.status === "new" ? (
                <span className="label rounded-full bg-[#A93659]/15 px-2 py-0.5 text-[0.6875rem] font-semibold text-[#A93659]">
                  New
                </span>
              ) : null}
              <span className="label text-stone text-[0.75rem]">
                {KIND_LABELS[inquiry.kind] ?? inquiry.kind}
              </span>
            </div>
            <p className="text-stone text-[0.875rem]">
              {when(inquiry.created_at)}
              {inquiry.relationship ? ` · ${inquiry.relationship}` : ""}
            </p>
          </div>
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
              href={inquiry.email ? `mailto:${inquiry.email}` : "#"}
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

          {/* Quick reply */}
          {mailto ? (
            <a
              href={mailto}
              className="bg-sage-wash text-sage-deep border-sage mb-4 inline-flex items-center gap-2 rounded border px-3 py-2 text-[0.875rem] font-semibold"
            >
              <Mail className="size-4" aria-hidden="true" />
              Open quick-reply in email
            </a>
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
        "min-h-9 rounded-full border px-3 text-[0.8125rem]",
        active ? "border-sage bg-sage-wash text-sage-deep font-semibold" : "border-rule text-stone",
      )}
    >
      {children}
    </button>
  );
}
