"use client";

import React from "react";
import { Menu } from "lucide-react";

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b-2 border-[#1A1A1A] bg-[#FAF7EC] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0px_2px_0px_0px_#1A1A1A]">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden flex h-9 w-9 items-center justify-center border-2 border-[#1A1A1A] bg-[#FFD84D] text-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5 stroke-[2.5]" />
          </button>
        )}
        <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1A1A1A] whitespace-nowrap">
          Welcome, Admin
        </h1>
      </div>
    </header>
  );
}
