import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Phone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Wave } from "@/components/brand/wave";
import { cn } from "@/lib/utils";

/**
 * Page hero.
 *
 * The image is optional: with no photograph it falls back to the sage ground
 * rather than a grey box, so a page still looks finished before the Phase 8
 * photo shoot. `badge` is a slot for the availability badge, which renders
 * nothing of its own when unset.
 */
export function Hero({
  title,
  lead,
  image,
  badge,
  primaryCta = { href: "/contact", label: "Book a house tour" },
  phone,
  phoneHref,
  size = "page",
}: {
  title: string;
  lead?: string | null;
  image?: { src: string; alt: string } | null;
  badge?: ReactNode;
  primaryCta?: { href: string; label: string };
  phone?: string | null;
  phoneHref?: string | null;
  size?: "page" | "home";
}) {
  const hasImage = Boolean(image);

  return (
    <section className={cn("relative", !hasImage && "bg-sage-wash")}>
      {image ? (
        <>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Scrim: heavy enough that white text clears 7:1 over the photograph. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_srgb,#10254A_92%,transparent),color-mix(in_srgb,#10254A_62%,transparent))]"
          />
        </>
      ) : null}

      <div
        className={cn(
          "relative mx-auto max-w-4xl px-4 text-center sm:px-6",
          size === "home" ? "py-24 sm:py-36" : "py-16 sm:py-24",
          hasImage && "text-white",
        )}
      >
        {badge ? <div className="mb-6 flex justify-center">{badge}</div> : null}

        <h1 className={size === "home" ? "text-hero" : "text-h1"}>{title}</h1>

        {lead ? (
          <p
            className={cn(
              "text-lead mx-auto mt-6 max-w-[48ch]",
              hasImage ? "text-white/90" : "text-ink-soft",
            )}
          >
            {lead}
          </p>
        ) : null}

        {/* Links are real anchors styled with buttonVariants rather than
            <Button render={<a/>}>. Same appearance, but the element carries its
            own href and children — which keeps it navigable (and lintable) as a
            link rather than a button wearing one. */}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href={primaryCta.href}
            className={cn(
              buttonVariants({ size: "lg" }),
              hasImage && "bg-paper text-ink hover:bg-sage hover:text-paper",
            )}
          >
            {primaryCta.label}
          </Link>

          {phone && phoneHref ? (
            <a
              href={phoneHref}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                hasImage && "border-white/70 text-white hover:border-white",
              )}
            >
              <Phone aria-hidden="true" />
              {phone}
            </a>
          ) : null}
        </div>
      </div>

      {/* Bleeds the photograph into the page ground below. Flipped so the solid
          paper fill sits at the bottom. */}
      {hasImage ? (
        <Wave
          className="absolute inset-x-0 bottom-0 block h-10 w-full sm:h-14"
          flip
          fill="var(--paper)"
          backFill={null}
        />
      ) : null}
    </section>
  );
}
