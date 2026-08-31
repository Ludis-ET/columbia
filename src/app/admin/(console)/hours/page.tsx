import { redirect } from "next/navigation";
import { createClient, getAdminProfile } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/cards";
import { OpeningHoursForm } from "@/components/admin/opening-hours-form";

export const metadata = { title: "Opening hours" };

interface HoursRow {
  day_of_week: number;
  day_name: string;
  opens: string | null;
  closes: string | null;
  closed: boolean;
  note: string | null;
}

export default async function HoursPage() {
  const profile = await getAdminProfile();
  if (profile?.role !== "owner") redirect("/admin");

  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("opening_hours")
    .select("*")
    .order("day_of_week", { ascending: true })) ?? { data: [] };

  const hours = (data ?? []) as HoursRow[];

  return (
    <>
      <PageHeader
        title="Opening hours"
        lead="Set your hours for each day of the week. These appear on the Contact section of the website."
      />
      <OpeningHoursForm hours={hours} />
    </>
  );
}
