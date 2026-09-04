"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { HouseMotion } from "@/components/motion/house";
import { houseTransition } from "@/lib/motion";

/**
 * Back to top.
 *
 * A single page this long needs a way home that is not "scroll for ten seconds"
 * particularly for someone with limited dexterity using a phone.
 *
 * Sits bottom-right so it never collides with the Reading options button
 * (bottom-left) or the mobile call bar (bottom, full width). Hidden until the
 * reader is well down the page, so it is not clutter on arrival.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 1200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <HouseMotion>
      <AnimatePresence>
        {visible ? (
          <motion.button
            type="button"
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            exit={{ y: 8 }}
            transition={houseTransition}
            onClick={() => {
              window.scrollTo({ top: 0 });
              document.getElementById("main")?.focus({ preventScroll: true });
            }}
            className="border-rule-strong bg-paper-raise text-ink hover:border-sage hover:text-sage-deep fixed right-4 bottom-20 z-40 inline-flex size-12 items-center justify-center rounded-full border shadow-md transition-colors sm:bottom-4 print:hidden"
          >
            <ArrowUp className="size-5" aria-hidden="true" strokeWidth={2} />
            <span className="sr-only">Back to top</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </HouseMotion>
  );
}
