"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { Toast } from "@/components/admin/ui";
import { saveAvailability, type ActionResult } from "@/app/admin/actions";
import type { AvailabilityStatus } from "@/lib/db/database.types";
import { cn } from "@/lib/utils";

/**
 * The availability control.
 *
 * Shows a LIVE PREVIEW of the badge exactly as visitors will see it, updating
 * as the owner picks, so there is no gap between the radio they chose and the
 * thing that appears on the website. "Not shown" is a first-class option, not
 * an absence: choosing it removes the badge entirely rather than displaying
 * something noncommittal.
 */

const OPTIONS: { value: AvailabilityStatus; label: string; help: string }[] = [
  {
    value: "unset",
    label: "Don't show anything",
    help: "No availability badge appears on the website.",
  },
  {
    value: "accepting",
    label: "Accepting new residents",
    help: "The strongest signal to families and placement agents.",
  },
  {
    value: "limited",
    label: "Limited availability",
    help: "Use when you have one space, or one opening soon.",
  },
  { value: "waitlist", label: "Joining a waitlist", help: "Full, but taking names." },
  { value: "full", label: "Currently full", help: "Honest, and families respect it." },
];

export function AvailabilityForm({
  status: initialStatus,
  note: initialNote,
  updatedAt,
}: {
  status: AvailabilityStatus;
  note: string;
  updatedAt: string | null;
}) {
  const [status, setStatus] = useState<AvailabilityStatus>(initialStatus);
  const [note, setNote] = useState(initialNote);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveAvailability,
    null,
  );

  const dirty = status !== initialStatus || note !== initialNote;

  return (
    <div className="border-rule bg-paper-raise rounded border p-5">
      <Toast result={state} />

      <form action={action} className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <fieldset className="min-w-0">
          <legend className="sr-only">Availability status</legend>
          {/* Each option is a grid rather than a nested wrapper span, which keeps
              the label text a direct child of <label>, which is what assistive tech
              (and jsx-a11y) expects, while still aligning the radio to the first line. */}
          <div className="grid gap-2">
            {OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "grid min-h-11 cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 rounded border p-3 transition-colors",
                  status === option.value
                    ? "border-sage bg-sage-wash"
                    : "border-rule hover:border-rule-strong",
                )}
              >
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  className="accent-sage row-span-2 mt-1 size-4 shrink-0"
                />
                <span className="font-semibold">{option.label}</span>
                <span className="text-stone text-[0.875rem]">{option.help}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-1.5">
            <Label htmlFor="note">Extra detail (optional)</Label>
            <Input
              id="note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder="e.g. one room from mid-September"
            />
            <p className="text-stone text-[0.875rem]">
              Shown beside the badge. Leave blank if there is nothing to add.
            </p>
          </div>
        </fieldset>

        <div className="lg:w-72">
          <p className="label text-stone mb-2">How it looks on the website</p>
          <div className="border-rule bg-paper flex min-h-24 items-center justify-center rounded border border-dashed p-4">
            {status === "unset" ? (
              <p className="text-stone text-center text-[0.875rem]">
                Nothing appears on the website.
              </p>
            ) : (
              <AvailabilityBadge
                status={status as Exclude<AvailabilityStatus, "unset">}
                note={note || null}
                updatedAt={dirty ? new Date().toISOString() : updatedAt}
              />
            )}
          </div>

          <Button type="submit" disabled={pending || !dirty} className="mt-4 w-full">
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {dirty ? "Save and show on the website" : "Saved"}
          </Button>

          <p className="text-stone mt-2 text-center text-[0.8125rem]">
            The website updates within a minute.
          </p>
        </div>
      </form>
    </div>
  );
}
