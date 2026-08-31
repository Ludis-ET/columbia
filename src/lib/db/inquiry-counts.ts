import type { SupabaseClient } from "@supabase/supabase-js";
import type { InquiryStatus } from "@/lib/db/database.types";

export interface InquiryCounts {
  total: number;
  new: number;
  last30Days: number;
  byStatus: Record<InquiryStatus, number>;
}

const EMPTY_BY_STATUS: Record<InquiryStatus, number> = {
  new: 0,
  contacted: 0,
  toured: 0,
  moved_in: 0,
  closed: 0,
};

/** Live enquiry counts for admin chrome and dashboard. */
export async function getInquiryCounts(
  supabase: SupabaseClient | null,
): Promise<InquiryCounts> {
  if (!supabase) {
    return { total: 0, new: 0, last30Days: 0, byStatus: { ...EMPTY_BY_STATUS } };
  }

  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [totalRes, newRes, monthRes, pipelineRes] = await Promise.all([
    supabase.from("inquiries").select("id", { count: "exact", head: true }),
    supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo),
    supabase.from("inquiries").select("status"),
  ]);

  const byStatus = { ...EMPTY_BY_STATUS };
  for (const row of pipelineRes.data ?? []) {
    const status = row.status as InquiryStatus;
    if (status in byStatus) byStatus[status]++;
  }

  return {
    total: totalRes.count ?? 0,
    new: newRes.count ?? 0,
    last30Days: monthRes.count ?? 0,
    byStatus,
  };
}

export function inquiryCountLabel(count: number, kind: "total" | "new" | "need-reply" = "total"): string {
  const word = count === 1 ? "enquiry" : "enquiries";
  if (kind === "new") return `${count} new ${word}`;
  if (kind === "need-reply") return `${count} ${word} need${count === 1 ? "s" : ""} a reply`;
  return `${count} ${word}`;
}
