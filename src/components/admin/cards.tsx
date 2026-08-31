import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Raised panel — safe for server and client components. */
export function AdminCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-rule bg-paper-raise rounded-lg border shadow-sm", className)}>
      {children}
    </div>
  );
}

/** Groups a screen into labelled sections. */
export function AdminSection({
  title,
  lead,
  children,
  action,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h3 font-sans font-bold">{title}</h2>
          {lead ? <p className="text-stone mt-1 max-w-[60ch] text-[0.9375rem]">{lead}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  lead,
  count,
  action,
}: {
  title: string;
  lead?: string;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-rule mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
      <div>
        <p className="label text-sage-deep mb-2">Columbia Care admin</p>
        <h1 className="text-h1">{title}</h1>
        {lead ? <p className="text-stone mt-2 max-w-[62ch] text-[0.9375rem]">{lead}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {count ? <span className="label text-stone">{count}</span> : null}
        {action}
      </div>
    </header>
  );
}
