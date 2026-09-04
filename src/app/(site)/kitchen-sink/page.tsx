import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Hero } from "@/components/site/hero";
import { Section, SectionHeading, Prose } from "@/components/site/section";
import { AvailabilityBadge } from "@/components/site/availability-badge";
import { ServiceCard } from "@/components/site/service-card";
import { TimelineEntry, DayGradient } from "@/components/site/timeline-entry";
import { Gallery } from "@/components/site/gallery";
import { TestimonialList } from "@/components/site/testimonial";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { MapBlock } from "@/components/site/map-block";
import { CtaBand } from "@/components/site/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { LaurelDivider } from "@/components/brand/laurel";
import { IconBadge } from "@/components/icons";

import { addressLine, contact, identity, published, schedule, services } from "@/lib/content";

export const metadata: Metadata = {
  title: "Kitchen sink",
  robots: { index: false, follow: false },
};

/** Sample gallery data. Placeholder files, replaced in Phase 8. */
const GALLERY = [
  {
    src: "/placeholder/living-room.jpg",
    alt: "Placeholder for the living room and kitchen photograph",
    caption: "Living room",
    category: "Living areas",
  },
  {
    src: "/placeholder/kitchen.jpg",
    alt: "Placeholder for the kitchen photograph",
    caption: "Kitchen",
    category: "Dining & kitchen",
  },
  {
    src: "/placeholder/table-setting.jpg",
    alt: "Placeholder for the dining table setting photograph",
    caption: "Set for lunch",
    category: "Dining & kitchen",
  },
  {
    src: "/placeholder/patio.jpg",
    alt: "Placeholder for the patio photograph",
    caption: "The patio",
    category: "Outdoors",
  },
  {
    src: "/placeholder/backyard.jpg",
    alt: "Placeholder for the backyard photograph",
    caption: "Backyard",
    category: "Outdoors",
  },
  {
    src: "/placeholder/flowers.jpg",
    alt: "Placeholder for the flowers on the table photograph",
    caption: "Fresh flowers, every week",
    category: "Living areas",
  },
];

const FAQ_SAMPLE = [
  {
    question: "Sample question, replaced with the client's own answers",
    answer:
      "This accordion is wired and styled, but every answer must come from the client. The FAQ page stays unpublished until it can be filled with real answers rather than plausible ones.",
  },
  {
    question: "Can I visit before deciding?",
    answer:
      "The structure is ready. This copy is a component demonstration on an internal page, not published content.",
  },
];

const TESTIMONIAL_SAMPLE = [
  {
    quote:
      "Demonstration only. No real testimonial exists yet, so the band on the public home page renders nothing at all.",
    author: "Sample",
    relationship: "Component demonstration",
  },
];

function Bench({
  n,
  title,
  note,
  children,
}: {
  n: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-14">
      <div className="border-rule mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b pb-2">
        <h2 className="label text-sage-deep">
          {n} {title}
        </h2>
        {note ? <span className="label text-stone">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default function KitchenSinkPage() {
  const scheduleItems = (published(schedule) ?? []).slice(0, 4);
  const serviceItems = published(services) ?? [];
  const phone = published(contact.phonePrimary);
  const address = addressLine();
  const locationLine = published(contact.locationLine);

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <header className="border-ink border-b-2 pt-12 pb-6">
          <p className="label text-sage-deep mb-4">Internal · Phase 2 · noindex</p>
          <h1 className="text-hero mb-4">Kitchen sink</h1>
          <p className="text-ink-soft text-lead max-w-[62ch]">
            Every component in the system on one page, for visual review and axe scanning. Sections
            marked <strong>renders nothing</strong> are proving the content rule: with no confirmed
            data they output no DOM at all, rather than a placeholder.
          </p>
          <p className="text-stone mt-4">
            See also the{" "}
            <Link href="/specimen" className="text-sage-deep font-semibold underline">
              design specimen
            </Link>{" "}
            for tokens, type and contrast.
          </p>
        </header>

        <Bench n="01" title="Buttons" note="48px minimum target">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Book a house tour</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="soft">Soft</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link style</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="lg">Large</Button>
            <Button size="default">Default</Button>
            <Button size="dense">Dense (admin only)</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Bench>

        <Bench n="02" title="Availability badge" note="renders nothing when unset">
          <div className="flex flex-col items-start gap-3">
            <AvailabilityBadge status="accepting" updatedAt={new Date().toISOString()} />
            <AvailabilityBadge
              status="limited"
              note="One room opening next month"
              updatedAt={new Date(Date.now() - 3 * 86_400_000).toISOString()}
            />
            <AvailabilityBadge status="waitlist" />
            <AvailabilityBadge status="full" />
          </div>
          <div className="border-rule mt-5 rounded border border-dashed p-4">
            <p className="label text-stone mb-2">status = null (the live state today)</p>
            <AvailabilityBadge status={null} />
            <p className="text-stone text-[0.9375rem]">
              ↑ Nothing rendered. The client has not told us their availability, so the badge is
              absent from the site entirely.
            </p>
          </div>
        </Bench>

        <Bench n="03" title="Service cards" note="from the client's seven services">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceItems.slice(0, 3).map((service) => (
              <ServiceCard
                key={service.slug}
                title={service.title}
                icon={service.icon}
                href={service.hasDetailPage ? `/services/${service.slug}` : null}
                summary={service.hasDetailPage ? undefined : "No detail page, informational card."}
              />
            ))}
          </div>
        </Bench>

        <Bench n="04" title="Timeline entries" note="4 of 13 · accents from the artwork">
          <div className="relative">
            {scheduleItems.map((item) => (
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
        </Bench>

        <Bench n="05" title="Icon badges" note="the client's own colour assignments">
          <div className="flex flex-wrap gap-3">
            <IconBadge name="sunrise" accent="navy" />
            <IconBadge name="coffee-cup" accent="sage" />
            <IconBadge name="palette" accent="violet" />
            <IconBadge name="cooking-pot" accent="amber" />
            <IconBadge name="armchair-clock" accent="rose" />
            <IconBadge name="fork-knife" accent="blue" />
            <IconBadge name="house-heart" accent="navy" size="lg" />
            <IconBadge name="heart-in-hands" accent="sage" size="sm" />
          </div>
        </Bench>

        <Bench n="06" title="Gallery" note="placeholder files, Phase 8 replaces these">
          <Gallery images={GALLERY} />
          <div className="border-rule mt-5 rounded border border-dashed p-4">
            <p className="label text-stone mb-2">images = [] </p>
            <Gallery images={[]} />
            <p className="text-stone text-[0.9375rem]">↑ Nothing rendered.</p>
          </div>
        </Bench>

        <Bench n="07" title="Testimonials" note="empty on the real site">
          <TestimonialList items={TESTIMONIAL_SAMPLE} />
          <div className="border-rule mt-5 rounded border border-dashed p-4">
            <p className="label text-stone mb-2">items = [] (the live state today)</p>
            <TestimonialList items={[]} />
            <p className="text-stone text-[0.9375rem]">
              ↑ Nothing rendered, no heading, no empty grid, no &ldquo;coming soon&rdquo;.
            </p>
          </div>
        </Bench>

        <Bench n="08" title="FAQ accordion" note="answers must come from the client">
          <FaqAccordion items={FAQ_SAMPLE} />
        </Bench>

        <Bench n="09" title="Map block" note="Google embed deferred until requested">
          <MapBlock address={address} locationLine={locationLine} />
        </Bench>

        <Bench n="10" title="Section headings & prose">
          <SectionHeading
            eyebrow="Our promise"
            title="A safe place. A caring heart."
            lead={published(identity.about)}
          />
          <Prose>
            <p>{published(identity.meals)}</p>
            <p>
              Running text sits at a 68-character measure with 18px base type and 1.65 line height.
              Links look like <a href="#main">this link</a>.
            </p>
          </Prose>
          <LaurelDivider className="py-10" />
        </Bench>

        <Bench n="11" title="Form controls" note="wired to react-hook-form in Phase 6">
          <div className="grid max-w-lg gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ks-name">Your name</Label>
              <Input id="ks-name" name="name" autoComplete="name" placeholder="Jane Doe" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ks-phone">Phone</Label>
              <Input id="ks-phone" name="phone" type="tel" autoComplete="tel" />
              <p className="text-stone text-[0.875rem]">
                Any format is accepted, we tidy it up on our end.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ks-message">How can we help?</Label>
              <Textarea id="ks-message" name="message" rows={4} />
            </div>
            {/* Base UI's Switch renders a <button role="switch">, so a plain
                <Label htmlFor> does not name it the way it would a native
                checkbox. aria-labelledby is what actually associates them, axe caught this as aria-toggle-field-name. */}
            <div className="flex items-center gap-3">
              <Switch id="ks-switch" aria-labelledby="ks-switch-label" />
              <Label id="ks-switch-label" htmlFor="ks-switch">
                Send me a copy of this message
              </Label>
            </div>
          </div>
        </Bench>

        <Bench n="12" title="Cards, badges, table, skeleton" note="mostly admin (Phase 5)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>New inquiries</CardTitle>
                <CardDescription>Waiting for a reply</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold tabular-nums">3</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status chips</CardTitle>
                <CardDescription>Admin pipeline</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge>New</Badge>
                <Badge variant="secondary">Contacted</Badge>
                <Badge variant="outline">Toured</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <Table label="Sample inquiries">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Sample row</TableCell>
                  <TableCell className="tabular-nums">2 days ago</TableCell>
                  <TableCell>
                    <Badge>New</Badge>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-full max-w-sm" />
          </div>
        </Bench>

        <Bench n="13" title="Motion" note="suppressed by OS or the reading options panel">
          <Reveal>
            <div className="border-rule bg-paper-raise rounded border p-6">
              <p>
                This block rises 12px and fades over 320ms when it scrolls into view. Set
                &ldquo;Animation: Reduced&rdquo; in Reading options and reload, it renders with no
                animation at all, rather than a zero-duration one.
              </p>
            </div>
          </Reveal>
        </Bench>
      </div>

      <Bench n="14" title="Day gradient" note="the signature moment">
        <div />
      </Bench>
      <div className="relative isolate overflow-hidden py-20">
        <DayGradient />
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-ink-soft max-w-[62ch]">
            The full page ramps dawn → night as the reader moves through the 13 entries. Here it is
            compressed into one block so both ends are visible at once.
          </p>
        </div>
      </div>

      <Section ground="wash">
        <SectionHeading
          eyebrow="Section shell"
          title="Alternating grounds, not card shadows"
          lead="Sections separate by ground colour (paper, then sage wash), which is quieter than stacking shadows and holds up in both themes."
          align="center"
        />
      </Section>

      <Hero
        title="Hero with a photograph"
        lead="Scrim is heavy enough that white text clears 7:1 over the image. The wave bleeds it into the page ground."
        image={{ src: "/placeholder/living-room.jpg", alt: "Placeholder for the living room" }}
        badge={<AvailabilityBadge status="accepting" />}
        phone={phone}
        phoneHref={null}
      />

      <Hero
        title="Hero without a photograph"
        lead="Falls back to the sage ground rather than a grey box, so pages look finished before the photo shoot."
      />

      <CtaBand
        lead="Come and see the home, meet the caregivers, and ask anything you like."
        script={published(identity.closingLine)}
        phone={phone}
        phoneHref={null}
      />
    </>
  );
}
