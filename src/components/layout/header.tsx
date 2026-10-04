"use client";

import React, { useState } from "react";
import { Bell, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "12 customers with low wallet balance",
      desc: "Recharge reminders sent via SMS before 10:00 PM cutoff.",
      time: "25m ago",
    },
    {
      id: 2,
      title: "Tomorrow's dispatch volume confirmed",
      desc: "482 Liters scheduled across active Raipur sectors.",
      time: "1h ago",
    },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-stone-200/70 bg-white/90 px-8 backdrop-blur-md">
      {/* Left: Active Raipur Time & Calm Context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-100/70 px-3 py-1.5 rounded-lg border border-stone-200/50">
          <Calendar className="h-3.5 w-3.5 text-[#133826]" />
          <span className="font-medium text-stone-800">
            Sunday, 04 Oct 2026
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-stone-500 font-mono tabular-nums">
            10:00 PM Cutoff
          </span>
        </div>

        <Badge variant="sage" className="hidden sm:inline-flex text-[11px] py-0.5">
          Morning Deliveries Before 09:00 AM
        </Badge>
      </div>

      {/* Right: Notification & Admin Profile */}
      <div className="flex items-center gap-4">
        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/80 bg-white text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#133826] text-[9px] font-bold text-white shadow-xs">
              2
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-semibold text-stone-900">
                  Operations Notifications
                </span>
                <span className="text-[10px] text-stone-400">2 unread</span>
              </div>
              <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
                {notifications.map((item) => (
                  <div key={item.id} className="py-2.5">
                    <p className="text-xs font-medium text-stone-900 leading-snug">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {item.desc}
                    </p>
                    <span className="text-[10px] text-stone-400 mt-1 block">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-stone-100 text-center">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-medium text-[#133826] hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-stone-200">
          <div className="h-8 w-8 rounded-full bg-[#133826] text-white flex items-center justify-center text-xs font-semibold">
            AS
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-stone-900 leading-none">
              Amit Sharma
            </div>
            <div className="text-[10px] text-stone-500 mt-1 leading-none">
              Raipur Operations
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
