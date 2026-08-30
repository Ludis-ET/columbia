/**
 * The heart-in-shield mark from the infographic's values badge.
 * Used as the section mark for "Why families choose us" and beside licence details.
 */
export function HeartShield({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      {/* hexagonal shield */}
      <path
        d="M24 3.5 42 12.2v14.4c0 9.1-7.3 15.5-18 17.9-10.7-2.4-18-8.8-18-17.9V12.2Z"
        fill="var(--ink)"
      />
      {/* heart */}
      <path
        d="M24 34.5c-5.6-3.6-9-7-9-11a4.6 4.6 0 0 1 9-1.7 4.6 4.6 0 0 1 9 1.7c0 4-3.4 7.4-9 11Z"
        fill="var(--paper)"
      />
    </svg>
  );
}
