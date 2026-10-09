"use client";

import React, { useState } from "react";
import { CreditRequestItem, RejectResponse } from "@/types/wallet";
import { rejectCreditRequest } from "@/services/wallet-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

interface RejectRequestModalProps {
  request: CreditRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRejected: (updatedRequest: CreditRequestItem, refund?: RejectResponse["refund"]) => void;
}

export function RejectRequestModal({
  request,
  isOpen,
  onClose,
  onRejected,
}: RejectRequestModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmReject = async () => {
    if (!request) return;
    const trimmed = note.trim();

    if (!trimmed || trimmed.length < 3) {
      setError("Please provide a rejection note of at least 3 characters.");
      return;
    }

    if (trimmed.length > 1000) {
      setError("Rejection note cannot exceed 1000 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await rejectCreditRequest(request.id, trimmed);

      const updated: CreditRequestItem = {
        ...request,
        status: "REJECTED",
        refundStatus: response.request?.refundStatus || "REFUND_PENDING",
        adminNote: trimmed,
        reviewedAt: new Date().toISOString(),
      };

      onRejected(updated, response.refund);
      setNote("");
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setError(
          "Conflict: This credit request has already been processed by an administrator."
        );
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to reject credit request. Please try again.";
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-md w-full p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A] flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#FF8E72] stroke-[2.5]" />
            REJECT WALLET CREDIT REQUEST
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-[#5C5647]">
            Write a reason why this wallet top-up request is being rejected.
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-4 pt-2">
            {/* Request Summary */}
            <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 text-xs font-bold space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
              <div className="flex justify-between">
                <span className="text-[#5C5647]">Customer:</span>
                <span className="font-black text-[#1A1A1A]">
                  {request.customer?.name} ({request.customer?.mobile || "No phone"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5647]">Amount Requested:</span>
                <span className="font-mono font-black text-sm text-[#1A1A1A]">
                  {formatCurrency(request.amountPaise / 100)}
                </span>
              </div>
            </div>

            {/* Refund Notification Note */}
            <div className="rounded-[8px] border-2 border-black bg-[#FFFDF7] p-3 text-xs font-bold text-[#1A1A1A] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#FF8E72] mt-0.5" />
              <span className="leading-relaxed">
                <strong>Notice:</strong> Rejecting will automatically trigger a PayU refund request for online payments. For cash payments, refunds are handled offline.
              </span>
            </div>

            {/* Mandatory Reason Note Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
                Admin Reason Note (Required, 3 - 1000 chars)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Payment was not received in the bank account."
                className="w-full rounded-[10px] border-2 border-black p-3 text-xs font-bold text-[#1A1A1A] focus:outline-none shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>

            {error && (
              <div className="rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

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
            disabled={isSubmitting}
            onClick={handleConfirmReject}
            className="rounded-[10px] border-2 border-black bg-[#FF8E72] hover:bg-[#ff7b5a] text-black font-black uppercase text-xs px-4 py-2 shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
            )}
            CONFIRM REJECTION & INITIATE REFUND
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
