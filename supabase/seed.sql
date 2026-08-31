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
