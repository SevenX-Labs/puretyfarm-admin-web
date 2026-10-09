"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/auth-context";
import {
  Milk,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired") === "1") {
        setSessionNotice("Your session has expired. Please sign in again to continue.");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Email address is required.");
      return;
    }
    if (!password) {
      setErrorMessage("Password is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify credentials.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:grid lg:grid-cols-12 bg-[#FAF7EC] selection:bg-[#FFD84D] selection:text-[#1A1A1A]">
      {/* ========================================================================= */}
      {/* Left Column: Form & Access Console                                       */}
      {/* ========================================================================= */}
      <div className="w-full flex-1 lg:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-screen bg-[#FAF7EC] border-r-0 lg:border-r-2 lg:border-[#1A1A1A] z-10">
        {/* Brand Top Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center border-2 border-[#1A1A1A] bg-[#FFD84D] text-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] overflow-hidden">
              <Image
                src="/gir-cow-logo.jpg"
                alt="Puretyfarm Gir Cow"
                width={44}
                height={44}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] leading-none">
                  PURETYFARM
                </span>
                <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] text-[#1A1A1A] font-black uppercase text-[10px] px-2 py-0.5 rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
                  ADMIN PANEL
                </span>
              </div>
              <div className="text-[11px] font-mono font-bold text-[#5C5647] uppercase mt-0.5">
                Raipur Operations Console
              </div>
            </div>
          </div>
        </div>

        {/* Form Container (Vertically centered) */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-[30px] font-black uppercase tracking-tight text-[#1A1A1A] leading-tight mb-1.5">
              OPERATOR SIGN IN
            </h1>
            <p className="text-[#5C5647] text-xs sm:text-sm font-bold leading-relaxed">
              Enter your administrator credentials to access the Raipur delivery, customer dispatch, and wallet management console.
            </p>
          </div>

          {/* Session Expired Notice */}
          {sessionNotice && !errorMessage && (
            <div
              role="status"
              className="bg-[#FFD84D] border-2 border-[#1A1A1A] p-3.5 font-mono text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] rounded-[10px] mb-5 flex items-start gap-2.5 animate-in fade-in-0 duration-150"
            >
              <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5] mt-0.5 text-[#1A1A1A]" />
              <div className="leading-snug flex-1 break-words">{sessionNotice}</div>
            </div>
          )}

          {/* Dynamic Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="bg-[#FFD9D0] border-2 border-[#1A1A1A] p-3.5 font-mono text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] rounded-[10px] mb-5 flex items-start gap-2.5 animate-in fade-in-0 duration-150"
            >
              <AlertCircle className="h-4 w-4 shrink-0 stroke-[2.5] mt-0.5 text-[#1A1A1A]" />
              <div className="leading-snug flex-1 break-words">{errorMessage}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]"
              >
                ADMIN EMAIL
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="admin@puretyfarm.in"
                className="w-full h-11 border-2 border-[#1A1A1A] bg-white px-4 font-mono font-bold text-xs text-[#1A1A1A] rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]"
                >
                  MASTER PASSWORD
                </label>
              </div>
              <div className="relative flex items-center">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full h-11 border-2 border-[#1A1A1A] bg-white px-4 pr-16 font-mono font-bold text-xs text-[#1A1A1A] rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 px-2.5 py-1 text-[#1A1A1A] font-mono text-xs font-black uppercase hover:bg-[#FAF7EC] transition-colors flex items-center gap-1 select-none border-2 border-[#1A1A1A] rounded-[6px] cursor-pointer"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3 w-3" />
                      <span className="text-[10px]">HIDE</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span className="text-[10px]">SHOW</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Button: SIGN IN TO DISPATCH */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black uppercase tracking-wider text-xs border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 stroke-[3] animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN TO DISPATCH</span>
                    <ArrowRight className="h-4 w-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Clean Footer */}
        <div className="pt-4 border-t-2 border-[#1A1A1A]/20 flex items-center justify-between text-xs font-bold text-[#5C5647]">
          <span>Puretyfarm A2 Dairy</span>
          <span>Raipur, CG</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Right Column: Clean Farm Imagery Showcase (Desktop only)                  */}
      {/* Bottle positioned perfectly and visibly                                   */}
      {/* ========================================================================= */}
      <div className="hidden lg:block lg:col-span-7 relative h-full min-h-screen overflow-hidden bg-stone-100">
        <Image
          src="/auth-bg.jpg"
          alt="Puretyfarm A2 Desi Cow Milk Farm"
          fill
          priority
          className="object-cover object-right"
        />
      </div>
    </div>
  );
}
