import { getAvailability, getServices, getSiteSettings } from "@/lib/db/queries";
import { identity, published } from "@/lib/content";
import { absoluteUrl, siteUrl } from "@/lib/site-url";

/**
 * JSON-LD.
 *
 * ---------------------------------------------------------------------------
 * THE CONTENT RULE APPLIES HERE TOO, arguably more than anywhere.
 *
 * Structured data is read by machines and surfaced in search results as fact.
 * A guessed telephone number or an invented bed count in here can end up shown
 * to a family in Google before they ever reach the site.
 *
 * So every field is conditional: if the value is null in the database, the
 * property is OMITTED from the graph entirely. There are no empty strings, no
 * "TBC", no placeholders. An absent property is honest; a wrong one is not.
 * ---------------------------------------------------------------------------
 */

/** Drops null, undefined and empty values so they never reach the output. */
function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}

const AVAILABILITY_SCHEMA: Record<string, string> = {
  accepting: "https://schema.org/InStock",
  limited: "https://schema.org/LimitedAvailability",
  waitlist: "https://schema.org/PreOrder",
  full: "https://schema.org/OutOfStock",
};

export async function OrganisationJsonLd() {
  const [settings, services, availability] = await Promise.all([
    getSiteSettings(),
    getServices(),
    getAvailability(),
  ]);

  const address = compact({
    "@type": "PostalAddress",
    streetAddress: settings.addressLine?.split(",")[0] ?? null,
    addressLocality: settings.serviceArea[0] ?? null,
    addressRegion: "WA",
    addressCountry: "US",
  });

  const graph = compact({
    "@context": "https://schema.org",
    "@type": "AssistedLivingFacility",
    "@id": `${siteUrl}#organisation`,
    name: published(identity.name),
    description: published(identity.about),
    slogan: published(identity.tagline),
    url: siteUrl,

    // Null until the client confirms which number to publish (q1). Omitted, not blank.
    telephone: settings.phone,
    faxNumber: settings.fax,
    email: settings.email,

    address: Object.keys(address).length > 1 ? address : null,

    // Only Everett is confirmed. Never widen this without written confirmation.
    areaServed: settings.serviceArea.map((name) => ({ "@type": "City", name })),

    // Justified by the "Overnight, 24-Hour Care" schedule entry.
    openingHoursSpecification: settings.hours
      ? [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ],
            opens: "00:00",
            closes: "23:59",
          },
        ]
      : null,

    availableService: services.map((service) =>
      compact({ "@type": "Service", name: service.title, description: service.description }),
    ),

    // Only when the owner has actually set a status.
    makesOffer: availability.status
      ? compact({
          "@type": "Offer",
          availability: AVAILABILITY_SCHEMA[availability.status],
          description: availability.note,
        })
      : null,

    // numberOfRooms and priceRange are deliberately absent: the client has
    // confirmed neither (q3, q6).
  });

  return <JsonLd data={graph} />;
}

export function BreadcrumbJsonLd({ trail }: { trail: { name: string; path: string }[] }) {
  if (trail.length < 2) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(crumb.path),
        })),
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null;

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      }}
    />
  );
}

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is our own, from the database, not user input.
      // suppressHydrationWarning: SEO browser extensions often rewrite ld+json
      // script nodes (injecting blob: src) before React hydrates. The server
      // markup is still what crawlers receive; this silences the dev warning.
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
