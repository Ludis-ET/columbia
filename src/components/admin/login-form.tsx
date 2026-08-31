"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, sendMagicLink, type ActionResult } from "@/app/admin/actions";

/**
 * Sign-in.
 *
 * Password first, magic link as the "I forgot again" path, realistic for
 * someone who signs in twice a month. Both report the same vague outcome on
 * failure so neither can be used to discover whether an account exists.
 */
export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [pwState, pwAction, pwPending] = useActionState<ActionResult | null, FormData>(
    signIn,
    null,
  );
  const [linkState, linkAction, linkPending] = useActionState<ActionResult | null, FormData>(
    sendMagicLink,
    null,
  );

  const state = mode === "password" ? pwState : linkState;
  const pending = mode === "password" ? pwPending : linkPending;

  return (
    <div>
      {notice ? (
        <p className="bg-sage-wash text-sage-deep mb-4 rounded p-3 text-[0.9375rem]">{notice}</p>
      ) : null}

      <form action={mode === "password" ? pwAction : linkAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        {mode === "password" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        ) : null}

        {/* aria-live so the result is announced, not just shown. */}
        <div aria-live="polite">
          {state && !state.ok ? (
            <p className="text-[0.9375rem] text-[var(--danger)]">{state.message}</p>
          ) : null}
          {state?.ok ? <p className="text-sage-deep text-[0.9375rem]">{state.message}</p> : null}
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {mode === "password" ? "Sign in" : "Email me a sign-in link"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "link" : "password")}
        className="text-sage-deep mt-4 min-h-11 w-full text-[0.9375rem] font-semibold underline"
      >
        {mode === "password" ? "I don't remember my password" : "Sign in with a password instead"}
      </button>
    </div>
  );
}
