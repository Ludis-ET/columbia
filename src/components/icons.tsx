import {
  Sunrise,
  Coffee,
  BookOpen,
  Palette,
  Utensils,
  Armchair,
  Trees,
  CookingPot,
  UtensilsCrossed,
  Music,
  MoonStar,
  Moon,
  HouseHeart,
  Shield,
  Pill,
  Soup,
  Users,
  Car,
  House,
  Heart,
  Phone,
  MapPin,
  HandHeart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icon system.
 *
 * The client's infographic already assigns an icon and a colour to every
 * schedule entry and every service. Those assignments live in
 * content/source-of-truth.json under `assets.icons`; this file maps each name
 * to a glyph and renders it in the client's own coloured-circle badge treatment.
 *
 * Glyphs are lucide rather than hand-traced: the client's set is 23 icons, and
 * lucide covers every one at consistent weight with maintained a11y. The marks
 * that are actually unique to this brand — the monogram, the heart-shield, the
 * laurel, the wave — are hand-drawn in ./brand.
 */

const GLYPHS = {
  // timeline
  sunrise: Sunrise,
  "coffee-cup": Coffee,
  "open-book": BookOpen,
  palette: Palette,
  "plate-heart": Utensils,
  "armchair-clock": Armchair,
  tree: Trees,
  "cooking-pot": CookingPot,
  "fork-knife": UtensilsCrossed,
  "music-note": Music,
  "moon-stars": MoonStar,
  moon: Moon,
  "house-heart": HouseHeart,
  // every day / services
  shield: Shield,
  capsule: Pill,
  bowl: Soup,
  people: Users,
  car: Car,
  house: House,
  heart: Heart,
  // contact
  phone: Phone,
  "map-pin": MapPin,
  "heart-in-hands": HandHeart,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof GLYPHS;

export function isIconName(name: string): name is IconName {
  return name in GLYPHS;
}

/** The accent families from the infographic's own badge colours. */
export type Accent = "navy" | "sage" | "blue" | "violet" | "amber" | "rose";

/** Badge fills. Always paired with a white glyph, so these stay fixed across themes. */
const ACCENT_BG: Record<Accent, string> = {
  navy: "bg-[var(--ink)]",
  sage: "bg-[var(--sage-deep)]",
  blue: "bg-[var(--accent-blue)]",
  violet: "bg-[var(--accent-violet)]",
  amber: "bg-[var(--accent-amber)]",
  rose: "bg-[var(--accent-rose)]",
};

/** Text-safe accent for the current ground — used for headings beside a badge. */
export const ACCENT_TEXT: Record<Accent, string> = {
  navy: "text-ink",
  sage: "text-sage-deep",
  blue: "text-[var(--accent-blue-on)]",
  violet: "text-[var(--accent-violet-on)]",
  amber: "text-[var(--accent-amber-on)]",
  rose: "text-[var(--accent-rose-on)]",
};

/** A bare glyph, inheriting colour and size from its parent. */
export function Icon({
  name,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  const Glyph = GLYPHS[name];
  return <Glyph className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/**
 * A glyph in a filled circle, the treatment used throughout the infographic.
 * Always decorative — the adjacent heading carries the meaning.
 */
export function IconBadge({
  name,
  accent = "navy",
  className,
  size = "md",
}: {
  name: IconName;
  accent?: Accent;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dimensions = {
    sm: "size-10 [&>svg]:size-5",
    md: "size-14 [&>svg]:size-7",
    lg: "size-20 [&>svg]:size-10",
  }[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-white",
        ACCENT_BG[accent],
        dimensions,
        className,
      )}
    >
      <Icon name={name} strokeWidth={1.9} />
    </span>
  );
}
