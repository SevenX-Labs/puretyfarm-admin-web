"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Users,
  Package,
  CalendarDays,
  CreditCard,
  MapPin,
  Settings,
  LogOut,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    icon: Zap,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Orders",
    href: "/orders",
    icon: Package,
  },
  {
    name: "Plans & Subscriptions",
    href: "/plans",
    icon: CalendarDays,
  },
  {
    name: "Wallets & Payments",
    href: "/wallet",
    icon: CreditCard,
  },
  {
    name: "Serviceability",
    href: "/serviceability",
    icon: MapPin,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { logout, admin } = useAuth();

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between">
      {/* Brand Header */}
      <div className="p-4 border-b-2 border-black bg-[#FBF8EE] flex items-center justify-between">
        <Link
          href="/"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex-1 flex items-center gap-3 p-3 bg-[#FFDF58] border-2 border-black shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-[#FFDF58] overflow-hidden shadow-[1px_1px_0px_0px_#000000]">
            <Image
              src="/gir-cow-logo.jpg"
              alt="Puretyfarm Gir Cow"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <div className="font-black text-black text-lg tracking-tight leading-none uppercase">
              Puretyfarm
            </div>
            <div className="mt-1 inline-block border border-black bg-white px-1.5 py-0.2 text-[9px] font-mono font-black uppercase text-black">
              Raipur Dispatch
            </div>
          </div>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-[#FF8E72] text-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Navigation Items (Phase 1 Only) */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="text-[10px] font-black uppercase tracking-wider text-stone-500 px-1 mb-2">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && onCloseMobile?.()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-tight text-black transition-all border-2",
                isActive
                  ? "bg-[#FFDF58] border-black shadow-[3px_3px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                  : "bg-white border-transparent hover:border-black hover:bg-[#FFFDF7] hover:shadow-[2px_2px_0px_0px_#000000]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status & Logout */}
      <div className="p-4 border-t-2 border-black bg-[#FBF8EE] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">
            Current Session
          </span>
          <span className="bg-[#B8E8B8] border-2 border-black text-black font-mono text-[10px] font-black px-2 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000000] whitespace-nowrap">
            {admin?.role ? `${admin.role} / OWNER` : "ADMIN / OWNER"}
          </span>
        </div>

        {/* Hard-shadow Logout Button */}
        <button
          type="button"
          onClick={() => {
            if (isMobile) onCloseMobile?.();
            logout();
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#FF8E72] hover:bg-[#FF7250] text-black font-black uppercase text-xs py-2 px-3 border-2 border-black shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 stroke-[2.5]" />
          <span>Exit Console</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar (Visible lg and above) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-white border-r-2 border-black shadow-[4px_0px_0px_0px_#000000]">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Drawer Navigation (Visible < lg when opened) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Drawer */}
          <aside className="relative z-50 flex w-72 max-w-[85vw] flex-col bg-white border-r-4 border-black shadow-[6px_0px_0px_0px_#000000] animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
