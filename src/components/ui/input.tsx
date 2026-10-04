import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full border-2 border-black bg-white px-3 py-1.5 text-xs text-black font-medium shadow-[2px_2px_0px_0px_#000000] transition-all placeholder:text-stone-400 focus-visible:outline-none focus-visible:shadow-[3px_3px_0px_0px_#000000] focus-visible:bg-[#FFFDF7] disabled:cursor-not-allowed disabled:opacity-50 rounded-none",
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
