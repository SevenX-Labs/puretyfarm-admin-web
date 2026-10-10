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
  AlertTriangle,
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
        className="w-full sm:max-w-md md:max-w-lg p-0 overflow-y-auto bg-[#FAF7EC] border-l-2 border-black shadow-[-6px_0px_0px_0px_#000000]"
      >
        {/* Compact Header */}
        <div className="p-4 border-b-2 border-black bg-white sticky top-0 z-20">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-[6px] border-2 border-black bg-[#FFD84D] px-2.5 py-0.5 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 stroke-[2.5]" />
                  CUSTOMER LEDGER
                </span>
                {displayWallet?.autoCreditEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-black bg-[#B8E8B8] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                    <ShieldCheck className="h-2.5 w-2.5 stroke-[2.5]" />
                    AUTO-CREDIT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-black bg-[#FFDF58] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                    <ShieldAlert className="h-2.5 w-2.5 stroke-[2.5]" />
                    MANUAL REVIEW
                  </span>
                )}
              </div>

              {userId && (
                <button
                  type="button"
                  onClick={() => loadWallet(true)}
                  disabled={isRefreshing}
                  className="rounded-[6px] border-2 border-black bg-white hover:bg-[#FAF7EC] p-1 text-xs font-black shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title="Refresh Wallet"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-amber-700" : "text-[#1A1A1A]"}`}
                  />
                </button>
              )}
            </div>

            <SheetTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A] mt-1.5 leading-none">
              {displayWallet?.customer?.name || "Customer Wallet"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Customer wallet ledger and balance details
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3.5">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <div className="h-20 bg-white border-2 border-black rounded-[12px] p-3 animate-pulse" />
              <div className="h-16 bg-white border-2 border-black rounded-[12px] p-3 animate-pulse" />
              <div className="h-44 bg-white border-2 border-black rounded-[12px] p-3 animate-pulse" />
            </div>
          ) : error && !displayWallet ? (
            <div className="rounded-[12px] border-2 border-black bg-[#FFD9D0] p-4 shadow-[3px_3px_0px_0px_#000000] text-center space-y-2">
              <AlertTriangle className="h-6 w-6 text-[#8C2E1D] mx-auto" />
              <h4 className="text-xs font-black uppercase text-[#1A1A1A]">
                Failed to Load Wallet
              </h4>
              <p className="text-[11px] font-bold text-[#5C5647]">{error}</p>
              <button
                type="button"
                onClick={() => loadWallet(true)}
                className="px-3 py-1 bg-white border-2 border-black rounded-[6px] text-xs font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000] hover:bg-[#FAF7EC] cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : displayWallet ? (
            <>
              {/* Minimal Unified Balance & Profile Card */}
              <div className="rounded-[12px] border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000000] space-y-2.5">
                {/* Balance Row */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#5C5647] tracking-wider block font-mono">
                      Current Float Balance
                    </span>
                    <span className="font-mono text-2xl sm:text-3xl font-black tabular-nums text-[#1A1A1A]">
                      {formatCurrency(displayWallet.balancePaise / 100)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-mono font-bold text-[#5C5647] block">
                      {displayWallet.balancePaise.toLocaleString()} paise
                    </span>
                    <span className="inline-block text-[9px] font-mono font-black uppercase bg-[#1A1A1A] text-[#FFDF58] px-2 py-0.5 rounded-[4px] mt-0.5">
                      LIVE FLOAT
                    </span>
                  </div>
                </div>

                {/* Customer Contact Sub-strip */}
                <div className="border-t border-black/10 pt-2 flex items-center justify-between text-[11px] font-bold text-[#5C5647]">
                  <div className="flex items-center gap-2 font-mono">
                    <Phone className="h-3 w-3 stroke-[2] text-[#1A1A1A]" />
                    <span>{displayWallet.customer?.mobile || "No phone"}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(displayWallet.customer.id)}
                    className="text-[10px] font-mono font-bold text-[#5C5647] hover:text-[#1A1A1A] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-700" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>ID: {displayWallet.customer.id.slice(0, 8)}...</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Compact Credits vs Debits Summary Strip */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8]/40 p-2.5 shadow-[2px_2px_0px_0px_#000000] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#1A1A1A] block font-mono">
                      Credits ({displayWallet.summary.totalCreditsCount})
                    </span>
                    <span className="font-mono text-base font-black text-[#1A1A1A] block mt-0.5">
                      {formatCurrency(displayWallet.summary.totalCreditsPaise / 100)}
                    </span>
                  </div>
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-800 stroke-[3]" />
                </div>

                <div className="rounded-[10px] border-2 border-black bg-[#FF8E72]/30 p-2.5 shadow-[2px_2px_0px_0px_#000000] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#1A1A1A] block font-mono">
                      Debits ({displayWallet.summary.totalDebitsCount})
                    </span>
                    <span className="font-mono text-base font-black text-[#1A1A1A] block mt-0.5">
                      {formatCurrency(displayWallet.summary.totalDebitsPaise / 100)}
                    </span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#8C2E1D] stroke-[3]" />
                </div>
              </div>

              {/* Minimal Transaction Ledger Table */}
              <div className="rounded-[12px] border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
                <div className="p-2.5 bg-[#FAF7EC] border-b-2 border-black flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 stroke-[2.5] text-[#1A1A1A]" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                      Transaction Ledger
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-[#5C5647]">
                    {displayWallet.recentTransactions.length} Entries
                  </span>
                </div>

                <div className="divide-y-2 divide-black/10 max-h-[380px] overflow-y-auto">
                  {displayWallet.recentTransactions.length === 0 ? (
                    <div className="py-6 text-center text-xs font-bold text-[#5C5647] space-y-0.5">
                      <p className="text-[#1A1A1A] font-black uppercase text-[11px]">No Ledger Entries</p>
                      <p className="text-[10px]">No wallet top-ups or order deductions recorded.</p>
                    </div>
                  ) : (
                    displayWallet.recentTransactions.map((tx) => {
                      const isCredit = tx.type === "CREDIT";
                      return (
                        <div key={tx.id} className="p-2.5 hover:bg-[#FAF7EC]/60 transition-colors space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-[4px] border border-black px-1.5 py-0.2 text-[9px] font-mono font-black uppercase ${
                                  isCredit
                                    ? "bg-[#B8E8B8] text-[#1A1A1A]"
                                    : "bg-[#FFD9D0] text-[#1A1A1A]"
                                }`}
                              >
                                {tx.type}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-[#5C5647] flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {formatDate(tx.createdAt)}
                              </span>
                            </div>

                            <span
                              className={`font-mono font-black text-xs sm:text-sm tabular-nums ${
                                isCredit ? "text-emerald-800" : "text-[#1A1A1A]"
                              }`}
                            >
                              {isCredit ? "+" : "-"}
                              {formatCurrency(tx.amountPaise / 100)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-[#1A1A1A] truncate max-w-[200px]">
                              {tx.description || tx.referenceType || "Wallet transaction"}
                            </span>
                            <span className="font-mono text-[9px] text-[#5C5647]">
                              Bal: {formatCurrency(tx.balanceAfterPaise / 100)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
