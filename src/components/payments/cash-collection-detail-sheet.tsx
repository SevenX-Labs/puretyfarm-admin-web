"use client";

import React, { useState, useEffect } from "react";
import { CashCollectionItem, CashCollectionStatus } from "@/types/payment";
import { fetchCashCollectionDetail } from "@/services/payment-service";
import { getCachedData } from "@/lib/cache";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Banknote,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Copy,
  Check,
  Building2,
  Receipt,
  FileCheck2,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CashCollectionDetailSheetProps {
  collectionId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CashCollectionDetailSheet({
  collectionId,
  isOpen,
  onClose,
}: CashCollectionDetailSheetProps) {
  const [collection, setCollection] = useState<CashCollectionItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && collectionId) {
      let isMounted = true;
      setError(null);

      const cached = getCachedData<CashCollectionItem>(`cash-collection:${collectionId}`);
      if (cached) {
        setCollection(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      fetchCashCollectionDetail(collectionId, {
        onFreshData: (fresh) => {
          if (isMounted && fresh) {
            setCollection(fresh);
            setIsLoading(false);
          }
        },
      })
        .then((fresh) => {
          if (isMounted && fresh) setCollection(fresh);
        })
        .catch((err: unknown) => {
          if (isMounted && !cached) {
            const msg = err instanceof Error ? err.message : "Failed to load collection details.";
            setError(msg);
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (!isOpen) {
      setCollection(null);
      setError(null);
    }
  }, [isOpen, collectionId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: CashCollectionStatus) => {
    switch (status) {
      case "CONFIRMED":
        return {
          className: "bg-[#B8E8B8] border-2 border-black text-[#14532D]",
          icon: <CheckCircle2 className="h-3 w-3 stroke-[3]" />,
          label: "Confirmed",
        };
      case "PENDING":
      case "COLLECTED":
        return {
          className: "bg-[#FFDF58] border-2 border-black text-[#713F12]",
          icon: <Clock className="h-3 w-3 stroke-[3]" />,
          label: status === "COLLECTED" ? "Collected" : "Pending",
        };
      case "CANCELLED":
        return {
          className: "bg-[#FFD9D0] border-2 border-black text-[#7F1D1D]",
          icon: <XCircle className="h-3 w-3 stroke-[2.5]" />,
          label: "Cancelled",
        };
      default:
        return {
          className: "bg-white border-2 border-black text-black",
          icon: null,
          label: status,
        };
    }
  };

  const statusBadge = collection ? getStatusBadge(collection.status) : null;
  const isPlan = collection?.purpose === "PLAN_PAYMENT" || Boolean(collection?.planSelectionId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-xl p-0 overflow-y-auto bg-[#FAF7EC] border-l-2 border-black shadow-[-5px_0px_0px_0px_#000000]"
      >
        {/* Header Strip */}
        <div className="p-5 border-b-2 border-black bg-white">
          <SheetHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="rounded-[6px] border-2 border-black bg-white px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]">
                    {collection?.id || "CASH"}
                  </span>
                  {collection?.id && (
                    <button
                      type="button"
                      onClick={() => handleCopy(collection.id, "header-id")}
                      title="Copy Collection ID"
                      className="rounded border border-black p-1 hover:bg-[#FAF7EC] bg-white cursor-pointer shadow-[1px_1px_0px_0px_#000000]"
                    >
                      {copiedKey === "header-id" ? (
                        <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="h-3 w-3 text-[#1A1A1A]" />
                      )}
                    </button>
                  )}
                </div>
                {statusBadge && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-xs font-black uppercase tracking-wider ${statusBadge.className}`}
                  >
                    {statusBadge.icon}
                    {statusBadge.label}
                  </span>
                )}
              </div>

              <span className="rounded-[4px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                {isPlan ? "Plan Payment" : "Wallet Top-up"}
              </span>
            </div>

            <SheetTitle className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-3">
              Physical Cash Collection Detail
            </SheetTitle>
            <SheetDescription className="text-xs font-bold text-[#5C5647]">
              Depot reconciliation, operational notes, and audit ledger trail.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {isLoading && !collection ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
              <div className="h-32 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
              <div className="h-40 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
            </div>
          ) : error && !collection ? (
            <div className="rounded-[10px] border-2 border-black bg-[#FFD9D0] p-4 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          ) : collection ? (
            <>
              {/* 1. AMOUNT HERO CARD */}
              <div className="rounded-[14px] border-2 border-black bg-[#FFDF58] p-4 shadow-[4px_4px_0px_0px_#000000]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Physical Cash Amount
                  </span>
                  <span className="rounded-[6px] border border-black bg-white px-2 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                    INR
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
                    {formatCurrency(collection.amountPaise / 100)}
                  </span>
                  <span className="text-xs font-black uppercase text-[#1A1A1A]">
                    {isPlan ? "Subscription Plan" : "Wallet Balance"}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/20 flex flex-wrap items-center justify-between text-xs font-bold text-[#1A1A1A]">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="h-3 w-3" />
                    <span>Created: {formatDate(collection.createdAt)}</span>
                  </div>
                  {collection.confirmedAt && (
                    <span className="font-mono text-[11px] text-[#14532D]">
                      Confirmed: {formatDate(collection.confirmedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. TRANSACTION & RECONCILIATION IDENTIFIERS */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <Receipt className="h-3.5 w-3.5 stroke-[2.5]" />
                  Transaction & Collection Identifiers
                </span>

                <div className="space-y-2 text-xs font-bold">
                  {/* Collection ID */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C5647]">Collection Record ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[#1A1A1A] text-[11px] truncate max-w-[180px]">
                        {collection.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(collection.id, "record-id")}
                        className="rounded border border-black p-1 hover:bg-[#FAF7EC] cursor-pointer"
                      >
                        {copiedKey === "record-id" ? (
                          <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                        ) : (
                          <Copy className="h-3 w-3 text-[#1A1A1A]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C5647]">Payment Mode:</span>
                    <span className="inline-block rounded-md border border-black/30 bg-[#FAF7EC] px-2 py-0.5 text-[11px] font-mono font-bold text-[#1A1A1A]">
                      Physical Cash (Depot / Doorstep)
                    </span>
                  </div>

                  {/* Purpose */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C5647]">Purpose:</span>
                    <span className="font-mono text-[#1A1A1A]">
                      {isPlan ? "Subscription Plan Payment" : "Customer Wallet Top-up"}
                    </span>
                  </div>

                  {/* Linked Wallet Credit Request ID */}
                  {collection.walletCreditRequestId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Wallet Credit Request ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#1A1A1A] text-[11px] truncate max-w-[160px]">
                          {collection.walletCreditRequestId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(collection.walletCreditRequestId!, "credit-req-id")}
                          className="rounded border border-black p-1 hover:bg-[#FAF7EC] cursor-pointer"
                        >
                          {copiedKey === "credit-req-id" ? (
                            <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Copy className="h-3 w-3 text-[#1A1A1A]" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Linked Plan Selection ID */}
                  {collection.planSelectionId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Plan Selection ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#1A1A1A] text-[11px] truncate max-w-[160px]">
                          {collection.planSelectionId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(collection.planSelectionId!, "plan-id")}
                          className="rounded border border-black p-1 hover:bg-[#FAF7EC] cursor-pointer"
                        >
                          {copiedKey === "plan-id" ? (
                            <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                          ) : (
                            <Copy className="h-3 w-3 text-[#1A1A1A]" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. CUSTOMER SNAPSHOT */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <User className="h-3.5 w-3.5 stroke-[2.5]" />
                  Customer Information
                </span>

                <div className="rounded-[10px] border border-black/20 bg-[#FAF7EC] p-3 text-xs font-bold space-y-1">
                  <div className="font-black text-sm text-[#1A1A1A]">
                    {collection.customer?.name || "Customer"}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5C5647]">
                    <span className="font-mono">{collection.customer?.mobile || "No phone"}</span>
                    {collection.customer?.email && <span>{collection.customer.email}</span>}
                  </div>
                </div>
              </div>

              {/* 4. RECONCILIATION AUDIT INFO */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <Receipt className="h-3.5 w-3.5 stroke-[2.5]" />
                  Reconciliation Audit Trail
                </span>

                <div className="space-y-2 text-xs font-bold">
                  {collection.confirmedByAdminId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Confirmed By Admin ID:</span>
                      <span className="font-mono text-[#1A1A1A] text-[11px]">
                        {collection.confirmedByAdminId}
                      </span>
                    </div>
                  )}

                  {collection.collectedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Collected Handover:</span>
                      <span className="font-mono text-[#1A1A1A] text-[11px]">
                        {formatDate(collection.collectedAt)}
                      </span>
                    </div>
                  )}

                  {collection.adminNote ? (
                    <div className="pt-2 border-t border-black/10">
                      <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                        Admin Note / Reason:
                      </span>
                      <p className="mt-1 text-xs font-medium text-[#1A1A1A] bg-[#FAF7EC] p-2.5 rounded-[8px] border border-black/20 break-words">
                        {collection.adminNote}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-1 text-[11px] text-[#5C5647] italic">
                      No admin note attached to this record.
                    </div>
                  )}
                </div>
              </div>

              {/* 5. LINKED WALLET OR PLAN DETAILS */}
              {collection.walletCredit && (
                <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                    <FileCheck2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    Linked Wallet Ledger Credit
                  </span>

                  <div className="space-y-1.5 text-xs font-bold">
                    <div className="flex justify-between">
                      <span className="text-[#5C5647]">Credit Status:</span>
                      <span className="font-mono font-black text-[#1A1A1A]">
                        {collection.walletCredit.status}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#5C5647]">Amount Credited:</span>
                      <span className="font-mono font-black text-[#1A1A1A]">
                        {formatCurrency(collection.walletCredit.amountPaise / 100)}
                      </span>
                    </div>

                    {collection.walletCredit.transactionId && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#5C5647]">Ledger Transaction ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-[#1A1A1A]">
                            {collection.walletCredit.transactionId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(collection.walletCredit!.transactionId!, "txnid")}
                            className="p-1 rounded border border-black hover:bg-[#FAF7EC]"
                          >
                            {copiedKey === "txnid" ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-[#1A1A1A]" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {collection.planSelection && (
                <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                    <Building2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    Linked Subscription Plan
                  </span>

                  <div className="space-y-1.5 text-xs font-bold">
                    <div className="flex justify-between">
                      <span className="text-[#5C5647]">Plan Type:</span>
                      <span className="font-black text-[#1A1A1A]">
                        {collection.planSelection.planType}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#5C5647]">Plan Status:</span>
                      <span className="font-mono font-black text-[#1A1A1A]">
                        {collection.planSelection.status}
                      </span>
                    </div>

                    {collection.planSelection.paidAt && (
                      <div className="flex justify-between">
                        <span className="text-[#5C5647]">Activated At:</span>
                        <span className="font-mono text-[11px] text-[#1A1A1A]">
                          {formatDate(collection.planSelection.paidAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
