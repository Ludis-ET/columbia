"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/admin/ui";
import { saveRow, type ActionResult } from "@/app/admin/actions";
import type { SiteSettingsRow } from "@/lib/db/database.types";

/**
 * Site settings.
 *
 * Every field here is allowed to be empty, and empty means the website shows
 * nothing rather than a placeholder. That is why the phone number and licence
 * number are blank today: the client has not confirmed them, and inventing one
 * on a care home's website is exactly what the content rule forbids.
 *
 * The help text under each field says so plainly, so the owner understands the
 * blank is deliberate rather than broken.
 */

interface Field {
  name: keyof SiteSettingsRow & string;
  label: string;
  help?: string;
  type?: string;
  autoComplete?: string;
}

const GROUPS: { legend: string; fields: Field[] }[] = [
  {
    legend: "How families reach you",
    fields: [
      {
        name: "phone",
        label: "Phone number",
        type: "tel",
        help: "Leave blank and no phone number appears anywhere on the website. Nothing is shown in its place.",
      },
      {
        name: "sms",
        label: "Number for text messages",
        type: "tel",
        help: "Optional. Many families text before they call.",
      },
      { name: "email", label: "Email address", type: "email" },
      {
        name: "fax",
        label: "Fax number",
        type: "tel",
        help: "Shown for referrals from hospitals and placement agents.",
      },
    ],
  },
  {
    legend: "Where you are",
    fields: [
      { name: "street_address", label: "Street address", autoComplete: "street-address" },
      { name: "address_locality", label: "City" },
      { name: "address_region", label: "State" },
      { name: "postal_code", label: "ZIP code", autoComplete: "postal-code" },
      {
        name: "location_line",
        label: "Directions line",
        help: "The short sentence about nearby roads.",
      },
    ],
  },
  {
    legend: "Licence",
    fields: [
      {
        name: "license_number",
        label: "Washington State licence number",
        help: "Families check this on the DSHS lookup. Blank until you provide it.",
      },
      {
        name: "licensed_capacity",
        label: "Number of residents you are licensed for",
        type: "number",
        help: "Blank until you provide it — we will not guess a number.",
      },
      { name: "hours", label: "Hours", help: "e.g. “24 hours, every day”." },
    ],
  },
];

export function SettingsForm({ settings }: { settings: SiteSettingsRow | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRow, null);

  const fieldNames = GROUPS.flatMap((g) => g.fields.map((f) => f.name)).join(",");

  return (
    <form action={action} className="max-w-2xl">
      <Toast result={state} />

      <input type="hidden" name="__table" value="site_settings" />
      <input type="hidden" name="__id" value="singleton" />
      <input type="hidden" name="__fields" value={fieldNames} />

      <div className="grid gap-8">
        {GROUPS.map((group) => (
          <fieldset key={group.legend} className="border-rule bg-paper-raise rounded border p-5">
            <legend className="label text-sage-deep px-2">{group.legend}</legend>
            <div className="grid gap-4">
              {group.fields.map((field) => {
                const value = settings?.[field.name];
                return (
                  <div key={field.name} className="grid gap-1.5">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type ?? "text"}
                      autoComplete={field.autoComplete}
                      defaultValue={value === null || value === undefined ? "" : String(value)}
                      aria-describedby={field.help ? `${field.name}-help` : undefined}
                    />
                    {field.help ? (
                      <p id={`${field.name}-help`} className="text-stone text-[0.875rem]">
                        {field.help}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <Button type="submit" disabled={pending} className="mt-6">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        Save settings
      </Button>

      <p className="text-stone mt-3 text-[0.875rem]">
        The website updates within a minute of saving.
      </p>
    </form>
  );
}
