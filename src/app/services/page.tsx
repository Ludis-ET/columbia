import type { Metadata } from "next";
import Link from "next/link";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { ServiceCard } from "@/components/site/service-card";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { IconBadge, isIconName } from "@/components/icons";
import { identity, published } from "@/lib/content";
import { getCareTypes, getEveryDay, getServices, getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Care & Services",
  description:
    "The care and services provided at Columbia Care Adult Family Home in Everett, Washington.",
  alternates: { canonical: "/services" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function ServicesPage() {
  const about = published(identity.about);
  const closingLine = published(identity.closingLine);

  const [care, services, included, settings] = await Promise.all([
    getCareTypes(),
    getServices(),
    getEveryDay(),
    getSiteSettings(),
  ]);
  const { phone, telHref: tel } = settings;

  return (
    <>
      <Hero
        title="Care & services"
        lead="Personalised care in a real home — here is everything we provide."
      />

      {/* Care types — the three brochure chips, each with its own page. */}
      {care.length > 0 ? (
        <Section labelledBy="care-heading">
          <SectionHeading
            id="care-heading"
            eyebrow="Types of care"
            title="The care we provide"
            lead={about}
            align="center"
          />
          <ul className="grid gap-4 md:grid-cols-3">
            {care.map((type, index) => (
              <li key={type.slug}>
                <Reveal delay={index * 0.06}>
                  <Link
                    href={`/services/${type.slug}`}
                    className="group border-rule bg-paper-raise hover:border-sage flex h-full flex-col items-center rounded border p-8 text-center transition-colors"
                  >
                    {isIconName(type.icon) ? (
                      <IconBadge name={type.icon} accent="sage" size="lg" className="mb-4" />
                    ) : null}
                    <h3 className="text-h3 font-sans font-bold">{type.shortTitle}</h3>
                    <span className="text-sage-deep mt-3 font-semibold">Learn more</span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* The seven services, verbatim. */}
      {services.length > 0 ? (
        <Section ground="wash" labelledBy="services-heading">
          <SectionHeading
            id="services-heading"
            eyebrow="Our services"
            title="What we provide"
            align="center"
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <li key={service.slug}>
                <Reveal delay={index * 0.06}>
                  <ServiceCard
                    title={service.title}
                    icon={service.icon}
                    summary={service.description}
                    href={service.hasDetailPage ? `/services/${service.slug}` : null}
                    className="h-full"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Included every day. */}
      {included.length > 0 ? (
        <Section labelledBy="included-heading">
          <SectionHeading
            id="included-heading"
            eyebrow="Every day at Columbia Care"
            title="Included for every resident"
            align="center"
          />
          <ul className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
            {included.map((item, index) => (
              <li key={item.title}>
                <Reveal delay={index * 0.06}>
                  <div className="border-rule bg-paper-raise flex h-full items-center gap-3 rounded border p-4">
                    {isIconName(item.icon) ? (
                      <IconBadge name={item.icon} accent="navy" size="sm" />
                    ) : null}
                    <span className="font-semibold">{item.title}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <Prose className="mx-auto mt-10 text-center">
            <p className="text-stone">
              Not sure whether we can meet your loved one&rsquo;s needs?{" "}
              <Link href="/contact" className="text-sage-deep font-semibold">
                Ask us
              </Link>{" "}
              — we will tell you honestly.
            </p>
          </Prose>
        </Section>
      ) : null}

      <CtaBand
        title="See the care for yourself"
        lead="Book a house tour and we will walk you through a typical day."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
