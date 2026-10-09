"use client";

import React from "react";

interface StatCardSkeletonProps {
  count?: number;
  className?: string;
}

export function StatCardSkeleton({ count = 1, className = "" }: StatCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`bg-white border-2 border-[#1A1A1A] p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col justify-between h-full min-h-[140px] animate-pulse motion-reduce:animate-none ${className}`}
          aria-busy="true"
          aria-label="Loading metric data"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-28 bg-stone-200 border border-[#1A1A1A]/20 rounded-[4px]" />
            <div className="h-9 w-9 rounded-[8px] bg-[#FFD84D]/40 border-2 border-[#1A1A1A]/30 shrink-0" />
          </div>

          <div className="space-y-2 mt-4">
            {/* Big metric skeleton */}
            <div className="h-8 w-32 bg-stone-300 border border-[#1A1A1A]/30 rounded-[6px]" />
            <div className="h-3 w-40 bg-stone-200 border border-[#1A1A1A]/20 rounded-[4px]" />
          </div>
        </div>
      ))}
    </>
  );
}
