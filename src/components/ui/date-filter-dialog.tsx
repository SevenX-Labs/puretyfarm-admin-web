"use client";

import React, { useState, useEffect } from "react";
import {
  DatePreset,
  DateRange,
  getDateRangeForPreset,
  formatDateRangeLabel,
  getTodayIST,
} from "@/lib/date-filter";
import {
  Calendar,
  ChevronDown,
  X,
  SlidersHorizontal,
  Clock,
  Check,
  RotateCcw,
} from "lucide-react";

export interface DateFilterDialogProps {
  activePreset: DatePreset;
  startDate: string;
  endDate: string;
  onApply: (preset: DatePreset, range: DateRange) => void;
  className?: string;
  buttonLabel?: string;
}

export function DateFilterDialog({
  activePreset,
  startDate,
  endDate,
  onApply,
  className = "",
  buttonLabel,
}: DateFilterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempPreset, setTempPreset] = useState<DatePreset>(activePreset);
  const [tempStartDate, setTempStartDate] = useState<string>(startDate);
  const [tempEndDate, setTempEndDate] = useState<string>(endDate);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setTempPreset(activePreset);
      setTempStartDate(startDate);
      setTempEndDate(endDate);
    }
  }, [isOpen, activePreset, startDate, endDate]);

  const handleSelectPreset = (preset: DatePreset) => {
    setTempPreset(preset);
    if (preset !== "CUSTOM") {
      const range = getDateRangeForPreset(preset);
      setTempStartDate(range.startDate);
      setTempEndDate(range.endDate);
    }
  };

  const handleApply = () => {
    onApply(tempPreset, {
      startDate: tempStartDate,
      endDate: tempEndDate,
    });
    setIsOpen(false);
  };

  const handleResetToToday = () => {
    const today = getTodayIST();
    setTempPreset("TODAY");
    setTempStartDate(today);
    setTempEndDate(today);
    onApply("TODAY", { startDate: today, endDate: today });
    setIsOpen(false);
  };

  const currentLabel = formatDateRangeLabel(activePreset, startDate, endDate);

  const dayPresets: { id: DatePreset; label: string }[] = [
    { id: "TODAY", label: "Today" },
    { id: "TOMORROW", label: "Tomorrow" },
    { id: "YESTERDAY", label: "Yesterday" },
  ];

  const weekPresets: { id: DatePreset; label: string }[] = [
    { id: "THIS_WEEK", label: "This Week" },
    { id: "NEXT_WEEK", label: "Next Week" },
    { id: "LAST_WEEK", label: "Last Week" },
  ];

  const monthPresets: { id: DatePreset; label: string }[] = [
    { id: "THIS_MONTH", label: "This Month" },
    { id: "NEXT_MONTH", label: "Next Month" },
    { id: "LAST_MONTH", label: "Last Month" },
    { id: "ALL", label: "All Dates" },
  ];

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`h-9 px-3 sm:px-3.5 rounded-[10px] border-2 border-black transition-all cursor-pointer flex items-center gap-2 text-xs font-black uppercase tracking-tight shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
          activePreset !== "TODAY"
            ? "bg-[#FFDF58] text-[#1A1A1A]"
            : "bg-white hover:bg-[#FAF7EC] text-[#1A1A1A]"
        }`}
      >
        <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
        <span>{buttonLabel ? `${buttonLabel}: ${currentLabel}` : currentLabel}</span>
        <ChevronDown className="h-3 w-3 stroke-[2.5] opacity-70" />
      </button>

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-white border-2 border-black rounded-[14px] shadow-[6px_6px_0px_0px_#000000] overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-black bg-[#FAF7EC]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[6px] border-2 border-black bg-[#FFDF58] shadow-[1px_1px_0px_0px_#000000]">
                  <Calendar className="h-4 w-4 stroke-[2.5] text-[#1A1A1A]" />
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase text-[#1A1A1A] tracking-tight">
                    Filter By Date
                  </h3>
                  <p className="text-[11px] font-bold text-[#5C5647]">
                    Filter orders and deliveries by exact schedule date.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close dialog"
                className="h-8 w-8 rounded-[6px] border-2 border-black bg-white hover:bg-[#FFD9D0] flex items-center justify-center text-[#1A1A1A] cursor-pointer transition-colors shadow-[1px_1px_0px_0px_#000000]"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* 1. Day Options */}
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#5C5647] block mb-1.5">
                  Single Days
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {dayPresets.map((p) => {
                    const isSelected = tempPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id)}
                        className={`h-9 rounded-[8px] border-2 border-black font-black text-xs uppercase transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                            : "bg-[#FAF7EC] hover:bg-white text-[#5C5647] hover:text-[#1A1A1A]"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Week Options */}
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#5C5647] block mb-1.5">
                  Week Periods
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {weekPresets.map((p) => {
                    const isSelected = tempPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id)}
                        className={`h-9 rounded-[8px] border-2 border-black font-black text-xs uppercase transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                            : "bg-[#FAF7EC] hover:bg-white text-[#5C5647] hover:text-[#1A1A1A]"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Month & All Options */}
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#5C5647] block mb-1.5">
                  Month Periods & Overall
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {monthPresets.map((p) => {
                    const isSelected = tempPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id)}
                        className={`h-9 rounded-[8px] border-2 border-black font-black text-xs uppercase transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                            : "bg-[#FAF7EC] hover:bg-white text-[#5C5647] hover:text-[#1A1A1A]"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Custom Date Range */}
              <div className="p-3 bg-[#FAF7EC] border-2 border-black rounded-[10px] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      id="custom-preset-radio"
                      name="preset-radio"
                      checked={tempPreset === "CUSTOM"}
                      onChange={() => setTempPreset("CUSTOM")}
                      className="accent-black h-3.5 w-3.5"
                    />
                    <label
                      htmlFor="custom-preset-radio"
                      className="text-xs font-black uppercase text-[#1A1A1A] cursor-pointer"
                    >
                      Custom Date Range
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const today = getTodayIST();
                      setTempPreset("CUSTOM");
                      setTempEndDate(today);
                    }}
                    className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-black bg-white hover:bg-[#FFDF58] text-[#1A1A1A] transition-colors cursor-pointer"
                  >
                    Set End to Today
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono font-bold text-[#5C5647] block mb-1">
                      From Date:
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => {
                        setTempStartDate(e.target.value);
                        setTempPreset("CUSTOM");
                      }}
                      className="w-full h-9 px-2.5 rounded-[6px] border-2 border-black bg-white font-mono text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-bold text-[#5C5647] block mb-1">
                      To Date:
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => {
                        setTempEndDate(e.target.value);
                        setTempPreset("CUSTOM");
                      }}
                      className="w-full h-9 px-2.5 rounded-[6px] border-2 border-black bg-white font-mono text-xs font-bold text-[#1A1A1A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t-2 border-black bg-[#FAF7EC] flex flex-wrap items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleResetToToday}
                className="h-9 px-3 rounded-[8px] border-2 border-black bg-white hover:bg-stone-100 text-[#5C5647] hover:text-[#1A1A1A] font-black text-xs uppercase transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>Reset to Today</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-9 px-3 rounded-[8px] border-2 border-black bg-white hover:bg-stone-100 text-[#1A1A1A] font-black text-xs uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="h-9 px-4 rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#FFD84D] text-[#1A1A1A] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Apply Filter</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
