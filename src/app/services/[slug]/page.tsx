import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { TimelineEntry } from "@/components/site/timeline-entry";
import { ServiceCard } from "@/components/site/service-card";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { identity, published } from "@/lib/content";
import {
  findServiceBySlug,
  getScheduleFor,
  getServices,
  getServicesWithPages,
  getSiteSettings,
} from "@/lib/db/queries";

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getServicesWithPages()).map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await findServiceBySlug(slug);
  if (!service) return {};

  return {
    title: service.title,
    description:
      service.description ??
      `${service.title} at Columbia Care Adult Family Home in Everett, Washington.`,
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await findServiceBySlug(slug);

  if (!service || !service.hasDetailPage) notFound();

  /**
   * The page is built from the client's own words only.
   *
   * `description` is null until they write one, so the body of this page is the
   * day-timeline entries that actually demonstrate the service — all verbatim
   * from the infographic. That is honest content rather than plausible-sounding
   * filler, which is the whole point of the rule in CLAUDE.md.
   */
  const [moments, allServices, settings] = await Promise.all([
    getScheduleFor(service.relatedSchedule),
    getServices(),
    getSiteSettings(),
  ]);
  const others = allServices.filter((s) => s.slug !== slug && s.hasDetailPage);

  const closingLine = published(identity.closingLine);
  const { phone, telHref: tel } = settings;

  return (
    <>
      <Hero title={service.title} lead={service.description} />

      <Section>
        <Link
          href="/services"
          className="text-sage-deep mb-8 inline-flex min-h-12 items-center gap-2 font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          All care &amp; services
        </Link>

        {moments.length > 0 ? (
          <>
            <SectionHeading
              eyebrow="In a typical day"
              title="How this looks in practice"
              lead="Taken straight from our daily routine."
            />
            <div className="relative max-w-3xl">
              {moments.map((item, index) => (
                <Reveal key={item.position} delay={index * 0.06}>
                  <TimelineEntry
                    timeLabel={item.timeLabel}
                    title={item.title}
                    body={item.body}
                    bullets={item.bullets}
                    icon={item.icon}
                    accent={item.accent}
                  />
                </Reveal>
              ))}
            </div>
            <Link
              href="/a-day-in-our-home"
              className="text-sage-deep inline-flex min-h-12 items-center font-semibold"
            >
              See the full day, morning to night
            </Link>
          </>
        ) : (
          <Prose>
            {/* Deliberately does not interpolate the title into a sentence:
                lower-casing it mangles "Alzheimer's", and capitalising it
                mid-sentence reads wrong. The heading above already names it. */}
            <p className="text-lead text-ink-soft">
              This is one of the services we provide for residents at Columbia Care.
            </p>
            <p>
              The best way to understand what that means for your loved one is to visit and ask.{" "}
              <Link href="/contact" className="text-sage-deep font-semibold">
                Book a house tour
              </Link>{" "}
              and we will talk through their needs in detail.
            </p>
          </Prose>
        )}
      </Section>

      {others.length > 0 ? (
        <Section ground="wash" labelledBy="other-services">
          <SectionHeading id="other-services" title="Other care we provide" align="center" />
          <ul className="grid gap-4 sm:grid-cols-3">
            {others.map((other, index) => (
              <li key={other.slug}>
                <Reveal delay={index * 0.06}>
                  <ServiceCard
                    title={other.title}
                    icon={other.icon}
                    href={`/services/${other.slug}`}
                    className="h-full"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <CtaBand
        title="Talk to us about your loved one"
        lead="Every resident's care plan is different. Tell us what they need."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
