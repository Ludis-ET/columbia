import type { Metadata } from "next";
import Image from "next/image";
import { Mail, MapPin, Phone, Printer } from "lucide-react";

import { Hero } from "@/components/site/hero";
import { AnchorSection } from "@/components/site/anchor-section";
import { SectionHeading, Prose } from "@/components/site/section";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ServiceCard } from "@/components/site/service-card";
import { TimelineEntry, DayGradient } from "@/components/site/timeline-entry";
import { Gallery } from "@/components/site/gallery";
import { TestimonialList } from "@/components/site/testimonial";
import { MapBlock } from "@/components/site/map-block";
import { TourForm } from "@/components/site/tour-form";
import { BackToTop } from "@/components/site/back-to-top";
import { Reveal } from "@/components/motion/reveal";
import { LaurelDivider } from "@/components/brand/laurel";
import { HeartShield } from "@/components/brand/heart-shield";
import { IconBadge, isIconName } from "@/components/icons";
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
import type { TestimonialItem } from "@/components/site/testimonial";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

/**
 * The whole public site, on one page.
 *
 * Section order follows how a family actually reads: what is this place, what
 * care do you give, what do the days look like, what does it look like, what do
 * you eat, where are you, how do I visit. The tour form is last because that is
 * the decision the page is building toward.
 *
 * Exactly one h1 (the hero). Every section is a labelled landmark with an h2, so
 * a screen reader user can jump between them — which matters more on one long
 * page than it does across several short ones.
 */
export default async function HomePage() {
  const tagline = published(identity.tagline);
  const promise = published(identity.promise);
  const about = published(identity.about);
  const meals = published(identity.meals);
  const closingLine = published(identity.closingLine);
  const tourCta = published(identity.tourCta);
  const values = published(identity.values) ?? [];

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

  const { phone, telHref: tel, addressLine: address, locationLine, email, fax, hours } = settings;
  const testimonials = quotes as TestimonialItem[];

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <Hero
        size="home"
        title={tagline ?? "Columbia Care Adult Family Home"}
        lead="An adult family home in Everett, Washington."
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

      {/* ------------------------------------------------------------ promise */}
      {promise ? (
        <div className="bg-sage-wash py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
            <HeartShield className="mx-auto mb-5 size-12" />
            <p className="text-h2 font-display mx-auto max-w-[24ch]">{promise}</p>
            {values.length > 0 ? (
              <ul className="text-sage-deep mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {values.map((value) => (
                  <li key={value} className="label">
                    {value}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- about */}
      <AnchorSection id="about" title="About our home">
        <SectionHeading
          eyebrow="Who we are"
          title="A family-like environment"
          lead={about}
          align="center"
        />

        {reasons.length > 0 ? (
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
        ) : null}
      </AnchorSection>

      {/* --------------------------------------------------------------- care */}
      <AnchorSection id="care" title="Care and services" ground="wash">
        <SectionHeading
          eyebrow="Care &amp; services"
          title="What we do, every day"
          align="center"
        />

        {care.length > 0 ? (
          <ul className="mx-auto mb-12 grid max-w-4xl gap-4 md:grid-cols-3">
            {care.map((type, index) => (
              <li key={type.slug}>
                <Reveal delay={index * 0.06}>
                  <div className="border-rule bg-paper flex h-full flex-col items-center rounded border p-8 text-center">
                    {isIconName(type.icon) ? (
                      <IconBadge name={type.icon} accent="sage" size="lg" className="mb-4" />
                    ) : null}
                    <h3 className="text-h3 font-sans font-bold">{type.shortTitle}</h3>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}

        {services.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <li key={service.slug}>
                <Reveal delay={Math.min(index, 5) * 0.05}>
                  <ServiceCard
                    title={service.title}
                    icon={service.icon}
                    summary={service.description}
                    className="bg-paper h-full"
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : null}

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
                  className="border-rule bg-paper inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5"
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
      </AnchorSection>

      {/* ---------------------------------------------------------------- day */}
      {/* The signature moment: the ground ramps dawn → night behind the 13
          entries, using the client's own accent colours. Full-bleed, so it
          reads as a change of place rather than another band. */}
      <AnchorSection id="day" title="A day in our home" bleed className="relative overflow-hidden">
        <DayGradient />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <p className="label text-sage-deep mb-3">Morning to night</p>
            <h2 className="text-h1 mb-5">A day in our home</h2>
            <p className="text-lead text-ink-soft mx-auto max-w-[52ch]">
              Families always ask what the days actually look like. Here is the whole of one, from
              the first good morning to the last safety check.
            </p>
          </div>

          {schedule.length > 0 ? (
            <div className="relative">
              {schedule.map((item, index) => (
                <Reveal key={item.position} delay={Math.min(index, 6) * 0.04}>
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
          ) : null}
        </div>
      </AnchorSection>

      {/* --------------------------------------------------------------- home */}
      <AnchorSection id="home" title="Our home">
        <SectionHeading
          eyebrow="Our home"
          title="Come and look around"
          lead="A real house on a quiet street — not a facility."
          align="center"
        />
        <Gallery images={gallery} />
        <p className="text-stone mx-auto mt-8 max-w-[56ch] text-center">
          Photographs show the shared areas of the home. To see everything, come and visit.
        </p>
      </AnchorSection>

      {/* -------------------------------------------------------------- meals */}
      {meals ? (
        <AnchorSection id="meals" title="Meals and dining" ground="wash">
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
                eyebrow="Meals &amp; dining"
                title="Home-cooked, every day"
                className="mb-6"
              />
              <Prose>
                <p className="text-lead text-ink-soft">{meals}</p>
                <p className="text-stone">
                  Does your loved one have a special diet, a food they cannot eat, or a favourite
                  meal? Tell us and we will talk it through.
                </p>
              </Prose>
            </div>
          </div>
        </AnchorSection>
      ) : null}

      {/* ------------------------------------------------------- testimonials */}
      {testimonials.length > 0 ? (
        <div className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <TestimonialList items={testimonials} />
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- visit */}
      {address ? (
        <AnchorSection id="visit" title="Where to find us">
          <SectionHeading
            eyebrow="Find us"
            title="Close to home, easy to reach"
            lead={locationLine}
            align="center"
          />
          <MapBlock address={address} locationLine={locationLine} className="mx-auto max-w-4xl" />

          <ul className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
            {phone && tel ? (
              <li>
                <a
                  href={tel}
                  className="group border-rule bg-paper-raise hover:border-sage flex h-full flex-col items-center rounded border p-5 text-center transition-colors"
                >
                  <Phone className="text-sage mb-2 size-6" aria-hidden="true" />
                  <span className="label text-stone">Call us</span>
                  <span className="text-ink group-hover:text-sage-deep font-semibold">{phone}</span>
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                <a
                  href={`mailto:${email}`}
                  className="group border-rule bg-paper-raise hover:border-sage flex h-full flex-col items-center rounded border p-5 text-center transition-colors"
                >
                  <Mail className="text-sage mb-2 size-6" aria-hidden="true" />
                  <span className="label text-stone">Email us</span>
                  <span className="text-ink group-hover:text-sage-deep font-semibold break-all">
                    {email}
                  </span>
                </a>
              </li>
            ) : null}
            <li className="border-rule bg-paper-raise flex h-full flex-col items-center rounded border p-5 text-center">
              <MapPin className="text-sage mb-2 size-6" aria-hidden="true" />
              <span className="label text-stone">Visit</span>
              <address className="text-ink font-semibold not-italic">{address}</address>
              {hours ? <span className="text-stone mt-1 text-[0.875rem]">Open {hours}</span> : null}
            </li>
          </ul>

          {fax ? (
            <p className="text-stone mt-4 flex items-center justify-center gap-2 text-[0.9375rem]">
              <Printer className="size-4" aria-hidden="true" />
              <span>
                <span className="sr-only">Fax for referrals: </span>Fax {fax}
              </span>
            </p>
          ) : null}
        </AnchorSection>
      ) : null}

      {/* ------------------------------------------------------------ contact */}
      <AnchorSection id="contact" title="Book a house tour" ground="wash">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <HeartShield className="mx-auto mb-5 size-12" />
            <h2 className="text-h1 mb-4">{tourCta ?? "Book a house tour"}</h2>
            <p className="text-lead text-ink-soft mx-auto max-w-[52ch]">
              Tell us a little about your loved one and what they need. There is no pressure and no
              obligation — most families visit two or three homes before deciding.
            </p>
          </div>

          <TourForm />

          {closingLine ? (
            <p className="font-script text-sage-deep mt-12 text-center text-3xl sm:text-4xl">
              {closingLine}
            </p>
          ) : null}
        </div>
      </AnchorSection>

      <BackToTop />
    </>
  );
}
