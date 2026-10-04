"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  CalendarDays,
  Wallet,
  MapPin,
  Settings,
  Milk,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    name: "Plans & Subscriptions",
    href: "/plans",
    icon: CalendarDays,
  },
  {
    name: "Wallets & Payments",
    href: "/wallet",
    icon: Wallet,
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#133826] text-stone-300 shadow-xl transition-all">
      {/* Top Branding */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-300">
            <Milk className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white text-base tracking-tight leading-none">
              Puretyfarm
            </div>
            <div className="text-[11px] text-emerald-300/80 font-medium mt-1">
              A2 Gir Cow Milk
            </div>
          </div>
        </Link>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
          Raipur
        </span>
      </div>

      {/* Navigation List - Only 6 Phase 1 items + Dashboard */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-white/10 text-white font-medium shadow-2xs"
                  : "text-stone-300 hover:bg-white/5 hover:text-white"
              )}
            >
              {/* Subtle 3px active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-emerald-400" />
              )}
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-emerald-400" : "text-stone-400"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer: Minimal profile card */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-800 text-xs font-semibold text-emerald-100">
              PF
            </div>
            <div className="truncate">
              <div className="text-xs font-medium text-white truncate">
                Admin
              </div>
              <div className="text-[10px] text-stone-400 truncate">
                Raipur Branch
              </div>
            </div>
          </div>

          <button
            type="button"
            title="Log out"
            onClick={() => {
              if (typeof window !== "undefined") {
                alert("Logged out of Raipur Admin session.");
              }
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
