/**
 * The Columbia Care monogram, a "C" enclosing a cottage.
 *
 * Redrawn from the "A Day in Our AFH" infographic. This is a faithful
 * reconstruction, not the original: question 8 in docs/client-questions.md asks
 * the client for the source vector. Swap this file's paths when it arrives and
 * nothing else needs to change.
 *
 * Colours come from theme tokens, so the mark inverts correctly in dark mode.
 */
export function Monogram({
  className,
  title = "Columbia Care Adult Family Home",
  decorative = false,
}: {
  className?: string;
  title?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
      fill="none"
    >
      {/* the C */}
      <path
        d="M46.5 15.2A22 22 0 1 0 46.5 48.8"
        stroke="var(--ink)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />

      {/* foliage behind the cottage */}
      <circle cx="21.5" cy="31" r="5.2" fill="var(--sage)" opacity="0.9" />
      <circle cx="43" cy="30" r="4.2" fill="var(--sage)" opacity="0.75" />

      {/* cottage body */}
      <path
        d="M23 35.5h18v12.5H23z"
        fill="var(--paper-raise)"
        stroke="var(--ink)"
        strokeWidth="2"
      />

      {/* pitched roof */}
      <path
        d="M20 36 32 25.5 44 36Z"
        fill="var(--sage-wash)"
        stroke="var(--ink)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* chimney */}
      <path d="M38 27.5h3v4.2" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />

      {/* door */}
      <path d="M29.5 48V41h5v7" fill="var(--sage)" stroke="var(--ink)" strokeWidth="1.8" />

      {/* window */}
      <rect
        x="24.8"
        y="38.4"
        width="3.4"
        height="3.4"
        fill="var(--paper)"
        stroke="var(--ink)"
        strokeWidth="1.4"
      />

      {/* flowers at the threshold */}
      <circle cx="21.5" cy="46.5" r="1.5" fill="var(--accent-amber)" />
      <circle cx="43.5" cy="45.5" r="1.5" fill="var(--accent-rose)" />
    </svg>
  );
}
