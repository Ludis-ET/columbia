import { createClient } from "@/lib/db/server";
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

  return (
    <>
      <PageHeader
        title="Enquiries"
        lead="Every message from the website, in one place. Nothing here is visible to the public."
        count={`${inquiries.length} total`}
      />

      {inquiries.length === 0 ? (
        <EmptyState title="No enquiries yet">
          <p>
            When someone asks for a house tour or sends a message, it appears here, and you get an
            email straight away.
          </p>
          <p className="mt-2">
            The tour request form goes live in the next phase of the build. Until then the website
            offers your phone number and email address only.
          </p>
        </EmptyState>
      ) : (
        <InquiryList inquiries={inquiries} />
      )}
    </>
  );
}
