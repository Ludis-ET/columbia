import type { Metadata } from "next";

import { Section, SectionHeading } from "@/components/site/section";
import { TimelineEntry, DayGradient } from "@/components/site/timeline-entry";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { LaurelDivider } from "@/components/brand/laurel";
import { HeartShield } from "@/components/brand/heart-shield";
import { IconBadge, isIconName } from "@/components/icons";
import { identity, published } from "@/lib/content";
import { getEveryDay, getSchedule, getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "A Day in Our Home",
  description:
    "Morning to night at Columbia Care Adult Family Home — the daily routine, hour by hour.",
  alternates: { canonical: "/a-day-in-our-home" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function DayPage() {
  const closingLine = published(identity.closingLine);
  const promise = published(identity.promise);

  const [day, included, settings] = await Promise.all([
    getSchedule(),
    getEveryDay(),
    getSiteSettings(),
  ]);
  const { phone, telHref: tel } = settings;

  return (
    <>
      {/*
        The signature page. The ground ramps dawn gold → midday light → amber
        kitchen → violet evening → night navy behind the 13 entries, using the
        client's own accent colours. Pure CSS, so it costs nothing and needs no
        JavaScript — and it degrades to a flat ground if gradients fail.
      */}
      <div className="relative overflow-hidden">
        <DayGradient />

        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
          <header className="mb-14 text-center">
            <HeartShield className="mx-auto mb-6 size-14" />
            <p className="label text-sage-deep mb-3">Morning to night</p>
            <h1 className="text-hero mb-5">A day in our home</h1>
            <p className="text-lead text-ink-soft mx-auto max-w-[52ch]">
              Families always ask what the days actually look like. Here is the whole of one, from
              the first good morning to the last safety check.
            </p>
            {/* Print-friendly: families print this to compare homes side by side. */}
            <p className="text-stone mt-4 text-[0.9375rem] print:hidden">
              This page prints cleanly if you would like to take it with you.
            </p>
          </header>

          {day.length > 0 ? (
            <div className="relative">
              {day.map((item, index) => (
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

          {promise ? (
            <>
              <LaurelDivider className="py-8" />
              <p className="font-display text-h2 text-center">{promise}</p>
            </>
          ) : null}
        </div>
      </div>

      {included.length > 0 ? (
        <Section ground="wash" labelledBy="every-day-heading">
          <SectionHeading
            id="every-day-heading"
            eyebrow="Every day at Columbia Care"
            title="Constant, whatever the hour"
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

      <CtaBand
        title="See a day for yourself"
        lead="Visit at any hour you like — mornings and mealtimes tell you the most."
        script={closingLine}
        phone={phone}
        phoneHref={tel}
      />
    </>
  );
}
