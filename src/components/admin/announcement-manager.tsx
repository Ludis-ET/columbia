"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import { saveAnnouncement, deleteAnnouncement, type ActionResult } from "@/app/admin/actions";
import { AdminCard, AdminSection } from "@/components/admin/cards";
import { Toast } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AnnouncementRow {
  id: string;
  message: string;
  cta_text: string | null;
  cta_href: string | null;
  active: boolean;
  created_at: string;
}

export function AnnouncementManager({
  announcements: initial,
}: {
  announcements: AnnouncementRow[];
}) {
  const [announcements, setAnnouncements] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<ActionResult | null>(null);
  const [deleting, startDelete] = useTransition();

  function announce(r: ActionResult) {
    setToast(r);
    if (r.ok) setTimeout(() => setToast(null), 4000);
  }

  function handleDelete(id: string) {
    startDelete(async () => {
      const r = await deleteAnnouncement(id);
      announce(r);
      if (r.ok) setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    });
  }

  return (
    <div className="grid gap-6">
      <Toast result={toast} />

      {/* Live preview banner */}
      {announcements.some((a) => a.active) ? (
        <AdminCard className="border-[#e8c84a]/40 bg-[#fffbeb] p-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <Megaphone className="size-5 shrink-0 text-[#92400e]" aria-hidden="true" />
            <p className="text-[0.9375rem] font-medium text-[#92400e]">
              Active banner preview:
            </p>
            <p className="text-[0.9375rem] text-[#92400e]">
              {announcements.find((a) => a.active)?.message}
            </p>
          </div>
        </AdminCard>
      ) : (
        <AdminCard className="border-dashed p-4">
          <p className="text-stone text-[0.9375rem]">
            No announcement is live on the website right now.
          </p>
        </AdminCard>
      )}

      {/* Existing announcements */}
      {announcements.length > 0 ? (
        <AdminSection title="Your announcements" lead="Toggle active to show on the website. Only one banner shows at a time — the first active one.">
          <ul className="grid gap-3">
            {announcements.map((a) => (
              <AnnouncementRow
                key={a.id}
                announcement={a}
                deleting={deleting}
                onDelete={() => handleDelete(a.id)}
                onSaved={(r, updated) => {
                  announce(r);
                  if (r.ok && updated) {
                    setAnnouncements((prev) =>
                      prev.map((x) => (x.id === updated.id ? updated : x)),
                    );
                  }
                }}
              />
            ))}
          </ul>
        </AdminSection>
      ) : null}

      {/* Add new */}
      <AdminSection title="Add an announcement" lead="">
        {showNew ? (
          <NewAnnouncementForm
            onCancel={() => setShowNew(false)}
            onSaved={(r, row) => {
              announce(r);
              if (r.ok && row) {
                setAnnouncements((prev) => [row, ...prev]);
                setShowNew(false);
              }
            }}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNew(true)}
          >
            <Plus className="size-4" aria-hidden="true" />
            New announcement
          </Button>
        )}
      </AdminSection>
    </div>
  );
}

function AnnouncementRow({
  announcement,
  deleting,
  onDelete,
  onSaved,
}: {
  announcement: AnnouncementRow;
  deleting: boolean;
  onDelete: () => void;
  onSaved: (r: ActionResult, updated?: AnnouncementRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAnnouncement, null);

  // Propagate result up
  const [lastState, setLastState] = useState<ActionResult | null>(null);
  if (state && state !== lastState) {
    setLastState(state);
    onSaved(state);
  }

  return (
    <li className={cn(
      "bg-paper-raise rounded border",
      announcement.active ? "border-[#e8c84a]/60" : "border-rule",
    )}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "label rounded-full px-2 py-0.5 text-[0.6875rem]",
              announcement.active
                ? "bg-[#fef9c3] text-[#92400e] font-semibold"
                : "bg-paper text-stone border-rule border",
            )}>
              {announcement.active ? "Live" : "Off"}
            </span>
            <p className="truncate font-semibold">{announcement.message}</p>
          </div>
          {announcement.cta_text ? (
            <p className="text-stone mt-1 text-[0.875rem]">
              CTA: {announcement.cta_text} → {announcement.cta_href}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-sage-deep min-h-11 px-2 text-[0.875rem] font-semibold underline"
          >
            {open ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete announcement"
            className="text-stone hover:text-[var(--danger)] inline-flex min-h-11 items-center px-2 transition-colors"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-rule border-t p-4">
          <AnnouncementForm
            id={announcement.id}
            defaultValues={announcement}
            action={action}
            pending={pending}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

function NewAnnouncementForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (r: ActionResult, row?: AnnouncementRow) => void;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAnnouncement, null);

  const [lastState, setLastState] = useState<ActionResult | null>(null);
  if (state && state !== lastState) {
    setLastState(state);
    onSaved(state);
  }

  return (
    <AdminCard>
      <AnnouncementForm
        id=""
        defaultValues={{ id: "", message: "", cta_text: null, cta_href: null, active: false, created_at: "" }}
        action={action}
        pending={pending}
        onClose={onCancel}
      />
    </AdminCard>
  );
}

function AnnouncementForm({
  id,
  defaultValues,
  action,
  pending,
  onClose,
}: {
  id: string;
  defaultValues: AnnouncementRow;
  action: (payload: FormData) => void;
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={id} />

      <div className="grid gap-1.5">
        <Label htmlFor={`msg-${id || "new"}`}>Banner message</Label>
        <Input
          id={`msg-${id || "new"}`}
          name="message"
          required
          defaultValue={defaultValues.message}
          placeholder="e.g. We are closed 25–26 Dec. Happy holidays!"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`cta-text-${id || "new"}`}>Button text (optional)</Label>
          <Input
            id={`cta-text-${id || "new"}`}
            name="cta_text"
            defaultValue={defaultValues.cta_text ?? ""}
            placeholder="Learn more"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`cta-href-${id || "new"}`}>Button link (optional)</Label>
          <Input
            id={`cta-href-${id || "new"}`}
            name="cta_href"
            type="url"
            defaultValue={defaultValues.cta_href ?? ""}
            placeholder="https://…"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[0.9375rem]">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaultValues.active}
          className="size-4"
        />
        Show this announcement on the website now
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {id ? "Save changes" : "Add announcement"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
