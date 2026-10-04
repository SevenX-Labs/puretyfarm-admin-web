import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#133826] text-white shadow-2xs hover:bg-[#1B4332]",
        secondary:
          "border-stone-200/60 bg-stone-100 text-stone-600",
        outline:
          "border-stone-300 text-stone-700 bg-white",
        success:
          "border-emerald-200/60 bg-emerald-50 text-emerald-800",
        sage:
          "border-emerald-200/60 bg-emerald-50 text-emerald-800",
        amber:
          "border-amber-200/60 bg-amber-50 text-amber-800",
        warning:
          "border-amber-200/60 bg-amber-50 text-amber-800",
        stone:
          "border-stone-200/60 bg-stone-100 text-stone-600",
        paused:
          "border-stone-200/60 bg-stone-100 text-stone-600",
        error:
          "border-rose-200/60 bg-rose-50 text-rose-800",
        rose:
          "border-rose-200/60 bg-rose-50 text-rose-800",
        // Backward-compatible aliases:
        mint:
          "border-emerald-200/60 bg-emerald-50 text-emerald-800",
        gold:
          "border-amber-200/60 bg-amber-50 text-amber-800",
        terracotta:
          "border-rose-200/60 bg-rose-50 text-rose-800",
        pine:
          "border-stone-200/60 bg-stone-100 text-[#133826]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
