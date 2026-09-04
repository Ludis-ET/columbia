# Database

Supabase project `wmxvickqaxkuaatftput`. Postgres + Auth + Storage, with row-level
security doing the access control.

## Apply the schema in one paste

The publishable key in `.env.local` can read and submit under RLS, but it **cannot create
tables**. That needs the database password or a secret key, neither of which belongs in this
repo. So applying the schema is a manual step, made as small as possible:

1. Open the [SQL Editor](https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new)
2. Paste the whole of [`supabase/apply.sql`](../supabase/apply.sql)
3. Run it

Safe to re-run: the schema is `IF NOT EXISTS`, the seed is `ON CONFLICT DO UPDATE`.

If the project is already live and you only need the Care-section updates (summaries and hiding the duplicate Long term care service), paste [`supabase/apply-care-summaries.sql`](../supabase/apply-care-summaries.sql) instead of the whole bundle.

Then verify:

```bash
pnpm db:verify
```

It checks every table's row count and proves that `inquiries` rejects anonymous reads while
still accepting anonymous submissions. The RLS probe is non-mutating on the healthy path, so
it is safe to re-run as often as you like.

### One-off cleanup

Verifying RLS by hand during Phase 4 left a single labelled row in `inquiries`. It is
invisible to the public key, which is the point, but it will appear in the admin inbox in
Phase 5. Remove it in the SQL Editor:

```sql
delete from inquiries where email = 'rls-test@example.invalid';
```

### Or, with the Supabase CLI

If you'd rather use the CLI, you need a personal access token and the database password:

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref wmxvickqaxkuaatftput
pnpm dlx supabase db push          # migrations
pnpm dlx supabase db execute -f supabase/seed.sql
```

## What's in it

| Table            | Rows after seeding | Notes                                                  |
| ---------------- | ------------------ | ------------------------------------------------------ |
| `site_settings`  | 1                  | Singleton. Phone and licence are **NULL**, unconfirmed |
| `availability`   | 1                  | Status `unset`, so the badge renders nothing           |
| `care_types`     | 3                  | Brochure chips, each with a short summary              |
| `services`       | 8                  | 7 published services; `long-term-care` is unpublished  |
| `schedule_items` | 13                 | The full day timeline                                  |
| `every_day`      | 7                  | "Every Day at Columbia Care"                           |
| `why_families`   | 4                  | Brochure bullets                                       |
| `pages`          | 7                  | Titles, intros, SEO descriptions                       |
| `media`          | **0**              | No photographs yet (q9)                                |
| `testimonials`   | **0**              | No quotes yet (q14)                                    |
| `faqs`           | **0**              | No answers yet                                         |
| `team`           | **0**              | No names or consent yet (q7)                           |
| `inquiries`      | 0                  | Fills from Phase 6                                     |
| `audit_log`      | 0                  | Fills from Phase 5                                     |

The four **bold zeros are deliberate**. Their sections render nothing on the site. Never
insert a sample row into any of them. See the rule at the top of [CLAUDE.md](../CLAUDE.md).

## The content rule, in the schema

- Every content table has `published boolean not null default false`. A new row is invisible
  until somebody deliberately publishes it.
- `media.alt` is `NOT NULL` with a non-empty check. An image without alt text cannot be saved.
- `media` has a check constraint: a row with `contains_people = true` cannot be published
  unless `release_on_file = true`.
- `testimonials` has the same shape: no `consent_on_file`, no publishing.

Those last two make privacy a database guarantee rather than an admin-UI convention.

## Row-level security

Deny by default on every table.

- **Content tables**: public `SELECT` where `published = true`; all writes require `is_admin()`.
- **Singletons** (`site_settings`, `availability`): public `SELECT` always; columns are
  nullable instead, and a null renders nothing.
- **`inquiries`**: anyone may `INSERT`; only admins may read, update or delete. Families'
  phone numbers and care details never leave the admin console.
- **`profiles` / `audit_log`**: admins only.

## Why the site still works when the database doesn't

`src/lib/db/queries.ts` falls back to `content/source-of-truth.json` whenever a query fails
or a seeded table comes back empty. The public site is statically generated, so if Supabase
is unreachable at build time the build still emits a complete website rather than an empty
one for a care home.

Two cases that look alike but are not:

- **Seeded-from-artwork tables** (services, care types, schedule, every-day, why-families,
  settings) should never be empty. Zero rows means the seed didn't run, so fall back to the file.
- **Deliberately-empty tables** (testimonials, faqs, team, media) are empty because the
  client hasn't supplied that content. Zero rows is the correct answer, and falling back
  would be wrong. They return `[]` and their sections render nothing.

Only the admin console and the contact form actually require Supabase to be awake.

## The free-tier pause

Free projects pause after **7 days of inactivity**. A low-traffic care home site will hit
that. `.github/workflows/supabase-keepalive.yml` pings the project every three days to keep
it awake. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as
repository secrets for it to run.

That's the cheap mitigation. For a paying client, budget **$25/mo for Supabase Pro** instead.

## Changing content

`content/source-of-truth.json` stays the audit trail. After editing it:

```bash
pnpm seed:generate   # rewrites supabase/seed.sql
pnpm db:bundle       # rewrites supabase/apply.sql
```

Then re-run the seed. Once the admin console lands in Phase 5, day-to-day edits happen there
and the JSON stays as the record of what came from the original artwork.

## Regenerating types

`src/lib/db/database.types.ts` is hand-written to mirror the migration. Once the schema is
applied and you have an access token:

```bash
pnpm db:types
```

Keep the types and the migration in step. A mismatch is a runtime bug the type checker will
wave straight through.

## Keys

`.env.local` holds the project URL and the **publishable** key. That key is safe in the
browser: it grants exactly what RLS allows.

The **secret / service-role** key is a different thing entirely. It bypasses RLS completely.
Never put it in `.env.local` with a `NEXT_PUBLIC_` prefix, never commit it, and never paste
it into a chat window. Phase 5 needs it only on the server, for the admin console.
