-- Migration 0004: Admin refinement additions (idempotent / safe to re-run)
-- Adds: inquiries.starred, announcements table, opening_hours table

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

-- Drop any policies first (policies must go before the table drop)
DROP POLICY IF EXISTS "admins can manage announcements"   ON announcements;
DROP POLICY IF EXISTS "public can read active announcements" ON announcements;

-- Drop the table if it exists in an incomplete state
DROP TABLE IF EXISTS announcements;

CREATE TABLE announcements (
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

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

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
--    Same defensive approach.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "admins can manage opening_hours" ON opening_hours;
DROP POLICY IF EXISTS "public can read opening_hours"   ON opening_hours;

DROP TABLE IF EXISTS opening_hours;

CREATE TABLE opening_hours (
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
