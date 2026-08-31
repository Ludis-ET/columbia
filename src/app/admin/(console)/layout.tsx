import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { createClient, getAdminProfile } from "@/lib/db/server";

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
  const { count } = (await supabase
    ?.from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")) ?? { count: 0 };

  return (
    <AdminShell role={profile.role} email={profile.email} newInquiries={count ?? 0}>
      {children}
    </AdminShell>
  );
}
