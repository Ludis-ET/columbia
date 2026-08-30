import { Quote } from "lucide-react";
import { HeartShield } from "@/components/brand/heart-shield";
import { SectionHeading } from "@/components/site/section";
import { cn } from "@/lib/utils";

export interface TestimonialItem {
  quote: string;
  author: string;
  /** e.g. "Daughter of a resident" — relationship, never a resident's own name. */
  relationship?: string | null;
}

export function Testimonial({
  quote,
  author,
  relationship,
  className,
}: TestimonialItem & { className?: string }) {
  return (
    <figure className={cn("border-rule bg-paper-raise rounded border p-6", className)}>
      <Quote className="text-sage mb-3 size-6" aria-hidden="true" />
      <blockquote className="text-lead text-ink">
        <p>{quote}</p>
      </blockquote>
      <figcaption className="text-stone mt-4">
        <span className="text-ink font-semibold">{author}</span>
        {relationship ? <span className="block text-[0.9375rem]">{relationship}</span> : null}
      </figcaption>
    </figure>
  );
}

/**
 * The testimonials band.
 *
 * Renders NOTHING when there are no published quotes. The client has not yet
 * told us whether any family is willing to be quoted (question 14 in
 * docs/client-questions.md), and a care home inventing praise for itself is
 * exactly what the rule in CLAUDE.md exists to prevent.
 */
export function TestimonialList({
  items,
  eyebrow = "From families",
  title = "What families tell us",
}: {
  items: TestimonialItem[];
  eyebrow?: string;
  title?: string;
}) {
  if (items.length === 0) return null;

  return (
    <>
      <div className="flex flex-col items-center">
        <HeartShield className="mb-5 size-12" />
      </div>
      <SectionHeading eyebrow={eyebrow} title={title} align="center" />
      <ul
        className={cn(
          "grid gap-4",
          items.length > 1 && "sm:grid-cols-2",
          items.length > 2 && "lg:grid-cols-3",
        )}
      >
        {items.map((item) => (
          <li key={item.quote}>
            <Testimonial {...item} className="h-full" />
          </li>
        ))}
      </ul>
    </>
  );
}
