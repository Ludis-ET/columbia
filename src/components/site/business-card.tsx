import type { ReactNode } from "react";
import { Download, Mail, MapPin, Phone, Printer, UserPlus } from "lucide-react";
import { Monogram } from "@/components/brand/monogram";
import { Wave } from "@/components/brand/wave";
import { MotionLift } from "@/components/motion/lift";
import { buttonVariants } from "@/components/ui/button";

const PDF_HREF = "/columbia-care-afh-everett.pdf";
const VCF_HREF = "/columbia-care-afh-everett.vcf";

/**
 * A printed-size business card in the contact column.
 *
 * Two panels, sampled from the infographic: ink + monogram on the left, the
 * confirmed contact details on the right. Save and download sit under the
 * card so tap targets stay at 48px without stretching the face.
 *
 * There is no owner name on the card: none is confirmed, and inventing one
 * would be a promise we cannot keep.
 */
export function BusinessCard({
  phone,
  phoneHref,
  email,
  fax,
  addressLine,
}: {
  phone: string | null;
  phoneHref: string | null;
  email: string | null;
  fax: string | null;
  addressLine: string | null;
}) {
  const hasFace = Boolean(phone || email || fax || addressLine);
  if (!hasFace) return null;

  const { street, locality } = splitAddress(addressLine);

  return (
    <div className="mb-8">
      <MotionLift className="group max-w-lg">
        <article
          aria-label="Columbia Care business card"
          className="border-ink/10 relative overflow-hidden rounded border shadow-[0_18px_40px_-16px_rgb(16_37_74/0.45),0_2px_8px_rgb(16_37_74/0.08)] transition-shadow duration-[320ms] group-hover:shadow-[0_26px_50px_-18px_rgb(16_37_74/0.52),0_4px_12px_rgb(16_37_74/0.1)]"
        >
          <div className="grid sm:grid-cols-[12.5rem_minmax(0,1fr)]">
            <div className="bg-ink text-paper relative flex min-h-52 flex-col items-center justify-center gap-4 px-6 pt-8 pb-12 sm:min-h-0 sm:py-10 sm:pb-14">
              <span className="bg-paper-raise relative z-10 inline-flex size-16 items-center justify-center rounded shadow-[inset_0_0_0_1px_rgb(16_37_74/0.08)]">
                <Monogram className="size-12" decorative />
              </span>
              <span className="relative z-10 text-center leading-tight">
                <span className="font-display block text-[1.2rem] font-semibold">Columbia Care</span>
                <span className="label mt-2 block text-[color-mix(in_srgb,var(--sage)_75%,white)]">
                  Adult Family Home · Everett
                </span>
              </span>
              <Wave
                className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10 w-full"
                flip
                fill="var(--sage)"
                backFill={null}
              />
            </div>

            <div className="bg-paper-raise relative flex flex-col justify-center gap-3 px-6 py-6 sm:py-5">
              <span
                className="bg-sage/25 pointer-events-none absolute inset-y-6 left-0 hidden w-px sm:block"
                aria-hidden="true"
              />
              {street || locality ? (
                <CardLine icon={MapPin} label="Address">
                  {street ? <span className="block">{street}</span> : null}
                  {locality ? <span className="text-ink-soft block">{locality}</span> : null}
                </CardLine>
              ) : null}
              {phone ? (
                <CardLine icon={Phone} label="Phone">
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="text-ink hover:text-sage-deep rounded font-semibold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      {phone}
                    </a>
                  ) : (
                    <span className="font-semibold">{phone}</span>
                  )}
                </CardLine>
              ) : null}
              {email ? (
                <CardLine icon={Mail} label="Email">
                  <a
                    href={`mailto:${email}`}
                    className="text-ink hover:text-sage-deep break-all rounded underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {email}
                  </a>
                </CardLine>
              ) : null}
              {fax ? (
                <CardLine icon={Printer} label="Fax">
                  {fax}
                </CardLine>
              ) : null}
            </div>
          </div>
        </article>
      </MotionLift>

      <div className="mt-4 flex max-w-lg flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a
          href={VCF_HREF}
          download="Columbia-Care-AFH-Everett.vcf"
          className={buttonVariants({ size: "default" })}
        >
          <UserPlus aria-hidden="true" />
          Save contact
        </a>
        <a
          href={PDF_HREF}
          download="Columbia-Care-AFH-Everett.pdf"
          className={buttonVariants({ size: "default", variant: "outline" })}
        >
          <Download aria-hidden="true" />
          Download our card
        </a>
      </div>
    </div>
  );
}

function CardLine({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-[1rem] leading-snug">
      <Icon className="text-sage mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0">
        <span className="label text-sage-deep mb-0.5 block">{label}</span>
        <span className="text-ink block">{children}</span>
      </span>
    </div>
  );
}

/** Splits a confirmed address line for a two-line card layout. Does not invent parts. */
function splitAddress(addressLine: string | null): { street: string | null; locality: string | null } {
  if (!addressLine) return { street: null, locality: null };
  const comma = addressLine.indexOf(", ");
  if (comma === -1) return { street: addressLine, locality: null };
  return {
    street: addressLine.slice(0, comma),
    locality: addressLine.slice(comma + 2),
  };
}
