-- ============================================================================
-- RUN THIS in the Supabase SQL Editor if the project is already applied:
--   https://supabase.com/dashboard/project/wmxvickqaxkuaatftput/sql/new
--
-- Adds care-type summaries, unpublishes the duplicate Long term care service,
-- and fills the seven remaining service cards from the artwork.
-- Safe to re-run.
-- ============================================================================

alter table care_types
  add column if not exists summary text;

update care_types
set summary = 'A safe, comfortable, and caring home where every resident is treated with dignity and respect, receiving personalized care in a family-like environment.'
where slug = 'long-term-care';

update care_types
set summary = 'Dementia and Alzheimer''s care is part of the care we provide.'
where slug = 'memory-care';

update care_types
set summary = 'Staff assist with toileting, bathing, dressing, grooming, and other activities of daily living (ADLs).'
where slug = 'personal-care';

update services
set published = false,
    summary = 'A safe, comfortable, and caring home where every resident is treated with dignity and respect, receiving personalized care in a family-like environment.'
where slug = 'long-term-care';

update services
set summary = 'Caregivers remain available throughout the night. Residents receive assistance when needed, according to their individual care plans.'
where slug = '24-hour-care';

update services
set summary = 'Staff assist with toileting, bathing, dressing, grooming, and other activities of daily living (ADLs).'
where slug = 'personal-care';

update services
set summary = 'Medications are administered according to each resident''s orders and medication schedule. Staff document care and medication administration.'
where slug = 'medication-management';

update services
set summary = 'Our home provides a wide variety of nutritious, home-cooked meals daily for breakfast, lunch, dinner, and snacks between meals such as fresh fruit and vegetables.'
where slug = 'meals';

update services
set summary = 'The home is kept clean, safe, and comfortable. Housekeeping and laundry are part of what we provide.'
where slug = 'housekeeping-laundry';

update services
set summary = 'Staff help residents with appointments and other scheduled activities.'
where slug = 'transportation';

update services
set summary = 'Dementia and Alzheimer''s care is part of the care we provide.'
where slug = 'memory-care';
