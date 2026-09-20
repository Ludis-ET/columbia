"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { EyeOff } from "lucide-react";
import { HouseMotion, useHouseReducedMotion } from "@/components/motion/house";
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
 * Filterable gallery with a full-screen lightbox / slideshow.
 *
 * Renders nothing when there are no images — the Phase 8 photo shoot fills
 * categories that do not exist yet, and an empty "Bedrooms" tab would
 * advertise something we cannot show.
 *
 * Alt text is required by the type, mirroring the NOT NULL constraint the
 * media table will carry in Phase 4.
 */
export function Gallery({ images, className }: { images: GalleryImage[]; className?: string }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);
  const chipId = useId();

  const isHidden = filter === "__hide_all__";

  const handleHideAll = useCallback(() => {
    setFilter("__hide_all__");
    setShowOverlay(false);
    const homeEl = document.getElementById("home");
    if (homeEl) {
      homeEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (images.length === 0 || isHidden) {
      setShowOverlay(false);
      return;
    }

    const checkVisibility = () => {
      if (!galleryRef.current || !filterBarRef.current) return;
      const filterBarRect = filterBarRef.current.getBoundingClientRect();
      const galleryRect = galleryRef.current.getBoundingClientRect();

      // Show floating overlay button when the reader has scrolled past the top filter tabs,
      // while the gallery photo section is still overflowing / visible on screen.
      const scrolledPastTop = filterBarRect.bottom < 60;
      const galleryStillVisible = galleryRect.bottom > 220 && galleryRect.top < window.innerHeight;

      setShowOverlay(scrolledPastTop && galleryStillVisible);
    };

    window.addEventListener("scroll", checkVisibility, { passive: true });
    window.addEventListener("resize", checkVisibility, { passive: true });
    checkVisibility();

    return () => {
      window.removeEventListener("scroll", checkVisibility);
      window.removeEventListener("resize", checkVisibility);
    };
  }, [images.length, isHidden]);

  if (images.length === 0) return null;

  const categories = Array.from(
    new Set(images.map((img) => img.category).filter((c): c is string => Boolean(c))),
  );
  const visible = isHidden ? [] : filter ? images.filter((img) => img.category === filter) : images;

  const openLightbox = (img: GalleryImage) => {
    const idx = visible.indexOf(img);
    if (idx !== -1) setActiveIndex(idx);
  };

  return (
    <HouseMotion>
      <div ref={galleryRef} className={cn("relative", className)}>
        {/* ── Category filter chips with 'Hide all' tab ── */}
        <div
          ref={filterBarRef}
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter photographs"
        >
          <FilterChip active={filter === null} onClick={() => setFilter(null)} layoutId={chipId}>
            All
          </FilterChip>
          {categories.map((cat) => (
            <FilterChip
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              layoutId={chipId}
            >
              {cat}
            </FilterChip>
          ))}
          <FilterChip
            active={isHidden}
            onClick={() => (isHidden ? setFilter(null) : handleHideAll())}
            layoutId={chipId}
          >
            <span className="inline-flex items-center gap-1.5">
              <EyeOff className="size-3.5" aria-hidden="true" />
              Hide all
            </span>
          </FilterChip>
        </div>

        {/* ── Photo grid or Hidden notice ── */}
        {isHidden ? (
          <div className="border-rule bg-paper-raise rounded-xl border p-8 text-center sm:p-12">
            <p className="text-ink font-sans text-base font-bold sm:text-lg">
              Photographs are currently hidden
            </p>
            <p className="text-ink-soft mx-auto mt-2 max-w-md text-sm">
              Select{" "}
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="text-sage-deep cursor-pointer font-semibold underline underline-offset-2 hover:opacity-80"
              >
                All
              </button>{" "}
              or choose any category above to view pictures of our home.
            </p>
            <button
              type="button"
              onClick={() => setFilter(null)}
              className="bg-sage text-paper hover:bg-sage-deep mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold transition-colors sm:text-sm"
            >
              Show all photos
            </button>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((image) => (
                  <motion.li
                    key={image.src}
                    layout
                    transition={houseTransition}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <button
                      type="button"
                      onClick={() => openLightbox(image)}
                      aria-label={`View ${image.alt}`}
                      className="group border-rule focus-visible:outline-ring relative block w-full overflow-hidden rounded-lg border focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <span className="relative block aspect-4/3 overflow-hidden">
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                        />
                        {/* hover overlay */}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/20">
                          <span className="scale-75 rounded-full bg-white/80 p-2 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
                            <ExpandIcon />
                          </span>
                        </span>
                      </span>
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            {/* In-page bottom hide button */}
            {visible.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={handleHideAll}
                  className="border-rule bg-paper-raise hover:border-sage text-sage-deep hover:bg-sage-wash inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-xs font-semibold shadow-xs transition-colors hover:shadow-sm sm:text-sm"
                >
                  <EyeOff className="size-4" aria-hidden="true" />
                  Hide all photos
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Floating Overlay Hide Button (appears when viewing overflowing photos) ── */}
        <AnimatePresence>
          {showOverlay && !isHidden && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={houseTransition}
              onClick={handleHideAll}
              className="border-rule-strong bg-paper/95 text-ink hover:border-sage hover:text-sage-deep hover:bg-paper fixed bottom-20 left-1/2 z-30 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 sm:bottom-8 sm:text-sm"
              aria-label="Hide gallery photographs"
            >
              <EyeOff className="text-sage-deep size-4" aria-hidden="true" />
              <span>Hide photos</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Full-screen lightbox (portal) ── */}
        {activeIndex !== null && (
          <Lightbox
            images={visible}
            initialIndex={activeIndex}
            onClose={() => setActiveIndex(null)}
          />
        )}
      </div>
    </HouseMotion>
  );
}

/* ─────────────────────────────────────────────
   Lightbox
   ───────────────────────────────────────────── */

const SLIDESHOW_DELAY = 4000; // ms between auto-advance

function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const reduceMotion = useHouseReducedMotion();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const total = images.length;
  const current = images[index];

  // ── Navigation ──
  const goTo = useCallback(
    (next: number, dir: 1 | -1) => {
      setDirection(dir);
      setIndex(((next % total) + total) % total);
      setProgress(0);
    },
    [total],
  );

  const prev = useCallback(() => goTo(index - 1, -1), [index, goTo]);
  const next = useCallback(() => goTo(index + 1, 1), [index, goTo]);

  // ── Keyboard ──
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  // ── Slideshow timer ──
  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }
    setProgress(0);
    const tick = 50;
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.min(p + (tick / SLIDESHOW_DELAY) * 100, 100));
    }, tick);
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % total);
      setProgress(0);
    }, SLIDESHOW_DELAY);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [playing, total, index]);

  // ── Scroll active thumbnail into view ──
  useEffect(() => {
    const container = thumbsRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>("[data-active='true']");
    active?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [index]);

  // ── Lock body scroll ──
  useEffect(() => {
    const saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = saved;
    };
  }, []);

  // ── Slide animation variants ──
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.38, ease: [0.22, 0.61, 0.36, 1] as const };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      style={{ isolation: "isolate" }}
    >
      {/* ── Top bar ── */}
      <div className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3">
        <span className="font-mono text-sm text-white/60 tabular-nums">
          {index + 1}&thinsp;/&thinsp;{total}
        </span>
        <div className="flex items-center gap-2">
          {total > 1 && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lightbox"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* ── Slideshow progress bar ── */}
      <div className="h-[2px] w-full shrink-0 bg-white/10">
        <div className="h-full bg-white/60 transition-none" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Main image stage ── */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current.src}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative h-full w-full">
              <Image
                src={current.src}
                alt={current.alt}
                fill
                priority
                sizes="100vw"
                className="object-contain"
              />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Left / Right hit areas ── */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute top-0 left-0 z-10 flex h-full w-16 items-center justify-start pl-3 focus-visible:outline-none"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95">
                <ChevronLeft />
              </span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute top-0 right-0 z-10 flex h-full w-16 items-center justify-end pr-3 focus-visible:outline-none"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/60 active:scale-95">
                <ChevronRight />
              </span>
            </button>
          </>
        )}
      </div>

      {/* ── Thumbnail filmstrip ── */}
      {total > 1 && (
        <div className="shrink-0 border-t border-white/10 bg-black/60 py-3 backdrop-blur-sm">
          {/* Pill dot indicators */}
          <div className="mb-2 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to photo ${i + 1}`}
                onClick={() => goTo(i, i > index ? 1 : -1)}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === index ? "h-2 w-6 bg-white" : "h-2 w-2 bg-white/30 hover:bg-white/60",
                )}
              />
            ))}
          </div>

          {/* Thumbnail strip */}
          <div
            ref={thumbsRef}
            className="flex [scrollbar-width:none] gap-2 overflow-x-auto scroll-smooth px-4 pb-1 [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                data-active={i === index}
                onClick={() => goTo(i, i > index ? 1 : -1)}
                aria-label={`Go to ${img.alt}`}
                className={cn(
                  "relative shrink-0 overflow-hidden rounded transition-all duration-300",
                  i === index
                    ? "scale-105 opacity-100 ring-2 ring-white ring-offset-2 ring-offset-black"
                    : "opacity-40 hover:opacity-70",
                )}
                style={{ width: 72, height: 48 }}
              >
                <Image src={img.src} alt={img.alt} fill sizes="72px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────
   FilterChip
   ───────────────────────────────────────────── */

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
      {active && (
        <motion.span
          layoutId={layoutId}
          className="bg-sage-wash absolute inset-0 rounded-full"
          transition={houseTransition}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Inline SVG icons (zero extra deps)
   ───────────────────────────────────────────── */

function ExpandIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9,6 15,12 9,18" />
    </svg>
  );
}
