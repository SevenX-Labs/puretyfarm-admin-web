"use client";

import React from "react";
import { FolderOpen, FilterX, RotateCcw } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  isFiltered?: boolean;
  onClearFilters?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  isFiltered = false,
  onClearFilters,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`py-12 px-6 flex flex-col items-center justify-center text-center space-y-3.5 ${className}`}
      role="status"
    >
      <div className="w-14 h-14 rounded-[12px] bg-[#FAF7EC] border-2 border-[#1A1A1A] flex items-center justify-center text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] shrink-0">
        {icon || (isFiltered ? <FilterX className="h-6 w-6 stroke-[2.5]" /> : <FolderOpen className="h-6 w-6 stroke-[2.5]" />)}
      </div>

      <div className="max-w-md space-y-1">
        <h3 className="text-base font-black uppercase text-[#1A1A1A] tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs font-bold text-[#5C5647] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {isFiltered && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-2 h-9 px-4 bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black uppercase text-xs border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer select-none"
        >
          <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Clear Active Filters</span>
        </button>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
