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
