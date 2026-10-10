"use client";

import React, { useState } from "react";
import { AdminOrder } from "@/types/order";
import { bulkUpdateOrderQuantity, BulkOperationResponse } from "@/services/order-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { SlidersHorizontal, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { formatDeliveryDateOrLabel } from "@/lib/utils";

interface BulkUpdateQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: AdminOrder[];
  onCompleted: (response: BulkOperationResponse) => void;
}

export function BulkUpdateQuantityModal({
  isOpen,
  onClose,
  selectedOrders,
  onCompleted,
}: BulkUpdateQuantityModalProps) {
  const [targetQuantity, setTargetQuantity] = useState<number>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleOrders = selectedOrders.filter(
    (o) =>
      !["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(o.status) &&
      o.planDelivery?.status !== "SKIPPED" &&
      o.planDelivery?.status !== "DELIVERED"
  );


  const handleConfirm = async () => {
    if (selectedOrders.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const orderIds = selectedOrders.map((o) => o.id);
      const res = await bulkUpdateOrderQuantity(orderIds, targetQuantity);
      onCompleted(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update bulk quantity.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border-2 border-black bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000]">
              <SlidersHorizontal className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Bulk Quantity Update
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Update delivery quantity for selected upcoming eligible deliveries.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-bold text-[#1A1A1A] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
              <AlertTriangle className="h-4 w-4 text-[#D9381E] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quantity Selector Stepper */}
          <div className="rounded-[12px] border-2 border-black bg-[#FAF7EC] p-4 space-y-2.5 shadow-[2px_2px_0px_0px_#000000]">
            <span className="text-xs font-black uppercase text-[#1A1A1A] block">
              Set Target Quantity (Litres):
            </span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setTargetQuantity(qty)}
                  className={`h-10 flex-1 rounded-[8px] border-2 border-black font-mono font-black text-sm uppercase transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                    targetQuantity === qty
                      ? "bg-[#FFDF58] text-[#1A1A1A]"
                      : "bg-white hover:bg-white/80 text-[#5C5647]"
                  }`}
                >
                  {qty} L
                </button>
              ))}
            </div>
            <p className="text-[11px] font-bold text-[#5C5647]">
              Valid range: 1 to 5 Litres per delivery.
            </p>
          </div>

          {/* Preview Comparison Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black uppercase text-[#1A1A1A]">
              <span>Preview Changes (Old vs New):</span>
              <span className="text-[#5C5647] font-bold">
                {eligibleOrders.length} of {selectedOrders.length} eligible
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-[10px] border-2 border-black bg-white divide-y divide-black/10">
              {selectedOrders.map((order) => {
                const currentQty =
                  order.items && order.items[0]
                    ? order.items[0].quantity
                    : order.planDelivery?.quantityLitres || 1;
                const isEligible =
                  !["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(order.status) &&
                  order.planDelivery?.status !== "SKIPPED" &&
                  order.planDelivery?.status !== "DELIVERED";
                const diff = targetQuantity - currentQty;

                return (
                  <div
                    key={order.id}
                    className="p-2.5 flex items-center justify-between text-xs font-mono hover:bg-[#FAF7EC] transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-black text-[#1A1A1A] flex items-center gap-1.5">
                        <span>{order.orderNumber}</span>
                        <span className="text-[10px] text-[#5C5647] font-bold truncate">
                          ({order.customer?.name || "Customer"})
                        </span>
                      </div>
                      <div className="text-[10px] text-[#5C5647] font-sans">
                        Date: {formatDeliveryDateOrLabel(order.deliveryDate)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isEligible ? (
                        <div className="flex items-center gap-1 text-xs font-black">
                          <span className="bg-[#FAF7EC] border border-black px-1.5 py-0.5 rounded-[4px] text-[#5C5647]">
                            {currentQty} L
                          </span>
                          <ChevronRight className="h-3 w-3 text-[#5C5647]" />
                          <span className="bg-[#FFDF58] border border-black px-1.5 py-0.5 rounded-[4px] text-[#1A1A1A]">
                            {targetQuantity} L
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1 rounded ${
                              diff > 0
                                ? "text-[#2A7E3B] bg-[#B8E8B8]/30"
                                : diff < 0
                                ? "text-[#D9381E] bg-[#FFD9D0]/30"
                                : "text-[#5C5647]"
                            }`}
                          >
                            {diff > 0 ? `+${diff}L` : diff < 0 ? `${diff}L` : "0L"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-[#D9381E] bg-[#FFD9D0] border border-black px-1.5 py-0.5 rounded-[4px]">
                          Ineligible ({order.status})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
            disabled={isSubmitting || eligibleOrders.length === 0}
            onClick={handleConfirm}
            className="w-full sm:w-auto h-9 px-5 rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#ebd052] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Quantities...</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Save Quantity Changes</span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
