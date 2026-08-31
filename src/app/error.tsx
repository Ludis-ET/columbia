"use client";

import { useEffect } from "react";
import { AnchorLink } from "@/components/site/anchor-link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced with real error reporting at launch (Phase 9).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <p className="label text-sage-deep mb-3">Something went wrong</p>
      <h1 className="text-h1 mb-4">This page didn&rsquo;t load</h1>
      <p className="text-ink-soft text-lead mb-8">
        Please try again. If it keeps happening, call us or send an email and we&rsquo;ll help
        directly.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-ink text-paper hover:bg-sage-deep inline-flex min-h-12 items-center rounded px-6 font-semibold transition-colors"
        >
          Try again
        </button>
        <AnchorLink
          sectionId="contact"
          className="border-rule hover:border-sage hover:text-sage-deep inline-flex min-h-12 items-center rounded border px-6 font-semibold"
        >
          Contact us
        </AnchorLink>
      </div>

      {error.digest ? (
        <p className="text-stone mt-8 font-mono text-sm">Reference: {error.digest}</p>
      ) : null}
    </div>
  );
}
