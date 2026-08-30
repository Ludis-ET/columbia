import Link from "next/link";
import { CalendarHeart, MessageSquare, Phone } from "lucide-react";

/**
 * Sticky bottom action bar, small screens only.
 *
 * Call and Text appear only when the client has confirmed a number — see the
 * rule in CLAUDE.md. "Book a house tour" always works, so the bar is never
 * empty and never shows a placeholder number.
 */
export function MobileCallBar({
  phone,
  phoneHref,
  sms,
}: {
  phone: string | null;
  phoneHref: string | null;
  sms: string | null;
}) {
  const canCall = Boolean(phone && phoneHref);
  const smsHref = sms ? `sms:${sms.replace(/\D/g, "")}` : null;

  return (
    <>
      {/* Keeps the bar from covering the end of the page. */}
      <div aria-hidden="true" className="h-16 sm:hidden" />

      <div className="border-rule bg-paper/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
          {canCall ? (
            <a
              href={phoneHref!}
              className="text-ink flex min-h-16 flex-col items-center justify-center gap-1 font-semibold"
            >
              <Phone className="size-5" aria-hidden="true" strokeWidth={2} />
              <span className="text-[0.8125rem]">Call</span>
            </a>
          ) : null}

          {smsHref ? (
            <a
              href={smsHref}
              className="text-ink border-rule flex min-h-16 flex-col items-center justify-center gap-1 border-l font-semibold"
            >
              <MessageSquare className="size-5" aria-hidden="true" strokeWidth={2} />
              <span className="text-[0.8125rem]">Text</span>
            </a>
          ) : null}

          <Link
            href="/contact"
            className="bg-ink text-paper flex min-h-16 flex-col items-center justify-center gap-1 font-semibold"
          >
            <CalendarHeart className="size-5" aria-hidden="true" strokeWidth={2} />
            <span className="text-[0.8125rem]">Book a tour</span>
          </Link>
        </div>
      </div>
    </>
  );
}
