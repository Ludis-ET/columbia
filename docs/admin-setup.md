# Admin console

The console lives at `/admin`. It is `noindex`, never cached, and every screen
below `/admin/login` requires a signed-in admin.

## Create the first admin account

There is no public sign-up, deliberately. An account is created by you, then
granted admin access by adding a row to `profiles`.

**1. Create the user** in the Supabase dashboard:
[Authentication → Users → Add user](https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/auth/users).
Use the client's real email address and tick **Auto Confirm User**.

**2. Grant admin access** in the [SQL Editor](https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new):

```sql
insert into profiles (id, email, full_name, role)
select id, email, 'Columbia Care', 'owner'
from auth.users
where email = 'THE-EMAIL-YOU-JUST-CREATED'
on conflict (id) do update set role = excluded.role;
```

**3. Sign in** at `/admin/login`.

Having a Supabase account is _not_ the same as being an admin. Someone who signs
up through the auth API but has no `profiles` row is bounced back to the login
screen with an explanation, that separation is intentional.

## Roles

| Role     | Can do                                                           |
| -------- | ---------------------------------------------------------------- |
| `owner`  | Everything, including Settings                                   |
| `editor` | Content and enquiries. Settings is hidden and blocks a typed URL |

Change a role by updating `profiles.role`.

## How access control actually works

Three layers, in order of importance:

1. **Row-level security in Postgres.** Every write policy calls `is_admin()`,
   which checks `auth.uid()` against `profiles`. This is the real boundary.
2. **`(console)` route group.** Its layout loads the profile and redirects if
   there isn't one.
3. **Middleware.** Refreshes the session cookie and redirects signed-out
   visitors so they get a login screen instead of an empty page.

**There is no service-role client anywhere in this codebase.** Admin writes run
as the signed-in user, so the policies are exercised on every request and cannot
silently rot. A service-role key bypasses RLS entirely; if something seems to
need one, the answer is almost always a better policy or a security-definer
function.

> The login page sits **outside** the `(console)` route group. If it were
> inside, the auth layout would redirect the login page to itself, an infinite
> loop. Do not move it.

## Screens

| Screen              | What it does                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| Dashboard           | Availability inline, unanswered count, 30-day figures, enquiry pipeline |
| Enquiries           | Every lead, filterable, click-to-call, status pipeline, private notes   |
| Availability        | Four states plus "don't show anything", with a live badge preview       |
| Photos              | Media library, show/hide, reorder                                       |
| Services            | The eight services from the brochure                                    |
| Daily schedule      | The thirteen timeline entries                                           |
| Testimonials        | Quotes, blocked from publishing without consent                         |
| Questions & answers | FAQ; the public page appears once one exists                            |
| Team                | Staff, once names and consent exist                                     |
| Pages               | Headings and search descriptions, with a Google-result preview          |
| Settings            | Contact details and licence. Owner only.                                |

## Rules the database enforces, not just the UI

These are `CHECK` constraints in migration 0001. The console surfaces them in
plain language, but they hold even if someone writes to the API directly:

- A photo showing a person **cannot be published** without `release_on_file`.
- A testimonial **cannot be published** without `consent_on_file`.
- A photo **cannot be saved at all** without alt text.

## Publishing

Saving revalidates only the routes that content actually appears on, a photo
change does not rebuild the whole site. The map is `AFFECTED` in
`src/app/admin/actions.ts`; add to it when a new content type appears on a new
page.

The public site rebuilds within about a minute.

## Audit log

Every publish, reorder, delete and settings change writes to `audit_log` with
the actor, the entity and a diff. Useful when two people share a login, which
they will.

## Still to come (Phase 6)

Photo **uploading** is not wired yet. The Photos screen lists and manages what
is in the database, but adding files arrives with the tour form, Resend
notifications and Turnstile. Until then the site shows the clearly-marked
placeholder photographs in `public/placeholder/`.
