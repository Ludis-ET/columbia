# Forms, email and SEO

## The tour request form

Lives on `/contact`. One Zod schema
([`src/lib/forms/tour-request.ts`](../src/lib/forms/tour-request.ts)) validates in the browser
and again inside the server action, so the two cannot drift.

### Order of operations, and why

```
1. Honeypot     free, no network call, catches naive bots
2. Zod parse    same schema the browser used
3. Turnstile    one network call, only for submissions that look real
4. Rate limit   duplicate guard via has_recent_inquiry()
5. INSERT       ← the lead is now safe
6. Email        best effort; failure here never loses the lead
```

**Step 5 before step 6 is the whole design.** If Resend is unconfigured, rate-limited or
down, the family still gets their confirmation and the owner still finds the enquiry in the
admin inbox. A care home losing a phone number because an email provider had a bad afternoon
is not acceptable.

### Two RLS traps this hit

Both are worth knowing, because they look like bugs in the form and are not:

**No `.select()` on the insert.** Visitors are anonymous. RLS grants them `INSERT` on
`inquiries` but not `SELECT` — correctly, since the table holds other families' phone
numbers. Postgres needs `SELECT` permission to satisfy a `RETURNING` clause, so
`.insert(...).select()` makes every genuine submission fail with _"new row violates
row-level security policy"_.

**The rate limit goes through an RPC.** For the same reason, a plain `SELECT` to check for a
recent duplicate always comes back empty, and the guard would silently never fire.
`has_recent_inquiry()` ([migration 0003](../supabase/migrations/0003_rate_limit.sql)) is
`SECURITY DEFINER` and returns only a boolean — no row, no name, no phone number crosses
back. That is the right shape: reaching for a service-role key here would hand the whole
table to the web tier to answer a yes/no question.

### Failing open on purpose

Turnstile verification is **skipped** when the keys are absent, and **allows** the submission
if Cloudflare is unreachable. Losing a real family's enquiry to a misconfigured spam check is
worse than letting spam through — the honeypot still catches naive bots, and the owner can
delete anything that slips past.

### Form design decisions

- Name, then **either** phone or email. Never both. Mirrors the `inquiry_contactable` CHECK
  constraint, so the form and the database agree.
- Phone accepts any punctuation and a leading `+1`. Nobody is rejected over a bracket.
- Errors are attached with `aria-describedby` and announced in an assertive live region,
  never signalled by colour alone.
- The confirmation **replaces** the form rather than appearing above it.
- No timeframe is promised. We cannot make a promise on the home's behalf — same rule as
  the rest of the site.

## Email

Two messages per enquiry, both React Email templates in
[`src/lib/email/templates.tsx`](../src/lib/email/templates.tsx):

- **To the owner** — phone as a `tel:` link, the message, and a link into the admin inbox.
  `replyTo` is the family's address, so hitting reply reaches them directly.
- **To the family** — confirmation that the message arrived. This matters more than it looks:
  a family who submits into silence assumes the home is disorganised, at exactly the moment
  they are comparing three of them.

Brand colours are inlined literals — email clients do not support CSS custom properties.

Set `RESEND_FROM` to a domain verified in Resend. Until the domain is verified, Resend's
shared sender only delivers to the account owner's own address.

## SEO

| Piece           | Where                                        |
| --------------- | -------------------------------------------- |
| Sitemap         | `src/app/sitemap.ts` — generated from the DB |
| robots.txt      | `src/app/robots.ts`                          |
| Structured data | `src/components/seo/structured-data.tsx`     |
| Social card     | `src/app/opengraph-image.tsx` — generated    |
| Canonicals      | Per-page `alternates.canonical`              |

### The content rule applies hardest to JSON-LD

Structured data is read by machines and surfaced in search results **as fact**. A guessed
telephone number there reaches a family in Google before they ever open the site.

So every property is conditional, and `compact()` drops anything null or empty. Today the
graph deliberately omits:

- `telephone` — unconfirmed (q1)
- `numberOfRooms` — capacity unconfirmed (q3)
- `priceRange` — rates unconfirmed (q6)
- `makesOffer` — availability unset

`tests/seo.spec.ts` asserts each of those is absent, and that `areaServed` is Everett only.
When the client confirms a value, promote it in `source-of-truth.json` and **delete the
matching assertion** — the test failing is the reminder.

The sitemap excludes the admin console, the two internal review pages, and the Tier 2 routes
that still 404. Submitting URLs that 404 wastes crawl budget and looks broken in Search
Console.

## Testing

| Suite                       | Covers                                               |
| --------------------------- | ---------------------------------------------------- |
| `src/**/*.test.ts` (Vitest) | The Zod schema and phone normalisation               |
| `tests/tour-form.spec.ts`   | Labels, validation, honeypot, axe on the error state |
| `tests/seo.spec.ts`         | robots, sitemap, JSON-LD omissions, canonicals       |

**The end-to-end tests are deliberately non-mutating.** A real submission writes to the
client's live enquiry inbox, so the only success path exercised is the honeypot one, which
returns the same confirmation to a bot but inserts nothing. Phone-format tolerance moved to
a Vitest unit test for the same reason — faster, more thorough, and writes nothing.

Testing the real insert belongs in a seeded staging project, not against the inbox the owner
actually reads.

## Still to come

- **Photo uploading** (Phase 8) — the Photos screen manages what is in the database; adding
  files needs the Supabase Storage upload flow.
- **The family info packet** — deferred. A print-optimised page that the browser can save as
  PDF will serve families better than a generated PDF, which screen readers handle poorly.
- **Google Business Profile** — your action, and worth more than any on-page work. A large
  share of enquiries for a home this size arrive through Maps.
