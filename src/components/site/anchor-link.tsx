"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { scrollToSection } from "@/lib/anchor-nav";

type AnchorLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  sectionId: string;
  children: ReactNode;
  onNavigate?: () => void;
};

/**
 * Link to a section on the one-page home.
 *
 * On `/`, intercepts the click and scrolls + focuses like SectionNav. From
 * any other route, navigates to `/#sectionId` so legacy bookmarks still work.
 */
export function AnchorLink({
  sectionId,
  children,
  className,
  onNavigate,
  onClick,
  ...rest
}: AnchorLinkProps) {
  const pathname = usePathname();
  const onHome = pathname === "/";

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (onHome && document.getElementById(sectionId)) {
      event.preventDefault();
      scrollToSection(sectionId);
      onNavigate?.();
    }
  }

  if (onHome) {
    return (
      <a href={`#${sectionId}`} className={className} onClick={handleClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={`/#${sectionId}`} className={className} onClick={onNavigate} {...rest}>
      {children}
    </Link>
  );
}
