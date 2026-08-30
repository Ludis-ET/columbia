"use client";

import { useState } from "react";
import { MapPin, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Location block.
 *
 * The Google embed is NOT loaded until the visitor asks for it. Until then this
 * is a static, styled placeholder with the address and directions. That keeps
 * a third-party iframe (and its cookies) off every page load, which is both a
 * performance win and the reason this site needs no cookie banner.
 *
 * Renders nothing without a confirmed address.
 */
export function MapBlock({
  address,
  locationLine,
  className,
}: {
  address: string | null;
  locationLine?: string | null;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (!address) return null;

  const query = encodeURIComponent(address);
  const embedSrc = `https://www.google.com/maps?q=${query}&output=embed`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${query}`;

  return (
    <div className={cn("border-rule overflow-hidden rounded border", className)}>
      <div className="bg-paper-sunk relative aspect-16/9 w-full">
        {loaded ? (
          <iframe
            src={embedSrc}
            title={`Map showing ${address}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <MapPin className="text-sage size-10" aria-hidden="true" strokeWidth={1.75} />
            <p className="text-ink font-semibold">{address}</p>
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className="border-rule-strong hover:border-sage hover:text-sage-deep inline-flex min-h-12 items-center gap-2 rounded border px-5 font-semibold transition-colors"
            >
              <Play className="size-4" aria-hidden="true" />
              Load the map
            </button>
            <p className="text-stone max-w-[42ch] text-[0.875rem]">
              We load Google Maps only when you ask, so the rest of the site stays fast and
              cookie-free.
            </p>
          </div>
        )}
      </div>

      <div className="bg-paper-raise flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <address className="text-ink font-semibold not-italic">{address}</address>
          {locationLine ? <p className="text-stone mt-1 text-[0.9375rem]">{locationLine}</p> : null}
        </div>
        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage-deep inline-flex min-h-12 items-center font-semibold underline underline-offset-2"
        >
          Get directions
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}
