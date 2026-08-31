import type { Metadata } from "next";
import Link from "next/link";

import { Hero } from "@/components/site/hero";
import { Section, Prose } from "@/components/site/section";
import { getSiteSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms of use for the Columbia Care Adult Family Home website.",
  alternates: { canonical: "/terms" },
};

/** Rebuilds hourly; publishing from the admin console revalidates on demand. */
export const revalidate = 3600;

export default async function TermsPage() {
  const { email, phone, telHref: tel, addressLine: address } = await getSiteSettings();

  return (
    <>
      <Hero title="Terms of use" lead="The plain-English version." />

      <Section>
        <Prose>
          <h2 className="text-h3 font-sans font-bold">About this website</h2>
          <p>
            This website describes Columbia Care Adult Family Home and the care we provide. We keep
            it accurate and up to date, but details can change. Please confirm anything important
            with us directly before making a decision.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Not medical advice</h2>
          <p>
            Nothing on this site is medical advice, and it is not a substitute for speaking with a
            doctor, a nurse, or a professional care adviser. Whether our home is right for someone
            depends on their individual needs, which we assess together before anyone moves in.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">No guarantee of availability</h2>
          <p>
            Where this site shows current availability, it reflects the position on the date shown.
            Availability can change quickly. Please contact us to confirm.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Photographs</h2>
          <p>
            Photographs show our home. We never publish images of residents without written
            permission. See our <Link href="/privacy">privacy page</Link>.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Links to other sites</h2>
          <p>
            Where we link to another organisation, we are not responsible for what that site
            contains or how it handles your information.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Content</h2>
          <p>
            The text, photographs and design of this site belong to Columbia Care Adult Family Home.
            Please ask before reproducing them.
          </p>

          <h2 className="text-h3 mt-10 font-sans font-bold">Questions</h2>
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
