import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client, bound to the signed-in admin's session cookies.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO SERVICE-ROLE CLIENT ANYWHERE IN THIS CODEBASE, ON PURPOSE.
 *
 * Admin writes run as the logged-in user, so the RLS policies written in
 * migration 0001 are what actually authorise them — `is_admin()` checks
 * auth.uid() against `profiles`. That means:
 *
 *   - A bug in admin code cannot escalate past what that user may do.
 *   - The elevated key never exists in the repo, the bundle or the env file.
 *   - The policies are exercised on every request, so they cannot silently rot.
 *
 * A service-role key bypasses RLS entirely. If a future task seems to need one,
 * the right fix is almost always a better policy or a security-definer function.
 * ---------------------------------------------------------------------------
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function createClient(): Promise<SupabaseClient | null> {
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Middleware refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
}

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: "owner" | "editor";
}

/**
 * The signed-in admin, or null.
 *
 * Reads `profiles` rather than trusting the session alone: having a Supabase
 * account is not the same as being an admin of this site. Someone could sign up
 * through the auth API and still have no profile row — and so no access.
 */
export async function getAdminProfile(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    email: data.email as string,
    fullName: (data.full_name as string | null) ?? null,
    role: data.role as "owner" | "editor",
  };
}

/** Writes an entry to the audit log. Never throws — logging must not block a save. */
export async function recordAudit(
  action: string,
  entity: string,
  entityId?: string | null,
  diff?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = await createClient();
    const profile = await getAdminProfile();
    if (!supabase || !profile) return;

    await supabase.from("audit_log").insert({
      actor_id: profile.id,
      action,
      entity,
      entity_id: entityId ?? null,
      diff: diff ?? null,
    });
  } catch (error) {
    console.warn("[audit] failed to record", action, entity, error);
  }
}
