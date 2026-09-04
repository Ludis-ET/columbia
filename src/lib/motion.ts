/**
 * House motion tokens.
 *
 * Matches CLAUDE.md: 320ms, the same cubic-bezier as the section reveal.
 * Chrome and page sections both use these. Section reveals arm only after
 * mount and never start at opacity 0 in the HTML, so a React failure cannot
 * hide Care again.
 */

export const HOUSE_EASE = [0.22, 0.61, 0.36, 1] as const;

export const houseTransition = {
  duration: 0.32,
  ease: HOUSE_EASE,
};
