"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Star,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminCard } from "@/components/admin/cards";
import { Toast } from "@/components/admin/ui";
import {
  clearAllInquiries,
  deleteInquiry,
  exportInquiriesCSV,
  replyToInquiry,
  starInquiry,
  updateInquiry,
  type ActionResult,
} from "@/app/admin/actions";
import type { InquiryRow, InquiryStatus } from "@/lib/db/database.types";
import { inquiryCountLabel } from "@/lib/db/inquiry-counts";
import { cn } from "@/lib/utils";

/**
 * Enquiry inbox — master-detail layout with plain-language labels that match
 * the public "Book a house tour" form field for field.
 */

const PIPELINE: {
  id: "all" | "needs_reply" | "in_progress" | "done";
  label: string;
  match: (status: InquiryStatus) => boolean;
}[] = [
  { id: "all", label: "All", match: () => true },
  { id: "needs_reply", label: "Needs a reply", match: (s) => s === "new" },
  {
    id: "in_progress",
    label: "In progress",
    match: (s) => s === "contacted" || s === "toured",
  },
  {
    id: "done",
    label: "Done",
    match: (s) => s === "moved_in" || s === "closed",
  },
];

const STATUSES: {
  value: InquiryStatus;
  label: string;
  hint: string;
}[] = [
  { value: "new", label: "Needs a reply", hint: "Nobody has responded yet." },
  { value: "contacted", label: "Contacted", hint: "You have reached out to this family." },
  { value: "toured", label: "House tour done", hint: "They have visited the home." },
  { value: "moved_in", label: "Moved in", hint: "This person is now a resident." },
  { value: "closed", label: "Closed", hint: "No longer active — wrong fit, chose elsewhere, etc." },
];

const STATUS_TONE: Record<InquiryStatus, string> = {
  new: "bg-[#A93659]/12 text-[#8B2D49] border-[#A93659]/30",
  contacted: "bg-[#2A6BB0]/12 text-[#1E5088] border-[#2A6BB0]/30",
  toured: "bg-[#6B4C9A]/12 text-[#523A75] border-[#6B4C9A]/30",
  moved_in: "bg-sage-wash text-sage-deep border-sage/30",
  closed: "bg-paper text-stone border-rule",
};

function formatPhone(digits: string | null): string {
  if (!digits) return "";
  const d = digits.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return digits;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (days <= 0) return `Today at ${time}`;
  if (days === 1) return `Yesterday at ${time}`;
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function sourceLabel(source: string | null): string {
  if (source === "website tour form") return "Book a house tour form";
  return source ?? "Website";
}

function statusMeta(status: InquiryStatus) {
  return STATUSES.find((s) => s.value === status) ?? STATUSES[0];
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  pending,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="admin-scrim fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inquiry-confirm-title"
    >
      <div className="bg-paper-raise border-rule w-full max-w-sm rounded-xl border p-6 shadow-xl">
        <h2 id="inquiry-confirm-title" className="mb-3 font-semibold">
          {title}
        </h2>
        <p className="text-stone mb-6 text-[0.9375rem]">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="dense"
            className="border-[var(--danger)] bg-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_88%,black)]"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reply dialog with stakeholder distribution notice
// ---------------------------------------------------------------------------

function ReplyDialog({
  inquiry,
  onClose,
  onSuccess,
}: {
  inquiry: InquiryRow;
  onClose: () => void;
  onSuccess: (result: ActionResult) => void;
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    replyToInquiry,
    null,
  );

  const defaultTemplates = useMemo(
    () => [
      {
        label: "Confirm House Tour",
        subject: `Re: Your house tour enquiry — Columbia Care`,
        body: `Dear ${inquiry.name},\n\nThank you for reaching out to Columbia Care Adult Family Home. We would love to welcome you for a house tour.\n\nWe have availability this week and would be delighted to show you our home and answer all your questions. Does morning or afternoon work best for you?\n\nWarm regards,\nColumbia Care Team`,
      },
      {
        label: "Care & Availability",
        subject: `Re: Care enquiry — Columbia Care Adult Family Home`,
        body: `Dear ${inquiry.name},\n\nThank you for inquiring about Columbia Care. We received your note${inquiry.relationship ? ` regarding care for ${inquiry.relationship}` : ""}.\n\nOur adult family home provides 24-hour attentive, compassionate care in a peaceful, family-centered environment. We would love to discuss your specific care needs in detail.\n\nWarm regards,\nColumbia Care Team`,
      },
      {
        label: "Custom Follow-Up",
        subject: `Re: Your message to Columbia Care`,
        body: `Dear ${inquiry.name},\n\nThank you for reaching out to Columbia Care Adult Family Home.\n\n`,
      },
    ],
    [inquiry.name, inquiry.relationship],
  );

  const [subject, setSubject] = useState(defaultTemplates[0].subject);
  const [message, setMessage] = useState(defaultTemplates[0].body);

  useEffect(() => {
    if (state?.ok) {
      onSuccess(state);
      onClose();
    }
  }, [state, onSuccess, onClose]);

  return (
    <div
      className="admin-scrim fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-dialog-title"
    >
      <div className="bg-paper-raise border-rule my-8 w-full max-w-xl rounded-xl border p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="reply-dialog-title"
              className="text-h3 flex items-center gap-2 font-sans font-bold"
            >
              <Mail className="text-sage-deep size-5" aria-hidden="true" />
              Reply to {inquiry.name}
            </h2>
            <p className="text-stone mt-0.5 text-[0.875rem]">
              To: <strong className="text-ink">{inquiry.email}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone hover:text-ink rounded-md p-1"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Stakeholder notification banner */}
        <div className="bg-sage-wash/60 border-sage/20 text-stone mb-5 rounded-lg border p-3 text-[0.8125rem]">
          <div className="text-sage-deep mb-1 flex items-center gap-1.5 font-semibold">
            <Users className="size-4" />
            <span>Stakeholder Distribution Active</span>
          </div>
          <p className="text-[0.75rem] leading-relaxed">
            Delivered with branded styling to the family. Automatic BCC copies are dispatched to all
            3 stakeholders:
            <span className="text-stone-deep mt-1 block font-mono text-[0.7rem] font-semibold">
              Wondimubelete4@gmail.com · Zgenet19@gmail.com · leulsegedmelaku1020@gmail.com
            </span>
          </p>
        </div>

        {state && !state.ok ? (
          <div className="mb-4 rounded border border-[#A93659]/30 bg-[#A93659]/10 p-3 text-[0.875rem] text-[#8B2D49]">
            {state.message}
          </div>
        ) : null}

        {/* Quick Template Chips */}
        <div className="mb-4">
          <span className="text-stone mb-1.5 block text-[0.75rem] font-semibold tracking-wider uppercase">
            Quick Templates
          </span>
          <div className="flex flex-wrap gap-1.5">
            {defaultTemplates.map((tmpl) => (
              <button
                key={tmpl.label}
                type="button"
                onClick={() => {
                  setSubject(tmpl.subject);
                  setMessage(tmpl.body);
                }}
                className="bg-paper border-rule hover:border-sage rounded border px-3 py-1 text-[0.8125rem] transition-colors"
              >
                {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={inquiry.id} />

          <div>
            <Label
              htmlFor="reply-subject"
              className="text-stone text-[0.8125rem] font-semibold tracking-wide uppercase"
            >
              Subject
            </Label>
            <Input
              id="reply-subject"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label
              htmlFor="reply-message"
              className="text-stone text-[0.8125rem] font-semibold tracking-wide uppercase"
            >
              Message to Family
            </Label>
            <Textarea
              id="reply-message"
              name="message"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="mt-1 text-[0.9375rem] leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-sage hover:bg-sage-deep text-paper inline-flex items-center gap-2"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending email…
                </>
              ) : (
                <>
                  <Send className="size-4" aria-hidden="true" />
                  Send Email to Family
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main list
// ---------------------------------------------------------------------------

export function InquiryList({ inquiries: initial }: { inquiries: InquiryRow[] }) {
  const router = useRouter();
  const [inquiries, setInquiries] = useState(initial);
  const [search, setSearch] = useState("");
  const [pipeline, setPipeline] = useState<(typeof PIPELINE)[number]["id"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.find((i) => i.status === "new")?.id ?? initial[0]?.id ?? null,
  );
  const [exportPending, startExport] = useTransition();
  const [clearPending, startClear] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);
  const [toastResult, setToastResult] = useState<ActionResult | null>(null);

  const counts = useMemo(() => {
    const c = { all: inquiries.length, needs_reply: 0, in_progress: 0, done: 0 };
    for (const i of inquiries) {
      if (i.status === "new") c.needs_reply++;
      else if (i.status === "contacted" || i.status === "toured") c.in_progress++;
      else c.done++;
    }
    return c;
  }, [inquiries]);

  const visible = useMemo(() => {
    const tab = PIPELINE.find((p) => p.id === pipeline)!;
    const q = search.trim().toLowerCase();
    return inquiries
      .filter((i) => {
        if (!tab.match(i.status)) return false;
        if (!q) return true;
        const haystack = [i.name, i.email, i.phone, i.message, i.relationship]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (a.starred !== b.starred) return a.starred ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [inquiries, pipeline, search]);

  const selected = inquiries.find((i) => i.id === selectedId) ?? null;

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
      setToastResult({ ok: true, message: "Spreadsheet downloaded." });
      setTimeout(() => setToastResult(null), 4000);
    });
  }

  const refreshCounts = useCallback(() => {
    router.refresh();
  }, [router]);

  function handleClearAll() {
    startClear(async () => {
      const result = await clearAllInquiries();
      setConfirmClear(false);
      if (result.ok) {
        setInquiries([]);
        setSelectedId(null);
        refreshCounts();
      }
      setToastResult(result);
      setTimeout(() => setToastResult(null), 4000);
    });
  }

  function toggleStar(id: string, currentlyStarred: boolean) {
    startExport(async () => {
      await starInquiry(id, !currentlyStarred);
      setInquiries((prev) =>
        prev.map((i) => (i.id === id ? { ...i, starred: !currentlyStarred } : i)),
      );
    });
  }

  const handleDeleted = useCallback(
    (id: string) => {
      setInquiries((prev) => {
        const next = prev.filter((i) => i.id !== id);
        if (selectedId === id) {
          setSelectedId(next[0]?.id ?? null);
        }
        return next;
      });
      refreshCounts();
      setToastResult({ ok: true, message: "Enquiry deleted." });
      setTimeout(() => setToastResult(null), 4000);
    },
    [selectedId, refreshCounts],
  );

  const handleUpdated = useCallback(
    (id: string, status: InquiryStatus, owner_notes: string | null) => {
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status, owner_notes, updated_at: new Date().toISOString() } : i,
        ),
      );
      refreshCounts();
    },
    [refreshCounts],
  );

  return (
    <>
      <Toast result={toastResult} />

      {/* Connection to public form */}
      <AdminCard className="mb-6 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label text-sage-deep mb-1">Connected to your website</p>
            <p className="text-[0.9375rem]">
              Every submission here comes from the{" "}
              <strong className="font-semibold">Book a house tour</strong> form on your homepage.
              When someone fills it in, you get an email and the message appears below.
            </p>
          </div>
          <Link
            href="/#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="border-rule hover:border-sage inline-flex min-h-11 shrink-0 items-center gap-2 rounded border px-3 text-[0.875rem] font-semibold"
          >
            View the form
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </AdminCard>

      {/* Toolbar */}
      <div className="mb-5 grid gap-4">
        <div className="relative">
          <Search
            className="text-stone absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email or message…"
            className="border-rule-strong bg-paper focus:border-sage w-full rounded border py-2.5 pr-10 pl-9 text-[0.9375rem] outline-none"
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

        <div
          className="flex flex-wrap gap-1.5"
          role="tablist"
          aria-label="Filter enquiries by stage"
        >
          {PIPELINE.map((tab) => {
            const n = counts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={pipeline === tab.id}
                onClick={() => setPipeline(tab.id)}
                className={cn(
                  "min-h-10 rounded border px-3 text-[0.8125rem] font-semibold transition-colors",
                  pipeline === tab.id
                    ? "border-sage bg-sage-wash text-sage-deep"
                    : "border-rule text-stone hover:border-sage/50",
                )}
              >
                {tab.label}
                <span className="text-stone ml-1.5 font-normal">({n})</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-stone text-[0.875rem]">
            {inquiryCountLabel(visible.length)} shown
            {inquiries.length !== visible.length
              ? ` · ${inquiryCountLabel(inquiries.length)} in total`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exportPending || inquiries.length === 0}
              className="border-rule hover:border-sage inline-flex min-h-10 items-center gap-2 rounded border px-3 text-[0.875rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="size-4" aria-hidden="true" />
              )}
              Download spreadsheet
            </button>
            {inquiries.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded border border-[var(--danger)] px-3 text-[0.875rem] font-semibold text-[var(--danger)] transition-colors hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-stone text-[0.9375rem]">
          {search.trim()
            ? "No enquiries match your search."
            : pipeline === "needs_reply"
              ? "Nothing waiting for a reply right now."
              : "No enquiries in this group."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,340px)_1fr] lg:items-start">
          {/* List panel */}
          <ul
            className={cn(
              "grid max-h-[70vh] gap-2 overflow-y-auto lg:sticky lg:top-4",
              selected && "max-lg:hidden",
            )}
            aria-label="Enquiry list"
          >
            {visible.map((inquiry) => (
              <ListItem
                key={inquiry.id}
                inquiry={inquiry}
                active={inquiry.id === selectedId}
                onSelect={() => setSelectedId(inquiry.id)}
                onToggleStar={() => toggleStar(inquiry.id, inquiry.starred)}
              />
            ))}
          </ul>

          {/* Detail panel */}
          {selected ? (
            <DetailPanel
              inquiry={selected}
              onBack={() => setSelectedId(null)}
              onToggleStar={() => toggleStar(selected.id, selected.starred)}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ) : (
            <AdminCard className="hidden p-8 text-center lg:block">
              <p className="text-stone text-[0.9375rem]">
                Select an enquiry to read the full message.
              </p>
            </AdminCard>
          )}
        </div>
      )}

      {confirmClear ? (
        <ConfirmDialog
          title="Clear every enquiry?"
          message="This permanently removes all messages from your inbox. It does not affect the contact form on your website."
          confirmLabel="Clear all"
          pending={clearPending}
          onConfirm={handleClearAll}
          onCancel={() => setConfirmClear(false)}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------

function ListItem({
  inquiry,
  active,
  onSelect,
  onToggleStar,
}: {
  inquiry: InquiryRow;
  active: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
}) {
  const meta = statusMeta(inquiry.status);
  const preview = inquiry.message?.trim() || inquiry.relationship || "No message left";

  return (
    <li>
      <div
        className={cn(
          "bg-paper-raise w-full rounded border text-left transition-colors",
          active ? "border-sage ring-sage/30 ring-1" : "border-rule hover:border-sage/40",
          inquiry.status === "new" && !active && "border-l-[3px] border-l-[#A93659]",
        )}
      >
        <button type="button" onClick={onSelect} className="w-full p-3 text-left">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="truncate font-semibold">{inquiry.name}</p>
            <span
              className={cn(
                "label shrink-0 rounded border px-2 py-0.5 text-[0.6875rem] font-semibold",
                STATUS_TONE[inquiry.status],
              )}
            >
              {meta.label}
            </span>
          </div>
          <p className="text-stone mb-1 truncate text-[0.8125rem]">{preview}</p>
          <p className="text-stone text-[0.75rem]">{formatWhen(inquiry.created_at)}</p>
        </button>
        <div className="border-rule flex border-t px-2 py-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            aria-label={inquiry.starred ? "Unpin enquiry" : "Pin enquiry"}
            className={cn(
              "inline-flex min-h-10 min-w-10 items-center justify-center rounded transition-colors",
              inquiry.starred ? "text-[#c9a600]" : "text-stone hover:text-[#c9a600]",
            )}
          >
            <Star className={cn("size-4", inquiry.starred && "fill-current")} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Detail panel
// ---------------------------------------------------------------------------

function DetailPanel({
  inquiry,
  onBack,
  onToggleStar,
  onDeleted,
  onUpdated,
}: {
  inquiry: InquiryRow;
  onBack: () => void;
  onToggleStar: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (id: string, status: InquiryStatus, notes: string | null) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateInquiry,
    null,
  );
  const [deletePending, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyToast, setReplyToast] = useState<ActionResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.ok || !formRef.current) return;
    const fd = new FormData(formRef.current);
    const status = String(fd.get("status") ?? inquiry.status) as InquiryStatus;
    const notes = String(fd.get("owner_notes") ?? "").trim() || null;
    onUpdated(inquiry.id, status, notes);
  }, [state, inquiry.id, inquiry.status, onUpdated]);

  const meta = statusMeta(inquiry.status);
  const phoneDisplay = formatPhone(inquiry.phone);
  const phoneHref = inquiry.phone?.replace(/\D/g, "") ?? "";

  return (
    <AdminCard className="overflow-hidden">
      {/* Header */}
      <div className="border-rule border-b p-4 sm:p-5">
        <button
          type="button"
          onClick={onBack}
          className="text-sage-deep mb-3 inline-flex min-h-10 items-center gap-2 text-[0.875rem] font-semibold lg:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to list
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-h3 font-sans font-bold">{inquiry.name}</h2>
              <span
                className={cn(
                  "label rounded border px-2.5 py-0.5 text-[0.75rem] font-semibold",
                  STATUS_TONE[inquiry.status],
                )}
              >
                {meta.label}
              </span>
            </div>
            <p className="text-stone text-[0.875rem]">
              Received {formatWhen(inquiry.created_at)} · {sourceLabel(inquiry.source)}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleStar}
            aria-label={inquiry.starred ? "Unpin enquiry" : "Pin enquiry"}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded border transition-colors",
              inquiry.starred
                ? "border-[#c9a600]/40 text-[#c9a600]"
                : "border-rule text-stone hover:text-[#c9a600]",
            )}
          >
            <Star className={cn("size-5", inquiry.starred && "fill-current")} aria-hidden="true" />
          </button>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {phoneHref ? (
            <a
              href={`tel:${phoneHref}`}
              className="bg-sage text-paper inline-flex min-h-11 items-center gap-2 rounded px-4 text-[0.875rem] font-semibold"
            >
              <Phone className="size-4" aria-hidden="true" />
              Call {phoneDisplay || inquiry.phone}
            </a>
          ) : null}
          {inquiry.email ? (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="border-rule hover:border-sage bg-paper-raise text-ink inline-flex min-h-11 items-center gap-2 rounded border px-4 text-[0.875rem] font-semibold transition-colors"
            >
              <Mail className="text-sage-deep size-4" aria-hidden="true" />
              Reply by email
            </button>
          ) : null}
        </div>
      </div>

      {/* Labelled fields */}
      <div className="grid gap-6 p-4 sm:p-5">
        <FieldSection title="Who sent this" icon={User}>
          <Field label="Name" value={inquiry.name} />
          <Field label="Phone" value={phoneDisplay || inquiry.phone} empty="Not provided" />
          <Field label="Email" value={inquiry.email} empty="Not provided" />
          <Field
            label="Who they are enquiring for"
            value={inquiry.relationship}
            empty="Not specified"
          />
        </FieldSection>

        {inquiry.preferred_times?.length ? (
          <FieldSection title="When they would like to visit" icon={Calendar}>
            <ul className="mt-1 grid gap-1">
              {inquiry.preferred_times.map((t) => (
                <li key={t} className="text-[0.9375rem] font-medium">
                  {t}
                </li>
              ))}
            </ul>
          </FieldSection>
        ) : null}

        {inquiry.message?.trim() ? (
          <FieldSection title="Their message" icon={MessageSquare}>
            <blockquote className="bg-sage-wash/60 border-sage mt-1 rounded border-l-2 p-4 text-[0.9375rem] leading-relaxed">
              {inquiry.message}
            </blockquote>
          </FieldSection>
        ) : (
          <FieldSection title="Their message" icon={MessageSquare}>
            <p className="text-stone mt-1 text-[0.9375rem]">
              No message — they only left contact details.
            </p>
          </FieldSection>
        )}

        {/* Follow-up form */}
        <FieldSection title="Your follow-up">
          <Toast result={state} />

          <form ref={formRef} action={action} className="mt-2 grid gap-5">
            <input type="hidden" name="id" value={inquiry.id} />

            <fieldset>
              <legend className="label text-stone mb-2">Where this has got to</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {STATUSES.map((s) => (
                  <label
                    key={s.value}
                    className={cn(
                      "border-rule has-checked:border-sage has-checked:bg-sage-wash has-checked:ring-sage/30 flex min-h-[4.5rem] cursor-pointer flex-col rounded border p-3 transition-colors has-checked:ring-1",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="status"
                        value={s.value}
                        defaultChecked={inquiry.status === s.value}
                        className="accent-sage size-4 shrink-0"
                      />
                      <span className="text-[0.9375rem] font-semibold">{s.label}</span>
                    </span>
                    <span className="text-stone mt-1 pl-6 text-[0.8125rem]">{s.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-1.5">
              <Label htmlFor={`notes-${inquiry.id}`}>Your private notes</Label>
              <Textarea
                id={`notes-${inquiry.id}`}
                name="owner_notes"
                rows={4}
                defaultValue={inquiry.owner_notes ?? ""}
                placeholder="Only you can see this — reminders, what you discussed, next steps…"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="dense" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Save changes
              </Button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex min-h-11 items-center gap-2 px-2 text-[0.875rem] font-semibold text-[var(--danger)]"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete this enquiry
              </button>
            </div>
          </form>
        </FieldSection>
      </div>

      {replyToast ? <Toast result={replyToast} /> : null}

      {replyOpen ? (
        <ReplyDialog
          inquiry={inquiry}
          onClose={() => setReplyOpen(false)}
          onSuccess={(res) => {
            setReplyToast(res);
            setTimeout(() => setReplyToast(null), 5000);
            onUpdated(inquiry.id, "contacted", inquiry.owner_notes);
          }}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete this enquiry?"
          message={`This permanently removes ${inquiry.name}'s message. It cannot be undone.`}
          pending={deletePending}
          onConfirm={() => {
            startDelete(async () => {
              const result = await deleteInquiry(inquiry.id);
              setConfirmDelete(false);
              if (result.ok) onDeleted(inquiry.id);
            });
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : null}
    </AdminCard>
  );
}

function FieldSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        {Icon ? <Icon className="text-sage-deep size-4" aria-hidden /> : null}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  empty = "—",
}: {
  label: string;
  value: string | null | undefined;
  empty?: string;
}) {
  return (
    <dl className="border-rule grid gap-1 border-b py-2.5 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-stone text-[0.8125rem] font-semibold tracking-wide uppercase">{label}</dt>
      <dd className="text-[0.9375rem] font-medium">{value?.trim() ? value : empty}</dd>
    </dl>
  );
}
