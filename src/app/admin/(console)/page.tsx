import Link from "next/link";
import { ArrowRight, ImageIcon } from "lucide-react";
import { createClient, getAdminProfile } from "@/lib/db/server";
import { AvailabilityForm } from "@/components/admin/availability-form";
import { AdminCard } from "@/components/admin/cards";
import type { AvailabilityStatus } from "@/lib/db/database.types";

export const metadata = { title: "Dashboard" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function sinceLabel(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const profile = await getAdminProfile();

  const [availability, newCount, monthCount, pipeline, lastSeen] = await Promise.all([
    supabase?.from("availability").select("*").eq("id", "singleton").maybeSingle(),
    supabase?.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      ?.from("inquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
    supabase?.from("inquiries").select("status"),
    Promise.resolve(profile?.id ?? null),
  ]);

  const statuses = (pipeline?.data ?? []) as { status: string }[];
  const counts = statuses.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const avail = availability?.data as
    { status: AvailabilityStatus; note: string | null; updated_at: string } | null | undefined;

  void lastSeen;

  const PIPELINE: { key: string; label: string; tone?: "new" | "ok" }[] = [
    { key: "new", label: "New", tone: "new" },
    { key: "contacted", label: "Contacted" },
    { key: "toured", label: "Toured" },
    { key: "moved_in", label: "Moved in", tone: "ok" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <>
      <header className="mb-8 border-b border-rule pb-6">
        <p className="label text-sage-deep mb-2">Dashboard</p>
        <h1 className="text-h1">{greeting()}</h1>
        <p className="text-stone mt-2">
          {newCount?.count
            ? `${newCount.count} ${newCount.count === 1 ? "enquiry needs" : "enquiries need"} a reply.`
            : "Nothing needs your attention right now."}
        </p>
      </header>

      {/* Availability first: the thing the owner changes most, editable here
          rather than one click away. */}
      <section className="mb-10" aria-labelledby="quick-heading">
        <h2 id="quick-heading" className="label text-stone mb-3">
          Quick links
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/admin/photos"
            className="border-rule bg-paper-raise hover:border-sage group flex min-h-16 items-center gap-3 rounded-lg border p-4 transition-colors"
          >
            <span className="bg-sage-wash text-sage-deep flex size-11 items-center justify-center rounded-md">
              <ImageIcon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold group-hover:text-sage-deep">Photos & gallery</span>
              <span className="text-stone text-[0.875rem]">Hero, meals, and home tour pictures</span>
            </span>
          </Link>
          <Link
            href="/admin/inquiries"
            className="border-rule bg-paper-raise hover:border-sage group flex min-h-16 items-center gap-3 rounded-lg border p-4 transition-colors"
          >
            <span className="bg-sage-wash text-sage-deep flex size-11 items-center justify-center rounded-md font-bold tabular-nums">
              {newCount?.count ?? 0}
            </span>
            <span>
              <span className="block font-semibold group-hover:text-sage-deep">Enquiries</span>
              <span className="text-stone text-[0.875rem]">Families waiting to hear back</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="mb-10" aria-labelledby="availability-heading">
        <h2 id="availability-heading" className="label text-stone mb-3">
          Availability
        </h2>
        <AvailabilityForm
          status={avail?.status ?? "unset"}
          note={avail?.note ?? ""}
          updatedAt={avail?.updated_at ?? null}
        />
      </section>

      <section className="mb-10" aria-labelledby="numbers-heading">
        <h2 id="numbers-heading" className="label text-stone mb-3">
          Last 30 days
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="New enquiries" value={newCount?.count ?? 0} detail="Waiting for a reply" />
          <Stat
            label="Enquiries received"
            value={monthCount?.count ?? 0}
            detail="In the last month"
          />
          <Stat
            label="Availability updated"
            value={sinceLabel(avail?.updated_at ?? null) || "-"}
            detail="Shown on the website"
            small
          />
        </div>
      </section>

      <section aria-labelledby="pipeline-heading">
        <h2 id="pipeline-heading" className="label text-stone mb-3">
          Enquiry pipeline
        </h2>
        <div className="flex flex-wrap gap-2">
          {PIPELINE.map(({ key, label, tone }) => (
            <span
              key={key}
              className={
                "border-rule inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.9375rem] " +
                (tone === "new" && counts[key]
                  ? "border-[var(--danger)] font-semibold text-[var(--danger)]"
                  : tone === "ok"
                    ? "border-sage text-sage-deep"
                    : "text-stone")
              }
            >
              {label}
              <span className="tabular-nums">{counts[key] ?? 0}</span>
            </span>
          ))}
        </div>

        <Link
          href="/admin/inquiries"
          className="text-sage-deep mt-5 inline-flex min-h-11 items-center gap-2 font-semibold"
        >
          Open the enquiry inbox
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  detail,
  small,
}: {
  label: string;
  value: number | string;
  detail: string;
  small?: boolean;
}) {
  return (
    <AdminCard className="p-4">
      <p className="label text-stone">{label}</p>
      <p className={small ? "mt-1 text-lg font-bold" : "mt-1 text-3xl font-bold tabular-nums"}>
        {value}
      </p>
      <p className="text-stone text-[0.875rem]">{detail}</p>
    </AdminCard>
  );
}
