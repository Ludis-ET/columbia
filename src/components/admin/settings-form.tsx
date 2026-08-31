"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toast } from "@/components/admin/ui";
import { saveSettings, type ActionResult } from "@/app/admin/actions";
import type { SiteSettingsRow } from "@/lib/db/database.types";

/**
 * Site settings — fully wired version.
 *
 * Uses `saveSettings` instead of the generic `saveRow` because the form now
 * includes JSONB (socials) and text[] (service_area) fields that the generic
 * action cannot handle.
 */

const GROUPS: {
  legend: string;
  lead?: string;
  fields: { name: string; label: string; help?: string; type?: string; autoComplete?: string }[];
}[] = [
  {
    legend: "How families reach you",
    fields: [
      {
        name: "phone",
        label: "Phone number",
        type: "tel",
        help: "Leave blank and no phone number appears anywhere on the website.",
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
        help: "The short sentence about nearby roads shown under the map.",
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
        help: "Blank until you provide it.",
      },
      { name: "hours", label: "Hours", help: 'e.g. "24 hours, every day".' },
    ],
  },
];

function formValuesFromSettings(settings: SiteSettingsRow | null): Record<string, string> {
  const base = Object.fromEntries(
    GROUPS.flatMap((group) =>
      group.fields.map((field) => {
        const raw = settings?.[field.name as keyof SiteSettingsRow];
        return [field.name, raw === null || raw === undefined ? "" : String(raw)];
      }),
    ),
  );

  const socials = (settings?.socials as Record<string, string>) ?? {};
  base["socials_facebook"] = socials.facebook ?? "";
  base["socials_instagram"] = socials.instagram ?? "";
  base["socials_google_maps"] = socials.google_maps ?? "";

  return base;
}

// ---------------------------------------------------------------------------
// Service area tag chip component
// ---------------------------------------------------------------------------

function ServiceAreaInput({ initialValue }: { initialValue: string[] }) {
  const [chips, setChips] = useState<string[]>(initialValue);
  const [inputVal, setInputVal] = useState("");

  function addChip(raw: string) {
    const vals = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setChips((prev) => {
      const next = [...prev];
      for (const v of vals) {
        if (!next.includes(v)) next.push(v);
      }
      return next;
    });
    setInputVal("");
  }

  function removeChip(chip: string) {
    setChips((prev) => prev.filter((c) => c !== chip));
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-[0.9375rem] font-medium">Service area cities</span>
      {/* Hidden input carries the comma-separated value for the form action */}
      <input type="hidden" name="service_area" value={chips.join(", ")} />

      {/* A <label> rather than a div with onClick. Clicking anywhere in the box
          focuses the input natively, with no JavaScript and no keyboard gap:
          the previous version worked for a mouse and not for a keyboard. */}
      <label
        htmlFor="service-area-input"
        className="border-rule-strong bg-paper flex min-h-11 cursor-text flex-wrap gap-1.5 rounded border px-3 py-2"
      >
        {chips.map((chip) => (
          <span
            key={chip}
            className="bg-sage-wash text-sage-deep label inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.75rem]"
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(chip)}
              aria-label={`Remove ${chip}`}
              className="hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id="service-area-input"
          type="text"
          value={inputVal}
          placeholder={chips.length === 0 ? "Type a city and press Enter or comma…" : ""}
          className="placeholder:text-stone/60 min-w-24 flex-1 border-none bg-transparent text-[0.9375rem] outline-none"
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
              e.preventDefault();
              addChip(inputVal);
            }
            if (e.key === "Backspace" && inputVal === "" && chips.length > 0) {
              setChips((prev) => prev.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (inputVal.trim()) addChip(inputVal);
          }}
        />
      </label>
      <p className="text-stone text-[0.875rem]">Press Enter or comma to add each city.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map preview
// ---------------------------------------------------------------------------

function MapPreview({ settings }: { settings: SiteSettingsRow | null }) {
  const addr =
    settings?.street_address && settings?.address_locality
      ? `${settings.street_address}, ${settings.address_locality}, ${settings.address_region ?? ""} ${settings.postal_code ?? ""}`
      : null;

  if (!addr) return null;

  const query = encodeURIComponent(addr);

  return (
    <div className="border-rule overflow-hidden rounded border">
      <div className="bg-sage-wash/60 flex items-center gap-2 px-3 py-2">
        <MapPin className="text-sage-deep size-4 shrink-0" aria-hidden="true" />
        <p className="text-stone text-[0.875rem]">{addr}</p>
      </div>
      <iframe
        src={`https://maps.google.com/maps?q=${query}&output=embed&z=15`}
        width="100%"
        height="200"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location map preview"
        className="block border-0"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main form
// ---------------------------------------------------------------------------

export function SettingsForm({ settings }: { settings: SiteSettingsRow | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveSettings,
    null,
  );
  const [values, setValues] = useState(() => formValuesFromSettings(settings));

  // Re-seed the form only when the underlying row actually changed. Depending on
  // `settings` itself would reset the form on every render and throw away
  // whatever the owner was in the middle of typing.
  useEffect(() => {
    setValues(formValuesFromSettings(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.updated_at]);

  const set = (name: string) => ({
    value: values[name] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [name]: e.target.value })),
  });

  return (
    <form action={action} className="max-w-2xl">
      <Toast result={state} />

      <div className="grid gap-8">
        {/* Contact fields */}
        {GROUPS.map((group) => (
          <fieldset key={group.legend} className="border-rule bg-paper-raise rounded border p-5">
            <legend className="label text-sage-deep px-2">{group.legend}</legend>
            <div className="grid gap-4">
              {group.fields.map((field) => (
                <div key={field.name} className="grid gap-1.5">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type={field.type ?? "text"}
                    autoComplete={field.autoComplete}
                    aria-describedby={field.help ? `${field.name}-help` : undefined}
                    {...set(field.name)}
                  />
                  {field.help ? (
                    <p id={`${field.name}-help`} className="text-stone text-[0.875rem]">
                      {field.help}
                    </p>
                  ) : null}
                </div>
              ))}

              {/* Map preview sits after the address group */}
              {group.legend === "Where you are" ? <MapPreview settings={settings} /> : null}
            </div>
          </fieldset>
        ))}

        {/* Social links */}
        <fieldset className="border-rule bg-paper-raise rounded border p-5">
          <legend className="label text-sage-deep px-2">Social links</legend>
          <div className="grid gap-4">
            {[
              {
                name: "socials_facebook",
                label: "Facebook page URL",
                placeholder: "https://facebook.com/…",
              },
              {
                name: "socials_instagram",
                label: "Instagram profile URL",
                placeholder: "https://instagram.com/…",
              },
              {
                name: "socials_google_maps",
                label: "Google Maps profile URL",
                placeholder: "https://maps.google.com/…",
              },
            ].map((field) => (
              <div key={field.name} className="grid gap-1.5">
                <Label htmlFor={field.name}>{field.label}</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="url"
                  placeholder={field.placeholder}
                  {...set(field.name)}
                />
              </div>
            ))}
          </div>
        </fieldset>

        {/* Service area */}
        <fieldset className="border-rule bg-paper-raise rounded border p-5">
          <legend className="label text-sage-deep px-2">Service area</legend>
          <div className="grid gap-4">
            <ServiceAreaInput initialValue={settings?.service_area ?? []} />
          </div>
        </fieldset>
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
