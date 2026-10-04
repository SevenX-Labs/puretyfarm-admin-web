import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 border-black px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-tight text-black transition-colors rounded-none",
  {
    variants: {
      variant: {
        default: "bg-[#FFDF58] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        secondary: "bg-white text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        outline: "bg-transparent text-black",
        butter: "bg-[#FFDF58] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        mint: "bg-[#B8E8B8] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        sage: "bg-[#B8E8B8] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        terracotta: "bg-[#FF8E72] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        rose: "bg-[#FF8E72] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        error: "bg-[#FF8E72] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        lavender: "bg-[#D8CEF6] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        girBrown: "bg-[#4A1513] text-white shadow-[1.5px_1.5px_0px_0px_#000000]",
        stone: "bg-[#EFEAE1] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
        amber: "bg-[#FFDF58] text-black shadow-[1.5px_1.5px_0px_0px_#000000]",
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
