import type { Metadata } from "next";

import { Hero } from "@/components/site/hero";
import { Section, Prose } from "@/components/site/section";
import { getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Columbia Care Adult Family Home handles information from this website.",
  alternates: { canonical: "/privacy" },
};

/**
 * Describes what this site ACTUALLY does today, not a generic template.
 *
 * The site currently sets no cookies and loads no third-party trackers, so it
 * says so. When Phase 6 adds the tour form and Phase 7 adds analytics, the
 * relevant paragraphs must be updated to match. Have the client's own adviser
 * review this before launch.
 */
/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function PrivacyPage() {
  const { email, phone, telHref: tel, addressLine: address } = await getSiteSettings();

  return (
    <>
      <Hero title="Privacy" lead="What we collect, and what we don't." />

      <Section>
        <Prose>
          <h2 className="text-h3 font-sans font-bold">The short version</h2>
          <p>
            This website does not set cookies, does not track you across other websites, and does
            not share your information with advertisers. If you contact us, we use what you tell us
            only to answer you.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">What this website collects</h2>
          <p>
            Browsing these pages does not require you to give us anything. We do not use advertising
            trackers, social media pixels, or cookie-based analytics, which is why you have not been
            asked to accept cookies.
          </p>
          <p>
            Our web host keeps standard server logs, which may include your IP address and which
            pages were requested. These are used to keep the site running and secure.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Maps</h2>
          <p>
            Our location pages show a map from Google Maps, but it does not load until you select
            &ldquo;Load the map&rdquo;. Until you do, Google receives nothing from your visit. If
            you do load it, Google&rsquo;s own privacy policy applies to that map.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">If you contact us</h2>
          <p>
            When you call, email, or send us a message about care for a loved one, we keep what you
            tell us so we can respond and, if you go ahead, arrange a visit. We use it for that
            purpose only. We do not sell it, and we do not add you to a marketing list.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Residents&rsquo; privacy</h2>
          <p>
            We never publish a photograph of a resident, a resident&rsquo;s name, or anything about
            their health without written permission from them or the person responsible for their
            care. Every photograph on this website shows the building and its rooms.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Your choices</h2>
          <p>
            You can ask us what information we hold about you, ask us to correct it, or ask us to
            delete it. Contact us using the details below and we will help.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Reading settings</h2>
          <p>
            If you change the text size, contrast, motion or reading font using the Reading options
            button, that choice is stored in your own browser on your own device. It is never sent
            to us. Clearing your browser data removes it.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Contact</h2>
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
