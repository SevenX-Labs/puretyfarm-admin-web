"use client";

import React from "react";
import { Milk, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-black bg-[#FFFDF7] px-6 py-3.5 flex items-center justify-between shadow-[0px_2px_0px_0px_#000000]">
      {/* Left Accent & Welcome Banner */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000]">
          <Sparkles className="h-4 w-4 stroke-[2.5] text-black" />
        </div>
        <div className="border-2 border-black bg-white px-3.5 py-1 shadow-[2px_2px_0px_0px_#000000]">
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-black">
            WELCOME
          </span>
        </div>
      </div>

      {/* Right Brand Badge with generous space between */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 border-2 border-black bg-[#FFDF58] px-3.5 py-1 shadow-[2px_2px_0px_0px_#000000]">
          <Milk className="h-4 w-4 stroke-[2.5] text-black" />
          <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-black">
            PURETYFARM
          </span>
        </div>
      </div>
    </header>
  );
}
