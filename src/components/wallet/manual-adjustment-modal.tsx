"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  manualCreditCustomerWallet,
  manualDebitCustomerWallet,
  ManualWalletAdjustmentResponse,
} from "@/services/wallet-service";

export type AdjustmentType = "CREDIT" | "DEBIT";

interface ManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  customerName: string;
  currentBalancePaise: number;
  type: AdjustmentType;
  onSuccess: (response: ManualWalletAdjustmentResponse, type: AdjustmentType) => void;
}

export function ManualAdjustmentModal({
  isOpen,
  onClose,
  userId,
  customerName,
  currentBalancePaise,
  type,
  onSuccess,
}: ManualAdjustmentModalProps) {
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [remark, setRemark] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isCredit = type === "CREDIT";

  // Reset form whenever modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      setAmountRupees("");
      setRemark("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, type]);

  const parsedAmountRupees = parseFloat(amountRupees || "0");
  const parsedAmountPaise = Math.round(parsedAmountRupees * 100);

  // Projected Balance Calculation
  const projectedBalancePaise = isCredit
    ? currentBalancePaise + (Number.isFinite(parsedAmountPaise) && parsedAmountPaise > 0 ? parsedAmountPaise : 0)
    : currentBalancePaise - (Number.isFinite(parsedAmountPaise) && parsedAmountPaise > 0 ? parsedAmountPaise : 0);

  const isInsufficientDebit = !isCredit && parsedAmountPaise > currentBalancePaise;

  const handleSubmit = async () => {
    if (!userId) {
      setError("Customer ID is missing.");
      return;
    }

    if (!Number.isFinite(parsedAmountRupees) || parsedAmountRupees <= 0) {
      setError("Please enter a valid amount greater than ₹0.");
      return;
    }

    if (parsedAmountPaise < 100) {
      setError("Minimum adjustment amount is ₹1.00.");
      return;
    }

    if (isInsufficientDebit) {
      setError(`Cannot debit ₹${parsedAmountRupees.toFixed(2)}. Customer only has ${formatCurrency(currentBalancePaise / 100)} available.`);
      return;
    }

    const trimmedRemark = remark.trim();
    if (!trimmedRemark || trimmedRemark.length < 3) {
      setError("Please provide a remark/reason of at least 3 characters.");
      return;
    }

    if (trimmedRemark.length > 500) {
      setError("Remark cannot exceed 500 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        amountPaise: parsedAmountPaise,
        remark: trimmedRemark,
      };

      let res: ManualWalletAdjustmentResponse;
      if (isCredit) {
        res = await manualCreditCustomerWallet(userId, payload);
      } else {
        res = await manualDebitCustomerWallet(userId, payload);
      }

      onSuccess(res, type);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.data && typeof err.data === "object" && "message" in err.data) {
          setError(String((err.data as any).message));
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred while processing the wallet adjustment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-md w-full p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={`h-8 w-8 rounded-[8px] border-2 border-black flex items-center justify-center font-black ${
                isCredit ? "bg-[#B8E8B8] text-emerald-900" : "bg-[#FF8E72] text-[#1A1A1A]"
              }`}
            >
              {isCredit ? <ArrowDownLeft className="h-5 w-5 stroke-[3]" /> : <ArrowUpRight className="h-5 w-5 stroke-[3]" />}
            </span>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                {isCredit ? "Manual Wallet Credit" : "Manual Wallet Debit"}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                {isCredit
                  ? "Directly add float funds to the customer's wallet balance."
                  : "Directly deduct float funds from the customer's wallet balance."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer & Balance Overview Card */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#5C5647]">Customer:</span>
              <span className="font-black text-[#1A1A1A]">{customerName || "Customer"}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold border-t border-black/10 pt-2">
              <span className="text-[#5C5647]">Current Balance:</span>
              <span className="font-mono font-black text-sm text-[#1A1A1A]">
                {formatCurrency(currentBalancePaise / 100)}
              </span>
            </div>

            {/* Projected Balance Preview */}
            {parsedAmountPaise > 0 && !isNaN(parsedAmountPaise) && (
              <div
                className={`flex items-center justify-between text-xs font-bold border-t border-black/10 pt-2 ${
                  isInsufficientDebit ? "text-[#8C2E1D]" : isCredit ? "text-emerald-800" : "text-[#1A1A1A]"
                }`}
              >
                <span className="flex items-center gap-1 font-mono text-[11px] font-black uppercase">
                  <Sparkles className="h-3 w-3" />
                  Projected Balance:
                </span>
                <span className="font-mono font-black text-sm">
                  {isInsufficientDebit ? "Insufficient Balance" : formatCurrency(projectedBalancePaise / 100)}
                </span>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 stroke-[2.5]" />
                Adjustment Amount (₹)
              </span>
              <span className="text-[10px] font-mono text-[#5C5647] font-bold">
                {parsedAmountPaise > 0 ? `${parsedAmountPaise.toLocaleString()} paise` : ""}
              </span>
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-[#5C5647]">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="1"
                disabled={isSubmitting}
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                className={`w-full h-11 pl-8 pr-3 rounded-[10px] border-2 border-black font-mono text-base font-black text-[#1A1A1A] focus:outline-none shadow-[2px_2px_0px_0px_#000000] transition-colors ${
                  isInsufficientDebit ? "bg-red-50 border-red-600" : "bg-white focus:bg-[#FFFDF7]"
                }`}
              />
            </div>

            {/* Quick Amount Preset Chips */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase text-[#5C5647] mr-0.5">Presets:</span>
              {[100, 200, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setAmountRupees(String(preset))}
                  className="px-2 py-0.5 rounded-[6px] border border-black bg-[#FAF7EC] hover:bg-[#FFD84D] text-[10px] font-mono font-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000] cursor-pointer transition-all active:translate-x-[0.5px] active:translate-y-[0.5px]"
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Remark / Reason Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
                Mandatory Reason / Remark
              </span>
              <span className="text-[10px] font-mono text-[#5C5647] font-bold">
                {remark.length}/500
              </span>
            </label>

            <textarea
              rows={3}
              disabled={isSubmitting}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={
                isCredit
                  ? "e.g., Approved manual wallet adjustment for promotional cashback"
                  : "e.g., Correction for duplicate wallet credit or manual penalty"
              }
              className="w-full rounded-[10px] border-2 border-black p-3 text-xs font-bold text-[#1A1A1A] placeholder:text-[#5C5647]/70 focus:outline-none shadow-[2px_2px_0px_0px_#000000] bg-white focus:bg-[#FFFDF7]"
            />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5] text-[#8C2E1D]" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 gap-2 flex-col sm:flex-row">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={
              isSubmitting ||
              !Number.isFinite(parsedAmountRupees) ||
              parsedAmountRupees <= 0 ||
              isInsufficientDebit ||
              remark.trim().length < 3
            }
            onClick={handleSubmit}
            className={`rounded-[10px] border-2 border-black font-black uppercase text-xs px-4 py-2 shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
              isCredit
                ? "bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A]"
                : "bg-[#FF8E72] hover:bg-[#ff7b5a] text-[#1A1A1A]"
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
            ) : isCredit ? (
              <PlusCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <MinusCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            )}
            <span>
              {isSubmitting
                ? "Processing Adjustment..."
                : isCredit
                ? `Confirm Credit (₹${parsedAmountRupees > 0 ? parsedAmountRupees.toFixed(2) : "0.00"})`
                : `Confirm Debit (₹${parsedAmountRupees > 0 ? parsedAmountRupees.toFixed(2) : "0.00"})`}
            </span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
