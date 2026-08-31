/**
 * Skip link. Must be the first focusable element in the DOM.
 * Off-screen until focused, see .skip-link in globals.css.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="skip-link bg-ink text-paper focus-visible:outline-sage rounded px-4 py-3 font-medium"
    >
      Skip to main content
    </a>
  );
}
