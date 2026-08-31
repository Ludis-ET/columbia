import type { Metadata } from "next";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { Gallery } from "@/components/site/gallery";
import { MapBlock } from "@/components/site/map-block";
import { CtaBand } from "@/components/site/cta-band";
import { identity, published } from "@/lib/content";
import { getGallery, getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Our Home",
  description:
    "Look around Columbia Care Adult Family Home in Everett, Washington — living areas, dining, kitchen and garden.",
  alternates: { canonical: "/our-home" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function OurHomePage() {
  const closingLine = published(identity.closingLine);

  const [galleryImages, settings] = await Promise.all([getGallery(), getSiteSettings()]);
  const { phone, telHref: tel, addressLine: address, locationLine } = settings;

  return (
    <>
      <Hero
        title="Our home"
        lead="A real house on a quiet street — not a facility. Have a look around."
      />

      <Section labelledBy="gallery-heading">
        <SectionHeading
          id="gallery-heading"
          eyebrow="Photographs"
          title="Room by room"
          lead="Filter by area, or select any photograph to see it larger."
        />
        <Gallery images={galleryImages} />

        <Prose className="mt-10">
          <p className="text-stone">
            Photographs show the shared areas of the home. To see a bedroom and the rest of the
            house, come and visit — we are happy to show you everything.
          </p>
        </Prose>
      </Section>

      {address ? (
        <Section ground="wash" labelledBy="find-heading">
          <SectionHeading
            id="find-heading"
            eyebrow="Find us"
            title="Where we are"
            lead={locationLine}
            align="center"
          />
          <MapBlock address={address} locationLine={locationLine} className="mx-auto max-w-4xl" />
        </Section>
      ) : null}

      <CtaBand
        title="Come and see it in person"
        lead="Photographs only tell you so much. Book a house tour and walk through it."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
