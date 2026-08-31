import type { Metadata } from "next";

import { Hero } from "@/components/site/hero";
import { Section, Prose } from "@/components/site/section";
import { getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How this website is built to be usable by everyone, and how to tell us if something is not.",
  alternates: { canonical: "/accessibility" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function AccessibilityPage() {
  const { email, phone, telHref: tel, addressLine: address } = await getSiteSettings();

  return (
    <>
      <Hero
        title="Accessibility"
        lead="This site is built for people who find most websites hard to read."
      />

      <Section>
        <Prose>
          <h2 className="text-h3 font-sans font-bold">Our commitment</h2>
          <p>
            Most people reading this site are either older adults or family members researching late
            at night on a phone. We have built it to meet the Web Content Accessibility Guidelines
            (WCAG) 2.2 at level AA, and we go beyond that where it helps.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">What we have done</h2>
          <ul>
            <li>
              Body text is set at 18 pixels rather than the more common 16, with generous line
              spacing.
            </li>
            <li>
              Text contrast exceeds the AAA standard of 7:1 for body copy, a stricter target than
              the AA minimum.
            </li>
            <li>
              Everything works with a keyboard alone, and every focused element shows a clear
              outline.
            </li>
            <li>Every button and link is at least 48 by 48 pixels, so it is easy to tap.</li>
            <li>Every image has a written description for screen reader users.</li>
            <li>
              The page works at 200% zoom and on a 320-pixel screen without anything overlapping or
              scrolling sideways.
            </li>
            <li>
              If your device asks for reduced motion, all animation is switched off automatically.
            </li>
          </ul>

          <h2 className="text-h3 mt-10 font-sans font-bold">Reading options</h2>
          <p>
            The <strong>Reading options</strong> button at the bottom of every page lets you make
            the text larger, increase contrast, turn off animation, and switch to Atkinson
            Hyperlegible, a typeface designed to keep similar letters distinct for readers with low
            vision. Your choices are remembered on your device.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">How we test</h2>
          <p>
            Automated accessibility checks run against every page of this site each time we change
            it, on both desktop and mobile, in light and dark themes, and at the largest text size
            with high contrast turned on. A change that introduces a problem cannot be published.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">If something does not work</h2>
          <p>
            If any part of this site is difficult to use, please tell us, we will fix it, and in the
            meantime we will give you the same information another way, by phone or in person.
          </p>
          <ul>
            {phone && tel ? (
              <li>
                Phone: <a href={tel}>{phone}</a>
              </li>
            ) : null}
            {email ? (
              <li>
                Email: <a href={`mailto:${email}`}>{email}</a>
              </li>
            ) : null}
            {address ? <li>Address: {address}</li> : null}
          </ul>
        </Prose>
      </Section>
    </>
  );
}
