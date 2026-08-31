-- ============================================================================
-- RUN THIS ONE FILE in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new
--
-- Creates the site_copy table. It is what makes the tagline, the promise, the
-- about and meals paragraphs, the values and every section heading editable
-- from the admin console instead of compiled into the build.
--
-- Safe to re-run. The seed rows are loaded separately with `pnpm db:seed:copy`,
-- which never overwrites wording the owner has already changed.
-- ============================================================================
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
