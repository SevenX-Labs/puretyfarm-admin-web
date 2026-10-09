"use client";

import React from "react";
import { AlertTriangle, RotateCcw, LogIn, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

interface ErrorStateProps {
  error: string | Error | null;
  onRetry?: () => void;
  className?: string;
  isSessionExpired?: boolean;
}

export function ErrorState({
  error,
  onRetry,
  className = "",
  isSessionExpired: explicitExpired,
}: ErrorStateProps) {
  const router = useRouter();
  
  if (!error) return null;

  const errorMessage = typeof error === "string" ? error : error.message;
  const is401 =
    explicitExpired ||
    (typeof error === "object" && error !== null && "statusCode" in error && (error as { statusCode: number }).statusCode === 401) ||
    /unauthorized|session expired|jwt|token|401/i.test(errorMessage);

  const handleLoginRedirect = () => {
    if (typeof window !== "undefined") {
      const returnPath = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?expired=1&returnUrl=${returnPath}`);
    } else {
      router.push("/login?expired=1");
    }
  };

  if (is401) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`bg-[#FFD9D0] border-2 border-[#1A1A1A] rounded-[12px] p-5 font-mono shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-white border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#1A1A1A]">
            <ShieldAlert className="h-5 w-5 text-[#8C2E1D] stroke-[2.5]" />
          </div>
          <div>
            <div className="text-xs font-black uppercase text-[#1A1A1A] tracking-wider">
              SESSION EXPIRED OR UNAUTHORIZED
            </div>
            <p className="text-xs font-bold text-[#5C5647] mt-0.5">
              Your administrator session has ended. Please log in again to continue managing operations.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoginRedirect}
          className="h-10 px-5 bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black uppercase text-xs border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer shrink-0 select-none"
        >
          <LogIn className="h-4 w-4 stroke-[2.5]" />
          <span>SIGN IN AGAIN</span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`bg-[#FFD9D0] border-2 border-[#1A1A1A] rounded-[12px] p-4 font-mono shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-[6px] bg-white border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
          <AlertTriangle className="h-4 w-4 text-[#8C2E1D] stroke-[2.5]" />
        </div>
        <div className="text-xs font-bold text-[#1A1A1A]">
          <span className="font-black uppercase tracking-wider block sm:inline mr-2">Error:</span>
          <span>{errorMessage}</span>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-8 px-3.5 bg-white hover:bg-[#FAF7EC] text-[#1A1A1A] font-black uppercase text-xs border-2 border-[#1A1A1A] rounded-[6px] shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer shrink-0 select-none"
        >
          <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
