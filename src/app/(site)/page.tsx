import type { Metadata } from "next";
import Image from "next/image";
import { Clock, MapPin, Printer } from "lucide-react";

import { Hero } from "@/components/site/hero";
import { AnchorSection } from "@/components/site/anchor-section";
import { SectionHeading, Prose } from "@/components/site/section";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ServiceCard } from "@/components/site/service-card";
import { TimelineEntry } from "@/components/site/timeline-entry";
import { Gallery } from "@/components/site/gallery";
import { TestimonialList } from "@/components/site/testimonial";
import { MapBlock } from "@/components/site/map-block";
import { BusinessCard } from "@/components/site/business-card";
import { TourForm } from "@/components/site/tour-form";
import { BackToTop } from "@/components/site/back-to-top";
import { Reveal } from "@/components/motion/reveal";
import { MotionLift } from "@/components/motion/lift";
import { HeartShield } from "@/components/brand/heart-shield";
import { IconBadge, isIconName } from "@/components/icons";
import { identity, published } from "@/lib/content";
import {
  getAvailability,
  getCareTypes,
  getGallery,
  getSchedule,
  getServices,
  getSectionImage,
  getSiteCopy,
  getSiteSettings,
  getTestimonials,
  getWhyFamilies,
  copy,
  copyList,
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
 * a screen reader user can jump between them, which matters more on one long
 * page than it does across several short ones.
 */
export default async function HomePage() {
  const [
    settings,
    availability,
    services,
    care,
    reasons,
    quotes,
    schedule,
    gallery,
    hero,
    mealsPhoto,
    text,
  ] = await Promise.all([
    getSiteSettings(),
    getAvailability(),
    getServices(),
    getCareTypes(),
    getWhyFamilies(),
    getTestimonials(),
    getSchedule(),
    getGallery(),
    getSectionImage("hero"),
    getSectionImage("meals"),
    getSiteCopy(),
  ]);

  const { phone, telHref: tel, addressLine: address, locationLine, email, fax, hours } = settings;

  // Every word below is editable in the admin. The artwork value is the
  // fallback, so a slug that has not been seeded still renders the right words.
  const t = (slug: string, fallback: string | null) => copy(text, slug, fallback ?? "");
  const tagline = t("hero_tagline", published(identity.tagline));
  const heroLead = t("hero_lead", "An adult family home in Everett, Washington.");
  const promise = t("promise", published(identity.promise));
  const values = copyList(text, "values", published(identity.values) ?? []);
  const about = t("about_body", published(identity.about));
  const meals = t("meals_body", published(identity.meals));
  const tourCta = t("contact_cta", published(identity.tourCta));
  const testimonials = quotes as TestimonialItem[];

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <Hero
        size="home"
        title={tagline ?? "Columbia Care Adult Family Home"}
        lead={heroLead}
        image={hero}
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
          <Reveal>
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
          </Reveal>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- about */}
      <AnchorSection id="about" title="About our home">
        <SectionHeading
          eyebrow={t("about_eyebrow", "Who we are")}
          title={t("about_heading", "A family-like environment")}
          lead={about}
          align="center"
        />

        {reasons.length > 0 ? (
          <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {reasons.map((reason) => (
              <li key={reason}>
                <MotionLift>
                  <div className="border-rule bg-paper-raise flex h-full items-start gap-3 rounded border p-5">
                    <HeartShield className="mt-0.5 size-6 shrink-0" />
                    <p className="font-semibold">{reason}</p>
                  </div>
                </MotionLift>
              </li>
            ))}
          </ul>
        ) : null}
      </AnchorSection>

      {/* --------------------------------------------------------------- care */}
      <AnchorSection id="care" title="Care and services" ground="wash">
        <SectionHeading
          eyebrow={t("care_eyebrow", "Care & services")}
          title={t("care_heading", "What we do, every day")}
          align="center"
        />

        {care.length > 0 ? (
          <ul className="mx-auto mb-12 grid max-w-4xl gap-4 md:grid-cols-3">
            {care.map((type) => (
              <li key={type.slug}>
                <MotionLift>
                  <div className="border-rule bg-paper-raise flex h-full flex-col items-center rounded border p-8 text-center">
                    {isIconName(type.icon) ? (
                      <IconBadge name={type.icon} accent="sage" size="lg" className="mb-4" />
                    ) : null}
                    <h3 className="text-h3 font-sans font-bold">{type.shortTitle}</h3>
                    {type.description ? (
                      <p className="text-ink mt-3 text-[1.05rem]">{type.description}</p>
                    ) : null}
                  </div>
                </MotionLift>
              </li>
            ))}
          </ul>
        ) : null}

        {services.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <MotionLift>
                  <ServiceCard
                    title={service.title}
                    icon={service.icon}
                    summary={service.description}
                    className="h-full"
                  />
                </MotionLift>
              </li>
            ))}
          </ul>
        ) : null}
      </AnchorSection>

      {/* ---------------------------------------------------------------- day */}
      {/* Time-of-day accents stay on the timeline icons only. The ground is the
          same sage-wash as the other quiet bands, not a dawn-to-night ramp. */}
      <AnchorSection id="day" title="A day in our home" ground="wash">
        <div className="mx-auto max-w-3xl">
          <div className="mb-14 text-center">
            <p className="label text-sage-deep mb-3">{t("day_eyebrow", "Morning to night")}</p>
            <h2 className="text-h1 mb-5">{t("day_heading", "A day in our home")}</h2>
            <p className="text-lead text-ink-soft mx-auto max-w-[52ch]">
              {t(
                "day_lead",
                "Families always ask what the days actually look like. Here is the whole of one, from the first good morning to the last safety check.",
              )}
            </p>
          </div>

          {schedule.length > 0 ? (
            <div className="relative">
              {schedule.map((item) => (
                <TimelineEntry
                  key={item.position}
                  timeLabel={item.timeLabel}
                  title={item.title}
                  body={item.body}
                  bullets={item.bullets}
                  icon={item.icon}
                  accent={item.accent}
                />
              ))}
            </div>
          ) : null}
        </div>
      </AnchorSection>

      {/* --------------------------------------------------------------- home */}
      <AnchorSection id="home" title="Our home">
        <SectionHeading
          eyebrow={t("home_eyebrow", "Our home")}
          title={t("home_heading", "Come and look around")}
          lead={t("home_lead", "A real house on a quiet street, not a facility.")}
          align="center"
        />
        <Gallery images={gallery} />
        <p className="text-stone mx-auto mt-8 max-w-[56ch] text-center">
          {t(
            "home_note",
            "Photographs show the shared areas of the home. To see everything, come and visit.",
          )}
        </p>
      </AnchorSection>

      {/* -------------------------------------------------------------- meals */}
      {meals ? (
        <AnchorSection id="meals" title="Meals and dining" ground="wash">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="relative aspect-4/3 w-full overflow-hidden rounded">
              <Image
                src={mealsPhoto.src}
                alt={mealsPhoto.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <div>
              <SectionHeading
                eyebrow={t("meals_eyebrow", "Meals & dining")}
                title={t("meals_heading", "Home-cooked, every day")}
                className="mb-6"
              />
              <Prose>
                <p className="text-lead text-ink-soft">{meals}</p>
                <p className="text-stone">
                  {t(
                    "meals_note",
                    "Does your loved one have a special diet, a food they cannot eat, or a favourite meal? Tell us and we will talk it through.",
                  )}
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
            <Reveal>
              <TestimonialList items={testimonials} />
            </Reveal>
          </div>
        </div>
      ) : null}

      {/* -------------------------------------------------------------- visit */}
      {/* Location only. The ways to get in touch live in the contact section,
          where someone is already deciding to act on them. */}
      {address ? (
        <AnchorSection id="visit" title="Where to find us">
          <SectionHeading
            eyebrow={t("visit_eyebrow", "Find us")}
            title={t("visit_heading", "Close to home, easy to reach")}
            lead={locationLine}
            align="center"
          />

          <MapBlock address={address} locationLine={locationLine} className="mx-auto max-w-4xl" />

          <div className="text-stone mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[0.9375rem]">
            <span className="inline-flex items-center gap-2">
              <MapPin className="text-sage size-4 shrink-0" aria-hidden="true" />
              <address className="not-italic">{address}</address>
            </span>
            {hours ? (
              <span className="inline-flex items-center gap-2">
                <Clock className="text-sage size-4 shrink-0" aria-hidden="true" />
                Someone is here {hours}
              </span>
            ) : null}
            {fax ? (
              <span className="inline-flex items-center gap-2">
                <Printer className="text-sage size-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="sr-only">Fax for referrals: </span>Fax {fax}
                </span>
              </span>
            ) : null}
          </div>
        </AnchorSection>
      ) : null}

      {/* ------------------------------------------------------------ contact */}
      {/*
        The closing moment, and the one the whole page builds toward.

        The form is never wrapped in Reveal: opacity-0 is how this page once
        went blank, and a family must always be able to write. On a narrow
        viewport the form comes straight after the invitation, before the
        card, so it is not sitting in empty space to the right of left-aligned
        copy. From md up it sits in the right column.
      */}
      <AnchorSection id="contact" title="Book a house tour" ground="wash">
        <div className="grid items-start gap-10 md:grid-cols-2 md:gap-12 lg:gap-16">
          <div>
            <p className="label text-sage-deep mb-3">{t("contact_eyebrow", "Book a house tour")}</p>
            <h2 className="text-h1 mb-5">{t("contact_heading", "Come and see the home")}</h2>

            <p className="text-lead text-ink-soft max-w-[46ch]">
              {t(
                "contact_lead",
                "Tell us a little about your loved one and what they need. There is no pressure and no obligation, and most families visit two or three homes before they decide.",
              )}
            </p>
          </div>

          <div className="border-rule bg-paper-raise min-w-0 rounded-lg border p-6 shadow-lg sm:p-8 md:row-span-2">
            <TourForm />
          </div>

          <div>
            <BusinessCard
              phone={phone}
              phoneHref={tel}
              email={email}
              fax={fax}
              addressLine={address}
            />

            <div className="border-sage/40 flex items-start gap-3 border-t pt-6">
              <HeartShield className="mt-0.5 size-7 shrink-0" />
              <p className="text-ink-soft max-w-[38ch]">
                {tourCta ?? "Contact us to book a house tour."} Ask us anything at all, including
                the awkward questions.
              </p>
            </div>
          </div>
        </div>
      </AnchorSection>

      <BackToTop />
    </>
  );
}
