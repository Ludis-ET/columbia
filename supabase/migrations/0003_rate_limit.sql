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
