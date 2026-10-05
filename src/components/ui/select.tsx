import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "flex h-11 w-full appearance-none border-2 border-[#1A1A1A] bg-white px-3.5 py-2 pr-9 text-xs font-bold text-[#1A1A1A] uppercase tracking-wider rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD84D] focus-visible:bg-[#FFFDF7] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
