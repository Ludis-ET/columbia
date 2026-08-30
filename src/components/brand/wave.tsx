/**
 * The navy-and-sage wave that divides the header from the body in the
 * infographic.
 *
 * Two stacked paths, the back one offset slightly, exactly as in the artwork.
 * Both fills are configurable so the same shape can cap a navy footer or bleed
 * a photographic hero into the page ground.
 *
 * The paths fill upward from the curve, so `flip` is what you want when the
 * solid colour belongs below.
 */
export function Wave({
  className,
  flip = false,
  fill = "var(--ink)",
  backFill = "var(--sage)",
}: {
  className?: string;
  flip?: boolean;
  fill?: string;
  /** Pass null for a single-colour wave. */
  backFill?: string | null;
}) {
  return (
    <svg
      viewBox="0 0 1440 96"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      {backFill ? (
        <path
          d="M0 40c180 44 360 52 540 26s360-58 540-42 240 46 360 58V0H0Z"
          fill={backFill}
          opacity="0.85"
        />
      ) : null}
      <path d="M0 26c180 44 360 52 540 26s360-58 540-42 240 46 360 58V0H0Z" fill={fill} />
    </svg>
  );
}
