"use client";

import React, { useState } from "react";
import { AdminOrder } from "@/types/order";
import { bulkUpdateOrderStatus, BulkOperationResponse } from "@/services/order-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Truck, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";


interface BulkMarkDeliveredModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: AdminOrder[];
  onCompleted: (response: BulkOperationResponse) => void;
}

export function BulkMarkDeliveredModal({
  isOpen,
  onClose,
  selectedOrders,
  onCompleted,
}: BulkMarkDeliveredModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleOrders = selectedOrders.filter(
    (o) =>
      !["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(o.status) &&
      o.planDelivery?.status !== "SKIPPED"
  );

  const ineligibleCount = selectedOrders.length - eligibleOrders.length;

  const handleConfirm = async () => {
    if (selectedOrders.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const orderIds = selectedOrders.map((o) => o.id);
      const res = await bulkUpdateOrderStatus(orderIds, "DELIVERED");
      onCompleted(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process bulk delivery marking.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-lg w-full p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border-2 border-black bg-[#8FD694] shadow-[2px_2px_0px_0px_#000000]">
              <Truck className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Bulk Mark as Delivered
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Transition selected eligible orders to Delivered status.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {error && (
            <div className="rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-bold text-[#1A1A1A] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
              <AlertTriangle className="h-4 w-4 text-[#D9381E] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex items-center justify-between text-xs font-black uppercase">
              <span>Total Selected Orders:</span>
              <span className="font-mono bg-white border border-black px-2 py-0.5 rounded-[6px]">
                {selectedOrders.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[#2A7E3B]">
              <span>Eligible for Marking Delivered:</span>
              <span className="font-mono bg-white border border-black px-2 py-0.5 rounded-[6px]">
                {eligibleOrders.length}
              </span>
            </div>
            {ineligibleCount > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-[#D9381E]">
                <span>Ineligible (Already Delivered/Skipped):</span>
                <span className="font-mono bg-white border border-black px-2 py-0.5 rounded-[6px]">
                  {ineligibleCount}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-[10px] border border-black/30 bg-white p-3 text-[11px] font-bold text-[#5C5647] space-y-1">
            <p className="flex items-center gap-1.5 text-[#1A1A1A]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2A7E3B] shrink-0" />
              <span>Preserves original scheduled delivery dates (overdue deliveries stay on their original date).</span>
            </p>
            <p className="flex items-center gap-1.5 text-[#1A1A1A]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2A7E3B] shrink-0" />
              <span>Synchronizes PlanDelivery schedule without duplicate status entries or billing changes.</span>
            </p>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 rounded-[8px] border-2 border-black bg-[#FAF7EC] p-2 text-xs font-mono">
            {selectedOrders.slice(0, 10).map((o) => {
              const eligible =
                !["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(o.status) &&
                o.planDelivery?.status !== "SKIPPED";
              return (
                <div key={o.id} className="flex items-center justify-between py-0.5 px-1 text-[11px]">
                  <span className="font-bold text-[#1A1A1A]">{o.orderNumber} ({o.customer?.name || "Customer"})</span>
                  <span className={eligible ? "text-[#2A7E3B] font-bold" : "text-[#D9381E] font-bold"}>
                    {eligible ? "Eligible" : o.status}
                  </span>
                </div>
              );
            })}
            {selectedOrders.length > 10 && (
              <div className="text-[10px] text-center text-[#5C5647] pt-1">
                ...and {selectedOrders.length - 10} more orders
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto h-9 px-4 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || selectedOrders.length === 0}
            onClick={handleConfirm}
            className="w-full sm:w-auto h-9 px-5 rounded-[8px] border-2 border-black bg-[#8FD694] hover:bg-[#79c97f] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Marking Delivered...</span>
              </>
            ) : (
              <>
                <Truck className="h-3.5 w-3.5" />
                <span>Confirm & Mark Delivered</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
