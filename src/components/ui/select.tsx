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
            "flex h-9 w-full appearance-none border-2 border-black bg-white px-3 py-1.5 pr-8 text-xs font-bold text-black uppercase tracking-tight shadow-[2px_2px_0px_0px_#000000] transition-all focus-visible:outline-none focus-visible:shadow-[3px_3px_0px_0px_#000000] rounded-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-black stroke-[2.5]" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
