import type { GalleryImage } from "@/components/site/gallery";

/**
 * Site imagery — authentic photographs of Columbia Care Adult Family Home.
 *
 * All photos are real photographs of the home located in Everett, WA,
 * with web-optimized local assets stored in /photos/ and high-resolution
 * originals managed in Supabase Storage.
 */

export const heroImage = {
  src: "/photos/living-room-1.jpg",
  alt: "Columbia Care Adult Family Home spacious living room with comfortable seating and natural daylight",
};

export const mealsImage = {
  src: "/photos/dining-1.jpg",
  alt: "Columbia Care family dining area set for home-cooked meals",
};

export const aboutImage = {
  src: "/photos/backyard-1.jpg",
  alt: "Columbia Care backyard and outdoor patio area",
};

/**
 * Fallback gallery contents for static rendering and offline resilience.
 * Dynamic gallery items are loaded from the database via queries.ts getGallery().
 */
export const galleryImages: GalleryImage[] = [
  {
    src: "/photos/living-room-1.jpg",
    alt: "Spacious main living room with comfortable seating",
    caption: "The living room",
    category: "Living areas",
  },
  {
    src: "/photos/living-room-2.jpg",
    alt: "Bright and open living area with comfortable armchairs",
    caption: "Sitting area",
    category: "Living areas",
  },
  {
    src: "/photos/living-room-3.jpg",
    alt: "Quiet corner in the living room",
    caption: "Quiet corner",
    category: "Living areas",
  },
  {
    src: "/photos/dining-1.jpg",
    alt: "Dining room set for family meals together",
    caption: "Family dining table",
    category: "Dining & kitchen",
  },
  {
    src: "/photos/dining-2.jpg",
    alt: "Dining area adjacent to kitchen",
    caption: "Where we eat together",
    category: "Dining & kitchen",
  },
  {
    src: "/photos/kitchen-2.jpg",
    alt: "Fully equipped kitchen for freshly prepared daily meals",
    caption: "The kitchen",
    category: "Dining & kitchen",
  },
  {
    src: "/photos/bedroom-1.jpg",
    alt: "Private, peaceful resident bedroom with natural light",
    caption: "Resident bedroom",
    category: "Bedrooms",
  },
  {
    src: "/photos/bedroom-2.jpg",
    alt: "Comfortable bedroom with closet space and garden views",
    caption: "Private room",
    category: "Bedrooms",
  },
  {
    src: "/photos/bedroom-3.jpg",
    alt: "Spacious resident bedroom layout",
    caption: "Resident room",
    category: "Bedrooms",
  },
  {
    src: "/photos/backyard-1.jpg",
    alt: "Private fenced backyard with lush green lawn and trees",
    caption: "The backyard",
    category: "Outdoors",
  },
  {
    src: "/photos/backyard-2.jpg",
    alt: "Outdoor patio seating area for relaxing in the fresh air",
    caption: "Backyard patio",
    category: "Outdoors",
  },
  {
    src: "/photos/entrance-1.jpg",
    alt: "Welcoming entryway to Columbia Care Adult Family Home",
    caption: "Front entrance",
    category: "Entrance",
  },
  {
    src: "/photos/restroom-1.jpg",
    alt: "Clean, accessible restroom designed for safety and ease",
    caption: "Accessible restroom",
    category: "Restroom",
  },
];

/** A short strip for the home page. */
export const galleryPreview = galleryImages.slice(0, 6);
