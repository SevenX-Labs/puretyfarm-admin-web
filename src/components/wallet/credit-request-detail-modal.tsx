"use client";

import React, { useState, useEffect } from "react";
import { CreditRequestItem } from "@/types/wallet";
import { fetchCreditRequestDetail } from "@/services/wallet-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Receipt,
  User,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CreditRequestDetailModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestInspectWallet?: (userId: string) => void;
}

export function CreditRequestDetailModal({
  requestId,
  isOpen,
  onClose,
  onRequestInspectWallet,
}: CreditRequestDetailModalProps) {
  const [detail, setDetail] = useState<CreditRequestItem | null>(null);
  const displayDetail = isOpen && detail?.id === requestId ? detail : null;
  const loading = Boolean(isOpen && requestId && !displayDetail);

  useEffect(() => {
    if (!isOpen || !requestId) return;
    let isMounted = true;
    fetchCreditRequestDetail(requestId)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch credit request detail:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, requestId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-[#B8E8B8] text-black border-2 border-black font-black";
      case "REJECTED":
        return "bg-[#FF8E72] text-black border-2 border-black font-black";
      case "PENDING":
        return "bg-[#D8CEF6] text-black border-2 border-black font-black";
      case "CANCELLED":
        return "bg-stone-200 text-stone-700 border-2 border-black font-black";
      default:
        return "bg-white text-black border-2 border-black";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-lg w-full p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A] flex items-center gap-2">
            <Receipt className="h-5 w-5 stroke-[2.5]" />
            Wallet Request Details
          </DialogTitle>
          <DialogDescription className="text-xs font-bold text-[#5C5647]">
            Customer details, history, and refund status.
          </DialogDescription>
        </DialogHeader>

        {loading && !displayDetail ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-14 bg-[#E5E0D8] rounded-[8px]" />
            <div className="h-24 bg-[#E5E0D8] rounded-[8px]" />
            <div className="h-24 bg-[#E5E0D8] rounded-[8px]" />
          </div>
        ) : displayDetail ? (
          <div className="space-y-4 pt-2 text-xs font-bold">
            {/* Top Stat Banner */}
            <div className="rounded-[10px] border-2 border-black bg-[#FFDF58] p-4 flex items-center justify-between shadow-[2px_2px_0px_0px_#000000]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                  Credit Amount
                </span>
                <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                  {formatCurrency(displayDetail.amountPaise / 100)}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-[6px] px-2.5 py-0.5 text-xs font-mono uppercase ${getStatusBadge(displayDetail.status)}`}>
                  {displayDetail.status}
                </span>
                {displayDetail.refundStatus !== "NOT_REQUIRED" && (
                  <span className="rounded-[4px] border border-black bg-amber-100 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-900">
                    {displayDetail.refundStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Customer Snapshot */}
            <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
              <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1">
                  <User className="h-3.5 w-3.5 stroke-[2]" />
                  Customer Profile
                </span>
                {onRequestInspectWallet && displayDetail.customer?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequestInspectWallet(displayDetail.customer.id);
                    }}
                    className="text-[11px] font-black underline text-blue-700 hover:text-black cursor-pointer"
                  >
                    View Wallet Details →
                  </button>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5647]">Name:</span>
                <span className="font-black text-[#1A1A1A]">{displayDetail.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5C5647]">Mobile:</span>
                <span className="font-mono font-bold text-[#1A1A1A]">{displayDetail.customer?.mobile || "N/A"}</span>
              </div>
              {displayDetail.walletBalancePaise !== undefined && (
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Balance at Snapshot:</span>
                  <span className="font-mono font-black text-[#1A1A1A]">
                    {formatCurrency(displayDetail.walletBalancePaise / 100)}
                  </span>
                </div>
              )}
            </div>

            {/* Admin Activity History */}
            <div className="rounded-[10px] border-2 border-black bg-white p-3.5 space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1 border-b border-black/10 pb-1.5">
                <Clock className="h-3.5 w-3.5 stroke-[2]" />
                Audit Trail
              </span>
              <div className="flex justify-between">
                <span className="text-[#5C5647]">Submitted:</span>
                <span className="font-mono text-[#1A1A1A]">{formatDate(displayDetail.createdAt)} {new Date(displayDetail.createdAt).toLocaleTimeString()}</span>
              </div>
              {displayDetail.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Reviewed At:</span>
                  <span className="font-mono text-[#1A1A1A]">{formatDate(displayDetail.reviewedAt)}</span>
                </div>
              )}
              {displayDetail.reviewedByAdminId && (
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Admin Reviewer ID:</span>
                  <span className="font-mono text-[#1A1A1A] text-[11px]">{displayDetail.reviewedByAdminId}</span>
                </div>
              )}
              {displayDetail.adminNote && (
                <div className="mt-2 rounded-[6px] border border-black/20 bg-[#FFD9D0]/50 p-2 text-xs">
                  <span className="font-black text-[#1A1A1A] block mb-0.5">Admin Note:</span>
                  <span className="text-[#1A1A1A]">{displayDetail.adminNote}</span>
                </div>
              )}
            </div>

            {/* Associated Transaction Snapshot */}
            {displayDetail.transaction && (
              <div className="rounded-[10px] border-2 border-black bg-white p-3.5 space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1 border-b border-black/10 pb-1.5">
                  <Receipt className="h-3.5 w-3.5 stroke-[2]" />
                  Money Added to Wallet
                </span>
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Transaction ID:</span>
                  <span className="font-mono font-bold text-[#1A1A1A]">{displayDetail.transaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Balance After:</span>
                  <span className="font-mono font-black text-[#1A1A1A]">
                    {formatCurrency(displayDetail.transaction.balanceAfterPaise / 100)}
                  </span>
                </div>
                {displayDetail.transaction.description && (
                  <div className="flex justify-between">
                    <span className="text-[#5C5647]">Memo:</span>
                    <span className="text-[#1A1A1A]">{displayDetail.transaction.description}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[10px] border-2 border-black bg-[#FFD84D] hover:bg-[#fcd033] py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
          >
            Close Details
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
