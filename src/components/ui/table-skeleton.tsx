"use client";

import React from "react";

interface TableSkeletonProps {
  columns?: number;
  colSpan?: number;
  rows?: number;
  columnWidths?: (string | number)[];
  className?: string;
}

export function TableSkeleton({
  columns,
  colSpan,
  rows = 5,
  columnWidths,
  className = "",
}: TableSkeletonProps) {
  const effectiveCols = columns ?? colSpan ?? 5;
  return (
    <tbody
      className={`divide-y-2 divide-[#1A1A1A] bg-white ${className}`}
      aria-busy="true"
      aria-label="Loading table data"
    >
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse motion-reduce:animate-none bg-[#FAF7EC]/20 hover:bg-[#FAF7EC]/40 transition-colors">
          {Array.from({ length: effectiveCols }).map((_, cIdx) => {
            const isLast = cIdx === effectiveCols - 1;
            const customWidth = columnWidths?.[cIdx];
            
            // Varied placeholder widths to look organic
            const widthPct = customWidth ?? (40 + ((rIdx * 17 + cIdx * 23) % 45));

            return (
              <td
                key={cIdx}
                className={`py-3.5 px-4 ${isLast ? "text-right" : "border-r-2 border-[#1A1A1A]"}`}
              >
                <div
                  className={`h-4 bg-stone-200 border border-[#1A1A1A]/20 rounded-[5px] ${
                    isLast ? "ml-auto" : ""
                  }`}
                  style={{
                    width: typeof widthPct === "number" ? `${widthPct}%` : widthPct,
                    maxWidth: isLast ? "80px" : "180px",
                    minWidth: "32px",
                  }}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
}
