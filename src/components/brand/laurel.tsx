/**
 * The laurel sprig that flanks the infographic's title.
 * Used as the section divider. Always decorative, never carries meaning.
 */
export function Laurel({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 40 20"
      className={className}
      aria-hidden="true"
      fill="none"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      {/* stem */}
      <path
        d="M2 18C10 16 22 12 38 4"
        stroke="var(--sage)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* leaves along the stem */}
      <ellipse
        cx="10"
        cy="13.6"
        rx="3.6"
        ry="2"
        fill="var(--sage)"
        transform="rotate(-24 10 13.6)"
      />
      <ellipse
        cx="18"
        cy="10.6"
        rx="3.6"
        ry="2"
        fill="var(--sage)"
        transform="rotate(-24 18 10.6)"
      />
      <ellipse cx="26" cy="7.6" rx="3.6" ry="2" fill="var(--sage)" transform="rotate(-24 26 7.6)" />
      <ellipse
        cx="13"
        cy="9.6"
        rx="3"
        ry="1.7"
        fill="var(--sage)"
        opacity="0.6"
        transform="rotate(20 13 9.6)"
      />
      <ellipse
        cx="21"
        cy="6.6"
        rx="3"
        ry="1.7"
        fill="var(--sage)"
        opacity="0.6"
        transform="rotate(20 21 6.6)"
      />
    </svg>
  );
}

/**
 * A full-width section divider: a centred pair of sprigs around a small heart,
 * matching the infographic's own divider treatment.
 */
export function LaurelDivider({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div className="flex items-center justify-center gap-3">
        <span className="bg-rule h-px w-16 sm:w-24" />
        <Laurel className="h-4 w-8" flip />
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--sage)" aria-hidden="true">
          <path d="M8 14C3.6 11.1 1 8.4 1 5.6A3.6 3.6 0 0 1 8 4.3 3.6 3.6 0 0 1 15 5.6C15 8.4 12.4 11.1 8 14Z" />
        </svg>
        <Laurel className="h-4 w-8" />
        <span className="bg-rule h-px w-16 sm:w-24" />
      </div>
    </div>
  );
}
