"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteCookie } from "@/lib/cookies";
import { ShieldAlert, LogIn, AlertCircle } from "lucide-react";

export function SessionExpiredModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>(
    "Your operator session has expired or you are unauthorized. Please sign in again to access Raipur dairy operations."
  );
  const [returnUrl, setReturnUrl] = useState<string>("/");

  useEffect(() => {
    // Don't show modal if already on login page
    if (pathname === "/login") {
      setIsOpen(false);
      return;
    }

    const handleUnauthorized = (event: Event) => {
      if (pathname === "/login") return;

      const customEvent = event as CustomEvent<{
        message?: string;
        returnUrl?: string;
      }>;
      if (customEvent.detail?.message) {
        setMessage(customEvent.detail.message);
      }
      if (customEvent.detail?.returnUrl) {
        setReturnUrl(customEvent.detail.returnUrl);
      } else if (typeof window !== "undefined") {
        setReturnUrl(window.location.pathname + window.location.search);
      }
      setIsOpen(true);
    };

    window.addEventListener("pf:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("pf:unauthorized", handleUnauthorized);
    };
  }, [pathname]);

  const handleLoginAgain = () => {
    deleteCookie("admin_access_token");
    deleteCookie("admin_refresh_token");
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      localStorage.removeItem("pf_admin_user");
    }
    setIsOpen(false);
    const destination = returnUrl && returnUrl !== "/login" ? encodeURIComponent(returnUrl) : "";
    router.push(`/login?expired=1${destination ? `&returnUrl=${destination}` : ""}`);
  };

  if (pathname === "/login") return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md border-2 border-[#1A1A1A] bg-[#FFFDF7] shadow-[6px_6px_0px_0px_#1A1A1A] rounded-[14px] p-6"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b-2 border-[#1A1A1A] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-[10px] bg-[#FFD9D0] border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#1A1A1A]">
              <ShieldAlert className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black uppercase text-[#1A1A1A] tracking-tight leading-none">
                SESSION EXPIRED
              </DialogTitle>
              <div className="text-[11px] font-mono font-bold text-[#8C2E1D] uppercase mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>Re-Authentication Required</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-3" role="alert" aria-live="assertive">
          <DialogDescription className="text-xs sm:text-sm font-bold text-[#5C5647] leading-relaxed">
            {message}
          </DialogDescription>
          <div className="p-3 bg-[#FAF7EC] border-2 border-[#1A1A1A] rounded-[10px] text-[11px] font-mono font-bold text-[#1A1A1A]">
            ⚠️ Please log in again to continue managing subscriptions, dispatch routes, and customer accounts.
          </div>
        </div>

        <DialogFooter className="border-t-2 border-[#1A1A1A] pt-4 sm:justify-end">
          <button
            type="button"
            onClick={handleLoginAgain}
            className="w-full sm:w-auto px-6 h-11 bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black uppercase tracking-wider text-xs border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <LogIn className="h-4 w-4 stroke-[2.5]" />
            <span>SIGN IN AGAIN</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
