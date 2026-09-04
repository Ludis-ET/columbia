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
