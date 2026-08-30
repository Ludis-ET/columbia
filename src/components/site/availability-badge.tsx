import { CircleCheck, CircleDot, CircleMinus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live availability.
 *
 * The highest-converting element on the site: families and placement agents
 * filter on exactly this, and almost no adult family home publishes it.
 *
 * Deliberately renders NOTHING when the status is unset or missing. The client
 * has not told us their availability (question 5 in docs/client-questions.md),
 * so until they do there is no badge — not "call for availability", not a
 * greyed-out placeholder. See the rule in CLAUDE.md.
 */

export type AvailabilityStatus = "accepting" | "limited" | "waitlist" | "full";

const PRESENTATION: Record<
  AvailabilityStatus,
  { label: string; Icon: typeof CircleCheck; className: string }
> = {
  accepting: {
    label: "Accepting new residents",
    Icon: CircleCheck,
    className: "border-sage bg-sage-wash text-sage-deep",
  },
  limited: {
    label: "Limited availability",
    Icon: CircleDot,
    className: "border-[var(--accent-amber)] bg-[var(--paper-raise)] text-[var(--accent-amber-on)]",
  },
  waitlist: {
    label: "Joining a waitlist",
    Icon: Clock,
    className: "border-[var(--accent-blue)] bg-[var(--paper-raise)] text-[var(--accent-blue-on)]",
  },
  full: {
    label: "Currently full",
    Icon: CircleMinus,
    className: "border-rule-strong bg-paper-sunk text-stone",
  },
};

/** Formats "updated" as something a person would say. */
function updatedLabel(updatedAt: string): string | null {
  const then = new Date(updatedAt);
  if (Number.isNaN(then.getTime())) return null;

  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 31) return `Updated ${days} days ago`;
  return `Updated ${then.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
}

export function AvailabilityBadge({
  status,
  note,
  updatedAt,
  className,
}: {
  status: AvailabilityStatus | null;
  note?: string | null;
  updatedAt?: string | null;
  className?: string;
}) {
  if (!status) return null;

  const { label, Icon, className: tone } = PRESENTATION[status];
  const updated = updatedAt ? updatedLabel(updatedAt) : null;

  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border py-2 pr-5 pl-4",
        tone,
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 font-semibold">
        <Icon className="size-5 shrink-0" aria-hidden="true" strokeWidth={2} />
        {label}
      </span>
      {/* No opacity utilities on text here. Dimming an already-tuned accent
          pushed "Updated N days ago" to 4.48:1 in dark mode — axe caught it.
          Hierarchy comes from size and weight instead. */}
      {note ? <span className="text-[0.9375rem]">{note}</span> : null}
      {updated ? (
        <span className="label">
          <span className="sr-only">Availability last </span>
          {updated}
        </span>
      ) : null}
    </div>
  );
}
