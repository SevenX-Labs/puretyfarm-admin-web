"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CustomerWalletDetail } from "@/types/wallet";
import { fetchCustomerWallet } from "@/services/wallet-service";
import { getCachedData } from "@/lib/cache";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Wallet,
  Phone,
  Mail,
  User,
  AlertTriangle,
  Info,
  RefreshCw,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerWalletSheetProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerWalletSheet({
  userId,
  isOpen,
  onClose,
}: CustomerWalletSheetProps) {
  const [wallet, setWallet] = useState<CustomerWalletDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Instant 0ms cached display
  const cachedWallet = userId ? getCachedData<CustomerWalletDetail>(`wallet:customer:${userId}`) : null;
  const activeWallet = wallet || cachedWallet;
  const displayWallet = isOpen && activeWallet?.customer?.id === userId ? activeWallet : null;
  const isLoading = Boolean(isOpen && userId && !displayWallet);

  const loadWallet = useCallback(
    async (forceRefresh = false) => {
      if (!userId) return;
      if (forceRefresh) setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchCustomerWallet(userId, {
          forceRefresh,
          onFreshData: (fresh) => {
            if (fresh) {
              setWallet(fresh);
              setError(null);
            }
          },
        });
        if (data) {
          setWallet(data);
          setError(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load customer wallet.";
        setError(msg);
      } finally {
        setIsRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!isOpen || !userId) {
      setWallet(null);
      setError(null);
      return;
    }
    loadWallet(false);
  }, [isOpen, userId, loadWallet]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-xl p-0 overflow-y-auto bg-[#FAF7EC] border-l-2 border-black shadow-[-6px_0px_0px_0px_#000000]"
      >
        {/* Header Strip */}
        <div className="p-5 border-b-2 border-black bg-white sticky top-0 z-20">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-[6px] border-2 border-black bg-[#FFD84D] px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 stroke-[2.5]" />
                  CUSTOMER LEDGER
                </span>
                <span className="rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#5C5647]">
                  REAL-TIME LEDGER
                </span>
              </div>

              {userId && (
                <button
                  type="button"
                  onClick={() => loadWallet(true)}
                  disabled={isRefreshing}
                  className="rounded-[6px] border-2 border-black bg-white hover:bg-[#FAF7EC] p-1.5 text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title="Refresh Wallet"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-700" : "text-[#1A1A1A]"}`}
                  />
                </button>
              )}
            </div>

            <SheetTitle className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-2">
              Customer Wallet Ledger
            </SheetTitle>
            <SheetDescription className="text-xs font-bold text-[#5C5647]">
              Current verified prepaid balance and transaction history.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="h-28 bg-white border-2 border-black rounded-[14px] p-4 animate-pulse" />
              <div className="h-24 bg-white border-2 border-black rounded-[14px] p-4 animate-pulse" />
              <div className="h-48 bg-white border-2 border-black rounded-[14px] p-4 animate-pulse" />
            </div>
          ) : error && !displayWallet ? (
            <div className="rounded-[14px] border-2 border-black bg-[#FFD9D0] p-5 shadow-[4px_4px_0px_0px_#000000] text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-[#8C2E1D] mx-auto" />
              <h4 className="text-sm font-black uppercase text-[#1A1A1A]">
                Failed to Load Wallet
              </h4>
              <p className="text-xs font-bold text-[#5C5647]">{error}</p>
              <button
                type="button"
                onClick={() => loadWallet(true)}
                className="px-4 py-2 bg-white border-2 border-black rounded-[8px] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FAF7EC] cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : displayWallet ? (
            <>
              {/* Primary Balance Display Card */}
              <div className="rounded-[14px] border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000000] relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
                  <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                    Available Wallet Float
                  </span>
                  {displayWallet.autoCreditEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-black bg-[#B8E8B8] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                      <ShieldCheck className="h-3 w-3 stroke-[2.5]" />
                      AUTO-CREDIT ACTIVE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-black bg-[#FFDF58] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                      <ShieldAlert className="h-3 w-3 stroke-[2.5]" />
                      MANUAL REVIEW REQUIRED
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="font-mono text-3xl sm:text-4xl font-black tabular-nums text-[#1A1A1A]">
                      {formatCurrency(displayWallet.balancePaise / 100)}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#5C5647] block mt-0.5">
                      ({displayWallet.balancePaise.toLocaleString()} paise)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase bg-[#1A1A1A] text-[#FFDF58] px-2.5 py-1 rounded-[6px] shadow-[1px_1px_0px_0px_#000000]">
                    Current Balance
                  </span>
                </div>
              </div>

              {/* Customer Profile Card */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000000] space-y-2">
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 stroke-[2.5]" />
                    Customer Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(displayWallet.customer.id)}
                    className="text-[10px] font-mono font-bold text-[#5C5647] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-700" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>ID: {displayWallet.customer.id.slice(0, 8)}...</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs font-bold space-y-1">
                  <div className="font-black text-sm text-[#1A1A1A]">
                    {displayWallet.customer?.name || "Customer"}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5C5647]">
                    <span className="font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3 stroke-[2]" />
                      {displayWallet.customer?.mobile || "No phone"}
                    </span>
                    {displayWallet.customer?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 stroke-[2]" />
                        {displayWallet.customer.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Cards: Credits vs Debits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] border-2 border-black bg-[#B8E8B8]/40 p-3.5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                      Total Credits
                    </span>
                    <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-800 stroke-[3]" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-lg sm:text-xl font-black text-[#1A1A1A]">
                      {formatCurrency(displayWallet.summary.totalCreditsPaise / 100)}
                    </span>
                    <p className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                      {displayWallet.summary.totalCreditsCount} Recharge(s)
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] border-2 border-black bg-[#FF8E72]/30 p-3.5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                      Total Debits
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#8C2E1D] stroke-[3]" />
                  </div>
                  <div className="mt-2">
                    <span className="font-mono text-lg sm:text-xl font-black text-[#1A1A1A]">
                      {formatCurrency(displayWallet.summary.totalDebitsPaise / 100)}
                    </span>
                    <p className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                      {displayWallet.summary.totalDebitsCount} Consumption(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Adjustment Status Notice */}
              <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3 text-xs font-bold text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] space-y-1">
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-black uppercase text-[#5C5647]">
                  <Info className="h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                  <span>Manual Ledger Adjustments</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#5C5647]">
                  Direct arbitrary wallet credit/debit is not exposed as a backend endpoint (no <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">POST /admin/wallet/customers/:id/adjust</code>). All balance modifications must originate through verified customer online recharge requests or confirmed doorstep cash collections.
                </p>
              </div>

              {/* Transaction History Section */}
              <div className="rounded-[14px] border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
                <div className="p-3.5 bg-[#FAF7EC] border-b-2 border-black flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 stroke-[2.5] text-[#1A1A1A]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                      Transaction Ledger
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#5C5647]">
                    {displayWallet.recentTransactions.length} Recorded Entries
                  </span>
                </div>

                <div className="divide-y-2 divide-black/10 max-h-96 overflow-y-auto">
                  {displayWallet.recentTransactions.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-[#5C5647] space-y-1">
                      <p className="text-[#1A1A1A] font-black uppercase text-xs">No Transactions Yet</p>
                      <p className="text-[11px]">This customer has not performed any wallet top-ups or order deductions.</p>
                    </div>
                  ) : (
                    displayWallet.recentTransactions.map((tx) => {
                      const isCredit = tx.type === "CREDIT";
                      return (
                        <div key={tx.id} className="p-3.5 hover:bg-[#FAF7EC]/60 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-[4px] border border-black px-2 py-0.5 text-[9px] font-mono font-black uppercase ${
                                  isCredit
                                    ? "bg-[#B8E8B8] text-[#1A1A1A]"
                                    : "bg-[#FFD9D0] text-[#1A1A1A]"
                                }`}
                              >
                                {tx.type}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[#5C5647] flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(tx.createdAt)}
                              </span>
                            </div>

                            <span
                              className={`font-mono font-black text-sm tabular-nums ${
                                isCredit ? "text-emerald-800" : "text-[#1A1A1A]"
                              }`}
                            >
                              {isCredit ? "+" : "-"}
                              {formatCurrency(tx.amountPaise / 100)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-[#1A1A1A] truncate max-w-[240px]">
                              {tx.description || tx.referenceType || "Wallet transaction"}
                            </span>
                            <span className="font-mono text-[10px] text-[#5C5647]">
                              Balance After: {formatCurrency(tx.balanceAfterPaise / 100)}
                            </span>
                          </div>

                          {tx.referenceId && (
                            <div className="text-[10px] font-mono text-[#5C5647] bg-[#FAF7EC] px-2 py-0.5 rounded border border-black/10 inline-block">
                              Ref: {tx.referenceId}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {displayWallet.recentTransactions.length > 0 && (
                  <div className="p-2.5 bg-[#FAF7EC] border-t border-black/10 text-center text-[10px] font-mono text-[#5C5647]">
                    Showing ledger entries returned by backend API
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
