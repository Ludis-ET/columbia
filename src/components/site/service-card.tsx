import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IconBadge, isIconName } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * A service from the client's list. Links through only when a detail page
 * exists; otherwise it is an informational card, not a dead link.
 */
export function ServiceCard({
  title,
  icon,
  summary,
  href,
  className,
}: {
  title: string;
  icon: string;
  summary?: string | null;
  href?: string | null;
  className?: string;
}) {
  const body = (
    <>
      {isIconName(icon) ? <IconBadge name={icon} accent="sage" className="mb-4" /> : null}
      <h3 className="text-h3 font-sans font-bold">{title}</h3>
      {summary ? <p className="text-ink-soft mt-2">{summary}</p> : null}
      {href ? (
        <span className="text-sage-deep mt-4 inline-flex items-center gap-1.5 font-semibold">
          Learn more
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      ) : null}
    </>
  );

  const shared = cn(
    "border-rule bg-paper-raise flex h-full flex-col rounded border p-6",
    href && "group hover:border-sage transition-colors",
    className,
  );

  if (!href) {
    return <div className={shared}>{body}</div>;
  }

  return (
    <Link href={href} className={shared}>
      {body}
    </Link>
  );
}
