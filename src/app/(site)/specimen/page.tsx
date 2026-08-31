import type { Metadata } from "next";
import { ContrastTable, type ContrastPair } from "@/components/dev/contrast";
import { Monogram } from "@/components/brand/monogram";
import { HeartShield } from "@/components/brand/heart-shield";
import { Laurel, LaurelDivider } from "@/components/brand/laurel";
import { Wave } from "@/components/brand/wave";
import { ACCENT_TEXT, IconBadge, isIconName, type Accent } from "@/components/icons";
import {
  careTypes,
  everyDay,
  identity,
  pendingQuestions,
  published,
  schedule,
  services,
} from "@/lib/content";

export const metadata: Metadata = {
  title: "Design specimen",
  robots: { index: false, follow: false },
};

const CONTRAST_PAIRS: ContrastPair[] = [
  { label: "Body text on paper", fg: "--ink", bg: "--paper", threshold: 7 },
  { label: "Secondary text on paper", fg: "--ink-soft", bg: "--paper", threshold: 4.5 },
  { label: "Caption on paper", fg: "--stone", bg: "--paper", threshold: 4.5 },
  { label: "Link on paper", fg: "--sage-deep", bg: "--paper", threshold: 4.5 },
  { label: "Body on raised surface", fg: "--ink", bg: "--paper-raise", threshold: 7 },
  { label: "Body on sage wash", fg: "--ink", bg: "--sage-wash", threshold: 7 },
  { label: "Link on sage wash", fg: "--sage-deep", bg: "--sage-wash", threshold: 4.5 },
  { label: "Dawn accent as text", fg: "--accent-blue-on", bg: "--paper", threshold: 4.5 },
  { label: "Activity accent as text", fg: "--accent-violet-on", bg: "--paper", threshold: 4.5 },
  { label: "Kitchen accent as text", fg: "--accent-amber-on", bg: "--paper", threshold: 4.5 },
  { label: "Rest accent as text", fg: "--accent-rose-on", bg: "--paper", threshold: 4.5 },
  { label: "Danger as text", fg: "--danger", bg: "--paper", threshold: 4.5 },
];

const CORE_TOKENS = [
  { name: "ink", token: "--ink", use: "Headings, header, footer, primary buttons" },
  { name: "ink-soft", token: "--ink-soft", use: "Secondary body text" },
  { name: "sage", token: "--sage", use: "Accents, rules, active states" },
  { name: "sage-deep", token: "--sage-deep", use: "Sage as text, passes 4.5:1" },
  { name: "sage-wash", token: "--sage-wash", use: "Alternating band backgrounds" },
  { name: "paper", token: "--paper", use: "Page ground" },
  { name: "paper-raise", token: "--paper-raise", use: "Cards, raised surfaces" },
  { name: "paper-sunk", token: "--paper-sunk", use: "Table headers, wells" },
  { name: "stone", token: "--stone", use: "Captions, metadata" },
  { name: "rule", token: "--rule", use: "Hairlines, borders" },
];

const ACCENTS: { name: string; token: string; accent: Accent; use: string }[] = [
  { name: "dawn", token: "--accent-blue", accent: "blue", use: "7am–9am, 5:30pm" },
  { name: "activity", token: "--accent-violet", accent: "violet", use: "10:30am, 6:30pm" },
  { name: "kitchen", token: "--accent-amber", accent: "amber", use: "4:30pm dinner prep" },
  { name: "rest", token: "--accent-rose", accent: "rose", use: "1pm rest, 8pm routine" },
];

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-14">
      <div className="border-rule mb-5 flex items-baseline justify-between gap-4 border-b pb-2">
        <h2 className="label text-sage-deep">
          {n} {title}
        </h2>
        {hint ? <span className="label text-stone">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default function SpecimenPage() {
  const scheduleItems = published(schedule) ?? [];
  const serviceItems = published(services) ?? [];
  const everyDayItems = published(everyDay) ?? [];
  const careTypeItems = published(careTypes) ?? [];
  const values = published(identity.values) ?? [];
  const pending = pendingQuestions();

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      <header className="border-ink border-b-2 pt-12 pb-6">
        <p className="label text-sage-deep mb-4">Internal · Phase 1 · noindex</p>
        <h1 className="text-hero mb-4">Design specimen</h1>
        <p className="text-ink-soft text-lead max-w-[60ch]">
          Every token, mark and icon in the Columbia Care system, rendered from the live theme.
          Switch themes with the control in the header, contrast ratios below recompute against
          whichever theme is actually applied.
        </p>
      </header>

      <Section n="01" title="Core palette" hint="sampled from the client's infographic">
        <div className="border-rule grid grid-cols-2 gap-px border bg-[var(--rule)] sm:grid-cols-3 lg:grid-cols-5">
          {CORE_TOKENS.map((t) => (
            <div key={t.token} className="bg-paper">
              <div
                className="border-rule h-16 border-b"
                style={{ background: `var(${t.token})` }}
              />
              <div className="p-3">
                <p className="font-semibold">{t.name}</p>
                <p className="text-stone font-mono text-[0.8125rem]">{t.token}</p>
                <p className="text-stone mt-1 text-[0.8125rem] leading-snug">{t.use}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="02" title="Time-of-day accents" hint="timeline only, never decorative">
        <div className="border-rule grid grid-cols-2 gap-px border bg-[var(--rule)] lg:grid-cols-4">
          {ACCENTS.map((t) => (
            <div key={t.token} className="bg-paper">
              <div
                className="border-rule h-16 border-b"
                style={{ background: `var(${t.token})` }}
              />
              <div className="p-3">
                <p className={`font-semibold ${ACCENT_TEXT[t.accent]}`}>{t.name}</p>
                <p className="text-stone font-mono text-[0.8125rem]">{t.token}</p>
                <p className="text-stone mt-1 text-[0.8125rem] leading-snug">{t.use}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-stone mt-3 text-[0.9375rem]">
          Badge fills stay fixed across themes because they always carry a white glyph. The
          <code className="bg-paper-sunk mx-1 rounded px-1.5 py-0.5 font-mono text-[0.875rem]">
            -on
          </code>
          variants are the text-safe versions and do shift, verified in section 03.
        </p>
      </Section>

      <Section n="03" title="Contrast audit" hint="computed live, both themes">
        <ContrastTable pairs={CONTRAST_PAIRS} />
        <p className="text-stone mt-3 text-[0.9375rem]">
          Body text targets 7:1 (WCAG AAA) rather than the 4.5:1 minimum, because the primary
          readers are older adults with reduced contrast sensitivity. Everything else targets 4.5:1.
        </p>
      </Section>

      <Section n="04" title="Typography" hint="Fraunces · Source Sans 3 · Parisienne · Plex Mono">
        <div className="border-rule bg-paper-raise divide-rule divide-y border">
          <div className="p-6">
            <p className="label text-stone mb-3">Display, Fraunces, SOFT 55, 600</p>
            <p className="text-hero">A place to feel at home</p>
          </div>
          <div className="p-6">
            <p className="label text-stone mb-3">H1 / H2 / H3</p>
            <p className="text-h1 mb-2">Care &amp; Services</p>
            <p className="text-h2 mb-2">A day in our home</p>
            <p className="text-h3 font-sans font-bold">Medication management</p>
          </div>
          <div className="p-6">
            <p className="label text-stone mb-3">Script, Parisienne · twice site-wide, maximum</p>
            <p className="font-script text-sage-deep text-4xl">{published(identity.closingLine)}</p>
          </div>
          <div className="p-6">
            <p className="label text-stone mb-3">Lead, 1.3rem</p>
            <p className="text-lead text-ink-soft max-w-[60ch]">{published(identity.promise)}</p>
          </div>
          <div className="p-6">
            <p className="label text-stone mb-3">Body, 18px base, 1.65</p>
            <p className="max-w-[65ch]">{published(identity.about)}</p>
          </div>
          <div className="p-6">
            <p className="label text-stone mb-3">Utility, Plex Mono, 0.12em</p>
            <p className="label text-sage-deep">Availability · Updated today</p>
          </div>
        </div>
      </Section>

      <Section n="05" title="Brand marks" hint="hand-drawn, originals requested from client">
        <div className="border-rule bg-paper-raise grid gap-px border bg-[var(--rule)] sm:grid-cols-3">
          <div className="bg-paper-raise flex flex-col items-center gap-3 p-8">
            <Monogram className="size-28" decorative />
            <p className="label text-stone">Monogram</p>
          </div>
          <div className="bg-paper-raise flex flex-col items-center gap-3 p-8">
            <HeartShield className="size-24" />
            <p className="label text-stone">Heart shield</p>
          </div>
          <div className="bg-paper-raise flex flex-col items-center justify-center gap-3 p-8">
            <Laurel className="h-10 w-20" />
            <p className="label text-stone">Laurel sprig</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="label text-stone mb-2">Section divider</p>
          <LaurelDivider className="py-4" />
        </div>

        <div className="mt-6">
          <p className="label text-stone mb-2">Wave, header to hero transition</p>
          <Wave className="block h-16 w-full" />
        </div>
      </Section>

      <Section n="06" title="Icon set" hint={`${scheduleItems.length} timeline · lucide glyphs`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scheduleItems.map((item) => (
            <div
              key={item.position}
              className="border-rule bg-paper-raise flex items-center gap-3 rounded border p-3"
            >
              {isIconName(item.icon) ? (
                <IconBadge name={item.icon} accent={item.accent} size="sm" />
              ) : null}
              <div className="min-w-0">
                <p className={`text-[0.9375rem] font-semibold ${ACCENT_TEXT[item.accent]}`}>
                  {item.timeLabel}
                </p>
                <p className="text-stone truncate text-[0.875rem]">{item.title}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="label text-stone mt-8 mb-3">Services, {serviceItems.length} from artwork</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {serviceItems.map((service) => (
            <div
              key={service.slug}
              className="border-rule bg-paper-raise flex items-center gap-3 rounded border p-3"
            >
              {isIconName(service.icon) ? (
                <IconBadge name={service.icon} accent="sage" size="sm" />
              ) : null}
              <p className="text-[0.9375rem]">{service.title}</p>
            </div>
          ))}
        </div>

        <p className="label text-stone mt-8 mb-3">Every day, {everyDayItems.length} from artwork</p>
        <div className="flex flex-wrap gap-2">
          {everyDayItems.map((item) => (
            <span
              key={item.title}
              className="border-rule bg-paper-raise inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[0.9375rem]"
            >
              {isIconName(item.icon) ? (
                <IconBadge
                  name={item.icon}
                  accent="navy"
                  size="sm"
                  className="size-8 [&>svg]:size-4"
                />
              ) : null}
              {item.title}
            </span>
          ))}
        </div>
      </Section>

      <Section n="07" title="Content from artwork" hint="everything publishable today">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="label text-stone mb-2">Values</p>
            <ul className="space-y-1">
              {values.map((v) => (
                <li key={v} className="marker:text-sage list-disc pl-1 marker:content-['·_']">
                  {v}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label text-stone mb-2">Care types</p>
            <ul className="space-y-1">
              {careTypeItems.map((v) => (
                <li key={v.slug} className="marker:text-sage list-disc pl-1 marker:content-['·_']">
                  {v.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section n="08" title="Still blocked on the client" hint={`${pending.length} open questions`}>
        <p className="text-ink-soft mb-4 max-w-[65ch]">
          These render nothing on the public site until the client confirms them in writing. This
          list is generated from{" "}
          <code className="bg-paper-sunk rounded px-1.5 py-0.5 font-mono text-[0.875rem]">
            content/source-of-truth.json
          </code>
          , so it stays honest as answers come in.
        </p>
        <div
          className="border-rule overflow-x-auto border"
          tabIndex={0}
          role="region"
          aria-label="Open client questions"
        >
          <table className="w-full min-w-[36rem] text-left text-[0.9375rem]">
            <thead>
              <tr className="bg-paper-sunk border-rule-strong label text-stone border-b">
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-3 py-2 font-medium">Question</th>
                <th className="px-3 py-2 font-medium">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((q) => (
                <tr key={q.id} className="border-rule border-b last:border-b-0">
                  <td className="px-3 py-2">
                    <span
                      className={`label inline-block rounded px-2 py-0.5 ${
                        q.priority === "blocker"
                          ? "text-[var(--danger)]"
                          : q.priority === "high"
                            ? "text-[var(--warn)]"
                            : "text-stone"
                      }`}
                    >
                      {q.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2">{q.question}</td>
                  <td className="text-stone px-3 py-2">{q.blocks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
