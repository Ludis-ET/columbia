import { IconBadge, isIconName, type Accent } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * One entry in "A Day in Our Home".
 *
 * The 13 entries, their icons and their accent colours all come from the
 * client's infographic, this component just renders what is already assigned
 * in content/source-of-truth.json.
 */
export function TimelineEntry({
  timeLabel,
  title,
  body,
  bullets,
  icon,
  accent = "navy",
  className,
}: {
  timeLabel: string;
  title: string;
  body: string;
  bullets?: string[];
  icon: string;
  accent?: Accent;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 sm:gap-x-6",
        // The connector rail between badges. Hidden on the last child by the parent.
        "relative",
        className,
      )}
    >
      <div className="flex flex-col items-center">
        {isIconName(icon) ? <IconBadge name={icon} accent={accent} /> : null}
        <span
          aria-hidden="true"
          className="bg-rule mt-3 w-px flex-1 [article:last-child_&]:hidden"
        />
      </div>

      <div className="pb-10">
        <p className="label text-stone mb-1 tabular-nums">{timeLabel}</p>
        <h3 className="text-h3 font-sans font-bold">{title}</h3>
        <p className="text-ink-soft mt-2 max-w-[62ch]">{body}</p>

        {bullets?.length ? (
          <ul className="text-ink-soft mt-3 grid gap-1 sm:grid-cols-2">
            {bullets.map((item) => (
              <li key={item} className="marker:text-sage list-disc pl-1 marker:content-['·__']">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

/**
 * The signature moment: the page ground shifts dawn → night as the reader moves
 * through the day. Pure CSS gradient, so it costs nothing and needs no JS.
 *
 * Colours are the client's own accent badges, read as a time-of-day ramp.
 */
export function DayGradient({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 -z-10", className)}
      style={{
        background:
          "linear-gradient(to bottom," +
          " color-mix(in srgb, var(--accent-amber) 10%, var(--paper)) 0%," +
          " var(--paper) 18%," +
          " color-mix(in srgb, var(--accent-blue) 7%, var(--paper)) 38%," +
          " color-mix(in srgb, var(--accent-amber) 12%, var(--paper)) 58%," +
          " color-mix(in srgb, var(--accent-violet) 12%, var(--paper)) 76%," +
          " color-mix(in srgb, var(--ink) 22%, var(--paper)) 100%)",
      }}
    />
  );
}
