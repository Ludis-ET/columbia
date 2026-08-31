import {
  Fraunces,
  Source_Sans_3,
  Parisienne,
  IBM_Plex_Mono,
  Atkinson_Hyperlegible,
} from "next/font/google";

/**
 * Fonts are self-hosted by next/font at build time, no render-blocking request
 * to fonts.googleapis.com, no layout shift, no third-party connection.
 *
 * Pairing rationale is in CLAUDE.md. Short version: Fraunces' SOFT axis rounds
 * the terminals so it reads warm and hand-cut rather than editorial-formal,
 * which is why it beats Playfair Display here. Body stays sans because
 * sans-serif is measurably more readable at body sizes for low-vision readers.
 */

// No `weight` here on purpose: next/font only accepts `axes` when the font is
// left fully variable. Weight is set in CSS (600 for headings) off the wght axis.
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
});

export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
});

/** Used at most twice site-wide, never for information. */
export const parisienne = Parisienne({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-parisienne",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

/**
 * Offered by the accessibility toolbar as "Easier reading font".
 *
 * Atkinson Hyperlegible was designed by the Braille Institute to keep similar
 * letterforms distinguishable at low vision. Chosen over OpenDyslexic because
 * it is better tested and reads as a normal typeface rather than a novelty one,
 * which matters when the reader is choosing it in front of family.
 */
export const hyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-hyperlegible",
});

export const fontVariables = [
  fraunces.variable,
  sourceSans.variable,
  parisienne.variable,
  plexMono.variable,
  hyperlegible.variable,
].join(" ");
