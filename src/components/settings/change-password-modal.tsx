"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/auth-context";
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface ChangePasswordModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ChangePasswordModal({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: ChangePasswordModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrorBanner(null);
    setSuccessBanner(null);
  };

  const handleOpenChange = (openState: boolean) => {
    setIsOpen(openState);
    if (!openState) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    // Client-side validations
    if (!currentPassword) {
      setErrorBanner("Current password is required.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorBanner("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorBanner("New password and confirmation do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setErrorBanner("New password must be different from current password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      setSuccessBanner(
        res?.message || "Password changed successfully. Your master credentials are updated."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to update password. Please check your current credentials.";
      setErrorBanner(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="max-w-md w-full border-2 border-[#1A1A1A] bg-white p-6 shadow-[5px_5px_0px_0px_#1A1A1A] rounded-[14px]">
        <DialogHeader className="border-b-2 border-[#1A1A1A] pb-3.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A]">
              <KeyRound className="h-4 w-4 stroke-[2.5] text-[#1A1A1A]" />
            </div>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
              Change Master Password
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-bold text-[#5C5647]">
            Update credentials for Raipur Dairy Operations administrator console.
          </DialogDescription>
        </DialogHeader>

        {/* Visual Feedback Banners */}
        {successBanner && (
          <div
            role="status"
            className="bg-[#B9E8B4] border-2 border-[#1A1A1A] rounded-[10px] p-3 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#1A1A1A] flex items-start gap-2 text-[#1A1A1A]"
          >
            <CheckCircle2 className="h-4 w-4 stroke-[2.5] shrink-0 mt-0.5" />
            <div className="leading-snug">{successBanner}</div>
          </div>
        )}

        {errorBanner && (
          <div
            role="alert"
            className="bg-[#FFD9D0] border-2 border-[#1A1A1A] rounded-[10px] p-3 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#1A1A1A] flex items-start gap-2 text-[#1A1A1A]"
          >
            <AlertCircle className="h-4 w-4 stroke-[2.5] shrink-0 mt-0.5" />
            <div className="leading-snug flex-1 break-words">{errorBanner}</div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1" noValidate>
          {/* Current Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="currentPassword"
                className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block"
              >
                Current Password
              </label>
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="text-[10px] font-mono font-bold uppercase text-[#5C5647] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer select-none"
              >
                {showCurrent ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Show
                  </>
                )}
              </button>
            </div>
            <input
              id="currentPassword"
              name="currentPassword"
              type={showCurrent ? "text" : "password"}
              required
              disabled={isLoading}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errorBanner) setErrorBanner(null);
              }}
              placeholder="••••••••••••"
              className="w-full h-11 border-2 border-[#1A1A1A] bg-white rounded-[10px] px-3.5 py-2 font-mono text-xs text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all placeholder:text-[#5C5647]/50"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="newPassword"
                className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block"
              >
                New Password (Min 8 Chars)
              </label>
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="text-[10px] font-mono font-bold uppercase text-[#5C5647] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer select-none"
              >
                {showNew ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Show
                  </>
                )}
              </button>
            </div>
            <input
              id="newPassword"
              name="newPassword"
              type={showNew ? "text" : "password"}
              required
              minLength={8}
              disabled={isLoading}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errorBanner) setErrorBanner(null);
              }}
              placeholder="••••••••••••"
              className="w-full h-11 border-2 border-[#1A1A1A] bg-white rounded-[10px] px-3.5 py-2 font-mono text-xs text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all placeholder:text-[#5C5647]/50"
            />
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="confirmPassword"
                className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block"
              >
                Confirm New Password
              </label>
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="text-[10px] font-mono font-bold uppercase text-[#5C5647] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer select-none"
              >
                {showConfirm ? (
                  <>
                    <EyeOff className="h-3 w-3" /> Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3" /> Show
                  </>
                )}
              </button>
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              disabled={isLoading}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errorBanner) setErrorBanner(null);
              }}
              placeholder="••••••••••••"
              className="w-full h-11 border-2 border-[#1A1A1A] bg-white rounded-[10px] px-3.5 py-2 font-mono text-xs text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] focus:shadow-[3px_3px_0px_0px_#1A1A1A] focus:ring-2 focus:ring-[#FFD84D] focus:bg-[#FFFDF7] outline-none transition-all placeholder:text-[#5C5647]/50"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3.5 border-t-2 border-[#1A1A1A] flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleOpenChange(false)}
              className="rounded-[10px] bg-white hover:bg-[#FAF7EC] text-[#1A1A1A] font-black uppercase border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all px-4 py-2 text-xs cursor-pointer select-none disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="rounded-[10px] bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black uppercase border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all px-5 py-2 text-xs flex items-center gap-1.5 cursor-pointer select-none disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 stroke-[3] animate-spin" />
                  <span>UPDATING...</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>UPDATE PASSWORD</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
