"use client";

import React, { useState } from "react";
import { CashCollectionItem } from "@/types/payment";
import { confirmCashCollection } from "@/services/payment-service";
import { ApiError } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, Loader2, Banknote, ShieldAlert } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Admin-facing copy per failure the confirm endpoint can report.
 *
 * Each one states whether the money moved, because that is the only thing the
 * admin needs in order to decide what to do next. The endpoint confirms the
 * collection, credits the wallet and activates the plan in a single
 * transaction, so a failed call changed nothing and retrying is safe — saying
 * so stops an admin hunting for a half-applied credit or confirming twice.
 */
const ERROR_COPY: Record<string, string> = {
  CASH_COLLECTION_NOT_FOUND:
    "This cash collection no longer exists. Refresh the list and try again.",
  CASH_COLLECTION_ALREADY_PROCESSED:
    "This collection was already processed, most likely by another admin. Refresh the list to see its current status — do not confirm it again.",
  CASH_CONFIRMATION_CONFLICT:
    "This collection was already processed. Refresh the list to see its current status.",
  CASH_CONFIRMATION_TIMED_OUT:
    "The confirmation took too long and was rolled back. No cash was confirmed and nothing was credited — please try again.",
  CASH_SHORT_FOR_PLAN:
    "The cash recorded for this collection is less than the plan total, so the plan cannot be activated. Check the collected amount with the delivery partner before confirming.",
  CASH_COLLECTION_NO_PURPOSE:
    "This collection is not linked to a wallet top-up or a plan, so there is nothing to credit. Escalate it to engineering.",
  PLAN_CONFIG_MISSING:
    "The plan configuration needed to price this subscription is missing. Configure the plan before confirming this payment.",
  CREDIT_REQUEST_NOT_FOUND:
    "The wallet credit request behind this collection is missing. Escalate it to engineering.",
  CREDIT_REQUEST_ALREADY_PROCESSED:
    "The wallet credit request behind this collection was already processed. Refresh the list to see its current status.",
};

interface ConfirmFailure {
  message: string;
  reference?: string;
  /** Whether re-submitting is safe and worth offering. */
  retryable: boolean;
}

function describeFailure(err: unknown): ConfirmFailure {
  if (!(err instanceof ApiError)) {
    return {
      message:
        err instanceof Error
          ? err.message
          : "Failed to confirm cash collection.",
      retryable: false,
    };
  }

  // A conflict means someone else already processed it; retrying would be
  // wrong, not merely useless.
  const alreadyProcessed = err.statusCode === 409;

  const copy =
    (err.code && ERROR_COPY[err.code]) ||
    // Status 0 is a transport failure: the request may never have reached the
    // server, but since the write is atomic nothing can be half-applied.
    (err.statusCode === 0
      ? "Could not reach the server, so nothing was confirmed. Check your connection and try again."
      : err.message);

  return {
    message: copy,
    reference: err.reference,
    retryable:
      !alreadyProcessed &&
      (err.retryable === true || err.statusCode === 0 || err.statusCode >= 500),
  };
}

interface ConfirmCashModalProps {
  item: CashCollectionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: CashCollectionItem) => void;
}

export function ConfirmCashModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: ConfirmCashModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<ConfirmFailure | null>(null);

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
                  ? "Confirm cash received and activate subscription deliveries"
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
                ? "Confirming will activate this subscription plan and materialize delivery schedules. This action cannot be reversed."
                : "Confirming will immediately credit the customer\x27s wallet balance. This action cannot be reversed."}
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
              rows={3}
              className="w-full rounded-[8px] border-2 border-black bg-white p-2.5 text-xs font-bold text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none placeholder:text-[#5C5647]/60"
            />
            <span className="text-[10px] font-mono text-[#5C5647] block text-right">
              {note.length} / 1000
            </span>
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
                      : isPlanPayment
                      ? "Confirm & Activate Plan"
                      : "Confirm & Credit Wallet"}
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
