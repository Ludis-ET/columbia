"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scrollToSection } from "@/lib/anchor-nav";

/**
 * Scroll to the section in the URL hash once the one-pager has mounted.
 *
 * Covers bookmarked /#contact links and redirects from old routes like /contact,
 * where the browser updates the hash but does not always scroll on a soft nav.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    const id = window.location.hash.slice(1);
    if (!id) return;

    requestAnimationFrame(() => {
      scrollToSection(id);
    });
  }, [pathname]);

  return null;
}
