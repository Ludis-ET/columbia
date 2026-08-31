"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InfoHint } from "@/components/site/info-hint";
import { submitTourRequest, type TourFormState } from "@/app/actions/tour";
import { PREFERRED_TIMES, RELATIONSHIPS } from "@/lib/forms/tour-request";
import { cn } from "@/lib/utils";

/**
 * The tour request form.
 *
 * Written for someone anxious, on a phone, late at night:
 *
 *   - Three required-ish fields. Name, then EITHER phone or email, never both.
 *   - Phone accepts any format. Brackets, dots, spaces all work; the server
 *     normalises. Nobody is rejected over punctuation.
 *   - Errors are attached with aria-describedby and announced in a live region,
 *     never signalled by colour alone.
 *   - The submit button says what happens, and the confirmation replaces the
 *     form rather than appearing above it, so there is no doubt it worked.
 *   - No timeframe is promised, because we cannot promise one on the home's
 *     behalf. Same rule as the rest of the site.
 */

const initialState: TourFormState = { status: "idle", message: "" };

export function TourForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(submitTourRequest, initialState);
  const [times, setTimes] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Move focus to the error summary so a screen reader user is not left
  // wondering why nothing happened.
  useEffect(() => {
    if (state.status === "error") errorRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div className={cn("py-8 text-center", className)} role="status">
        <span className="bg-sage-wash mx-auto mb-5 flex size-16 items-center justify-center rounded-full">
          <CheckCircle2 className="text-sage-deep size-8" aria-hidden="true" />
        </span>
        <h3 className="text-h3 mb-3 font-sans font-bold">{state.message}</h3>
        <p className="text-ink-soft mx-auto max-w-[42ch]">
          If you left an email address, there is a note in your inbox confirming this. You are very
          welcome to call in the meantime.
        </p>
      </div>
    );
  }

  const err = (field: string) => state.errors?.[field];

  return (
    <form action={action} className={cn("grid gap-5", className)} noValidate>
      <div className="flex flex-wrap items-center gap-1">
        <h3 className="text-h3 font-sans font-bold">Send us a message</h3>
        <InfoHint label="What we ask for">
          <p>Your name, and one way to reach you. Everything else is optional.</p>
          <p>Whichever contact method you prefer. Any phone format is fine.</p>
        </InfoHint>
      </div>
      {/* Honeypot. Hidden from people, irresistible to naive bots.
          aria-hidden + tabIndex -1 so assistive tech skips it entirely. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${uid}-company`}>Company</label>
        <input id={`${uid}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div
        ref={errorRef}
        tabIndex={-1}
        aria-live="assertive"
        className={state.status === "error" ? "" : "sr-only"}
      >
        {state.status === "error" ? (
          <p className="rounded border border-[var(--danger)] p-3 text-[var(--danger)]">
            {state.message}
          </p>
        ) : null}
      </div>

      <Field
        id={`${uid}-name`}
        name="name"
        label="Your name"
        autoComplete="name"
        error={err("name")}
        required
      />

      {/* items-start: the phone field has a hint and the email field does not, so
          the default stretch alignment pushed the email label out of line. */}
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <Field
          id={`${uid}-phone`}
          name="phone"
          label="Phone number"
          type="tel"
          autoComplete="tel"
          error={err("phone")}
        />
        <Field
          id={`${uid}-email`}
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={err("email")}
        />
      </div>

      <div className="grid min-w-0 gap-1.5">
        <Label htmlFor={`${uid}-relationship`}>Who are you asking for?</Label>
        {/* w-full + min-w-0: a <select> sizes to its widest option by default,
            and "I'm a case manager or social worker" was forcing the whole form
            grid 33px past a 320px viewport. */}
        <select
          id={`${uid}-relationship`}
          name="relationship"
          defaultValue=""
          className="border-rule-strong bg-paper-raise focus-visible:outline-ring min-h-12 w-full min-w-0 rounded border px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <option value="">Prefer not to say</option>
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-3 font-semibold">
          <span className="inline-flex flex-wrap items-center gap-1">
            When would suit you to visit?
            <InfoHint label="Visit times">
              <p>Choose as many as you like, or none.</p>
            </InfoHint>
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {PREFERRED_TIMES.map((time) => {
            const checked = times.includes(time);
            return (
              <label
                key={time}
                className={cn(
                  "inline-flex min-h-12 cursor-pointer items-center rounded-full border px-4 transition-colors",
                  checked
                    ? "border-sage bg-sage-wash text-sage-deep font-semibold"
                    : "border-rule text-ink-soft hover:border-rule-strong",
                )}
              >
                <input
                  type="checkbox"
                  name="preferredTimes"
                  value={time}
                  checked={checked}
                  onChange={(e) =>
                    setTimes((prev) =>
                      e.target.checked ? [...prev, time] : prev.filter((t) => t !== time),
                    )
                  }
                  className="sr-only"
                />
                {time}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <Label htmlFor={`${uid}-message`}>Anything you&rsquo;d like us to know?</Label>
          <InfoHint label="About your message">
            <p>
              Tell us about your loved one and what they need, or just say hello. Nothing here is
              required.
            </p>
          </InfoHint>
        </div>
        <Textarea id={`${uid}-message`} name="message" rows={4} />
      </div>

      {siteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
          />
          <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />
        </>
      ) : null}

      <div className="border-rule flex flex-wrap items-center gap-3 border-t pt-5">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="w-full whitespace-normal sm:w-auto"
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Sending…" : "Send this to Columbia Care"}
        </Button>
        <InfoHint label="Privacy">
          <p>No obligation, and we never share your details.</p>
        </InfoHint>
      </div>
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  error,
  hint,
  required,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-stone font-normal"> (required)</span> : null}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={error ? "border-[var(--danger)]" : undefined}
      />
      {hint ? (
        <p id={`${id}-hint`} className="text-stone text-[0.9375rem]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-[0.9375rem] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
