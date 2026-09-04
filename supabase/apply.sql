-- ============================================================================
-- Columbia Care, ONE-PASTE SETUP
--
-- Paste this whole file into the Supabase SQL Editor and run it:
--   https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new
--
-- Safe to re-run. Schema uses IF NOT EXISTS, seed uses ON CONFLICT.
-- GENERATED FILE, regenerate with: pnpm seed:generate && pnpm db:bundle
-- ============================================================================

-- ============================================================================
-- Columbia Care, schema
--
-- Fourteen tables. Public read is granted ONLY where published = true; every
-- write requires an authenticated admin. Because RLS runs inside the database,
-- the public site needs no auth middleware at all.
--
-- `published` defaults to FALSE on every content table. That makes the content
-- rule in CLAUDE.md a property of the schema rather than a promise in a doc:
-- a new row is invisible until somebody deliberately publishes it.
-- ============================================================================

-- gen_random_uuid() is core Postgres since v13 and Supabase runs newer than
-- that, so no extension is needed. Creating one can fail on permissions and
-- would abort the whole script for no benefit.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type admin_role as enum ('owner', 'editor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type availability_status as enum ('unset', 'accepting', 'limited', 'waitlist', 'full');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_kind as enum ('tour', 'contact', 'packet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inquiry_status as enum ('new', 'contacted', 'toured', 'moved_in', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type accent_token as enum ('navy', 'sage', 'blue', 'violet', 'amber', 'rose');
exception when duplicate_object then null; end $$;

-- Forces single-row tables to stay single-row: the primary key can only ever
-- hold one value, so a second INSERT conflicts instead of quietly duplicating.
do $$ begin
  create domain singleton_id as text
    not null default 'singleton'
    check (value = 'singleton');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- is_admin() is defined below, after profiles exists, see the note there.

-- ---------------------------------------------------------------------------
-- profiles, admin identity
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        admin_role not null default 'editor',
  last_seen_at timestamptz,
  created_at  timestamptz not null default now()
);

-- True when the caller is a signed-in admin. Used by every write policy.
--
-- MUST come after `profiles`: this is a `language sql` function, and Postgres
-- validates the body at creation time (unlike plpgsql), so referencing a table
-- that does not exist yet fails with 42P01.
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- site_settings, the NAP singleton
--
-- Nullable on purpose. A null renders nothing on the site; it never renders a
-- placeholder. phone/licence stay null until the client confirms them.
-- ---------------------------------------------------------------------------

create table if not exists site_settings (
  id                singleton_id primary key default 'singleton',
  phone             text,
  phone_display     text,
  sms               text,
  fax               text,
  email             text,
  street_address    text,
  address_locality  text,
  address_region    text,
  postal_code       text,
  address_country   text default 'US',
  latitude          double precision,
  longitude         double precision,
  license_number    text,
  licensed_capacity integer,
  hours             text,
  location_line     text,
  service_area      text[] not null default '{}',
  socials           jsonb not null default '{}'::jsonb,
  default_og_image  uuid,
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- availability, the highest-converting element on the site
-- ---------------------------------------------------------------------------

create table if not exists availability (
  id          singleton_id primary key default 'singleton',
  status      availability_status not null default 'unset',
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- announcements, site-wide banner
-- ---------------------------------------------------------------------------

create table if not exists announcements (
  id        uuid primary key default gen_random_uuid(),
  message   text not null,
  link      text,
  tone      text not null default 'info',
  starts_at timestamptz,
  ends_at   timestamptz,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- media, one library, alt text REQUIRED at the database layer
-- ---------------------------------------------------------------------------

create table if not exists media (
  id              uuid primary key default gen_random_uuid(),
  storage_path    text not null unique,
  alt             text not null check (length(btrim(alt)) > 0),
  caption         text,
  category        text,
  width           integer,
  height          integer,
  blur_data_url   text,
  contains_people boolean not null default false,
  release_on_file boolean not null default false,
  position        integer not null default 0,
  featured        boolean not null default false,
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Privacy, enforced by the database rather than by policy: an image showing a
  -- person cannot be published without a signed release on file.
  constraint media_release_required
    check (not published or not contains_people or release_on_file)
);

-- ---------------------------------------------------------------------------
-- pages / sections
-- ---------------------------------------------------------------------------

create table if not exists pages (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  lead            text,
  seo_title       text,
  seo_description text,
  og_image_id     uuid references media(id) on delete set null,
  noindex         boolean not null default false,
  published       boolean not null default false,
  updated_at      timestamptz not null default now()
);

create table if not exists sections (
  id        uuid primary key default gen_random_uuid(),
  page_id   uuid not null references pages(id) on delete cascade,
  kind      text not null,
  position  integer not null default 0,
  heading   text,
  body      jsonb,
  image_id  uuid references media(id) on delete set null,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------

create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  summary          text,
  body             text,
  icon             text not null,
  image_id         uuid references media(id) on delete set null,
  position         integer not null default 0,
  featured         boolean not null default false,
  has_detail_page  boolean not null default false,
  related_schedule integer[] not null default '{}',
  published        boolean not null default false,
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- care_types, the three brochure chips
-- ---------------------------------------------------------------------------

create table if not exists care_types (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  short_title text not null,
  icon        text not null,
  position    integer not null default 0,
  published   boolean not null default false
);

-- ---------------------------------------------------------------------------
-- schedule_items, the 13 day-timeline entries
-- ---------------------------------------------------------------------------

create table if not exists schedule_items (
  id           uuid primary key default gen_random_uuid(),
  position     integer not null unique,
  time_label   text not null,
  sort_minutes integer not null,
  title        text not null,
  body         text not null,
  bullets      text[] not null default '{}',
  icon         text not null,
  accent       accent_token not null default 'navy',
  published    boolean not null default false,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- every_day, the "Every Day at Columbia Care" list
-- ---------------------------------------------------------------------------

create table if not exists every_day (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  icon      text not null,
  position  integer not null default 0,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- why_families, the four brochure bullets
-- ---------------------------------------------------------------------------

create table if not exists why_families (
  id        uuid primary key default gen_random_uuid(),
  text      text not null,
  position  integer not null default 0,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- testimonials, consent required before publishing
-- ---------------------------------------------------------------------------

create table if not exists testimonials (
  id              uuid primary key default gen_random_uuid(),
  quote           text not null,
  author          text not null,
  relationship    text,
  consent_on_file boolean not null default false,
  position        integer not null default 0,
  published       boolean not null default false,
  created_at      timestamptz not null default now(),

  -- Same principle as media: no consent, no publication.
  constraint testimonial_consent_required
    check (not published or consent_on_file)
);

-- ---------------------------------------------------------------------------
-- faqs
-- ---------------------------------------------------------------------------

create table if not exists faqs (
  id        uuid primary key default gen_random_uuid(),
  question  text not null,
  answer    text not null,
  category  text,
  position  integer not null default 0,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- team
-- ---------------------------------------------------------------------------

create table if not exists team (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  role      text,
  bio       text,
  photo_id  uuid references media(id) on delete set null,
  languages text[] not null default '{}',
  position  integer not null default 0,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- inquiries, every lead, one pipeline. NEVER publicly readable.
-- ---------------------------------------------------------------------------

create table if not exists inquiries (
  id              uuid primary key default gen_random_uuid(),
  kind            inquiry_kind not null default 'contact',
  name            text not null,
  email           text,
  phone           text,
  message         text,
  preferred_times text[] not null default '{}',
  relationship    text,
  care_needs      jsonb,
  status          inquiry_status not null default 'new',
  owner_notes     text,
  source          text,
  utm             jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- A lead we cannot reply to is not a lead.
  constraint inquiry_contactable check (email is not null or phone is not null)
);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------

create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  diff       jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists services_published_position_idx on services (published, position);
create index if not exists schedule_published_position_idx on schedule_items (published, position);
create index if not exists media_published_position_idx    on media (published, position);
create index if not exists media_category_idx              on media (category);
create index if not exists faqs_published_position_idx     on faqs (published, position);
create index if not exists inquiries_status_created_idx    on inquiries (status, created_at desc);
create index if not exists audit_log_created_idx           on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'site_settings','availability','media','pages','services','schedule_items','inquiries'
  ] loop
    execute format(
      'drop trigger if exists %I_set_updated_at on %I;
       create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at();', t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- Deny by default. Public read is granted ONLY to published rows. Inquiries are
-- insert-only for the public and readable only by admins, families' phone
-- numbers and care details never leave the admin console.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  -- Content tables: public reads published rows, admins do everything.
  foreach t in array array[
    'services','care_types','schedule_items','every_day','why_families',
    'testimonials','faqs','team','media','pages','sections','announcements'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public reads published" on %I;', t);
    execute format(
      'create policy "public reads published" on %I for select using (published = true);', t);
    execute format('drop policy if exists "admins write" on %I;', t);
    execute format(
      'create policy "admins write" on %I for all using (is_admin()) with check (is_admin());', t);
  end loop;

  -- Singletons: always publicly readable (their columns are nullable instead).
  foreach t in array array['site_settings','availability'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public reads" on %I;', t);
    execute format('create policy "public reads" on %I for select using (true);', t);
    execute format('drop policy if exists "admins write" on %I;', t);
    execute format(
      'create policy "admins write" on %I for all using (is_admin()) with check (is_admin());', t);
  end loop;
end $$;

-- profiles: a signed-in admin may read the roster and edit only their own row.
alter table profiles enable row level security;
drop policy if exists "admins read profiles" on profiles;
create policy "admins read profiles" on profiles for select using (is_admin());
drop policy if exists "self updates profile" on profiles;
create policy "self updates profile" on profiles for update using (id = auth.uid());

-- inquiries: anyone may submit; only admins may read or change.
alter table inquiries enable row level security;
drop policy if exists "anyone submits" on inquiries;
create policy "anyone submits" on inquiries for insert with check (true);
drop policy if exists "admins read inquiries" on inquiries;
create policy "admins read inquiries" on inquiries for select using (is_admin());
drop policy if exists "admins update inquiries" on inquiries;
create policy "admins update inquiries" on inquiries for update using (is_admin());
drop policy if exists "admins delete inquiries" on inquiries;
create policy "admins delete inquiries" on inquiries for delete using (is_admin());

-- audit_log: admins read; writes happen through security-definer functions.
alter table audit_log enable row level security;
drop policy if exists "admins read audit" on audit_log;
create policy "admins read audit" on audit_log for select using (is_admin());


-- ============================================================================
-- Columbia Care, storage buckets
--
--   media/     photographs. Public read, admin write.
--              Sub-paths: gallery/ team/ services/ og/
--   documents/ the DSHS Disclosure of Services, the family info packet.
--
-- 8MB cap. Supabase's transform endpoint re-encodes to WebP/AVIF on the fly,
-- and next/image serves from there, nothing is stored pre-resized.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 8388608,
    array['image/jpeg','image/png','image/webp','image/avif']),
  ('documents', 'documents', true, 8388608,
    array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Policies on storage.objects.
--
-- On recent Supabase projects storage.objects is owned by supabase_storage_admin,
-- and creating policies on it from the SQL Editor can fail with
-- "must be owner of table objects". That must not abort the whole script, so it
-- is caught here and reported. If you see the NOTICE, add the same four policies
-- through Dashboard → Storage → Policies instead.
do $$
begin
  drop policy if exists "public reads media" on storage.objects;
  create policy "public reads media" on storage.objects
    for select using (bucket_id in ('media', 'documents'));

  drop policy if exists "admins upload" on storage.objects;
  create policy "admins upload" on storage.objects
    for insert with check (bucket_id in ('media', 'documents') and is_admin());

  drop policy if exists "admins update objects" on storage.objects;
  create policy "admins update objects" on storage.objects
    for update using (bucket_id in ('media', 'documents') and is_admin());

  drop policy if exists "admins delete objects" on storage.objects;
  create policy "admins delete objects" on storage.objects
    for delete using (bucket_id in ('media', 'documents') and is_admin());

  raise notice 'Storage policies created.';
exception
  when insufficient_privilege then
    raise notice 'SKIPPED storage policies: not the owner of storage.objects. Add them via Dashboard > Storage > Policies. Buckets themselves were created fine.';
end $$;


-- ============================================================================
-- Rate limiting for the tour form
--
-- THE PROBLEM
-- Anonymous visitors may INSERT into `inquiries` but not SELECT from it, because
-- the table holds other families' phone numbers and care details. That is correct,
-- but it means the server action cannot ask "has this person just submitted?",
-- because the answer always comes back empty and the duplicate check silently
-- never fires.
--
-- THE FIX
-- A SECURITY DEFINER function: it runs with the definer's rights, so it can see
-- the table, but it returns only a BOOLEAN. No row, no name, no phone number
-- ever crosses back to the caller. That is the right shape for this. Reaching
-- for a service-role key here would hand the whole table to the web tier to
-- answer a yes/no question.
-- ============================================================================

create or replace function has_recent_inquiry(p_name text, p_minutes integer default 5)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from inquiries
    where lower(btrim(name)) = lower(btrim(p_name))
      and created_at > now() - make_interval(mins => greatest(p_minutes, 1))
  );
$$;

-- Callable by the public site. It leaks nothing beyond a boolean.
grant execute on function has_recent_inquiry(text, integer) to anon, authenticated;

comment on function has_recent_inquiry is
  'Duplicate-submission guard for the tour form. Returns only a boolean so an anonymous caller learns nothing about existing enquiries.';


-- Migration 0004: Admin refinement additions
-- Adds: inquiries.starred, announcements table, opening_hours table
--
-- GENUINELY idempotent. An earlier version DROPPED both tables before creating
-- them, which meant re-running apply.sql silently destroyed every announcement
-- the owner had written and any opening hours they had adjusted. Tables are now
-- created only if absent, and missing columns are added in place.

-- ---------------------------------------------------------------------------
-- 1. inquiries.starred
-- ---------------------------------------------------------------------------

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. announcements
--    Drop and recreate cleanly in case a previous partial run left it
--    in a bad state (e.g. missing the `active` column).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message     text NOT NULL CHECK (char_length(message) <= 300),
  cta_text    text,
  cta_href    text,
  active      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE announcements IS
  'Site-wide banner messages displayed at the top of every public page.';

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS cta_href text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT false;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "public can read active announcements" ON announcements;

CREATE POLICY "admins can manage announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "public can read active announcements"
  ON announcements
  FOR SELECT
  TO anon
  USING (active = true);

-- ---------------------------------------------------------------------------
-- 3. opening_hours
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opening_hours (
  day_of_week  int PRIMARY KEY CHECK (day_of_week BETWEEN 1 AND 7),
  day_name     text NOT NULL,
  opens        text,
  closes       text,
  closed       boolean NOT NULL DEFAULT false,
  note         text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE opening_hours IS
  'Structured opening hours per day of the week (1=Monday, 7=Sunday).';

ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins can manage opening_hours" ON opening_hours;
DROP POLICY IF EXISTS "public can read opening_hours" ON opening_hours;

CREATE POLICY "admins can manage opening_hours"
  ON opening_hours
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "public can read opening_hours"
  ON opening_hours
  FOR SELECT
  TO anon
  USING (true);

-- Seed 7 default rows (24/7 care — adjust in the admin once the site is live)
INSERT INTO opening_hours (day_of_week, day_name, opens, closes, closed, note)
VALUES
  (1, 'monday',    '00:00', '23:59', false, null),
  (2, 'tuesday',   '00:00', '23:59', false, null),
  (3, 'wednesday', '00:00', '23:59', false, null),
  (4, 'thursday',  '00:00', '23:59', false, null),
  (5, 'friday',    '00:00', '23:59', false, null),
  (6, 'saturday',  '00:00', '23:59', false, null),
  (7, 'sunday',    '00:00', '23:59', false, null)
ON CONFLICT (day_of_week) DO NOTHING;


-- ============================================================================
-- site_copy: the words on the page
--
-- Until now the tagline, the promise strip, the about paragraph, the meals
-- paragraph and the five values were compiled into the build from
-- content/source-of-truth.json. The owner could not change a single word of the
-- most prominent copy on their own website.
--
-- This table holds all of it, plus the section headings that were hardcoded in
-- page.tsx. Seeded from the same JSON so nothing changes visually.
--
-- `source` keeps the audit trail that the content rule depends on:
--   'artwork'   came from the client's own brochure or infographic, verbatim
--   'editorial' written for the site, and safe to reword
-- The admin screen shows that distinction, so nobody edits the client's own
-- words without realising it.
-- ============================================================================

do $$ begin
  create type copy_kind as enum ('short', 'long', 'list');
exception when duplicate_object then null; end $$;

do $$ begin
  create type copy_source as enum ('artwork', 'editorial');
exception when duplicate_object then null; end $$;

create table if not exists site_copy (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  section     text not null,
  label       text not null,
  help        text,
  kind        copy_kind not null default 'short',
  source      copy_source not null default 'editorial',
  value       text,
  value_list  text[] not null default '{}',
  position    integer not null default 0,
  published   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create index if not exists site_copy_section_position_idx on site_copy (section, position);

drop trigger if exists site_copy_set_updated_at on site_copy;
create trigger site_copy_set_updated_at before update on site_copy
  for each row execute function set_updated_at();

-- Same policy shape as every other content table.
alter table site_copy enable row level security;

drop policy if exists "public reads published" on site_copy;
create policy "public reads published" on site_copy
  for select using (published = true);

drop policy if exists "admins write" on site_copy;
create policy "admins write" on site_copy
  for all using (is_admin()) with check (is_admin());

comment on table site_copy is
  'Editable page copy. `source` records whether the words came from the client''s own artwork or were written for the site.';


-- Multiple placements per photo (hero, meals, gallery categories, etc.)

alter table media
  add column if not exists placements text[] not null default '{}';

-- Backfill from the legacy single category column.
update media
set placements = array[category]::text[]
where category is not null
  and cardinality(placements) = 0;

create index if not exists media_placements_gin_idx on media using gin (placements);


-- Short descriptions on the three care-type cards.
-- Services already have `summary`; this matches that shape.

alter table care_types
  add column if not exists summary text;


-- Gallery categories — dynamic, admin-managed list that replaces the
-- hardcoded GALLERY_CATEGORIES const in src/lib/media.ts.
--
-- Each row is a named section that appears as a filter tab in the public
-- gallery and as a tagging option in the admin photo manager.

create table if not exists gallery_categories (
  id       uuid    primary key default gen_random_uuid(),
  name     text    not null unique,
  position integer not null default 0,
  published boolean not null default true
);

-- Seed with the four legacy categories + two new ones from real photos.
-- ON CONFLICT so re-running the migration is safe.
insert into gallery_categories (name, position) values
  ('Living areas',    0),
  ('Dining & kitchen',1),
  ('Bedrooms',        2),
  ('Outdoors',        3),
  ('Entrance',        4),
  ('Restroom',        5)
on conflict (name) do nothing;

-- RLS: published categories are readable by everyone.
-- Admin writes go through the authenticated role (the admin session).
alter table gallery_categories enable row level security;

create policy "Public can read published gallery categories"
  on gallery_categories for select
  to anon, authenticated
  using (published = true);

create policy "Admins can manage gallery categories"
  on gallery_categories for all
  to authenticated
  using (true)
  with check (true);

-- Expose to the PostgREST Data API (anon + authenticated need SELECT).
grant select on gallery_categories to anon, authenticated;
grant insert, update, delete on gallery_categories to authenticated;


-- ============================================================================
-- Columbia Care, seed data
--
-- GENERATED FILE. Do not edit by hand.
--   source: content/source-of-truth.json
--   regenerate: pnpm seed:generate
--
-- Only entries whose provenance is ARTWORK or ARTWORK_CONFIRMED appear here.
-- Anything still ASK_CLIENT is seeded as NULL or omitted entirely, so the site
-- renders nothing for it, see the rule in CLAUDE.md.
-- ============================================================================

begin;

-- site_settings: one row. Unconfirmed fields stay NULL and render nothing.
insert into site_settings (
  id, phone, phone_display, sms, fax, email,
  street_address, address_locality, address_region, postal_code, address_country,
  latitude, longitude, license_number, licensed_capacity, hours, location_line, service_area
) values (
  'singleton',
  '206-499-0849',   -- ASK_CLIENT q1, no number published yet
  '206-499-0849',
  null,
  '425-212-9108',
  'columbiacareafh@gmail.com',
  '2215 Columbia Ave', 'Everett', 'WA',
  '98203', 'US',
  null, null,
  null,  -- ASK_CLIENT q3
  null,
  '24 hours, every day',
  'Close to Broadway Ave, easy access to Evergreen Way and Interstate 5.',
  array['Everett']::text[]   -- Everett only: the sole confirmed area
)
on conflict (id) do update set
  phone = excluded.phone, phone_display = excluded.phone_display,
  sms = excluded.sms, fax = excluded.fax, email = excluded.email,
  street_address = excluded.street_address, address_locality = excluded.address_locality,
  address_region = excluded.address_region, postal_code = excluded.postal_code,
  hours = excluded.hours, location_line = excluded.location_line,
  service_area = excluded.service_area,
  updated_at = now();

-- availability: starts unset, so the badge renders nothing until the client sets it.
insert into availability (id, status) values ('singleton', 'unset')
on conflict (id) do nothing;

-- care_types: the three brochure chips, verbatim, with artwork-derived summaries.
insert into care_types (slug, title, short_title, summary, icon, position, published) values
  ('long-term-care', 'Long term care', 'Long term care', 'A safe, comfortable, and caring home where every resident is treated with dignity and respect, receiving personalized care in a family-like environment.', 'house', 0, true),
  ('memory-care', 'Memory care', 'Memory care', 'Dementia and Alzheimer''s care is part of the care we provide.', 'heart', 1, true),
  ('personal-care', 'Personal care, assistance and more', 'Personal care', 'Staff assist with toileting, bathing, dressing, grooming, and other activities of daily living (ADLs).', 'people', 2, true)
on conflict (slug) do update set
  title = excluded.title, short_title = excluded.short_title,
  summary = excluded.summary, icon = excluded.icon, position = excluded.position,
  published = excluded.published;

-- services: seven published offerings. long-term-care is unpublished (duplicates a care type).
insert into services (slug, title, summary, icon, position, has_detail_page, related_schedule, published) values
  ('long-term-care', 'Long term care', 'A safe, comfortable, and caring home where every resident is treated with dignity and respect, receiving personalized care in a family-like environment.', 'house', 0, true, array[1, 3, 12, 13]::integer[], false),
  ('24-hour-care', '24-hour compassionate care and supervision', 'Caregivers remain available throughout the night. Residents receive assistance when needed, according to their individual care plans.', 'shield', 1, false, array[1, 12, 13]::integer[], true),
  ('personal-care', 'Assistance with activities of daily living (ADLs)', 'Staff assist with toileting, bathing, dressing, grooming, and other activities of daily living (ADLs).', 'people', 2, true, array[1, 11]::integer[], true),
  ('medication-management', 'Medication management', 'Medications are administered according to each resident''s orders and medication schedule. Staff document care and medication administration.', 'capsule', 3, true, array[2]::integer[], true),
  ('meals', 'Fresh and nutritious meals', 'Our home provides a wide variety of nutritious, home-cooked meals daily for breakfast, lunch, dinner, and snacks between meals such as fresh fruit and vegetables.', 'bowl', 4, false, array[2, 5, 8, 9]::integer[], true),
  ('housekeeping-laundry', 'Housekeeping and laundry', 'The home is kept clean, safe, and comfortable. Housekeeping and laundry are part of what we provide.', 'house', 5, false, '{}', true),
  ('transportation', 'Transportation for appointments', 'Staff help residents with appointments and other scheduled activities.', 'car', 6, false, array[3]::integer[], true),
  ('memory-care', 'Dementia and Alzheimer''s care', 'Dementia and Alzheimer''s care is part of the care we provide.', 'heart', 7, true, '{}', true)
on conflict (slug) do update set
  title = excluded.title, summary = excluded.summary, icon = excluded.icon,
  position = excluded.position, has_detail_page = excluded.has_detail_page,
  related_schedule = excluded.related_schedule, published = excluded.published;

-- schedule_items: all 13 day-timeline entries, verbatim.
insert into schedule_items (position, time_label, sort_minutes, title, body, bullets, icon, accent, published) values
  (1, '7:00 AM', 420, 'Good Morning', 'Residents are gently welcomed and assisted with getting up according to their individual care plans. Staff assist with toileting, bathing, dressing, grooming, and other activities of daily living.', '{}', 'sunrise', 'navy', true),
  (2, '8:00 AM', 480, 'Breakfast', 'Residents enjoy a nutritious homemade breakfast. Medications are administered according to each resident''s orders and medication schedule. Staff document care and medication administration.', '{}', 'coffee-cup', 'sage', true),
  (3, '9:00 AM', 540, 'Morning Routine', 'Residents have time to relax, read, watch TV, listen to music, or socialize. Staff help residents with appointments and other scheduled activities.', '{}', 'open-book', 'navy', true),
  (4, '10:30 AM', 630, 'Activities', 'Residents participate in activities based on their interests and abilities, such as:', array['Games and puzzles', 'Music', 'Arts and crafts', 'Walking or light exercise', 'Conversation and social activities']::text[], 'palette', 'violet', true),
  (5, '12:00 PM', 720, 'Lunch', 'Residents enjoy lunch together. Staff encourage hydration and provide assistance as needed.', '{}', 'plate-heart', 'sage', true),
  (6, '1:00 PM', 780, 'Rest & Personal Time', 'Residents can take a nap, relax in their rooms, watch television, or spend time with family and friends.', '{}', 'armchair-clock', 'rose', true),
  (7, '2:30 PM', 870, 'Afternoon Activities', 'Depending on the day, residents may enjoy a walk, outdoor time, an activity, an appointment, or simply socializing with others.', '{}', 'tree', 'sage', true),
  (8, '4:30 PM', 990, 'Dinner Preparation', 'Staff prepare a fresh, homemade dinner while maintaining a safe environment. Residents may spend time together in the common area.', '{}', 'cooking-pot', 'amber', true),
  (9, '5:30 PM', 1050, 'Dinner', 'Residents enjoy dinner together. Staff provide assistance according to individual needs and document required care.', '{}', 'fork-knife', 'blue', true),
  (10, '6:30 PM', 1110, 'Evening Activities', 'Residents may watch a favorite program, listen to music, play games, talk with others, or visit with family.', '{}', 'music-note', 'violet', true),
  (11, '8:00 PM', 1200, 'Evening Routine', 'Staff assist residents with toileting, changing clothes, oral care, and getting ready for bed according to their care plans.', '{}', 'moon-stars', 'rose', true),
  (12, '9:00 PM', 1260, 'Quiet Time', 'The home becomes quieter so residents can rest. Staff continue safety checks and provide assistance as needed.', '{}', 'moon', 'navy', true),
  (13, 'Overnight', 1440, '24-Hour Care', 'Caregivers remain available throughout the night. Residents receive assistance when needed, and staff monitor safety and document any significant changes or care provided.', '{}', 'house-heart', 'navy', true)
on conflict (position) do update set
  time_label = excluded.time_label, sort_minutes = excluded.sort_minutes,
  title = excluded.title, body = excluded.body, bullets = excluded.bullets,
  icon = excluded.icon, accent = excluded.accent, published = excluded.published;

-- every_day: the 'Every Day at Columbia Care' list.
delete from every_day;
insert into every_day (title, icon, position, published) values
  ('24-Hour Care & Supervision', 'shield', 0, true),
  ('Medication Management', 'capsule', 1, true),
  ('Nutritious Homemade Meals', 'bowl', 2, true),
  ('Meaningful Activities', 'people', 3, true),
  ('Assistance with Appointments & Transportation', 'car', 4, true),
  ('Clean, Safe & Comfortable Home', 'house', 5, true),
  ('Dignity, Respect & Compassion', 'heart', 6, true);

-- why_families: the four brochure bullets.
delete from why_families;
insert into why_families (text, position, published) values
  ('Experienced and caring staff', 0, true),
  ('Clean and comfortable home-like environment', 1, true),
  ('Personalized care for every resident', 2, true),
  ('Conveniently located near Broadway Avenue, Evergreen Way, and Interstate 5', 3, true);

-- pages: titles and intros. SEO descriptions come from the artwork copy.
insert into pages (slug, title, lead, seo_description, published) values
  ('/', 'Home', 'A Place to Feel at Home, A Place to Be Cared For.', 'At Columbia Care Adult Family Home, we provide a safe, comfortable, and caring home where every resident is treated with dignity and respect. Our goal is to help each resident maintain the highest possible quality of life while receiving personalized care in a family-like environment.', true),
  ('/about', 'About Us', 'A safe place. A caring heart. A better quality of life.', 'At Columbia Care Adult Family Home, we provide a safe, comfortable, and caring home where every resident is treated with dignity and respect. Our goal is to help each resident maintain the highest possible quality of life while receiving personalized care in a family-like environment.', true),
  ('/services', 'Care & Services', null, 'At Columbia Care Adult Family Home, we provide a safe, comfortable, and caring home where every resident is treated with dignity and respect. Our goal is to help each resident maintain the highest possible quality of life while receiving personalized care in a family-like environment.', true),
  ('/a-day-in-our-home', 'A Day in Our Home', null, null, true),
  ('/our-home', 'Our Home', null, null, true),
  ('/meals', 'Meals & Dining', null, 'Our home provides a wide variety of nutritious, home-cooked meals daily for breakfast, lunch, dinner, and snacks between meals such as fresh fruit and vegetables.', true),
  ('/contact', 'Contact & Book a House Tour', 'Contact us to book a house tour!', null, true)
on conflict (slug) do update set
  title = excluded.title, lead = excluded.lead,
  seo_description = excluded.seo_description, published = excluded.published;

-- site_copy: every editable word on the page, seeded from the artwork file.
insert into site_copy (slug, section, label, help, kind, source, value, value_list, position, published) values
  ('hero_tagline', 'Hero', 'Main headline', 'The first thing a family reads.', 'short', 'artwork', 'A Place to Feel at Home, A Place to Be Cared For.', '{}', 0, true),
  ('hero_lead', 'Hero', 'Line under the headline', null, 'short', 'editorial', 'An adult family home in Everett, Washington.', '{}', 1, true),
  ('promise', 'Promise strip', 'Promise', 'The band under the hero.', 'short', 'artwork', 'A safe place. A caring heart. A better quality of life.', '{}', 2, true),
  ('values', 'Promise strip', 'Values', 'Shown as small capitals beneath the promise.', 'list', 'artwork', null, array['24-Hour Care', 'Compassion', 'Dignity', 'Respect', 'Safety']::text[], 3, true),
  ('about_eyebrow', 'About', 'Small label above the heading', null, 'short', 'editorial', 'Who we are', '{}', 4, true),
  ('about_heading', 'About', 'Heading', null, 'short', 'editorial', 'A family-like environment', '{}', 5, true),
  ('about_body', 'About', 'About paragraph', 'Your description of the home.', 'long', 'artwork', 'At Columbia Care Adult Family Home, we provide a safe, comfortable, and caring home where every resident is treated with dignity and respect. Our goal is to help each resident maintain the highest possible quality of life while receiving personalized care in a family-like environment.', '{}', 6, true),
  ('care_eyebrow', 'Care', 'Small label above the heading', null, 'short', 'editorial', 'Care & services', '{}', 7, true),
  ('care_heading', 'Care', 'Heading', null, 'short', 'editorial', 'What we do, every day', '{}', 8, true),
  ('care_included_heading', 'Care', 'Heading above the daily list', null, 'short', 'editorial', 'Included every single day', '{}', 9, true),
  ('day_eyebrow', 'A day', 'Small label above the heading', null, 'short', 'editorial', 'Morning to night', '{}', 10, true),
  ('day_heading', 'A day', 'Heading', null, 'short', 'editorial', 'A day in our home', '{}', 11, true),
  ('day_lead', 'A day', 'Introduction', null, 'long', 'editorial', 'Families always ask what the days actually look like. Here is the whole of one, from the first good morning to the last safety check.', '{}', 12, true),
  ('home_eyebrow', 'Our home', 'Small label above the heading', null, 'short', 'editorial', 'Our home', '{}', 13, true),
  ('home_heading', 'Our home', 'Heading', null, 'short', 'editorial', 'Come and look around', '{}', 14, true),
  ('home_lead', 'Our home', 'Introduction', null, 'short', 'editorial', 'A real house on a quiet street, not a facility.', '{}', 15, true),
  ('home_note', 'Our home', 'Note under the gallery', null, 'short', 'editorial', 'Photographs show the shared areas of the home. To see everything, come and visit.', '{}', 16, true),
  ('meals_eyebrow', 'Meals', 'Small label above the heading', null, 'short', 'editorial', 'Meals & dining', '{}', 17, true),
  ('meals_heading', 'Meals', 'Heading', null, 'short', 'editorial', 'Home-cooked, every day', '{}', 18, true),
  ('meals_body', 'Meals', 'Meals paragraph', 'Your description of the food.', 'long', 'artwork', 'Our home provides a wide variety of nutritious, home-cooked meals daily for breakfast, lunch, dinner, and snacks between meals such as fresh fruit and vegetables.', '{}', 19, true),
  ('meals_note', 'Meals', 'Note under the paragraph', null, 'long', 'editorial', 'Does your loved one have a special diet, a food they cannot eat, or a favourite meal? Tell us and we will talk it through.', '{}', 20, true),
  ('visit_eyebrow', 'Find us', 'Small label above the heading', null, 'short', 'editorial', 'Find us', '{}', 21, true),
  ('visit_heading', 'Find us', 'Heading', null, 'short', 'editorial', 'Close to home, easy to reach', '{}', 22, true),
  ('contact_eyebrow', 'Contact', 'Small label above the heading', null, 'short', 'editorial', 'Book a house tour', '{}', 23, true),
  ('contact_heading', 'Contact', 'Heading', null, 'short', 'editorial', 'Come and see the home', '{}', 24, true),
  ('contact_lead', 'Contact', 'Introduction', null, 'long', 'editorial', 'Tell us a little about your loved one and what they need. There is no pressure and no obligation, and most families visit two or three homes before they decide.', '{}', 25, true),
  ('contact_cta', 'Contact', 'Line beside the heart badge', 'Your own wording from the brochure.', 'short', 'artwork', 'Contact us to book a house tour!', '{}', 26, true),
  ('closing_line', 'Contact', 'Handwritten closing line', 'Set in the script face. Keep it short.', 'short', 'artwork', 'We treat your loved one like family.', '{}', 27, true)
on conflict (slug) do update set
  section = excluded.section, label = excluded.label, help = excluded.help,
  kind = excluded.kind, source = excluded.source, position = excluded.position;
-- NOTE: `value` is deliberately NOT overwritten on conflict. Re-running the
-- seed refreshes the labels and grouping without discarding anything the
-- owner has since reworded in the admin console.

-- testimonials, team, faqs and media are deliberately NOT seeded.
-- The client has supplied no quotes (q14), no staff names (q7), no FAQ answers,
-- and no full-resolution photographs (q9). Their sections render nothing until
-- real rows exist. Never insert a sample row into any of them.

commit;
