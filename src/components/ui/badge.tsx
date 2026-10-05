import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 border-[#1A1A1A] px-2 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] transition-colors rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]",
  {
    variants: {
      variant: {
        default: "bg-[#FFD84D] text-[#1A1A1A]",
        primary: "bg-[#FFD84D] text-[#1A1A1A]",
        butter: "bg-[#FFD84D] text-[#1A1A1A]",
        secondary: "bg-white text-[#1A1A1A]",
        outline: "bg-transparent text-[#1A1A1A] shadow-none",
        active: "bg-[#B9E8B4] text-[#1A1A1A]",
        mint: "bg-[#8FD694] text-[#1A1A1A]",
        sage: "bg-[#B9E8B4] text-[#1A1A1A]",
        inactive: "bg-[#E4DFD0] text-[#1A1A1A]",
        disabled: "bg-[#E4DFD0] text-[#1A1A1A]",
        stone: "bg-[#E4DFD0] text-[#1A1A1A]",
        destructive: "bg-[#FFD9D0] text-[#1A1A1A]",
        danger: "bg-[#FFD9D0] text-[#1A1A1A]",
        error: "bg-[#FFD9D0] text-[#1A1A1A]",
        terracotta: "bg-[#FFD9D0] text-[#1A1A1A]",
        rose: "bg-[#FFD9D0] text-[#1A1A1A]",
        maroon: "bg-[#4A1515] text-white",
        girBrown: "bg-[#4A1515] text-white",
        lavender: "bg-[#D8CEF6] text-[#1A1A1A]",
        amber: "bg-[#FFD84D] text-[#1A1A1A]",
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
