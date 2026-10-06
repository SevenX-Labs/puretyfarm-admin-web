"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Users,
  Package,
  CalendarDays,
  Wallet,
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
    name: "Wallets",
    href: "/wallet",
    icon: Wallet,
  },
  {
    name: "Payments",
    href: "/payments",
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
    <div className="flex flex-col h-full justify-between bg-[#FAF7EC]">
      {/* Brand Header */}
      <div className="p-4 border-b-2 border-[#1A1A1A] bg-[#FAF7EC] flex items-center justify-between">
        <Link
          href="/"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex-1 flex items-center gap-3 p-2.5 bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] transition-all"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#1A1A1A] bg-[#FFD84D] rounded-[6px] overflow-hidden shadow-[1px_1px_0px_0px_#1A1A1A]">
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
            <div className="font-black text-[#1A1A1A] text-base tracking-tight leading-none uppercase">
              Puretyfarm
            </div>
            <div className="mt-1 inline-block border border-[#1A1A1A] bg-white px-1.5 py-0.2 text-[9px] font-mono font-black uppercase text-[#1A1A1A] rounded-[4px]">
              Raipur Dispatch
            </div>
          </div>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center border-2 border-[#1A1A1A] bg-[#FFD9D0] text-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <div className="text-[11px] font-black uppercase tracking-wider text-[#5C5647] px-2 mb-2">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const isSettings = item.name === "Settings" || item.href === "/settings";
          const isActive =
            !isSettings &&
            (item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href));

          if (isSettings) {
            return (
              <button
                key={item.name}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  // No-op: settings disabled / static data hidden from admin
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-tight text-[#1A1A1A] transition-all border-2 rounded-[10px] bg-transparent border-transparent cursor-default select-none text-left"
              >
                <item.icon className="h-4 w-4 shrink-0 stroke-[2.5]" />
                <span>{item.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => isMobile && onCloseMobile?.()}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-tight text-[#1A1A1A] transition-all border-2 rounded-[10px]",
                isActive
                  ? "bg-[#FFD84D] border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                  : "bg-transparent border-transparent hover:border-[#1A1A1A] hover:bg-white hover:shadow-[2px_2px_0px_0px_#1A1A1A]"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status & Logout */}
      <div className="p-4 border-t-2 border-[#1A1A1A] bg-[#FAF7EC] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647]">
            Session
          </span>
          <span className="bg-[#B9E8B4] border-2 border-[#1A1A1A] text-[#1A1A1A] font-mono text-[10px] font-black px-2 py-0.5 rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A] whitespace-nowrap">
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
          className="w-full flex items-center justify-center gap-2 bg-[#FFD9D0] hover:bg-[#FFC6B8] text-[#1A1A1A] font-black uppercase text-xs py-2.5 px-3 border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4 stroke-[2.5]" />
          <span>Exit Console</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30 border-r-2 border-[#1A1A1A] bg-[#FAF7EC]">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#1A1A1A]/60 backdrop-blur-xs lg:hidden animate-in fade-in-0 duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r-2 border-[#1A1A1A] bg-[#FAF7EC] transform transition-transform duration-300 ease-in-out lg:hidden shadow-[5px_0px_0px_0px_#1A1A1A]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderNavContent(true)}
      </div>
    </>
  );
}
