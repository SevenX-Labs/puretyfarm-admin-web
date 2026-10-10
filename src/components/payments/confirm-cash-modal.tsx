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
import { CashCollectionItem } from "@/types/payment";
import { confirmCashCollection } from "@/services/payment-service";
import { formatCurrency } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
} from "lucide-react";

interface ConfirmCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CashCollectionItem | null;
  onSuccess: (updated: CashCollectionItem) => void;
}

interface ConfirmFailure {
  message: string;
  reference?: string;
  retryable: boolean;
}

function describeFailure(err: unknown): ConfirmFailure {
  if (err instanceof ApiError) {
    if (err.statusCode === 409 || err.code === "ALREADY_CONFIRMED") {
      return {
        message: "This cash collection was already confirmed in another session.",
        reference: err.reference,
        retryable: false,
      };
    }
    if (err.statusCode === 400 && err.code === "CASH_SHORT_FOR_PLAN") {
      return {
        message: err.message || "Collected cash is less than required plan total.",
        reference: err.reference,
        retryable: false,
      };
    }
    return {
      message: err.message || "Server rejected the confirmation request.",
      reference: err.reference,
      retryable: err.statusCode >= 500,
    };
  }
  if (err instanceof Error) {
    return {
      message: err.message,
      retryable: true,
    };
  }
  return {
    message: "An unexpected error occurred while confirming cash receipt.",
    retryable: true,
  };
}

export function ConfirmCashModal({
  isOpen,
  onClose,
  item,
  onSuccess,
}: ConfirmCashModalProps) {
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [failure, setFailure] = useState<ConfirmFailure | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFailure(null);
      setNote("");
    }
  }, [isOpen]);

  if (!item) return null;

  const isPlanPayment = item.purpose === "PLAN_PAYMENT" || Boolean(item.planSelectionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setFailure(null);

    try {
      const res = await confirmCashCollection(item.id, note);
      const updated: CashCollectionItem = res.cashCollection || {
        ...item,
        status: "CONFIRMED",
        confirmedAt: new Date().toISOString(),
        adminNote: note.trim() || item.adminNote,
      };
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to confirm cash collection", {
        cashCollectionId: item.id,
        amountPaise: item.amountPaise,
        purpose: isPlanPayment ? "PLAN_PAYMENT" : "WALLET_TOPUP",
        customerId: item.customer?.id,
        statusCode: err instanceof ApiError ? err.statusCode : undefined,
        code: err instanceof ApiError ? err.code : undefined,
        reference: err instanceof ApiError ? err.reference : undefined,
        at: new Date().toISOString(),
        error: err,
      });
      setFailure(describeFailure(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setFailure(null);
          setNote("");
          onClose();
        }
      }}
    >
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] bg-[#B8E8B8] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000]">
              <Banknote className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Confirm Cash Receipt
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                {isPlanPayment
                  ? "Confirm physical cash received for customer subscription plan"
                  : "Confirm cash received and credit customer wallet"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {failure && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5] mt-0.5" />
              <div className="space-y-1">
                <span className="block leading-snug">{failure.message}</span>
                {failure.reference && (
                  <span className="block font-mono text-[10px] font-bold text-[#5C5647]">
                    Support reference: {failure.reference}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Amount & Customer summary card */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Customer:</span>
              <div className="text-right">
                <span className="text-xs font-black text-[#1A1A1A] block">
                  {item.customer?.name || "Customer"}
                </span>
                <span className="text-[10px] font-mono text-[#5C5647]">
                  {item.customer?.mobile || "No phone"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Purpose:</span>
              <span className="rounded-[4px] border border-black bg-white px-2 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                {isPlanPayment ? "PLAN PAYMENT" : "WALLET TOP-UP"}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-black uppercase text-[#1A1A1A]">
                Physical Cash Amount:
              </span>
              <span className="font-mono text-xl font-black text-[#1A1A1A] tabular-nums">
                {formatCurrency(item.amountPaise / 100)}
              </span>
            </div>
          </div>

          {/* Non-reversible notice */}
          <div className="rounded-[10px] border-2 border-black bg-[#FFE58F] p-3 text-xs font-bold text-[#1A1A1A] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
            <ShieldAlert className="h-4 w-4 shrink-0 text-[#1A1A1A] mt-0.5" />
            <p className="leading-snug">
              {isPlanPayment
                ? "Confirming records payment for this subscription plan. The delivery schedule can subsequently be approved with a start date from the Subscriptions tab."
                : "Confirming will immediately credit the customer's wallet balance. This action cannot be reversed."}
            </p>
          </div>

          {/* Optional Admin Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
              Admin Reconciliation Note <span className="text-[10px] text-[#5C5647] font-normal">(Optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received cash from delivery partner at depot."
              maxLength={1000}
              rows={2}
              className="w-full rounded-[8px] border-2 border-black bg-white p-2.5 text-xs font-bold text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none placeholder:text-[#5C5647]/60"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-[8px] border-2 border-black bg-white px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#fcd033] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>
                    {failure?.retryable
                      ? "Retry Confirmation"
                      : "Confirm Receipt"}
                  </span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
