import Link from "next/link";
import { Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LaurelDivider } from "@/components/brand/laurel";
import { cn } from "@/lib/utils";

/**
 * The closing call to action, used at the foot of every page.
 *
 * `script` is the client's "We treat your loved one like family." line — one of
 * only two places the Parisienne face appears site-wide.
 */
export function CtaBand({
  title = "Come and see the home",
  lead,
  script,
  phone,
  phoneHref,
  className,
}: {
  title?: string;
  lead?: string | null;
  script?: string | null;
  phone?: string | null;
  phoneHref?: string | null;
  className?: string;
}) {
  return (
    <section className={cn("bg-ink text-paper py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        {script ? <p className="font-script mb-6 text-3xl sm:text-4xl">{script}</p> : null}

        <h2 className="text-h2">{title}</h2>
        {lead ? <p className="text-lead mt-4 opacity-90">{lead}</p> : null}

        <LaurelDivider className="my-8 opacity-60" />

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-paper text-ink hover:bg-sage hover:text-paper",
            )}
          >
            Book a house tour
          </Link>

          {phone && phoneHref ? (
            <a
              href={phoneHref}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-paper/60 text-paper hover:border-paper hover:text-paper",
              )}
            >
              <Phone aria-hidden="true" />
              {phone}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
