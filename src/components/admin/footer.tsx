import Link from "next/link";
import { ExternalLink } from "lucide-react";

/**
 * Compact footer for the authenticated admin console.
 * Separate from the public site footer — quiet utility links only.
 */
export function AdminFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-rule bg-paper/60 border-t">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-10">
        <p className="label text-stone text-[0.625rem]">
          Columbia Care · Website admin · {year}
        </p>

        <nav
          aria-label="Admin footer"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem]"
        >
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone hover:text-sage-deep inline-flex min-h-9 items-center gap-1 transition-colors"
          >
            View website
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
          <span className="text-stone/40" aria-hidden="true">
            ·
          </span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone hover:text-sage-deep inline-flex min-h-9 items-center transition-colors"
          >
            Privacy
          </Link>
          <span className="text-stone/40" aria-hidden="true">
            ·
          </span>
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone hover:text-sage-deep inline-flex min-h-9 items-center transition-colors"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
