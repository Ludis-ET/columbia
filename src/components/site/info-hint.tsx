"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Compact “i” control for supplementary copy.
 *
 * Keeps the contact area and form scannable while the full explanation stays
 * one tap or focus away. The trigger is 48×48px; the icon inside is smaller.
 */
export function InfoHint({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={cn(
            "text-stone hover:text-sage-deep inline-flex size-12 shrink-0 items-center justify-center rounded transition-colors",
            className,
          )}
          aria-label={label}
        >
          <Info className="size-5" aria-hidden="true" strokeWidth={2} />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-[32ch] text-left text-[0.9375rem] leading-relaxed [&_p+p]:mt-2"
        >
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
