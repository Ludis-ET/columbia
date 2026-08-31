-- Paste into Supabase SQL Editor if media.placements is missing.
-- Safe to re-run.

alter table media
  add column if not exists placements text[] not null default '{}';

update media
set placements = array[category]::text[]
where category is not null
  and cardinality(placements) = 0;

create index if not exists media_placements_gin_idx on media using gin (placements);
