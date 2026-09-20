"use client";

import { useEffect, useId, useState } from "react";
import { ChevronDown, ChevronUp, HandHeart } from "lucide-react";
import { MotionLift } from "@/components/motion/lift";
import { ServiceCard } from "@/components/site/service-card";
import { cn } from "@/lib/utils";

export interface ServiceItem {
  slug: string;
  title: string;
  icon: string;
  description?: string | null;
}

export interface CollapsibleServicesProps {
  services: ServiceItem[];
}

/**
 * Collapsible dropdown menu for the 7 service cards underneath the 3 care types.
 *
 * Responsive behavior:
 * - On mobile (< 768px): Starts collapsed by default to save 7 full card heights of
 *   scrolling. Tapping the header smoothly reveals all 7 services.
 * - On desktop (>= 768px): Starts expanded by default so visitors see all services
 *   without having to click, while retaining the toggle button to collapse if desired.
 * - Initial state uses CSS classes (hidden md:grid) to avoid any layout shift or SSR
 *   hydration mismatches.
 */
export function CollapsibleServices({ services }: CollapsibleServicesProps) {
  const [userState, setUserState] = useState<boolean | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const contentId = useId();

  useEffect(() => {
    setIsDesktop(window.innerWidth >= 768);
  }, []);

  if (services.length === 0) return null;

  const isOpen = userState !== null ? userState : isDesktop;

  return (
    <div className="w-full">
      {/* Dropdown toggle header */}
      <button
        type="button"
        onClick={() => setUserState(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="border-rule bg-paper-raise hover:border-sage group mx-auto mb-6 flex w-full max-w-4xl cursor-pointer items-center justify-between gap-4 rounded-xl border p-4 text-left shadow-xs transition-all hover:shadow-sm sm:p-5"
      >
        <div className="flex items-center gap-3.5">
          <div className="bg-sage-wash text-sage-deep flex size-10 shrink-0 items-center justify-center rounded-lg">
            <HandHeart className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-ink font-sans text-base font-bold sm:text-lg">
                Additional care & daily services
              </span>
              <span className="bg-sage-wash text-sage-deep hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline-block">
                {services.length} services
              </span>
            </div>
            <p className="text-ink-soft text-xs sm:text-sm">
              {isOpen
                ? "Tap to collapse services"
                : "Tap to view 24/7 care, Medication management, meals & more"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sage-deep text-xs font-semibold sm:hidden">
            {isOpen ? "Hide" : "Show (7)"}
          </span>
          <div
            className={cn(
              "border-rule text-ink-soft group-hover:border-sage group-hover:text-sage-deep flex size-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-300",
              userState === null ? "rotate-0 md:rotate-180" : isOpen ? "rotate-180" : "rotate-0",
            )}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </div>
        </div>
      </button>

      {/* Collapsible services grid */}
      <div
        id={contentId}
        className={cn(
          userState === null
            ? "hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3"
            : isOpen
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "hidden",
        )}
      >
        {services.map((service) => (
          <div key={service.slug} className="h-full">
            <MotionLift>
              <ServiceCard
                title={service.title}
                icon={service.icon}
                summary={service.description}
                className="h-full"
              />
            </MotionLift>
          </div>
        ))}
      </div>

      {/* Mobile bottom collapse shortcut */}
      {isOpen && (
        <div className="mt-6 flex justify-center sm:hidden">
          <button
            type="button"
            onClick={() => setUserState(false)}
            className="text-sage-deep hover:bg-sage-wash inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors"
          >
            <ChevronUp className="size-3.5" aria-hidden="true" />
            Collapse services
          </button>
        </div>
      )}
    </div>
  );
}
