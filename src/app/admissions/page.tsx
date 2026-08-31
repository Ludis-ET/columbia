import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { admissions, identity, published } from "@/lib/content";
import { getSiteSettings } from "@/lib/db/queries";

/**
 * TIER 2 — shell built, publishing gated.
 *
 * Admissions needs payment types, rates and admission criteria, none of which
 * appear in the client's artwork (docs/client-questions.md q6 and q11). Rather
 * than publish a pricing page with invented numbers, the route 404s until the
 * data exists. Fill those entries in content/source-of-truth.json and this page
 * appears with no further code change.
 */

export const metadata: Metadata = {
  title: "Admissions",
  description: "Payment options and how to move in to Columbia Care Adult Family Home.",
  alternates: { canonical: "/admissions" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function AdmissionsPage() {
  const paymentTypes = published(admissions.paymentTypes);
  const rate = published(admissions.rate);
  const criteria = published(admissions.admissionCriteria);
  const disclosure = published(admissions.dshsDisclosure);

  if (!paymentTypes && !rate && !criteria && !disclosure) notFound();

  const closingLine = published(identity.closingLine);
  const { phone, telHref: tel } = await getSiteSettings();

  return (
    <>
      <Hero title="Admissions" lead="What it costs, and how to move in." />

      {paymentTypes ? (
        <Section labelledBy="payment-heading">
          <SectionHeading id="payment-heading" eyebrow="Paying for care" title="Payment options" />
          <ul className="grid max-w-3xl gap-3 sm:grid-cols-2">
            {paymentTypes.map((type) => (
              <li
                key={type}
                className="border-rule bg-paper-raise rounded border p-4 font-semibold"
              >
                {type}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {rate ? (
        <Section ground="wash" labelledBy="rate-heading">
          <SectionHeading id="rate-heading" eyebrow="Monthly rate" title="What it costs" />
          <Prose>
            <p className="text-lead">{rate}</p>
          </Prose>
        </Section>
      ) : null}

      {criteria ? (
        <Section labelledBy="criteria-heading">
          <SectionHeading
            id="criteria-heading"
            eyebrow="Who we can care for"
            title="Admission criteria"
            lead="So nobody books a tour that was never going to work out."
          />
          <Prose>
            <p>{criteria}</p>
          </Prose>
        </Section>
      ) : null}

      {disclosure ? (
        <Section ground="wash" labelledBy="disclosure-heading">
          <SectionHeading
            id="disclosure-heading"
            eyebrow="Washington State"
            title="Disclosure of Services"
            lead="Our scope of care, exactly as filed with the state."
          />
          <a
            href={disclosure}
            className="text-sage-deep inline-flex min-h-12 items-center font-semibold underline underline-offset-2"
          >
            Download our Disclosure of Services (PDF)
          </a>
        </Section>
      ) : null}

      <CtaBand
        title="Talk it through with us"
        lead="Costs and care needs are easier to work out in a conversation."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
