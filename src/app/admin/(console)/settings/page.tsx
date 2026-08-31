import { redirect } from "next/navigation";
import { createClient, getAdminProfile } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { SettingsForm } from "@/components/admin/settings-form";
import type { SiteSettingsRow } from "@/lib/db/database.types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getAdminProfile();
  // Owner-only. The nav hides it for editors; this stops a typed URL too.
  if (profile?.role !== "owner") redirect("/admin");

  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("site_settings")
    .select("*")
    .eq("id", "singleton")
    .maybeSingle()) ?? { data: null };

  return (
    <>
      <PageHeader
        title="Settings"
        lead="Your contact details and licence information. Changing something here updates every page of the website at once."
      />
      <SettingsForm settings={data as SiteSettingsRow | null} />
    </>
  );
}
