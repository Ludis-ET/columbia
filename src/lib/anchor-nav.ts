/**
 * Scroll to a one-page section and move focus there.
 *
 * SectionNav, the hero CTA, and every "Book a house tour" button share this
 * so in-page jumps actually land in the content. A plain hash link or a Next.js
 * Link to /#contact on the home page often updates the URL without scrolling.
 */
export function scrollToSection(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;

  target.scrollIntoView({ block: "start" });
  target.focus({ preventScroll: true });
  history.replaceState(null, "", `#${id}`);
  return true;
}
