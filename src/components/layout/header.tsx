"use client";

import React, { useState } from "react";
import { Zap, Clock, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [batchNotice, setBatchNotice] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleTriggerBatch = () => {
    setIsRunning(true);
    setBatchNotice("Executing 10:00 PM Order Generation Engine...");

    setTimeout(() => {
      setIsRunning(false);
      setBatchNotice("10:00 PM Batch Complete: 286 subscriptions processed, 482 L bulk milk locked!");
      setTimeout(() => setBatchNotice(null), 4000);
    }, 1200);
  };

  return (
    <header className="sticky top-0 z-20 border-b-2 border-black bg-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0px_2px_0px_0px_#000000]">
      {/* Left: Greeting & Status Pill */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-black uppercase tracking-tight text-black">
          Hello, Owner
        </h1>
        <span className="bg-[#B8E8B8] border-2 border-black px-2.5 py-0.5 text-xs font-black uppercase tracking-tight text-black shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-black inline-block animate-pulse" />
          All Systems Nominal
        </span>
      </div>

      {/* Right: Date, Trigger Batch CTA, Admin Profile */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 border-2 border-black bg-[#FBF8EE] px-3 py-1 font-mono text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000000]">
          <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Sunday, 04 Oct 2026 • Raipur Hub</span>
        </div>

        {/* Trigger 10 PM Batch CTA */}
        <button
          type="button"
          onClick={handleTriggerBatch}
          disabled={isRunning}
          className="flex items-center gap-2 bg-[#FFDF58] text-black font-extrabold uppercase text-xs px-3.5 py-1.5 border-2 border-black shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all disabled:opacity-50"
        >
          <Zap className="h-4 w-4 stroke-[3] fill-black" />
          <span>{isRunning ? "Running Batch..." : "Trigger 10 PM Batch"}</span>
        </button>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-1.5 border-2 border-black bg-white px-2.5 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000000]">
          <div className="h-5 w-5 rounded-none border border-black bg-[#4A1513] text-white flex items-center justify-center text-[10px] font-mono">
            AS
          </div>
          <span className="hidden sm:inline">Amit Sharma</span>
        </div>
      </div>

      {/* Notice Banner */}
      {batchNotice && (
        <div className="absolute top-16 left-6 right-6 z-50 mt-2 flex items-center gap-2 border-2 border-black bg-[#B8E8B8] p-3 text-xs font-bold text-black shadow-[4px_4px_0px_0px_#000000] animate-in fade-in-0 duration-150">
          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
          <span>{batchNotice}</span>
        </div>
      )}
    </header>
  );
}
