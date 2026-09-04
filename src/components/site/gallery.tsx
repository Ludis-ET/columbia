"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HouseMotion } from "@/components/motion/house";
import { cn } from "@/lib/utils";
import { houseTransition } from "@/lib/motion";

export interface GalleryImage {
  src: string;
  alt: string;
  caption?: string | null;
  category?: string | null;
  width?: number;
  height?: number;
}

/**
 * Filterable gallery with a lightbox.
 *
 * Renders nothing when there are no images, the Phase 8 photo shoot fills
 * categories that do not exist yet, and an empty "Bedrooms" tab would advertise
 * something we cannot show.
 *
 * Alt text is required by the type, mirroring the NOT NULL constraint the
 * media table will carry in Phase 4.
 */
export function Gallery({ images, className }: { images: GalleryImage[]; className?: string }) {
  const [active, setActive] = useState<GalleryImage | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const chipId = useId();

  if (images.length === 0) return null;

  const categories = Array.from(
    new Set(images.map((image) => image.category).filter((c): c is string => Boolean(c))),
  );
  const visible = filter ? images.filter((image) => image.category === filter) : images;

  return (
    <HouseMotion>
      <div className={className}>
        {categories.length > 1 ? (
          <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter photographs">
            <FilterChip active={filter === null} onClick={() => setFilter(null)} layoutId={chipId}>
              All
            </FilterChip>
            {categories.map((category) => (
              <FilterChip
                key={category}
                active={filter === category}
                onClick={() => setFilter(category)}
                layoutId={chipId}
              >
                {category}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((image) => (
              <motion.li key={image.src} layout transition={houseTransition}>
                <button
                  type="button"
                  onClick={() => setActive(image)}
                  className="group border-rule focus-visible:outline-ring relative block w-full overflow-hidden rounded border focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="relative block aspect-4/3">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </span>
                  {image.caption ? (
                    <span className="text-ink-soft bg-paper-raise block px-3 py-2 text-left text-[0.9375rem]">
                      {image.caption}
                    </span>
                  ) : null}
                  <span className="sr-only">View larger</span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

        <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
          <DialogContent className="max-w-4xl">
            {active ? (
              <>
                <DialogTitle className="sr-only">{active.alt}</DialogTitle>
                <div className="relative aspect-3/2 w-full">
                  <Image
                    src={active.src}
                    alt={active.alt}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="rounded object-contain"
                  />
                </div>
                {active.caption ? (
                  <p className="text-ink-soft mt-3 text-center">{active.caption}</p>
                ) : null}
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </HouseMotion>
  );
}

function FilterChip({
  active,
  onClick,
  layoutId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative min-h-11 rounded-full border px-4 transition-colors",
        active
          ? "border-sage text-sage-deep font-semibold"
          : "border-rule text-ink-soft hover:border-rule-strong",
      )}
    >
      {active ? (
        <motion.span
          layoutId={layoutId}
          className="bg-sage-wash absolute inset-0 rounded-full"
          transition={houseTransition}
        />
      ) : null}
      <span className="relative">{children}</span>
    </button>
  );
}
