"use client";

import React, { useState } from "react";
import {
  DatePreset,
  DateRange,
  getDateRangeForPreset,
  getTodayIST,
} from "@/lib/date-filter";
import { Calendar, ChevronDown, Clock, ArrowRight } from "lucide-react";

export interface DatePresetFilterProps {
  activePreset: DatePreset;
  startDate: string;
  endDate: string;
  includeTomorrow?: boolean;
  onPresetChange: (preset: DatePreset, range: DateRange) => void;
  onRangeChange?: (range: DateRange) => void;
  className?: string;
  compact?: boolean;
}

export function DatePresetFilter({
  activePreset,
  startDate,
  endDate,
  includeTomorrow = false,
  onPresetChange,
  onRangeChange,
  className = "",
  compact = false,
}: DatePresetFilterProps) {
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(activePreset === "CUSTOM");

  const presets: { id: DatePreset; label: string }[] = [
    { id: "TODAY", label: "Today" },
    ...(includeTomorrow ? [{ id: "TOMORROW" as DatePreset, label: "Tomorrow" }] : []),
    { id: "WEEK", label: "Week" },
    { id: "MONTH", label: "Month" },
    { id: "ALL", label: "All" },
    { id: "CUSTOM", label: "Custom" },
  ];

  const handleSelectPreset = (p: DatePreset) => {
    if (p === "CUSTOM") {
      setShowCustomInputs(true);
      const today = getTodayIST();
      const currentStart = startDate || today;
      const currentEnd = endDate || today;
      onPresetChange("CUSTOM", { startDate: currentStart, endDate: currentEnd });
      return;
    }

    setShowCustomInputs(false);
    const range = getDateRangeForPreset(p);
    onPresetChange(p, range);
  };

  const handleStartChange = (val: string) => {
    const today = getTodayIST();
    const end = endDate || today;
    const newRange: DateRange = { startDate: val, endDate: end };
    if (onRangeChange) {
      onRangeChange(newRange);
    } else {
      onPresetChange("CUSTOM", newRange);
    }
  };

  const handleEndChange = (val: string) => {
    const today = getTodayIST();
    const start = startDate || today;
    const newRange: DateRange = { startDate: start, endDate: val };
    if (onRangeChange) {
      onRangeChange(newRange);
    } else {
      onPresetChange("CUSTOM", newRange);
    }
  };

  const handleSetToCurrent = () => {
    const today = getTodayIST();
    handleEndChange(today);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 ${className}`}>
      {/* Preset Pills */}
      <div className="inline-flex flex-wrap rounded-[10px] border-2 border-black p-0.5 bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] gap-0.5">
        {presets.map((p) => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 sm:px-3 py-1 rounded-[7px] text-[11px] sm:text-xs font-black uppercase tracking-tight transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[1px_1px_0px_0px_#000000]"
                  : "text-[#5C5647] hover:text-[#1A1A1A] hover:bg-white border-2 border-transparent"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Range Controls (Visible when CUSTOM is selected) */}
      {(showCustomInputs || activePreset === "CUSTOM") && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border-2 border-black rounded-[10px] shadow-[2px_2px_0px_0px_#000000]">
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#5C5647] pl-1">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartChange(e.target.value)}
              className="h-7 px-1.5 border border-black rounded-[5px] text-xs font-mono font-bold text-[#1A1A1A] bg-[#FAF7EC] focus:bg-white focus:outline-none"
              aria-label="From Date"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#5C5647]">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndChange(e.target.value)}
              className="h-7 px-1.5 border border-black rounded-[5px] text-xs font-mono font-bold text-[#1A1A1A] bg-[#FAF7EC] focus:bg-white focus:outline-none"
              aria-label="To Date"
            />
          </div>

          <button
            type="button"
            onClick={handleSetToCurrent}
            className="h-7 px-2 bg-[#FAF7EC] hover:bg-[#FFDF58] border border-black rounded-[5px] text-[10px] font-mono font-black uppercase text-[#1A1A1A] transition-colors cursor-pointer"
            title="Set To Date to Today"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );
}
