import { createClient } from "@/lib/db/server";
import { PageHeader } from "@/components/admin/ui";
import { AvailabilityForm } from "@/components/admin/availability-form";
import type { AvailabilityStatus } from "@/lib/db/database.types";

export const metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("availability")
    .select("*")
    .eq("id", "singleton")
    .maybeSingle()) ?? { data: null };

  const row = data as {
    status: AvailabilityStatus;
    note: string | null;
    updated_at: string;
  } | null;

  return (
    <>
      <PageHeader
        title="Availability"
        lead="Whether you have room. This is the single most useful thing on the website for families and placement agents, and almost no adult family home publishes it."
      />
      <AvailabilityForm
        status={row?.status ?? "unset"}
        note={row?.note ?? ""}
        updatedAt={row?.updated_at ?? null}
      />
    </>
  );
}
