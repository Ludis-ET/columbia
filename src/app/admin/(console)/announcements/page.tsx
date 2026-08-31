import { redirect } from "next/navigation";
import { createClient, getAdminProfile } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { AnnouncementManager } from "@/components/admin/announcement-manager";

export const metadata = { title: "Announcements" };

interface AnnouncementRow {
  id: string;
  message: string;
  cta_text: string | null;
  cta_href: string | null;
  active: boolean;
  created_at: string;
}

export default async function AnnouncementsPage() {
  const profile = await getAdminProfile();
  if (profile?.role !== "owner") redirect("/admin");

  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("announcements")
    .select("*")
    .order("created_at", { ascending: false })) ?? { data: [] };

  const announcements = (data ?? []) as AnnouncementRow[];

  return (
    <>
      <PageHeader
        title="Announcements"
        lead="A banner shown at the top of every page of the website. Use it for temporary notices like holiday hours, a temporary closure, or 'now accepting new residents'."
      />
      <AnnouncementManager announcements={announcements} />
    </>
  );
}
