"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveOpeningHours, type ActionResult } from "@/app/admin/actions";
import { AdminCard } from "@/components/admin/cards";
import { Toast } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HoursRow {
  day_of_week: number;
  day_name: string;
  opens: string | null;
  closes: string | null;
  closed: boolean;
  note: string | null;
}

const DAYS = [
  { key: "monday", label: "Monday", num: 1 },
  { key: "tuesday", label: "Tuesday", num: 2 },
  { key: "wednesday", label: "Wednesday", num: 3 },
  { key: "thursday", label: "Thursday", num: 4 },
  { key: "friday", label: "Friday", num: 5 },
  { key: "saturday", label: "Saturday", num: 6 },
  { key: "sunday", label: "Sunday", num: 7 },
];

function defaultForDay(hours: HoursRow[], dayNum: number): HoursRow {
  return (
    hours.find((h) => h.day_of_week === dayNum) ?? {
      day_of_week: dayNum,
      day_name: DAYS[dayNum - 1].key,
      opens: "09:00",
      closes: "17:00",
      closed: false,
      note: null,
    }
  );
}

export function OpeningHoursForm({ hours }: { hours: HoursRow[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveOpeningHours,
    null,
  );

  // Local closed toggles (to show/hide time inputs)
  const [closedMap, setClosedMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DAYS.map(({ key, num }) => [key, defaultForDay(hours, num).closed])),
  );

  return (
    <form action={action} className="max-w-2xl">
      <Toast result={state} />

      <AdminCard className="overflow-hidden p-0">
        {/* Header row */}
        <div className="border-rule bg-paper-raise text-stone grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-4 border-b px-4 py-2 text-[0.8125rem] font-semibold">
          <span>Day</span>
          <span>Opens</span>
          <span>—</span>
          <span>Closes</span>
          <span>Closed all day</span>
        </div>

        {DAYS.map(({ key, label, num }) => {
          const row = defaultForDay(hours, num);
          const isClosed = closedMap[key] ?? false;

          return (
            <div
              key={key}
              className={cn(
                "border-rule grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-3 border-b px-4 py-3 last:border-b-0",
                isClosed && "bg-paper-sunk/40",
              )}
            >
              <span className="text-[0.9375rem] font-medium">{label}</span>

              <Input
                name={`${key}_opens`}
                type="time"
                defaultValue={row.opens ?? "09:00"}
                disabled={isClosed}
                className="w-28 disabled:opacity-40"
                aria-label={`${label} opens`}
              />

              <span className="text-stone">–</span>

              <Input
                name={`${key}_closes`}
                type="time"
                defaultValue={row.closes ?? "17:00"}
                disabled={isClosed}
                className="w-28 disabled:opacity-40"
                aria-label={`${label} closes`}
              />

              <label className="flex cursor-pointer items-center justify-end gap-2 text-[0.875rem]">
                <input
                  type="checkbox"
                  name={`${key}_closed`}
                  defaultChecked={isClosed}
                  onChange={(e) => setClosedMap((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="size-4"
                />
                <span className={cn(isClosed ? "text-stone" : "text-stone/60")}>Closed</span>
              </label>
            </div>
          );
        })}
      </AdminCard>

      {/* Note for each day — shown below */}
      <div className="mt-4 grid gap-3">
        {DAYS.map(({ key, label, num }) => {
          const row = defaultForDay(hours, num);
          return (
            <div key={key} className="grid gap-1.5">
              <label htmlFor={`${key}-note`} className="label text-stone text-[0.8125rem]">
                {label} note (optional)
              </label>
              <Input
                id={`${key}-note`}
                name={`${key}_note`}
                defaultValue={row.note ?? ""}
                placeholder={`e.g. "${label} — by appointment only"`}
              />
            </div>
          );
        })}
      </div>

      <Button type="submit" disabled={pending} className="mt-6">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Save opening hours
      </Button>
    </form>
  );
}
