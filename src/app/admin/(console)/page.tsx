import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, ImageIcon, Settings } from "lucide-react";
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

function auditLabel(action: string, entity: string): string {
  const entityLabel: Record<string, string> = {
    availability: "availability",
    site_settings: "settings",
    media: "a photo",
    services: "a service",
    schedule_items: "the schedule",
    announcements: "an announcement",
    opening_hours: "opening hours",
    inquiries: "an enquiry",
  };
  const actionLabel: Record<string, string> = {
    update: "Updated",
    publish: "Published",
    unpublish: "Hid",
    create: "Added",
    delete: "Deleted",
  };
  return `${actionLabel[action] ?? action} ${entityLabel[entity] ?? entity}`;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const profile = await getAdminProfile();

  const [availability, newCount, monthCount, pipeline, photoStats, settingsRow, recentActivity] =
    await Promise.all([
      supabase?.from("availability").select("*").eq("id", "singleton").maybeSingle(),
      supabase?.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      supabase
        ?.from("inquiries")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
      supabase?.from("inquiries").select("status"),
      supabase?.from("media").select("id, published"),
      supabase?.from("site_settings").select("*").eq("id", "singleton").maybeSingle(),
      supabase
        ?.from("audit_log")
        .select("id, action, entity, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const statuses = (pipeline?.data ?? []) as { status: string }[];
  const counts = statuses.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const avail = availability?.data as
    { status: AvailabilityStatus; note: string | null; updated_at: string } | null | undefined;

  // Photo stats
  const photos = (photoStats?.data ?? []) as { id: string; published: boolean }[];
  const livePhotos = photos.filter((p) => p.published).length;

  // Settings completeness
  const s = settingsRow?.data as Record<string, unknown> | null;
  const settingsFields = [
    { key: "phone", label: "Phone number" },
    { key: "email", label: "Email address" },
    { key: "street_address", label: "Street address" },
    { key: "license_number", label: "Licence number" },
  ];
  const missing = settingsFields.filter((f) => !s?.[f.key]);
  const settingsComplete = missing.length === 0;
  const completeness = Math.round(
    ((settingsFields.length - missing.length) / settingsFields.length) * 100,
  );

  const activity = (recentActivity?.data ?? []) as {
    id: string;
    action: string;
    entity: string;
    created_at: string;
  }[];

  const PIPELINE: { key: string; label: string; tone?: "new" | "ok" }[] = [
    { key: "new", label: "New", tone: "new" },
    { key: "contacted", label: "Contacted" },
    { key: "toured", label: "Toured" },
    { key: "moved_in", label: "Moved in", tone: "ok" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <>
      <header className="border-rule mb-8 border-b pb-6">
        <p className="label text-sage-deep mb-2">Dashboard</p>
        <h1 className="text-h1">
          {greeting()}
          {profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-stone mt-2">
          {newCount?.count
            ? `${newCount.count} ${newCount.count === 1 ? "enquiry needs" : "enquiries need"} a reply.`
            : "Nothing needs your attention right now."}
        </p>
      </header>

      {/* Settings completeness nudge */}
      {!settingsComplete ? (
        <section className="mb-8" aria-labelledby="completeness-heading">
          <div className="border-rule bg-paper-raise rounded-lg border p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-5 shrink-0 text-[var(--warn)]" aria-hidden="true" />
                <h2 id="completeness-heading" className="font-semibold">
                  Finish setting up your contact info
                </h2>
              </div>
              <span className="label text-stone text-[0.75rem]">{completeness}% complete</span>
            </div>

            {/* Progress bar */}
            <div className="bg-paper mb-3 h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-sage h-full rounded-full transition-all"
                style={{ width: `${completeness}%` }}
              />
            </div>

            <p className="text-stone mb-3 text-[0.875rem]">
              Still missing: {missing.map((f) => f.label).join(", ")}.
            </p>
            <Link
              href="/admin/settings"
              className="text-sage-deep inline-flex items-center gap-1.5 text-[0.875rem] font-semibold underline"
            >
              Open settings
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="mb-8">
          <div className="border-rule bg-sage-wash/50 flex items-center gap-3 rounded-lg border px-4 py-3">
            <CheckCircle2 className="text-sage-deep size-5 shrink-0" aria-hidden="true" />
            <p className="text-sage-deep text-[0.9375rem] font-semibold">
              All contact info is filled in.
            </p>
            <Link
              href="/admin/settings"
              className="text-stone hover:text-ink ml-auto text-[0.875rem] underline"
            >
              <Settings className="size-4" aria-hidden="true" />
              <span className="sr-only">Settings</span>
            </Link>
          </div>
        </section>
      )}

      {/* Quick links */}
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
              <span className="group-hover:text-sage-deep block font-semibold">
                Photos & gallery
              </span>
              <span className="text-stone text-[0.875rem]">
                {livePhotos} photo{livePhotos !== 1 ? "s" : ""} live · {photos.length} in library
              </span>
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
              <span className="group-hover:text-sage-deep block font-semibold">Enquiries</span>
              <span className="text-stone text-[0.875rem]">Families waiting to hear back</span>
            </span>
          </Link>
        </div>
      </section>

      {/* Availability */}
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

      {/* Stats */}
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

      {/* Pipeline */}
      <section className="mb-10" aria-labelledby="pipeline-heading">
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

      {/* Recent activity */}
      {activity.length > 0 ? (
        <section aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="label text-stone mb-3">
            Recent activity
          </h2>
          <AdminCard className="divide-rule divide-y p-0">
            {activity.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-[0.9375rem]">{auditLabel(entry.action, entry.entity)}</p>
                <p className="text-stone shrink-0 text-[0.8125rem]">
                  {sinceLabel(entry.created_at)}
                </p>
              </div>
            ))}
          </AdminCard>
        </section>
      ) : null}
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
