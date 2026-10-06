"use client";

import React, { useState } from "react";
import { CashCollectionItem } from "@/types/payment";
import { cancelCashCollection } from "@/services/payment-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CancelCashModalProps {
  item: CashCollectionItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: CashCollectionItem) => void;
}

export function CancelCashModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: CancelCashModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const isNoteValid = note.trim().length >= 3 && note.trim().length <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNoteValid) {
      setError("Please provide a cancellation reason note (minimum 3 characters).");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await cancelCashCollection(item.id, note);
      const updated: CashCollectionItem = res.cashCollection || {
        ...item,
        status: "CANCELLED",
        adminNote: note.trim(),
        updatedAt: new Date().toISOString(),
      };
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to cancel cash collection:", err);
      const msg = err instanceof Error ? err.message : "Failed to cancel cash collection.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setError(null);
          setNote("");
          onClose();
        }
      }}
    >
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] bg-[#FF8E72] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000]">
              <XCircle className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Cancel Cash Collection
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Reject uncollected or void physical deposit
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount & Customer summary */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Customer:</span>
              <div className="text-right">
                <span className="text-xs font-black text-[#1A1A1A] block">
                  {item.customer.name}
                </span>
                <span className="text-[10px] font-mono text-[#5C5647]">
                  {item.customer.mobile}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-black uppercase text-[#1A1A1A]">
                Collection Amount:
              </span>
              <span className="font-mono text-xl font-black text-[#1A1A1A] tabular-nums">
                {formatCurrency(item.amountPaise / 100)}
              </span>
            </div>
          </div>

          {/* Warning banner */}
          <div className="rounded-[10px] border-2 border-black bg-[#FF8E72]/30 p-3 text-xs font-bold text-[#1A1A1A] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#1A1A1A] mt-0.5" />
            <p className="leading-snug">
              Cancelling will permanently terminate this cash collection request. No wallet credit will occur.
            </p>
          </div>

          {/* Mandatory reason textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
                Cancellation Reason <span className="text-red-600 font-bold">*</span>
              </label>
              <span className="text-[10px] font-mono text-[#5C5647]">
                Min 3 chars
              </span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer cancelled cash topup; opted for UPI online payment."
              maxLength={1000}
              rows={3}
              required
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
              Keep Active
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isNoteValid}
              className="rounded-[8px] border-2 border-black bg-[#FF8E72] hover:bg-[#ff7b5a] disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 stroke-[2.5]" />
                  <span>Cancel Collection</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
