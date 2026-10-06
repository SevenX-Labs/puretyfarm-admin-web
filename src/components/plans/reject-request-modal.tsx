"use client";

import React, { useState } from "react";
import { ChangeRequestItem } from "@/types/plan-delivery";
import { rejectChangeRequest } from "@/services/plan-delivery-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api-client";

interface RejectRequestModalProps {
  request: ChangeRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: ChangeRequestItem) => void;
}

export function RejectRequestModal({
  request,
  isOpen,
  onClose,
  onSuccess,
}: RejectRequestModalProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const isNoteValid = note.trim().length >= 3 && note.trim().length <= 1000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNoteValid) {
      setError("Please provide a reason note between 3 and 1000 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await rejectChangeRequest(request.id, note);
      const updated: ChangeRequestItem = {
        ...request,
        status: "REJECTED",
        adminNote: note.trim(),
        reviewedAt: new Date().toISOString(),
      };
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to reject change request:", err);
      if (err instanceof ApiError && err.statusCode === 409) {
        setError("Conflict: This change request has already been reviewed or updated.");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to reject change request.";
        setError(msg);
      }
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
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-md w-full p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] bg-[#FF8E72] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000]">
              <XCircle className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Reject Subscription Change Request
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Customer will receive your explanation note
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

          {/* Customer & Request summary */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Customer:</span>
              <div className="text-right">
                <span className="text-xs font-black text-[#1A1A1A] block">
                  {request.customer?.name || "Customer"}
                </span>
                <span className="text-[10px] font-mono text-[#5C5647]">
                  {request.customer?.mobile || "No phone"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-[#5C5647]">Request Type:</span>
              <span className="rounded-[4px] border border-black bg-white px-2 py-0.5 text-xs font-mono font-black text-[#1A1A1A]">
                {request.requestType.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Mandatory Reason Note */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
                Admin Rejection Note <span className="text-red-600 font-bold">*</span>
              </label>
              <span className="text-[10px] font-mono text-[#5C5647]">
                Min 3 chars
              </span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Tomorrow's morning route is already packed beyond cutoff. Please apply for the next delivery date."
              maxLength={1000}
              rows={3}
              required
              className="w-full rounded-[8px] border-2 border-black bg-white p-2.5 text-xs font-bold text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none placeholder:text-[#5C5647]/60"
            />
            <span className="text-[10px] font-mono text-[#5C5647] block text-right">
              {note.length} / 1000
            </span>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !isNoteValid}
              className="w-full rounded-[8px] border-2 border-black bg-[#FF8E72] hover:bg-[#ff7b5a] disabled:opacity-50 disabled:cursor-not-allowed py-2.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Rejecting Request...</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 stroke-[2.5]" />
                  <span>Confirm Rejection</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full rounded-[8px] border-2 border-black bg-white py-2 text-xs font-black uppercase text-[#1A1A1A] hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
