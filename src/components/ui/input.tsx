import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full border-2 border-[#1A1A1A] bg-white px-3.5 py-2 text-sm text-[#1A1A1A] font-semibold rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] transition-all placeholder:text-[#5C5647]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD84D] focus-visible:bg-[#FFFDF7] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
