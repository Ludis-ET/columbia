-- Short descriptions on the three care-type cards.
-- Services already have `summary`; this matches that shape.

alter table care_types
  add column if not exists summary text;
