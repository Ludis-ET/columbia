import Link from "next/link";
import { LaurelDivider } from "@/components/brand/laurel";
import { buttonVariants } from "@/components/ui/button";
import { sections } from "@/lib/sections";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
      <p className="label text-sage-deep mb-3">Page not found</p>
      <h1 className="text-h1 mb-4">We couldn&rsquo;t find that page</h1>
      <p className="text-ink-soft text-lead mb-8">
        The link may be out of date. Everything about Columbia Care is on one page, and here&rsquo;s
        where to go next.
      </p>

      <LaurelDivider className="mb-8" />

      <ul className="mb-10 flex flex-wrap justify-center gap-2">
        {sections.map((section) => (
          <li key={section.id}>
            <Link
              href={`/#${section.id}`}
              className="border-rule hover:border-sage hover:text-sage-deep inline-flex min-h-12 items-center rounded border px-4"
            >
              {section.navLabel}
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Back to the home page
      </Link>
    </div>
  );
}
