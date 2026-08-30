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

## Verification

`pnpm test:a11y` runs axe against every route on desktop and mobile, in both themes, at
largest text with high contrast, and checks 320px width and the skip link. It is a CI gate.
Run it after touching anything visual — the token-level contrast table on `/specimen` only
covers the pairs it is told about, and axe catches the ones it is not.

## Reference

Full build plan (19 sections — sitemap, data model, admin spec, phases):
https://claude.ai/code/artifact/ebaba159-9209-47a5-b093-a20c5dc0873d
