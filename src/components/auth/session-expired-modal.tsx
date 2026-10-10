"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteCookie } from "@/lib/cookies";
import { invalidateCache } from "@/lib/cache";
import { useAuth } from "@/context/auth-context";
import {
  ShieldAlert,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export function SessionExpiredModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { login, admin } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>(
    "Your operator session has expired or is unauthorized. Please sign in again to restore live Raipur dairy operations."
  );
  const [returnUrl, setReturnUrl] = useState<string>("/");

  // In-modal login credentials
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize email from previous session or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const lastEmail =
        localStorage.getItem("pf_last_admin_email") ||
        admin?.email ||
        "";
      if (lastEmail && !email) {
        setEmail(lastEmail);
      }
    }
  }, [admin, email]);

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

      // Pre-fill email if stored
      if (typeof window !== "undefined") {
        const lastEmail =
          localStorage.getItem("pf_last_admin_email") ||
          admin?.email ||
          "";
        if (lastEmail) {
          setEmail(lastEmail);
        }
      }

      setAuthError(null);
      setPassword("");
      setIsOpen(true);
    };

    window.addEventListener("pf:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("pf:unauthorized", handleUnauthorized);
    };
  }, [pathname, admin]);

  // Handle in-place login & live data refresh
  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError("Please enter both administrator email and master password.");
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);

    try {
      // Login without auto-redirecting (pass null for returnUrl so we can reload in place)
      await login(email.trim(), password, null);

      // Invalidate all stale cache
      invalidateCache();

      // Close modal
      setIsOpen(false);

      // Reload window to instantly re-fetch fresh live data for the current view
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Invalid credentials or unauthorized. Please check your password.";
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect to full /login page
  const handleGoToLoginPage = () => {
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
        hideCloseButton={true}
        className="sm:max-w-lg border-2 border-[#1A1A1A] bg-[#FFFDF7] shadow-[8px_8px_0px_0px_#1A1A1A] rounded-[16px] p-6 sm:p-7"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b-2 border-[#1A1A1A] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-[12px] bg-[#FFD9D0] border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 shadow-[3px_3px_0px_0px_#1A1A1A]">
              <ShieldAlert className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black uppercase text-[#1A1A1A] tracking-tight leading-none">
                UNAUTHORIZED ACCESS
              </DialogTitle>
              <div className="text-[11px] font-mono font-black text-[#8C2E1D] uppercase mt-1.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#8C2E1D] animate-pulse" />
                <span>401 • Session Expired / Re-Authentication Required</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="p-3.5 bg-[#FAF7EC] border-2 border-[#1A1A1A] rounded-[12px] shadow-[2px_2px_0px_0px_#1A1A1A] text-xs font-bold text-[#5C5647] leading-relaxed flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-[#1A1A1A] shrink-0 mt-0.5 stroke-[2.5]" />
            <div>
              <p className="text-[#1A1A1A] font-black uppercase text-[11px] mb-0.5 font-mono">
                Live Data Synchronization Suspended
              </p>
              <span>{message}</span>
            </div>
          </div>

          {/* Dynamic In-Dialog Error Notice */}
          {authError && (
            <div
              role="alert"
              className="bg-[#FFD9D0] border-2 border-[#1A1A1A] p-3 font-mono text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] rounded-[10px] flex items-start gap-2 animate-in fade-in-0 duration-150"
            >
              <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5] mt-0.5 text-[#1A1A1A]" />
              <div className="leading-snug flex-1 break-words">{authError}</div>
            </div>
          )}

          {/* Quick Re-Authentication Form */}
          <form onSubmit={handleDirectLogin} className="space-y-3.5 pt-1">
            {/* Admin Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="dialog-email"
                className="block text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] font-mono"
              >
                ADMIN EMAIL
              </label>
              <input
                id="dialog-email"
                type="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="admin@puretyfarm.in"
                className="w-full h-11 border-2 border-[#1A1A1A] bg-white px-3.5 font-mono font-bold text-xs text-[#1A1A1A] rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Master Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="dialog-password"
                className="block text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] font-mono"
              >
                MASTER PASSWORD
              </label>
              <div className="relative flex items-center">
                <input
                  id="dialog-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter administrator password"
                  className="w-full h-11 border-2 border-[#1A1A1A] bg-white px-3.5 pr-16 font-mono font-bold text-xs text-[#1A1A1A] rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 px-2.5 py-1 text-[#1A1A1A] font-mono text-[10px] font-black uppercase hover:bg-[#FAF7EC] transition-colors flex items-center gap-1 select-none border-2 border-[#1A1A1A] rounded-[6px] cursor-pointer bg-white"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3 w-3" />
                      <span>HIDE</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>SHOW</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black uppercase tracking-wider text-xs border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 select-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 stroke-[3] animate-spin" />
                    <span>AUTHENTICATING & SYNCING LIVE DATA...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 stroke-[2.5]" />
                    <span>SIGN IN & GET LIVE DATA</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGoToLoginPage}
                disabled={isSubmitting}
                className="w-full h-9 bg-[#FAF7EC] hover:bg-stone-200 text-[#5C5647] hover:text-[#1A1A1A] font-mono font-bold uppercase tracking-wider text-[11px] border-2 border-[#1A1A1A] rounded-[8px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Go to Full Sign-In Page</span>
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
