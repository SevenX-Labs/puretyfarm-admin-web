"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Package,
  Truck,
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
    name: "Manage Deliveries",
    href: "/deliveries",
    icon: Truck,
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
  const { logout } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key and trap focus within the drawer when mobile menu is open
  useEffect(() => {
    if (!isMobileOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseMobile?.();
        return;
      }

      if (e.key === "Tab" && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Focus close button or first element on open
    const timer = setTimeout(() => {
      const firstBtn = drawerRef.current?.querySelector<HTMLElement>("button, a");
      firstBtn?.focus();
    }, 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isMobileOpen, onCloseMobile]);

  const renderContent = (isMobile = false) => (
    <div className="flex h-full flex-col justify-between bg-[#FAF7EC]">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b-2 border-[#1A1A1A] bg-white flex items-center justify-between">
        <Link
          href="/"
          onClick={() => isMobile && onCloseMobile?.()}
          className="flex items-center gap-3 group min-h-[44px]"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black uppercase tracking-tight text-[#1A1A1A] leading-none">
                PURETYFARM
              </span>
              <span className="bg-[#FFD84D] border border-[#1A1A1A] text-[#1A1A1A] font-black uppercase text-[9px] px-1.5 py-0.2 rounded-[4px]">
                ADMIN
              </span>
            </div>
            <div className="text-[10px] font-mono font-bold text-[#5C5647] uppercase mt-0.5">
              Raipur Operations
            </div>
          </div>
        </Link>

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] border-2 border-[#1A1A1A] bg-[#FFD9D0] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5 stroke-[3]" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        <div className="text-[11px] font-black uppercase tracking-wider text-[#5C5647] px-2 mb-2">
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
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-tight text-[#1A1A1A] transition-all border-2 rounded-[10px]",
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
      <div className="p-4 border-t-2 border-[#1A1A1A] bg-[#FAF7EC]">
        {/* Hub Indicator with inline logout */}
        <div className="p-2.5 rounded-[10px] border-2 border-[#1A1A1A] bg-white shadow-[2px_2px_0px_0px_#1A1A1A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8FD694] border border-[#1A1A1A] animate-pulse" />
            <span className="text-[11px] font-mono font-black uppercase text-[#1A1A1A]">
              Raipur Hub Live
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log Out"
            aria-label="Log Out of console"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] border-2 border-[#1A1A1A] bg-[#FFD9D0] hover:bg-[#FFC6B8] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r-2 border-[#1A1A1A] bg-[#FAF7EC]">
        {renderContent(false)}
      </aside>

      {/* Mobile Slide-Out Drawer (below 1024px) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            ref={drawerRef}
            className="fixed inset-y-0 left-0 w-4/5 max-w-xs border-r-2 border-[#1A1A1A] bg-[#FAF7EC] shadow-[6px_0px_0px_0px_#1A1A1A] animate-in slide-in-from-left duration-200"
          >
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
