"use client";

import React, { useState } from "react";
import { MembershipType } from "@/types/customer";
import { updateCustomerMembership, bulkUpdateMembership } from "@/services/customer-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Crown, Loader2, AlertTriangle, ShieldMinus } from "lucide-react";

interface VipMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: MembershipType;
  customerIds: string[];
  customerNames?: string[];
  onSuccess: (result: { updatedCount: number; failedIds: string[] }) => void;
}

export function VipMembershipModal({
  isOpen,
  onClose,
  targetType,
  customerIds,
  customerNames,
  onSuccess,
}: VipMembershipModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMakeVip = targetType === "VIP";
  const isBulk = customerIds.length > 1;
  const count = customerIds.length;

  const handleConfirm = async () => {
    if (customerIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (isBulk) {
        const res = await bulkUpdateMembership(customerIds, targetType);
        onSuccess({ updatedCount: res.updatedCount, failedIds: res.failedIds });
      } else {
        await updateCustomerMembership(customerIds[0], targetType);
        onSuccess({ updatedCount: 1, failedIds: [] });
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update membership.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-md w-full p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-[8px] border-2 border-black shadow-[2px_2px_0px_0px_#000000] ${
                isMakeVip ? "bg-[#FFD84D]" : "bg-[#E4DFD0]"
              }`}
            >
              {isMakeVip ? (
                <Crown className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
              ) : (
                <ShieldMinus className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
              )}
            </span>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                {isMakeVip ? "Make VIP" : "Remove VIP"}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                {isBulk
                  ? `Update ${count} customer${count === 1 ? "" : "s"} to ${targetType} membership.`
                  : `Change this customer to ${targetType} membership.`}
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
              <span>{isBulk ? "Customers Selected:" : "Customer:"}</span>
              <span className="font-mono bg-white border border-black px-2 py-0.5 rounded-[6px]">
                {isBulk ? count : (customerNames?.[0] || customerIds[0]?.slice(0, 8) + "...")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>New Membership:</span>
              <span
                className={`font-mono font-black px-2 py-0.5 rounded-[6px] border-2 border-black inline-flex items-center gap-1 ${
                  isMakeVip
                    ? "bg-[#FFD84D] text-[#1A1A1A]"
                    : "bg-[#E4DFD0] text-[#1A1A1A]"
                }`}
              >
                {isMakeVip && <Crown className="h-3 w-3" />}
                {targetType}
              </span>
            </div>
          </div>

          {isBulk && customerNames && customerNames.length > 0 && (
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-[8px] border-2 border-black bg-[#FAF7EC] p-2 text-xs font-mono">
              {customerNames.slice(0, 10).map((name, i) => (
                <div key={customerIds[i]} className="flex items-center justify-between py-0.5 px-1 text-[11px]">
                  <span className="font-bold text-[#1A1A1A]">{name}</span>
                  <span className="font-mono text-[#5C5647]">{customerIds[i].slice(0, 8)}...</span>
                </div>
              ))}
              {customerNames.length > 10 && (
                <div className="text-[10px] text-center text-[#5C5647] pt-1">
                  ...and {customerNames.length - 10} more
                </div>
              )}
            </div>
          )}
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
            disabled={isSubmitting || customerIds.length === 0}
            onClick={handleConfirm}
            className={`w-full sm:w-auto h-9 px-5 rounded-[8px] border-2 border-black text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${
              isMakeVip
                ? "bg-[#FFD84D] hover:bg-[#E6C23D]"
                : "bg-[#E4DFD0] hover:bg-[#D5D0C3]"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                {isMakeVip ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  <ShieldMinus className="h-3.5 w-3.5" />
                )}
                <span>
                  {isMakeVip
                    ? `Make ${isBulk ? count + " " : ""}VIP`
                    : `Remove ${isBulk ? count + " " : ""}VIP`}
                </span>
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
