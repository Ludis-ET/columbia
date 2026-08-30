import Link from "next/link";
import { LaurelDivider } from "@/components/brand/laurel";
import { HeartShield } from "@/components/brand/heart-shield";
import { identity, published } from "@/lib/content";

/**
 * Phase 1 placeholder.
 *
 * The real home page — 13 blocks — is Phase 3. This exists so the foundation is
 * reviewable end to end: fonts, tokens, header, footer, and the content pipeline
 * all working against real artwork copy.
 */
export default function HomePage() {
  const tagline = published(identity.tagline);
  const promise = published(identity.promise);
  const about = published(identity.about);

  return (
    <>
      <section className="bg-sage-wash">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <HeartShield className="mx-auto mb-6 size-14" />
          {tagline ? <h1 className="text-hero mb-6">{tagline}</h1> : null}
          {promise ? (
            <p className="text-ink-soft text-lead mx-auto max-w-[46ch]">{promise}</p>
          ) : null}

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="bg-ink text-paper hover:bg-sage-deep inline-flex min-h-12 items-center rounded px-6 font-semibold transition-colors"
            >
              Book a house tour
            </Link>
            <Link
              href="/a-day-in-our-home"
              className="border-rule-strong hover:border-sage hover:text-sage-deep inline-flex min-h-12 items-center rounded border px-6 font-semibold transition-colors"
            >
              See a day in our home
            </Link>
          </div>
        </div>
      </section>

      <LaurelDivider className="py-12" />

      <section className="mx-auto max-w-2xl px-4 pb-24 sm:px-6">
        {about ? <p className="text-lead text-ink-soft">{about}</p> : null}

        <div className="border-rule bg-paper-raise mt-12 rounded border p-6">
          <p className="label text-sage-deep mb-2">Phase 1 · foundation</p>
          <p className="mb-4">
            Design system, fonts, brand marks and site chrome are in place. Page content lands in
            Phase 3.
          </p>
          <Link href="/specimen" className="text-sage-deep font-semibold underline">
            View the design specimen
          </Link>
        </div>
      </section>
    </>
  );
}
