import type { Metadata } from "next";
import Image from "next/image";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { HeartShield } from "@/components/brand/heart-shield";
import { LaurelDivider } from "@/components/brand/laurel";
import { IconBadge, isIconName } from "@/components/icons";
import { aboutImage } from "@/lib/images";
import { identity, published, team } from "@/lib/content";
import { getEveryDay, getSiteSettings, getWhyFamilies } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "About Us",
  description:
    published(identity.about) ?? "About Columbia Care Adult Family Home in Everett, Washington.",
  alternates: { canonical: "/about" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function AboutPage() {
  const about = published(identity.about);
  const promise = published(identity.promise);
  const closingLine = published(identity.closingLine);
  const values = published(identity.values) ?? [];
  const members = published(team) ?? [];

  const [settings, reasons, included] = await Promise.all([
    getSiteSettings(),
    getWhyFamilies(),
    getEveryDay(),
  ]);
  const { phone, telHref: tel, licenseNumber: licence, licensedCapacity: capacity } = settings;

  return (
    <>
      <Hero title="About our home" lead={promise} />

      <Section labelledBy="story-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              id="story-heading"
              eyebrow="Who we are"
              title="A family-like environment"
              className="mb-6"
            />
            {about ? (
              <Prose>
                <p className="text-lead text-ink-soft">{about}</p>
              </Prose>
            ) : null}
          </div>
          <Reveal>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded">
              <Image
                src={aboutImage.src}
                alt={aboutImage.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Values band */}
      {values.length > 0 ? (
        <Section ground="wash" labelledBy="values-heading">
          <SectionHeading
            id="values-heading"
            eyebrow="What we stand for"
            title="Our values"
            align="center"
          />
          <ul className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
            {values.map((value, index) => (
              <li key={value}>
                <Reveal delay={index * 0.06}>
                  <span className="border-rule bg-paper inline-flex min-h-12 items-center gap-2.5 rounded-full border px-5">
                    <HeartShield className="size-5 shrink-0" />
                    <span className="font-semibold">{value}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Why families choose us */}
      {reasons.length > 0 ? (
        <Section labelledBy="why-heading">
          <SectionHeading
            id="why-heading"
            eyebrow="Why families choose Columbia Care"
            title="What sets this home apart"
            align="center"
          />
          <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {reasons.map((reason, index) => (
              <li key={reason}>
                <Reveal delay={index * 0.06}>
                  <div className="border-rule bg-paper-raise flex h-full items-start gap-3 rounded border p-5">
                    <HeartShield className="mt-0.5 size-6 shrink-0" />
                    <p className="font-semibold">{reason}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* What's included */}
      {included.length > 0 ? (
        <Section ground="wash" labelledBy="included-heading">
          <SectionHeading
            id="included-heading"
            eyebrow="Every day at Columbia Care"
            title="What's included"
            align="center"
          />
          <ul className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
            {included.map((item, index) => (
              <li key={item.title}>
                <Reveal delay={index * 0.06}>
                  <div className="bg-paper border-rule flex h-full items-center gap-3 rounded border p-4">
                    {isIconName(item.icon) ? (
                      <IconBadge name={item.icon} accent="sage" size="sm" />
                    ) : null}
                    <span className="font-semibold">{item.title}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Team — renders nothing until the client supplies names and consent. */}
      {members.length > 0 ? (
        <Section labelledBy="team-heading">
          <SectionHeading
            id="team-heading"
            eyebrow="Who cares for your loved one"
            title="Meet the team"
            align="center"
          />
        </Section>
      ) : null}

      {/* Licence details — each line appears only once confirmed. */}
      {licence || capacity ? (
        <Section labelledBy="licence-heading">
          <div className="border-rule bg-paper-raise mx-auto max-w-2xl rounded border p-6 text-center">
            <HeartShield className="mx-auto mb-4 size-10" />
            <h2 id="licence-heading" className="text-h3 mb-3 font-sans font-bold">
              Licensed in Washington State
            </h2>
            {licence ? (
              <p>
                <span className="label text-stone block">Licence number</span>
                <span className="text-lead font-semibold">{licence}</span>
              </p>
            ) : null}
            {capacity ? (
              <p className="mt-3">
                <span className="label text-stone block">Licensed for</span>
                <span className="text-lead font-semibold">{capacity} residents</span>
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}

      {closingLine ? <LaurelDivider className="pb-4" /> : null}

      <CtaBand
        title="Come and meet us"
        lead="The best way to know if a home is right is to walk through the door."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
