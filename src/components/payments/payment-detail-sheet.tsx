"use client";

import React, { useState, useEffect } from "react";
import { PaymentItem, PaymentTransactionStatus } from "@/types/payment";
import { fetchPaymentDetail, retryPhonePeRefund } from "@/services/payment-service";
import { getCachedData } from "@/lib/cache";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Receipt,
  FileCheck2,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PaymentDetailSheetProps {
  paymentId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentUpdated?: (updated: PaymentItem) => void;
}

export function PaymentDetailSheet({
  paymentId,
  isOpen,
  onClose,
  onPaymentUpdated,
}: PaymentDetailSheetProps) {
  const [payment, setPayment] = useState<PaymentItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetryingRefund, setIsRetryingRefund] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && paymentId) {
      let isMounted = true;
      setError(null);
      setActionSuccess(null);

      // Instant SWR cache load
      const cached = getCachedData<PaymentItem>(`payment:${paymentId}`);
      if (cached) {
        setPayment(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      fetchPaymentDetail(paymentId, {
        onFreshData: (fresh) => {
          if (isMounted && fresh) {
            setPayment(fresh);
            setIsLoading(false);
          }
        },
      })
        .then((fresh) => {
          if (isMounted && fresh) {
            setPayment(fresh);
          }
        })
        .catch((err: unknown) => {
          if (isMounted && !cached) {
            const msg = err instanceof Error ? err.message : "Failed to load payment details.";
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
      setPayment(null);
      setError(null);
      setActionSuccess(null);
    }
  }, [isOpen, paymentId]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRetryRefund = async () => {
    if (!payment) return;
    const creditReqId = payment.walletCreditRequestId || payment.walletCredit?.id;
    if (!creditReqId) {
      setError("No linked credit request ID found for refund orchestration.");
      return;
    }

    setIsRetryingRefund(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await retryPhonePeRefund(creditReqId);
      const updated: PaymentItem = {
        ...payment,
        status: "REFUND_PENDING",
        updatedAt: new Date().toISOString(),
      };
      setPayment(updated);
      setActionSuccess(res.message || "PhonePe refund retry initiated successfully. Status set to REFUND_PENDING.");
      onPaymentUpdated?.(updated);
    } catch (err: unknown) {
      console.error("Refund retry error:", err);
      const msg = err instanceof Error ? err.message : "Failed to trigger PhonePe refund retry.";
      setError(msg);
    } finally {
      setIsRetryingRefund(false);
    }
  };

  const getStatusBadge = (status: PaymentTransactionStatus) => {
    switch (status) {
      case "SUCCESS":
        return "bg-[#B8E8B8] border-2 border-black text-black font-mono font-black text-xs";
      case "REFUND_PENDING":
        return "bg-[#FFE58F] border-2 border-black text-black font-mono font-black text-xs";
      case "REFUNDED":
        return "bg-[#D8CEF6] border-2 border-black text-black font-mono font-black text-xs";
      case "PENDING":
      case "PROCESSING":
        return "bg-[#FFDF58] border-2 border-black text-black font-mono font-black text-xs";
      case "FAILED":
      case "CANCELLED":
      case "EXPIRED":
        return "bg-[#FF8E72] border-2 border-black text-black font-mono font-black text-xs";
      default:
        return "bg-white border-2 border-black text-black font-mono font-bold text-xs";
    }
  };

  // Check if refund retry is applicable
  // Requirements:
  // - Linked credit request is REJECTED
  // - Payment method is ONLINE (never for cash)
  // - Payment status is NOT REFUNDED
  const linkedCreditStatus = payment?.walletCredit?.status;
  const isRejectedCredit = linkedCreditStatus === "REJECTED";
  const isOnlinePayment = payment?.paymentMethod === "ONLINE";
  const isNotRefunded = payment?.status !== "REFUNDED";
  const canRetryRefund = isOnlinePayment && isRejectedCredit && isNotRefunded;

  const providerResp = payment?.providerResponse || {};

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
                <span className="rounded-[6px] border-2 border-black bg-white px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]">
                  {payment?.transactionId || "PAYMENT"}
                </span>
                {payment && (
                  <span className={`rounded-[6px] px-2.5 py-1 uppercase tracking-wider ${getStatusBadge(payment.status)}`}>
                    {payment.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {payment && (
                <span className="rounded-[4px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                  Provider: {payment.provider}
                </span>
              )}
            </div>

            <SheetTitle className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-3">
              Payment Gateway Audit Detail
            </SheetTitle>
            <SheetDescription className="text-xs font-bold text-[#5C5647]">
              Full details of the online payment and refund status.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {isLoading && !payment ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-20 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
              <div className="h-32 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
              <div className="h-44 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
            </div>
          ) : error && !payment ? (
            <div className="rounded-[10px] border-2 border-black bg-[#FFD9D0] p-4 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          ) : payment ? (
            <>
              {/* Alert Banners */}
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#B8E8B8] p-3 text-xs font-black text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[3]" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000]">
                  <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                  <span>{error}</span>
                </div>
              )}

              {/* Read-Only Notice */}
              <div className="rounded-[10px] border-2 border-black bg-white p-3 text-xs font-bold text-[#5C5647] flex items-center gap-2 shadow-[2px_2px_0px_0px_#000000]">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#1A1A1A]" />
                <span>
                  Online payments are read-only. Status transitions strictly via verified PhonePe callbacks and webhooks.
                </span>
              </div>

              {/* 1. TRANSACTION HERO CARD */}
              <div className="rounded-[14px] border-2 border-black bg-[#FFDF58] p-4 shadow-[4px_4px_0px_0px_#000000]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Transaction Amount
                  </span>
                  <span className="rounded-[6px] border border-black bg-white px-2 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                    {payment.currency || "INR"}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
                    {formatCurrency(payment.amountPaise / 100)}
                  </span>
                  <span className="text-xs font-black uppercase text-[#1A1A1A]">
                    {payment.purpose.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/20 flex flex-wrap items-center justify-between text-xs font-bold text-[#1A1A1A]">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="h-3 w-3" />
                    <span>Created: {formatDate(payment.createdAt)}</span>
                  </div>
                  {payment.completedAt && (
                    <span className="font-mono text-[11px] text-emerald-900">
                      Settled: {formatDate(payment.completedAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* 2. MANUAL PHONEPE REFUND RETRY BLOCK */}
              {canRetryRefund && (
                <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <span className="text-xs font-black uppercase text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 stroke-[2.5]" />
                      PhonePe Refund Status & Fallback
                    </span>
                    <span className="rounded-[4px] border border-black bg-[#FF8E72] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                      Credit Rejected
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[#5C5647]">
                    The linked credit request was rejected by an admin, but the automated PhonePe refund call failed or requires retry.
                  </p>

                  <div className="rounded-[8px] border border-black/20 bg-[#FAF7EC] p-3 text-xs font-bold space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[#5C5647]">Locked Refund Value:</span>
                      <span className="font-mono font-black text-sm text-[#1A1A1A]">
                        {formatCurrency(payment.amountPaise / 100)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#5C5647] italic">
                      Notice: Refund amount is strictly locked to payment value. Manual modification is forbidden.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isRetryingRefund || payment.status === "REFUND_PENDING"}
                    onClick={handleRetryRefund}
                    className="w-full rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#fcd033] py-2 px-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRetryingRefund ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
                        <span>Triggering PhonePe Refund API...</span>
                      </>
                    ) : payment.status === "REFUND_PENDING" ? (
                      <>
                        <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Awaiting PhonePe Confirmation</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Retry PhonePe Refund</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* 3. TRANSACTION IDENTIFIERS */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <Receipt className="h-3.5 w-3.5 stroke-[2.5]" />
                  Transaction Identifiers
                </span>

                <div className="space-y-2 text-xs font-bold">
                  {/* Merchant Txn ID */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#5C5647]">Merchant TXN ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-[#1A1A1A]">
                        {payment.transactionId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(payment.transactionId, "txnid")}
                        className="rounded border border-black p-1 hover:bg-[#FAF7EC] cursor-pointer"
                        title="Copy Transaction ID"
                      >
                        {copiedKey === "txnid" ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-[#1A1A1A]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Provider Payment ID / Reference */}
                  {payment.providerPaymentId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Provider Payment ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#1A1A1A]">
                          {payment.providerPaymentId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(payment.providerPaymentId!, "providerid")}
                          className="rounded border border-black p-1 hover:bg-[#FAF7EC] cursor-pointer"
                        >
                          {copiedKey === "providerid" ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-[#1A1A1A]" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Order ID */}
                  {payment.orderId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Linked Order ID:</span>
                      <span className="font-mono text-[#1A1A1A]">{payment.orderId}</span>
                    </div>
                  )}

                  {/* Wallet Credit Request ID */}
                  {payment.walletCreditRequestId && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#5C5647]">Linked Credit Request ID:</span>
                      <span className="font-mono text-[#1A1A1A]">
                        {payment.walletCreditRequestId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. CUSTOMER PROFILE SNAPSHOT */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <User className="h-3.5 w-3.5 stroke-[2.5]" />
                  Customer Profile
                </span>

                <div className="rounded-[10px] border border-black/20 bg-[#FAF7EC] p-3 text-xs font-bold space-y-1">
                  <div className="font-black text-sm text-[#1A1A1A]">
                    {payment.customer?.name || "Customer"}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5C5647]">
                    <span className="font-mono">{payment.customer?.mobile || "No phone"}</span>
                    {payment.customer?.email && <span>{payment.customer.email}</span>}
                  </div>
                </div>
              </div>

              {/* 5. SANITIZED PHONEPE GATEWAY PAYLOAD */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <Building2 className="h-3.5 w-3.5 stroke-[2.5]" />
                  PhonePe Gateway Payload
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <div className="rounded-[8px] border border-black/15 bg-white p-2">
                    <span className="text-[10px] uppercase text-[#5C5647] block font-mono">Payment Mode</span>
                    <span className="text-xs text-[#1A1A1A] font-bold">
                      {providerResp.mode || (payment.paymentMethod === "CASH" ? "Cash" : "Online / UPI")}
                    </span>
                  </div>

                  <div className="rounded-[8px] border border-black/15 bg-white p-2">
                    <span className="text-[10px] uppercase text-[#5C5647] block font-mono">Bank Code</span>
                    <span className="text-xs font-mono text-[#1A1A1A] font-bold">
                      {providerResp.bankcode || "—"}
                    </span>
                  </div>

                  <div className="rounded-[8px] border border-black/15 bg-white p-2">
                    <span className="text-[10px] uppercase text-[#5C5647] block font-mono">Provider Status</span>
                    <span className="text-xs text-[#1A1A1A] font-bold">
                      {providerResp.status || payment.status}
                    </span>
                  </div>

                  <div className="rounded-[8px] border border-black/15 bg-white p-2">
                    <span className="text-[10px] uppercase text-[#5C5647] block font-mono">Unmapped Status</span>
                    <span className="text-xs font-mono text-[#1A1A1A] font-bold">
                      {providerResp.unmappedstatus || "—"}
                    </span>
                  </div>
                </div>

                {/* Failure code & message if any */}
                {(payment.failureCode || payment.failureMessage) && (
                  <div className="rounded-[8px] border border-red-500 bg-[#FFD9D0] p-2.5 text-xs font-bold text-red-950 mt-2">
                    <div className="font-black uppercase text-[10px]">Failure Code: {payment.failureCode || "FAILED"}</div>
                    <p className="mt-0.5">{payment.failureMessage || "Transaction was rejected or expired by bank."}</p>
                  </div>
                )}
              </div>

              {/* 6. LINKED WALLET CREDIT RECORD */}
              {payment.walletCredit && (
                <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                    <FileCheck2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    Linked Wallet Credit Request
                  </span>

                  <div className="space-y-1.5 text-xs font-bold">
                    <div className="flex justify-between">
                      <span className="text-[#5C5647]">Credit Status:</span>
                      <span className="font-mono font-black text-[#1A1A1A]">
                        {payment.walletCredit.status}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-[#5C5647]">Credit Amount:</span>
                      <span className="font-mono font-black text-[#1A1A1A]">
                        {formatCurrency(payment.walletCredit.amountPaise / 100)}
                      </span>
                    </div>

                    {payment.walletCredit.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-[#5C5647]">Transaction ID:</span>
                        <span className="font-mono text-[#1A1A1A]">
                          {payment.walletCredit.transactionId}
                        </span>
                      </div>
                    )}

                    {payment.walletCredit.adminNote && (
                      <div className="pt-1 border-t border-black/10">
                        <span className="text-[10px] text-[#5C5647] block uppercase">Admin Note:</span>
                        <p className="text-xs text-[#1A1A1A] mt-0.5">{payment.walletCredit.adminNote}</p>
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
