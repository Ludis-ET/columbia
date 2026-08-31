# Columbia Care AFH — website

Website for Columbia Care Adult Family Home, Everett, WA.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · pnpm.

## Start here

| File                                                         | What it is                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                       | Design system, voice, a11y floor — and the do-not-invent rule |
| [content/source-of-truth.json](content/source-of-truth.json) | The only approved source of published copy, with provenance   |
| [docs/client-questions.md](docs/client-questions.md)         | What we still need from the client                            |
| [docs/toolchain-setup.md](docs/toolchain-setup.md)           | MCP servers and Claude Code plugins for this project          |
| [docs/database.md](docs/database.md)                         | Schema, RLS, seeding, and the file fallback                   |
| [docs/admin-setup.md](docs/admin-setup.md)                   | The admin console: creating the first account, roles, rules   |
| [docs/forms-and-seo.md](docs/forms-and-seo.md)               | Tour form, email, structured data — and two RLS traps         |

**Before writing any copy, read the rule at the top of [CLAUDE.md](CLAUDE.md).** This is a
licensed care home; nothing gets published that the client hasn't confirmed. Content reaches
components only through `published()` in [src/lib/content.ts](src/lib/content.ts), which
returns `null` for anything unconfirmed — so a component cannot render an invented fact.

## Setup

```bash
pnpm install
pnpm dev
```

Then open [localhost:3000](http://localhost:3000). Two internal pages document the system:

| Route                                               | What it shows                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| [/specimen](http://localhost:3000/specimen)         | Tokens, type scale, brand marks, icons — with contrast ratios computed live |
| [/kitchen-sink](http://localhost:3000/kitchen-sink) | Every component, including its empty state                                  |

Both are `noindex` and excluded from the sitemap.

## Scripts

| Command                   | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `pnpm dev`                | Start the Next dev server                         |
| `pnpm build`              | Production build                                  |
| `pnpm start`              | Serve the production build                        |
| `pnpm typecheck`          | `tsc --noEmit`                                    |
| `pnpm lint`               | ESLint, including `jsx-a11y`                      |
| `pnpm lint:fix`           | ESLint with auto-fix                              |
| `pnpm format`             | Format with Prettier                              |
| `pnpm format:check`       | Check Prettier formatting                         |
| `pnpm test:a11y`          | axe / WCAG 2.2 AA, desktop + mobile               |
| `pnpm check:placeholders` | Report placeholder imagery still in use           |
| `pnpm seed:generate`      | Rebuild `supabase/seed.sql` from the content file |
| `pnpm db:bundle`          | Rebuild `supabase/apply.sql` (one-paste setup)    |
| `pnpm db:verify`          | Check the applied schema matches the app          |

## Layout

```
content/          source-of-truth.json — all approved copy, with provenance
supabase/         migrations, generated seed, one-paste apply.sql
docs/             client questions, toolchain setup
scripts/          check-placeholders.mjs (hard gate at launch)
tests/            axe, responsive and content-integrity suites
public/placeholder/  scaffolding imagery — replaced in Phase 8
src/app/          14 public routes + 2 internal + 2 gated (see below)
src/components/
  brand/          hand-drawn marks: monogram, heart-shield, laurel, wave
  site/           header, footer, hero, availability, gallery, timeline, CTA…
  ui/             vendored shadcn primitives, restyled to the brand
  motion/         Reveal — the one scroll animation, reduced-motion aware
  dev/            contrast auditing for /specimen (never shipped publicly)
  icons.tsx       the client's icon assignments, mapped to lucide glyphs
src/lib/
  db/             Supabase client, row types, queries with file fallback
  content.ts      the provenance gate — published() returns null if unconfirmed
  ...             fonts, nav, preferences, images, utils
```

## Routes

**Tier 1 — live, built entirely from the client's artwork**

`/` · `/about` · `/services` · `/services/{long-term-care,memory-care,personal-care,medication-management}` ·
`/a-day-in-our-home` · `/our-home` · `/meals` · `/contact` · `/privacy` · `/accessibility` · `/terms`

**Tier 2 — shell built, returns 404 until its data exists**

`/admissions` needs payment types, rates or admission criteria. `/faq` needs answers. Fill the
matching entries in [content/source-of-truth.json](content/source-of-truth.json) and the route
appears with no code change. `tests/content-integrity.spec.ts` asserts they 404 today.

**Admin — authenticated, noindex, never cached**

`/admin/login` sits outside the `(console)` route group; everything else under
`/admin` is behind it. See [docs/admin-setup.md](docs/admin-setup.md).

**Internal — noindex**

`/specimen` · `/kitchen-sink`

## Git hooks & CI

`pre-commit` runs `lint-staged` (ESLint `--fix` + Prettier on staged files) then
`tsc --noEmit`. CI runs typecheck → lint → format check → build on every push and PR.
Playwright, axe and a Lighthouse budget join CI in Phase 7.
