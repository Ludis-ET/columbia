import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Restyled from the shadcn default.
 *
 * Two deliberate departures:
 *  - Sizes start at 48px, not shadcn's 32px. CLAUDE.md sets a 48x48 target floor
 *    because the primary readers are older adults, often on a phone.
 *  - Radius is 4px, not 10px, and colours come from brand tokens.
 *
 * The `dense` size is 44px and exists only for the admin console (Phase 5),
 * where interaction is mouse-driven and tables get long. Never use it on a
 * public page.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded",
    "font-semibold whitespace-nowrap transition-colors outline-none select-none",
    "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  ],
  {
    variants: {
      variant: {
        default: "bg-ink text-paper hover:bg-sage-deep",
        // `outline` and `secondary` are the same treatment. Both names exist
        // because shadcn's generated components reference `outline`, and
        // dropping it breaks every future `shadcn add`.
        outline: "border-rule-strong text-ink hover:border-sage hover:text-sage-deep border",
        secondary: "border-rule-strong text-ink hover:border-sage hover:text-sage-deep border",
        soft: "bg-sage-wash text-sage-deep hover:bg-sage hover:text-paper",
        ghost: "text-ink-soft hover:bg-paper-sunk hover:text-ink",
        link: "text-sage-deep h-auto p-0 underline underline-offset-4 hover:no-underline",
        destructive: "bg-danger text-paper hover:opacity-90",
      },
      size: {
        default: "min-h-12 px-6 text-[1rem]",
        lg: "min-h-14 px-8 text-[1.0625rem]",
        icon: "size-12",
        // Sizes below the 48px floor are for the admin console and for shadcn's
        // own chrome (dialog and sheet close buttons). Never on a public page.
        sm: "min-h-11 px-4 text-[0.9375rem]",
        dense: "min-h-11 px-4 text-[0.9375rem]",
        "icon-sm": "size-11",
        "icon-dense": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
