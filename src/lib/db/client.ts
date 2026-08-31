import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients.
 *
 * The publishable key is safe in the browser: it grants exactly what row-level
 * security allows, and every table is deny-by-default with a public-read policy
 * limited to published rows. Inquiries are insert-only for the public.
 *
 * There is deliberately no service-role client here. Admin writes go through
 * server actions with a signed-in user's session (Phase 5), so the elevated key
 * never reaches the bundle.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when the project is configured. Lets the build run without env vars. */
export const isSupabaseConfigured = Boolean(url && key);

let cached: SupabaseClient | null = null;

/**
 * Returns a read-only client, or null when Supabase is not configured.
 *
 * Callers must handle null, see the fallback in ./queries.ts. That is what
 * keeps the static site building when the database is unreachable.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "columbia-care-site" } },
  });

  return cached;
}
