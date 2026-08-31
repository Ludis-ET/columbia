import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ServiceCard } from "@/components/site/service-card";
import { Gallery } from "@/components/site/gallery";
import { TestimonialList } from "@/components/site/testimonial";
import { MapBlock } from "@/components/site/map-block";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { LaurelDivider } from "@/components/brand/laurel";
import { HeartShield } from "@/components/brand/heart-shield";
import { IconBadge, isIconName } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { heroImage, mealsImage } from "@/lib/images";
import { identity, published } from "@/lib/content";
import {
  getAvailability,
  getCareTypes,
  getEveryDay,
  getGallery,
  getSchedule,
  getServices,
  getSiteSettings,
  getTestimonials,
  getWhyFamilies,
} from "@/lib/db/queries";

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function HomePage() {
  const tagline = published(identity.tagline);
  const promise = published(identity.promise);
  const about = published(identity.about);
  const meals = published(identity.meals);
  const closingLine = published(identity.closingLine);

  // One round trip per table, deduped by React cache() across the render.
  const [settings, availability, services, care, included, reasons, quotes, schedule, gallery] =
    await Promise.all([
      getSiteSettings(),
      getAvailability(),
      getServices(),
      getCareTypes(),
      getEveryDay(),
      getWhyFamilies(),
      getTestimonials(),
      getSchedule(),
      getGallery(),
    ]);

  const { phone, telHref: tel, addressLine: address, locationLine } = settings;

  // Four moments that read well out of context — morning, activities, dinner, night.
  const dayPreview = schedule.filter((item) => [1, 4, 9, 13].includes(item.position));

  return (
    <>
      {/* 1–2 · Hero, with the availability badge directly under the H1.
          The badge renders nothing until the client sets a status. */}
      <Hero
        size="home"
        title={tagline ?? "Columbia Care Adult Family Home"}
        lead={`An adult family home in Everett, Washington.`}
        image={heroImage}
        badge={
          <AvailabilityBadge
            status={availability.status}
            note={availability.note}
            updatedAt={availability.updatedAt}
          />
        }
        phone={phone}
        phoneHref={tel}
      />

      {/* 3 · Promise strip */}
      {promise ? (
        <Section ground="wash" className="py-14 sm:py-16">
          <div className="text-center">
            <HeartShield className="mx-auto mb-5 size-12" />
            <p className="text-h2 font-display mx-auto max-w-[24ch]">{promise}</p>
            <ul className="text-sage-deep mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2">
              {(published(identity.values) ?? []).map((value) => (
                <li key={value} className="label">
                  {value}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* 4 · Services grid */}
      <Section labelledBy="services-heading">
        <SectionHeading
          id="services-heading"
          eyebrow="Care & services"
          title="What we do, every day"
          lead={about}
          align="center"
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <li key={service.slug}>
              <Reveal delay={index * 0.06}>
                <ServiceCard
                  title={service.title}
                  icon={service.icon}
                  href={service.hasDetailPage ? `/services/${service.slug}` : null}
                  className="h-full"
                />
              </Reveal>
            </li>
          ))}
        </ul>

        {care.length > 0 ? (
          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="text-sage-deep inline-flex min-h-12 items-center gap-2 font-semibold"
            >
              See all care and services
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </Section>

      {/* 5 · Day teaser */}
      {dayPreview.length > 0 ? (
        <Section ground="wash" labelledBy="day-heading">
          <SectionHeading
            id="day-heading"
            eyebrow="Morning to night"
            title="A day in our home"
            lead="Every hour of the day, written out — so you know exactly what life here looks like."
            align="center"
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dayPreview.map((item, index) => (
              <li key={item.position}>
                <Reveal delay={index * 0.06}>
                  <div className="border-rule bg-paper h-full rounded border p-5">
                    {isIconName(item.icon) ? (
                      <IconBadge name={item.icon} accent={item.accent} size="sm" className="mb-3" />
                    ) : null}
                    <p className="label text-stone tabular-nums">{item.timeLabel}</p>
                    <h3 className="text-h3 mt-1 font-sans font-bold">{item.title}</h3>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link href="/a-day-in-our-home" className={buttonVariants({ variant: "secondary" })}>
              See a full day in our home
            </Link>
          </div>
        </Section>
      ) : null}

      {/* 6 · Gallery strip */}
      <Section labelledBy="gallery-heading">
        <SectionHeading
          id="gallery-heading"
          eyebrow="Our home"
          title="Come and look around"
          align="center"
        />
        <Gallery images={gallery.slice(0, 6)} />
        <div className="mt-8 text-center">
          <Link href="/our-home" className={buttonVariants({ variant: "secondary" })}>
            See the whole home
          </Link>
        </div>
      </Section>

      {/* 7 · Meals */}
      {meals ? (
        <Section ground="wash" labelledBy="meals-heading">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <div className="relative aspect-4/3 w-full overflow-hidden rounded">
                <Image
                  src={mealsImage.src}
                  alt={mealsImage.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
            <div>
              <SectionHeading
                id="meals-heading"
                eyebrow="Meals & dining"
                title="Home-cooked, every day"
                className="mb-6"
              />
              <Prose>
                <p className="text-lead text-ink-soft">{meals}</p>
              </Prose>
              <Link
                href="/meals"
                className="text-sage-deep mt-6 inline-flex min-h-12 items-center gap-2 font-semibold"
              >
                More about meals
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Section>
      ) : null}

      {/* 8 · Why families choose us + what's included */}
      {reasons.length > 0 ? (
        <Section labelledBy="why-heading">
          <SectionHeading
            id="why-heading"
            eyebrow="Why families choose us"
            title="What families tell us matters"
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

          {included.length > 0 ? (
            <>
              <LaurelDivider className="py-12" />
              <h3 className="text-h3 mb-6 text-center font-sans font-bold">
                Included every single day
              </h3>
              <ul className="flex flex-wrap justify-center gap-2">
                {included.map((item) => (
                  <li
                    key={item.title}
                    className="border-rule bg-paper-raise inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5"
                  >
                    {isIconName(item.icon) ? (
                      <IconBadge
                        name={item.icon}
                        accent="sage"
                        size="sm"
                        className="size-8 [&>svg]:size-4"
                      />
                    ) : null}
                    <span className="text-[0.9375rem]">{item.title}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Section>
      ) : null}

      {/* 9 · Testimonials — renders nothing until real quotes exist */}
      {quotes.length > 0 ? (
        <Section ground="wash">
          <TestimonialList items={quotes} />
        </Section>
      ) : null}

      {/* 10 · Location */}
      {address ? (
        <Section labelledBy="location-heading">
          <SectionHeading
            id="location-heading"
            eyebrow="Find us"
            title="Close to home, easy to reach"
            lead={locationLine}
            align="center"
          />
          <MapBlock address={address} locationLine={locationLine} className="mx-auto max-w-4xl" />
        </Section>
      ) : null}

      {/* 11 · Closing CTA */}
      <CtaBand
        lead="Come and see the home, meet the caregivers, and ask us anything you like."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}

/** Home keeps the site default title rather than the page-title template. */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};
