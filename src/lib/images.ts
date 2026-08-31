import type { GalleryImage } from "@/components/site/gallery";

/**
 * Site imagery.
 *
 * EVERY FILE HERE IS A PLACEHOLDER of a different house. They were chosen to
 * read as a real residential care home, communal sitting rooms, a family
 * dining table, a garden, rather than the generic stock that makes care sites
 * look interchangeable. None contains a person, because CLAUDE.md forbids stock
 * humans and because a photo of a stranger implying they live here is exactly
 * the kind of claim the content rule exists to prevent.
 *
 * Source: StockSnap.io, CC0, free for commercial use, no attribution required.
 * Provenance for each file is in public/placeholder/manifest.json.
 *
 * Named by SLOT, so Phase 8 is a straight file swap: drop the real photograph
 * in at the same path and nothing else changes. `pnpm check:placeholders`
 * tracks what is still in use and becomes a hard build failure under
 * LAUNCH_READY=1.
 *
 * ALT TEXT DESCRIBES THE PLACEHOLDER. Rewrite it when the real photograph
 * lands, alt text describing the wrong image is worse than none.
 */

const P = "/placeholder";

export const heroImage = {
  src: `${P}/living-room.jpg`,
  alt: "Placeholder: a shared sitting room with striped sofas, bookshelves and a fireplace",
};

export const mealsImage = {
  src: `${P}/table-setting.jpg`,
  alt: "Placeholder: a table laid with linen, stacked plates and a small autumn arrangement",
};

export const aboutImage = {
  src: `${P}/garden.jpg`,
  alt: "Placeholder: rose bushes in flower along the front of a house, beside a covered porch",
};

/**
 * Gallery contents.
 *
 * Categories cover only areas the client's own brochure photographs show, plus
 * a bedroom, the room families ask about most and the biggest gap in the
 * supplied artwork (docs/client-questions.md q10).
 */
export const galleryImages: GalleryImage[] = [
  {
    src: `${P}/living-room.jpg`,
    alt: "Placeholder: a shared sitting room with striped sofas, bookshelves and a fireplace",
    caption: "The sitting room",
    category: "Living areas",
  },
  {
    src: `${P}/sitting-room.jpg`,
    alt: "Placeholder: a wood-panelled sitting room with large windows onto the garden",
    caption: "Looking out over the garden",
    category: "Living areas",
  },
  {
    src: `${P}/quiet-corner.jpg`,
    alt: "Placeholder: a pale blue loveseat with cushions beside a sunny window",
    caption: "A quiet corner",
    category: "Living areas",
  },
  {
    src: `${P}/dining-room.jpg`,
    alt: "Placeholder: a wooden dining table and chairs beside French doors onto the garden",
    caption: "Where we eat together",
    category: "Dining & kitchen",
  },
  {
    src: `${P}/table-setting.jpg`,
    alt: "Placeholder: a table laid with linen, stacked plates and a small autumn arrangement",
    caption: "Set for a meal",
    category: "Dining & kitchen",
  },
  {
    src: `${P}/bedroom.jpg`,
    alt: "Placeholder: a made bed beside an open window with flowers on the balcony rail",
    caption: "A resident's room",
    category: "Bedrooms",
  },
  {
    src: `${P}/patio.jpg`,
    alt: "Placeholder: two wooden patio chairs on a paved terrace facing a planted border at dusk",
    caption: "The patio",
    category: "Outdoors",
  },
  {
    src: `${P}/garden.jpg`,
    alt: "Placeholder: rose bushes in flower along the front of a house, beside a covered porch",
    caption: "The garden in summer",
    category: "Outdoors",
  },
];

/** A short strip for the home page. */
export const galleryPreview = galleryImages.slice(0, 6);
