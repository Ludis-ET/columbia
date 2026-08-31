import type { Metadata } from "next";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone, Printer } from "lucide-react";

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
import { identity, published } from "@/lib/content";
import {
  getAvailability,
  getCareTypes,
  getEveryDay,
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
    included,
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
    getEveryDay(),
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
          eyebrow={t("about_eyebrow", "Who we are")}
          title={t("about_heading", "A family-like environment")}
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
          eyebrow={t("care_eyebrow", "Care & services")}
          title={t("care_heading", "What we do, every day")}
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
              {t("care_included_heading", "Included every single day")}
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
            <Reveal>
              <div className="relative aspect-4/3 w-full overflow-hidden rounded">
                <Image
                  src={mealsPhoto.src}
                  alt={mealsPhoto.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </Reveal>
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
            <TestimonialList items={testimonials} />
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

        Two columns on desktop: the invitation and the direct ways to reach a
        human on the left, the form raised on a card to the right. Someone who
        would rather phone should not have to scroll past a form to find the
        number, and someone ready to write should not have to hunt for the form.
      */}
      <AnchorSection id="contact" title="Book a house tour" ground="wash">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24">
            <p className="label text-sage-deep mb-3">{t("contact_eyebrow", "Book a house tour")}</p>
            <h2 className="text-h1 mb-5">{t("contact_heading", "Come and see the home")}</h2>

            <p className="text-lead text-ink-soft mb-6 max-w-[46ch]">
              {t(
                "contact_lead",
                "Tell us a little about your loved one and what they need. There is no pressure and no obligation, and most families visit two or three homes before they decide.",
              )}
            </p>

            {phone || email ? (
              <>
                <p className="label text-stone mb-3">Or reach us directly</p>
                <ul className="mb-8 grid gap-3 sm:max-w-sm">
                  {phone && tel ? (
                    <li>
                      <a
                        href={tel}
                        className="group border-rule bg-paper hover:border-sage flex min-h-16 items-center gap-4 rounded border px-5 transition-colors"
                      >
                        <Phone className="text-sage size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="label text-stone block">Call us</span>
                          <span className="text-ink group-hover:text-sage-deep block font-semibold">
                            {phone}
                          </span>
                        </span>
                      </a>
                    </li>
                  ) : null}
                  {email ? (
                    <li>
                      <a
                        href={`mailto:${email}`}
                        className="group border-rule bg-paper hover:border-sage flex min-h-16 items-center gap-4 rounded border px-5 transition-colors"
                      >
                        <Mail className="text-sage size-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="label text-stone block">Email us</span>
                          <span className="text-ink group-hover:text-sage-deep block font-semibold break-all">
                            {email}
                          </span>
                        </span>
                      </a>
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}

            <div className="border-sage/40 flex items-start gap-3 border-t pt-6">
              <HeartShield className="mt-0.5 size-7 shrink-0" />
              <p className="text-ink-soft max-w-[38ch]">
                {tourCta ?? "Contact us to book a house tour."} Ask us anything at all, including
                the awkward questions.
              </p>
            </div>
          </div>

          {/* The form, raised off the band so it reads as the thing to do. */}
          <Reveal>
            <div className="border-rule bg-paper-raise rounded-lg border p-6 shadow-lg sm:p-8">
              <TourForm />
            </div>
          </Reveal>
        </div>
      </AnchorSection>

      <BackToTop />
    </>
  );
}
