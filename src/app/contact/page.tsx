import type { Metadata } from "next";
import { Mail, MapPin, Phone, Printer } from "lucide-react";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { MapBlock } from "@/components/site/map-block";
import { LaurelDivider } from "@/components/brand/laurel";
import { HeartShield } from "@/components/brand/heart-shield";
import { identity, published } from "@/lib/content";
import { getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Contact & Book a House Tour",
  description:
    "Contact Columbia Care Adult Family Home in Everett, Washington, or book a house tour.",
  alternates: { canonical: "/contact" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function ContactPage() {
  const {
    phone,
    telHref: tel,
    email,
    fax,
    addressLine: address,
    locationLine,
    hours,
  } = await getSiteSettings();
  const closingLine = published(identity.closingLine);
  const tourCta = published(identity.tourCta);

  const hasAnyContactMethod = Boolean((phone && tel) || email);

  return (
    <>
      <Hero
        title="Book a house tour"
        lead={tourCta ?? "Come and see the home for yourself."}
        phone={phone}
        phoneHref={tel}
      />

      <Section labelledBy="reach-heading">
        <SectionHeading
          id="reach-heading"
          eyebrow="Get in touch"
          title="How to reach us"
          lead={
            hours
              ? `Someone is here ${hours.toLowerCase()}, so call whenever suits you.`
              : undefined
          }
          align="center"
        />

        {hasAnyContactMethod ? (
          <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
            {phone && tel ? (
              <li>
                <a
                  href={tel}
                  className="group border-rule bg-paper-raise hover:border-sage flex h-full min-h-24 flex-col justify-center rounded border p-6 text-center transition-colors"
                >
                  <Phone className="text-sage mx-auto mb-3 size-7" aria-hidden="true" />
                  <span className="label text-stone">Call us</span>
                  <span className="text-lead text-ink group-hover:text-sage-deep font-semibold">
                    {phone}
                  </span>
                </a>
              </li>
            ) : null}

            {email ? (
              <li>
                <a
                  href={`mailto:${email}`}
                  className="group border-rule bg-paper-raise hover:border-sage flex h-full min-h-24 flex-col justify-center rounded border p-6 text-center transition-colors"
                >
                  <Mail className="text-sage mx-auto mb-3 size-7" aria-hidden="true" />
                  <span className="label text-stone">Email us</span>
                  <span className="text-ink group-hover:text-sage-deep font-semibold break-all">
                    {email}
                  </span>
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}

        <ul className="mx-auto mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
          {address ? (
            <li className="border-rule bg-paper-raise flex h-full min-h-24 flex-col justify-center rounded border p-6 text-center">
              <MapPin className="text-sage mx-auto mb-3 size-7" aria-hidden="true" />
              <span className="label text-stone">Visit</span>
              <address className="text-ink font-semibold not-italic">{address}</address>
            </li>
          ) : null}

          {fax ? (
            <li className="border-rule bg-paper-raise flex h-full min-h-24 flex-col justify-center rounded border p-6 text-center">
              <Printer className="text-sage mx-auto mb-3 size-7" aria-hidden="true" />
              <span className="label text-stone">Fax — for referrals</span>
              <span className="text-ink font-semibold">{fax}</span>
            </li>
          ) : null}
        </ul>

        {/*
          The tour request form lands in Phase 6, together with the database,
          Resend notifications and Turnstile. Until then the page offers only
          real, working contact methods — a form that goes nowhere would be
          worse than no form at all.
        */}

        <LaurelDivider className="py-12" />

        <Prose className="mx-auto text-center">
          <HeartShield className="mx-auto mb-5 size-10" />
          <p className="text-lead text-ink-soft">
            Tell us a little about your loved one and what they need. There is no pressure and no
            obligation — most families visit two or three homes before deciding.
          </p>
          {closingLine ? (
            <p className="font-script text-sage-deep mt-6 text-3xl">{closingLine}</p>
          ) : null}
        </Prose>
      </Section>

      {address ? (
        <Section ground="wash" labelledBy="directions-heading">
          <SectionHeading
            id="directions-heading"
            eyebrow="Getting here"
            title="Directions"
            lead={locationLine}
            align="center"
          />
          <MapBlock address={address} locationLine={locationLine} className="mx-auto max-w-4xl" />
        </Section>
      ) : null}
    </>
  );
}
