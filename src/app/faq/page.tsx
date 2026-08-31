import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading } from "@/components/site/section";
import { FaqAccordion, type FaqItem } from "@/components/site/faq-accordion";
import { CtaBand } from "@/components/site/cta-band";
import { identity, published } from "@/lib/content";
import { getFaqs, getSiteSettings } from "@/lib/db/queries";

/**
 * TIER 2 — shell built, publishing gated.
 *
 * Every answer has to come from the client; a care home's FAQ is exactly the
 * wrong place to guess. The route 404s while the list is empty. Add entries to
 * `faqs` in content/source-of-truth.json and the page appears.
 */

export const metadata: Metadata = {
  title: "Questions Families Ask",
  description:
    "Answers to the questions families most often ask about Columbia Care Adult Family Home.",
  alternates: { canonical: "/faq" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function FaqPage() {
  const items: FaqItem[] = await getFaqs();

  if (items.length === 0) notFound();

  const closingLine = published(identity.closingLine);
  const { phone, telHref: tel } = await getSiteSettings();

  return (
    <>
      <Hero title="Questions families ask" lead="Straight answers to the things that matter." />

      <Section>
        <SectionHeading eyebrow="Common questions" title="Answers" />
        <div className="max-w-3xl">
          <FaqAccordion items={items} />
        </div>
      </Section>

      <CtaBand
        title="Still have a question?"
        lead="Ask us directly — we would rather answer honestly than have you guess."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
