"use client";

import React from "react";
import { BulkOperationResponse } from "@/services/order-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Check } from "lucide-react";

interface BulkResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: BulkOperationResponse | null;
  actionTitle?: string;
}

export function BulkResultsModal({
  isOpen,
  onClose,
  results,
  actionTitle = "Bulk Action",
}: BulkResultsModalProps) {
  if (!results) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border-2 border-black bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000]">
              <CheckCircle2 className="h-5 w-5 text-[#2A7E3B] stroke-[2.5]" />
            </span>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                {actionTitle} Results
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Summary and individual status for processed deliveries.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8]/30 p-3 text-center shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#2A7E3B] block">
                Succeeded
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                {results.successCount}
              </span>
            </div>

            <div className={`rounded-[10px] border-2 border-black p-3 text-center shadow-[2px_2px_0px_0px_#000000] ${
              results.failureCount > 0 ? "bg-[#FFD9D0]/50" : "bg-[#FAF7EC]"
            }`}>
              <span className={`text-[10px] font-black uppercase block ${
                results.failureCount > 0 ? "text-[#D9381E]" : "text-[#5C5647]"
              }`}>
                Skipped / Failed
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                {results.failureCount}
              </span>
            </div>
          </div>

          {/* Results List */}
          <div className="space-y-1.5">
            <span className="text-xs font-black uppercase text-[#1A1A1A] block">
              Individual Order Details:
            </span>
            <div className="max-h-60 overflow-y-auto rounded-[10px] border-2 border-black bg-[#FAF7EC] p-2 space-y-1.5 font-mono text-xs">
              {results.results.map((item, idx) => (
                <div
                  key={`${item.orderId}-${idx}`}
                  className={`p-2 rounded-[6px] border border-black/30 bg-white flex items-start justify-between gap-2 shadow-[1px_1px_0px_0px_#000000]`}
                >
                  <div className="min-w-0">
                    <div className="font-black text-[#1A1A1A] flex items-center gap-1.5">
                      <span>{item.orderNumber}</span>
                      {item.oldQuantity !== undefined && item.newQuantity !== undefined && (
                        <span className="text-[10px] text-[#5C5647] font-normal font-sans">
                          ({item.oldQuantity} L → {item.newQuantity} L)
                        </span>
                      )}
                    </div>
                    {item.reason && (
                      <div className="text-[10px] font-sans font-bold text-[#D9381E] mt-0.5">
                        {item.reason}
                      </div>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[10px] font-bold uppercase shrink-0 ${
                      item.success
                        ? "bg-[#B8E8B8] text-[#1A1A1A] border-black"
                        : "bg-[#FFD9D0] text-[#D9381E] border-black"
                    }`}
                  >
                    {item.success ? (
                      <>
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>Success</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" />
                        <span>Failed</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 px-5 rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#ebd052] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
