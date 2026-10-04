import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center border-2 border-black font-extrabold text-xs uppercase tracking-tight text-black transition-all outline-none select-none rounded-none shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#FFDF58] text-black hover:bg-[#FFD13B]",
        primary: "bg-[#FFDF58] text-black hover:bg-[#FFD13B]",
        secondary: "bg-white text-black hover:bg-[#FBF8EE]",
        outline: "bg-white text-black hover:bg-[#FBF8EE]",
        terracotta: "bg-[#FF8E72] text-black hover:bg-[#FF7250]",
        destructive: "bg-[#FF8E72] text-black hover:bg-[#FF7250]",
        mint: "bg-[#B8E8B8] text-black hover:bg-[#9fe09f]",
        girBrown: "bg-[#4A1513] text-white hover:bg-[#591C18]",
        ghost: "border-transparent shadow-none hover:bg-black/5 hover:translate-x-0 hover:translate-y-0",
        link: "border-transparent shadow-none underline-offset-4 hover:underline hover:translate-x-0 hover:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 px-2 text-[10px]",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
        icon: "size-9 p-0",
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
