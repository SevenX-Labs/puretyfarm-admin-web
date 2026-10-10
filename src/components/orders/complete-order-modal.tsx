"use client";

import React, { useState } from "react";
import { AdminOrder } from "@/types/order";
import { completeOrder } from "@/services/order-service";
import { ApiError } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Describes a failed completion for the admin.
 *
 * Completion writes nothing but the order's status and timestamp — no wallet,
 * payment, cash or delivery record moves — so a failed call always leaves the
 * order exactly as it was. Saying so keeps an admin from hunting for a
 * half-applied change.
 */
function describeFailure(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.statusCode === 0) {
      return "Could not reach the server, so nothing changed. Check your connection and try again.";
    }
    if (err.statusCode === 403) {
      return "Your account is not allowed to complete orders.";
    }
    if (err.statusCode === 404) {
      return "This order no longer exists. Refresh the list and try again.";
    }
    if (err.statusCode === 409) {
      return (
        err.message ||
        "This order changed while it was being completed. Refresh it and try again."
      );
    }
    return err.message || "Failed to complete this order.";
  }
  return err instanceof Error ? err.message : "Failed to complete this order.";
}

interface CompleteOrderModalProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: AdminOrder, message: string) => void;
}

export function CompleteOrderModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: CompleteOrderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against a double submit: the endpoint is idempotent, but a second
    // in-flight request buys nothing and muddles the feedback.
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await completeOrder(order.id);
      const updated: AdminOrder =
        res.order || {
          ...order,
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      onSuccess(
        updated,
        res.alreadyCompleted
          ? "This order was already completed."
          : `Order ${updated.orderNumber} marked as completed.`
      );
      onClose();
    } catch (err: unknown) {
      console.error("Failed to complete order", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusCode: err instanceof ApiError ? err.statusCode : undefined,
        code: err instanceof ApiError ? err.code : undefined,
        reference: err instanceof ApiError ? err.reference : undefined,
        at: new Date().toISOString(),
      });
      setError(describeFailure(err));
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
          onClose();
        }
      }}
    >
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] bg-[#B8E8B8] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000]">
              <PackageCheck className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Complete Order
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Close this delivered order for good
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5] mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* Order summary */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Order:</span>
              <span className="font-mono text-xs font-black text-[#1A1A1A]">
                {order.orderNumber}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Customer:</span>
              <div className="text-right">
                <span className="block text-xs font-black text-[#1A1A1A]">
                  {order.customer?.name || "Customer"}
                </span>
                <span className="font-mono text-[10px] text-[#5C5647]">
                  {order.customer?.mobile || "No phone"}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Current status:</span>
              <span className="rounded-[4px] border border-black bg-white px-2 py-0.5 font-mono text-[10px] font-black text-[#1A1A1A]">
                {order.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-black uppercase text-[#1A1A1A]">
                Order Total:
              </span>
              <span className="font-mono text-xl font-black tabular-nums text-[#1A1A1A]">
                {formatCurrency(order.totalPaise / 100)}
              </span>
            </div>
          </div>

          {/* What this does — and does not — change */}
          <div className="flex items-start gap-2 rounded-[10px] border-2 border-black bg-[#FFE58F] p-3 text-xs font-bold text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
            <p className="leading-snug">
              Completing moves the order to its final status and stamps the
              completion time. It does not move money, change payment or cash
              records, or alter any other scheduled delivery on this plan. It
              cannot be reversed.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border-2 border-black bg-white px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FAF7EC] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-2 border-black bg-[#B8E8B8] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#9fe09f] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Completing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>{error ? "Try Again" : "Mark as Completed"}</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
