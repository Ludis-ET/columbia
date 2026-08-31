import { createClient } from "@/lib/db/server";
import { getInquiryCounts, inquiryCountLabel } from "@/lib/db/inquiry-counts";
import { PageHeader } from "@/components/admin/cards";
import { EmptyState } from "@/components/admin/ui";
import { InquiryList } from "@/components/admin/inquiry-list";
import type { InquiryRow } from "@/lib/db/database.types";

export const metadata = { title: "Enquiries" };

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data } = (await supabase
    ?.from("inquiries")
    .select("*")
    .order("created_at", { ascending: false })) ?? { data: [] };

  const inquiries = (data ?? []) as InquiryRow[];
  const counts = await getInquiryCounts(supabase);

  return (
    <>
      <PageHeader
        title="Enquiries"
        lead="Messages from families who used the Book a house tour form on your website. Only you can see them here."
        count={
          counts.total === 0
            ? "Empty inbox"
            : counts.new > 0
              ? inquiryCountLabel(counts.new, "need-reply")
              : inquiryCountLabel(counts.total)
        }
      />

      {inquiries.length === 0 ? (
        <EmptyState title="No enquiries yet">
          <p>
            When someone fills in the <strong className="font-semibold">Book a house tour</strong> form
            on your homepage, their message lands here and you get an email straight away.
          </p>
          <p className="mt-2">
            The form lives in the Contact section at the bottom of your homepage. You can{" "}
            <a href="/#contact" className="text-sage-deep font-semibold underline">
              open it on your website
            </a>{" "}
            to see what families fill in.
          </p>
        </EmptyState>
      ) : (
        <InquiryList inquiries={inquiries} />
      )}
    </>
  );
}
