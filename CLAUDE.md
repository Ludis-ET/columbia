# Columbia Care Adult Family Home — website

## THE RULE — read before writing any copy

**Never invent a fact about this business.**

No capacity, bed count, room type, rate, payment method, service, service area, licence
number, staff name, language, year founded, or statistic — unless it appears in
[content/source-of-truth.json](content/source-of-truth.json) with provenance `ARTWORK` or
`ARTWORK_CONFIRMED`.

This is a licensed care home. An invented detail is a promise the home may not be able to
keep, made to a family in a vulnerable moment. It is a liability, not a copywriting nit.

When a value is missing:

- **Render nothing.** No placeholder, no "Coming soon", no stub heading, no sample data.
- **Do not borrow a plausible default** from another care home or from what is typical.
- Add it to `openQuestions` in the source-of-truth file if it isn't already there.

Category research and best practice belong in the build plan and in code comments. They
never become copy about Columbia Care.

## Content workflow

- `content/source-of-truth.json` is the only approved source of published copy.
- Every entry carries a `provenance` field. Only `ARTWORK` and `ARTWORK_CONFIRMED` may ship.
- To promote an `ASK_CLIENT` entry: set the value, change provenance to `ARTWORK_CONFIRMED`,
  add `confirmedOn` with the date and channel. Written confirmation only.
- Once the database exists (Phase 4), this file is the seed. It stays the audit trail.
- Every content table defaults `published = false`. Sections with no published rows render nothing.

## The business

Columbia Care Adult Family Home, 2215 Columbia Ave, Everett, WA 98203.
The site's single job: get a family to book a house tour.

Three audiences on every page — the adult child (researching on a phone, at night), the
prospective resident (reading over their shoulder), and the referral agent (scanning for
scope of care and availability).

## Design system

Sampled from the client's "A Day in Our AFH" infographic. Do not invent new colours.

### Core palette

| Token       | Hex       | Use                                            |
| ----------- | --------- | ---------------------------------------------- |
| `ink`       | `#10254A` | Headings, header bar, footer, primary buttons  |
| `sage`      | `#5E7C3C` | Links, accents, botanical rules, active states |
| `sage-deep` | `#3F5528` | Sage text on light — passes 4.5:1              |
| `paper`     | `#F6F5EE` | Page ground. Green-biased, never pure white    |
| `sage-wash` | `#E7EBDC` | Alternating band backgrounds, quiet cards      |
| `stone`     | `#6B7266` | Secondary text, captions, metadata             |

### Time-of-day accents

Reserved **exclusively** for the day timeline and its icons. Never decorative elsewhere.

| Token    | Hex       | Timeline blocks       |
| -------- | --------- | --------------------- |
| `blue`   | `#2A6BB0` | 7am–9am, 5:30pm       |
| `violet` | `#6B4C9A` | 10:30am, 6:30pm       |
| `amber`  | `#B8720F` | 4:30pm dinner prep    |
| `rose`   | `#A93659` | 1pm rest, 8pm routine |

Admin status colours (new / contacted / toured / closed, success, destructive) come from a
separate semantic set and never borrow these.

### Typography

- **Display** — Fraunces variable, `SOFT 55`, weight 600. Headings only.
- **Body** — Source Sans 3, **18px** base, line-height 1.65. Never below 16px.
- **Script** — Parisienne. At most twice site-wide, never for information.
- **Utility** — IBM Plex Mono, `.12em` tracking. Labels, badges, admin chrome.
- Nothing below weight 400 renders anywhere.

### Layout & motion

- Content column 68–72ch. Full-bleed only for gallery, timeline, map.
- Separate sections with alternating grounds (paper / sage-wash), not card shadows.
- Radii stay at `4px`. Nothing is a pill except status badges. 8pt spacing scale.
- Grid `gap`, never per-element margins.
- One orchestrated motion moment: the day timeline gradient. Everything else near-static.
- Scroll reveals: 12px rise + fade, 320ms, 60ms stagger. No parallax, no counters, no scale-ins.
- `prefers-reduced-motion` collapses every transition to an instant state change.

### Banned

- **The cyan brochure palette.** The tri-fold panels use cyan-on-navy with chevrons and
  circuit motifs. It reads as an IT consultancy and fights the word "home". Retired.
- Playfair Display — the category default, and Fraunces is the deliberate choice.
- Stock photographs containing people, in production, ever.
- Carousel heroes, auto-playing media, AI chatbots, cookie-banner trackers.

## Voice

- **Home**, never _facility_. **Residents**, never _patients_. Match the artwork's vocabulary.
- Second person, present tense, short sentences. Grade-8 reading level.
- Gloss "activities of daily living (ADLs)" in plain English on first use, every page.
- Use the client's own phrase **"book a house tour"** — not "schedule a visit".
- No superlatives without a confirmed source behind them.

## Accessibility floor — non-negotiable

Target WCAG 2.2 AA, adopting AAA where cheap. These are CI gates, not aspirations.

- Contrast ≥ 7:1 body text, ≥ 4.5:1 everything else, both themes.
- Base 18px, all sizing in `rem`. Survives 200% zoom and 320px width with no horizontal scroll.
- Interactive targets ≥ 48×48px with ≥ 8px spacing.
- Visible focus ring on every focusable element, 2px, 3:1 against both adjacent colours.
- Full keyboard operation. No keyboard traps.
- Meaningful alt text on every image — enforced at the database layer (`alt` is `NOT NULL`).
- Forms: real `<label>`, `autocomplete` tokens, inline errors via `aria-describedby`, live region.
- Semantic landmarks, one `h1` per page, ordered headings, skip link first in DOM.
- Phone fields accept any format and normalise server-side.

## Privacy

Never publish a photograph of a resident, a resident's name, or anything implying a health
condition without a signed written release. Any image tagged `containsPeople` requires
`releaseOnFile: true` before it can be published. Testimonials require `consentOnFile`.

## Stack

Current repo is a bare Vite + React 19 + TS starter. Phase 1 migrates to:

| Layer      | Choice                                         |
| ---------- | ---------------------------------------------- |
| Framework  | Next.js 16 App Router (static-first/ISR)       |
| Styling    | Tailwind v4 (`@theme`, CSS-first)              |
| Components | shadcn/ui + Radix                              |
| Motion     | `motion` (`motion/react`)                      |
| Data       | Supabase — Postgres + Auth + Storage + RLS     |
| Forms      | react-hook-form + Zod (same schema both sides) |
| Email      | Resend + React Email                           |
| Spam       | Cloudflare Turnstile                           |
| Hosting    | Vercel                                         |
| Testing    | Vitest + Playwright + `@axe-core/playwright`   |

Keep the existing ESLint / Prettier / Husky / lint-staged / pnpm setup through the migration.

## Commands

```bash
pnpm dev            # dev server
pnpm build          # typecheck + build
pnpm lint           # eslint
pnpm format         # prettier --write
```

## Component conventions

- TypeScript strict. No `any`.
- **Content reaches a component only through `published()`** in `src/lib/content.ts`. It
  returns `null` for anything unconfirmed. Handle null by rendering `null`.
- **Components own their empty state by rendering `null`** — never a placeholder, never a
  stub heading. `AvailabilityBadge`, `TestimonialList`, `Gallery`, `FaqAccordion` and
  `MapBlock` all do this; follow the pattern.
- `src/components/ui/` is vendored shadcn output. It is regenerated by `shadcn add`, so
  keep edits there minimal and comment why. `button.tsx` and `table.tsx` are deliberately
  modified — read the notes before regenerating them.
- shadcn's semantic tokens (`--color-primary`, `--color-border`, …) are mapped onto brand
  tokens in `globals.css`. That means `shadcn add` produces on-brand components with no
  dark-mode block of their own. Do not reintroduce shadcn's own neutral palette.
- **Links that look like buttons use `buttonVariants()` on a real `<a>`/`<Link>`**, not
  `<Button render={<a/>}>`. Keeps them navigable and lintable as links.
- Any horizontally scrolling container needs `tabIndex={0}`, `role="region"` and an
  `aria-label`, or off-screen content is unreachable by keyboard.
- No `opacity-*` utilities on text. Dimming an already-tuned token breaks contrast — it
  cost us two axe failures in Phase 2. Use size and weight for hierarchy.
- Server actions for all mutations; Zod-validate on client and server (Phase 6).
- Run `/code-review` and `/security-review` before every deploy — the admin panel handles
  families' personal data.

## Data

Content lives in Supabase (project `wmxvickqaxkuaatftput`), seeded from
`content/source-of-truth.json`. Full detail in [docs/database.md](docs/database.md).

- Pages read through `src/lib/db/queries.ts`, never through `supabase` directly.
- **Every read falls back to the content file** when a query fails or a seeded table comes
  back empty. The public site is static, so a paused or unreachable database cannot take it
  down — only the admin console and the contact form need Supabase awake.
- **Empty is not always a failure.** Seeded-from-artwork tables (services, care types,
  schedule, every-day, why-families, settings) falling to zero rows means something broke —
  fall back. Deliberately-empty tables (testimonials, faqs, team, media) are empty because
  the client hasn't supplied that content; `[]` is correct and must NOT fall back.
- The provenance rule survives into SQL: `published` defaults to `false` everywhere, the seed
  generator only emits ARTWORK / ARTWORK_CONFIRMED entries, and check constraints block
  publishing an image of a person without a release or a testimonial without consent.
- After editing the content file: `pnpm seed:generate && pnpm db:bundle`.
- The **secret / service-role** key bypasses RLS entirely. Server-side only, never
  `NEXT_PUBLIC_`, never committed.

## Admin console

Lives at `/admin`, documented in [docs/admin-setup.md](docs/admin-setup.md).

- **No service-role client exists in this codebase.** Admin writes run as the signed-in
  user, so RLS authorises them and the policies are exercised on every request. If a task
  seems to need the elevated key, the answer is a better policy or a security-definer
  function.
- The login page is **outside** the `(console)` route group. Moving it inside makes the auth
  layout redirect the login page to itself.
- Consent and photo-release rules are `CHECK` constraints, not UI conventions. Surface those
  failures in the owner's language — see `togglePublished` in `src/app/admin/actions.ts`.
- Admin copy uses the owner's words: "Show on the website", never "published: true";
  "Photos", never "Media assets".
- Empty states teach. The testimonials empty state explains how to ask a family for a quote,
  which is more useful than a shrug and steers the owner away from writing one themselves.
- Saving revalidates only the affected routes — keep the `AFFECTED` map current.

## Building pages

- **Tier 1** pages are fillable entirely from the artwork and are live.
- **Tier 2** pages (`/admissions`, `/faq`) have their shell built and call `notFound()` while
  their data is unconfirmed, so the route 404s rather than publishing guesses. Filling the
  matching entry in `source-of-truth.json` makes the page appear — no code change.
- Where a page needs body copy the client has not written, build it from the **day timeline**
  instead. `scheduleFor()` maps a service to the entries that demonstrate it, so the page is
  the client's own sentences rather than plausible filler. `services[].relatedSchedule` holds
  that mapping.
- Never interpolate a content title into a sentence with `toLowerCase()` — it mangles
  "Alzheimer's". Let the heading carry the name and write around it.

## Verification

Three suites, all CI gates, run on desktop and mobile:

- `tests/a11y.spec.ts` — axe/WCAG 2.2 AA on every route, both themes, largest text with high
  contrast, one-`h1`-per-page, skip link.
- `tests/responsive.spec.ts` — no horizontal overflow at 320/375/768/1024/1440/1920, and at
  200% zoom.
- `tests/content-integrity.spec.ts` — greps the **rendered HTML** for unconfirmed facts
  (phone, capacity, payment types, extra cities, filler). This catches a hardcoded value that
  `published()` would never see. When the client confirms something, promote it in
  `source-of-truth.json` **and** delete its line from `FORBIDDEN`.

Run `pnpm test:a11y` after touching anything visual — the contrast table on `/specimen` only
covers the pairs it is told about, and axe catches the ones it is not.

## Reference

Full build plan (19 sections — sitemap, data model, admin spec, phases):
https://claude.ai/code/artifact/ebaba159-9209-47a5-b093-a20c5dc0873d
