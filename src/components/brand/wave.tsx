/**
 * The navy-and-sage wave that divides the header from the body in the
 * infographic. Used as the header-to-hero transition.
 *
 * Two stacked paths, the sage one offset slightly, exactly as in the artwork.
 */
export function Wave({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <path
        d="M0 40c180 44 360 52 540 26s360-58 540-42 240 46 360 58V0H0Z"
        fill="var(--sage)"
        opacity="0.85"
      />
      <path d="M0 26c180 44 360 52 540 26s360-58 540-42 240 46 360 58V0H0Z" fill="var(--ink)" />
    </svg>
  );
}
