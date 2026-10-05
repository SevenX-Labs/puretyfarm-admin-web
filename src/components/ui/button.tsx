import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center border-2 border-[#1A1A1A] font-extrabold text-xs uppercase tracking-tight text-[#1A1A1A] transition-all outline-none select-none rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-[#FFD84D] text-[#1A1A1A] hover:bg-[#E6C23D]",
        primary: "bg-[#FFD84D] text-[#1A1A1A] hover:bg-[#E6C23D]",
        secondary: "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]",
        outline: "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]",
        destructive: "bg-[#FFD9D0] text-[#1A1A1A] hover:bg-[#FFC6B8]",
        danger: "bg-[#FFD9D0] text-[#1A1A1A] hover:bg-[#FFC6B8]",
        terracotta: "bg-[#FFD9D0] text-[#1A1A1A] hover:bg-[#FFC6B8]",
        mint: "bg-[#8FD694] text-[#1A1A1A] hover:bg-[#7BC880]",
        maroon: "bg-[#4A1515] text-white hover:bg-[#5E1B1B]",
        girBrown: "bg-[#4A1515] text-white hover:bg-[#5E1B1B]",
        ghost: "border-transparent shadow-none hover:bg-black/5 hover:translate-x-0 hover:translate-y-0",
        link: "border-transparent shadow-none underline-offset-4 hover:underline hover:translate-x-0 hover:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        xs: "h-6 px-2 text-[10px]",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
