-- ============================================================================
-- Columbia Care — ONE-PASTE SETUP
--
-- Paste this whole file into the Supabase SQL Editor and run it:
--   https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new
--
-- Safe to re-run. Schema uses IF NOT EXISTS, seed uses ON CONFLICT.
-- GENERATED FILE — regenerate with: pnpm seed:generate && pnpm db:bundle
-- ============================================================================

-- ============================================================================
-- Columbia Care — schema
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

-- is_admin() is defined below, after profiles exists — see the note there.

-- ---------------------------------------------------------------------------
-- profiles — admin identity
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
-- site_settings — the NAP singleton
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
-- availability — the highest-converting element on the site
-- ---------------------------------------------------------------------------

create table if not exists availability (
  id          singleton_id primary key default 'singleton',
  status      availability_status not null default 'unset',
  note        text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references profiles(id) on delete set null
);

-- ---------------------------------------------------------------------------
-- announcements — site-wide banner
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
-- media — one library, alt text REQUIRED at the database layer
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
-- care_types — the three brochure chips
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
-- schedule_items — the 13 day-timeline entries
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
-- every_day — the "Every Day at Columbia Care" list
-- ---------------------------------------------------------------------------

create table if not exists every_day (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  icon      text not null,
  position  integer not null default 0,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- why_families — the four brochure bullets
-- ---------------------------------------------------------------------------

create table if not exists why_families (
  id        uuid primary key default gen_random_uuid(),
  text      text not null,
  position  integer not null default 0,
  published boolean not null default false
);

-- ---------------------------------------------------------------------------
-- testimonials — consent required before publishing
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
-- inquiries — every lead, one pipeline. NEVER publicly readable.
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
-- insert-only for the public and readable only by admins — families' phone
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
-- Columbia Care — storage buckets
--
--   media/     photographs. Public read, admin write.
--              Sub-paths: gallery/ team/ services/ og/
--   documents/ the DSHS Disclosure of Services, the family info packet.
--
-- 8MB cap. Supabase's transform endpoint re-encodes to WebP/AVIF on the fly,
-- and next/image serves from there — nothing is stored pre-resized.
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
-- Columbia Care — seed data
--
-- GENERATED FILE. Do not edit by hand.
--   source: content/source-of-truth.json
--   regenerate: pnpm seed:generate
--
-- Only entries whose provenance is ARTWORK or ARTWORK_CONFIRMED appear here.
-- Anything still ASK_CLIENT is seeded as NULL or omitted entirely, so the site
-- renders nothing for it — see the rule in CLAUDE.md.
-- ============================================================================

begin;

-- site_settings: one row. Unconfirmed fields stay NULL and render nothing.
insert into site_settings (
  id, phone, phone_display, sms, fax, email,
  street_address, address_locality, address_region, postal_code, address_country,
  latitude, longitude, license_number, licensed_capacity, hours, location_line, service_area
) values (
  'singleton',
  null,   -- ASK_CLIENT q1 — no number published yet
  null,
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
  fax = excluded.fax, email = excluded.email,
  street_address = excluded.street_address, address_locality = excluded.address_locality,
  address_region = excluded.address_region, postal_code = excluded.postal_code,
  hours = excluded.hours, location_line = excluded.location_line,
  service_area = excluded.service_area;

-- availability: starts unset, so the badge renders nothing until the client sets it.
insert into availability (id, status) values ('singleton', 'unset')
on conflict (id) do nothing;

-- care_types: the three brochure chips, verbatim.
insert into care_types (slug, title, short_title, icon, position, published) values
  ('long-term-care', 'Long term care', 'Long term care', 'house', 0, true),
  ('memory-care', 'Memory care', 'Memory care', 'heart', 1, true),
  ('personal-care', 'Personal care, assistance and more', 'Personal care', 'people', 2, true)
on conflict (slug) do update set
  title = excluded.title, short_title = excluded.short_title,
  icon = excluded.icon, position = excluded.position, published = excluded.published;

-- services: the seven verbatim services plus the long-term-care chip.
-- `summary` is NULL — the client has not written descriptions (see q4).
insert into services (slug, title, summary, icon, position, has_detail_page, related_schedule, published) values
  ('long-term-care', 'Long term care', null, 'house', 0, true, array[1, 3, 12, 13]::integer[], true),
  ('24-hour-care', '24-hour compassionate care and supervision', null, 'shield', 1, false, array[1, 12, 13]::integer[], true),
  ('personal-care', 'Assistance with activities of daily living (ADLs)', null, 'people', 2, true, array[1, 11]::integer[], true),
  ('medication-management', 'Medication management', null, 'capsule', 3, true, array[2]::integer[], true),
  ('meals', 'Fresh and nutritious meals', null, 'bowl', 4, false, array[2, 5, 8, 9]::integer[], true),
  ('housekeeping-laundry', 'Housekeeping and laundry', null, 'house', 5, false, '{}', true),
  ('transportation', 'Transportation for appointments', null, 'car', 6, false, array[3]::integer[], true),
  ('memory-care', 'Dementia and Alzheimer''s care', null, 'heart', 7, true, '{}', true)
on conflict (slug) do update set
  title = excluded.title, icon = excluded.icon, position = excluded.position,
  has_detail_page = excluded.has_detail_page,
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

-- testimonials, team, faqs and media are deliberately NOT seeded.
-- The client has supplied no quotes (q14), no staff names (q7), no FAQ answers,
-- and no full-resolution photographs (q9). Their sections render nothing until
-- real rows exist. Never insert a sample row into any of them.

commit;
