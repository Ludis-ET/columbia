import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { createClient, getAdminProfile } from "@/lib/db/server";
import { getInquiryCounts } from "@/lib/db/inquiry-counts";

/**
 * The authenticated console.
 *
 * Everything in this route group requires an admin. /admin/login sits OUTSIDE
 * the group, so the redirect below can never target a page this layout wraps.
 */
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAdminProfile();

  // Middleware already bounces signed-out visitors. This catches the other
  // case: a valid Supabase account with no `profiles` row, someone who signed
  // up but was never made an admin of this site.
  if (!profile) {
    redirect("/admin/login?message=That account does not have admin access.");
  }

  const supabase = await createClient();
  const inquiryCounts = await getInquiryCounts(supabase);

  return (
    <AdminShell
      role={profile.role}
      email={profile.email}
      inquiryCounts={inquiryCounts}
    >
      {children}
    </AdminShell>
  );
}
