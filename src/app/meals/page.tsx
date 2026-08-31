import type { Metadata } from "next";
import Image from "next/image";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { TimelineEntry } from "@/components/site/timeline-entry";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { mealsImage } from "@/lib/images";
import { identity, published } from "@/lib/content";
import { getMealtimes, getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Meals & Dining",
  description:
    published(identity.meals) ??
    "Home-cooked meals at Columbia Care Adult Family Home in Everett, Washington.",
  alternates: { canonical: "/meals" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function MealsPage() {
  const meals = published(identity.meals);
  const closingLine = published(identity.closingLine);

  // Breakfast, lunch, dinner prep and dinner — verbatim from the day timeline.
  const [times, settings] = await Promise.all([getMealtimes(), getSiteSettings()]);
  const { phone, telHref: tel } = settings;

  return (
    <>
      <Hero title="Meals & dining" lead="Home-cooked, eaten together, every day." />

      <Section labelledBy="meals-heading">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="relative aspect-4/3 w-full overflow-hidden rounded">
              <Image
                src={mealsImage.src}
                alt={mealsImage.alt}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <div>
            <SectionHeading
              id="meals-heading"
              eyebrow="What's on the table"
              title="Nutritious, home-cooked food"
              className="mb-6"
            />
            {meals ? (
              <Prose>
                <p className="text-lead text-ink-soft">{meals}</p>
              </Prose>
            ) : null}
          </div>
        </div>
      </Section>

      {times.length > 0 ? (
        <Section ground="wash" labelledBy="times-heading">
          <SectionHeading
            id="times-heading"
            eyebrow="Mealtimes"
            title="How the day is fed"
            lead="Taken straight from our daily routine."
          />
          <div className="relative mx-auto max-w-3xl">
            {times.map((item, index) => (
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
        </Section>
      ) : null}

      <Section>
        <Prose className="mx-auto text-center">
          <p className="text-lead text-ink-soft">
            Does your loved one have a special diet, a food they cannot eat, or a favourite meal?
            Tell us and we will talk it through.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title="Join us for a meal"
        lead="Visiting at mealtime tells you more about a home than anything else."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
