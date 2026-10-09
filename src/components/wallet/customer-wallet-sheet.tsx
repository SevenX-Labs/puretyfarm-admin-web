"use client";

import React, { useState, useEffect } from "react";
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

  // Instant 0ms cached display
  const cachedWallet = userId ? getCachedData<CustomerWalletDetail>(`wallet:customer:${userId}`) : null;
  const activeWallet = wallet || cachedWallet;
  const displayWallet = isOpen && activeWallet?.customer?.id === userId ? activeWallet : null;
  const isLoading = Boolean(isOpen && userId && !displayWallet);

  useEffect(() => {
    if (!isOpen || !userId) return;
    let isMounted = true;
    const cached = getCachedData<CustomerWalletDetail>(`wallet:customer:${userId}`);

    fetchCustomerWallet(userId, {
      onFreshData: (fresh) => {
        if (isMounted && fresh) {
          setWallet(fresh);
          setError(null);
        }
      },
    })
      .then((data) => {
        if (isMounted && data) {
          setWallet(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted && !cached) {
          const msg = err instanceof Error ? err.message : "Failed to load customer wallet.";
          setError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-xl p-0 overflow-y-auto bg-[#FAF7EC] border-l-2 border-black shadow-[-5px_0px_0px_0px_#000000]"
      >
        {/* Header Strip */}
        <div className="p-5 border-b-2 border-black bg-white">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <span className="rounded-[6px] border-2 border-black bg-[#FFD84D] px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 stroke-[2.5]" />
                PREPAID WALLET
              </span>
              <span className="rounded-[6px] border border-black bg-white px-2 py-0.5 text-[10px] font-mono text-[#5C5647]">
                BALANCE HISTORY
              </span>
            </div>

            <SheetTitle className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-3">
              Customer Wallet Details
            </SheetTitle>
            <SheetDescription className="text-xs font-bold text-[#5C5647]">
              Current balance and a list of all money added or spent.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {isLoading && !activeWallet ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 bg-[#E5E0D8] rounded-[14px] border-2 border-black/30" />
              <div className="h-20 bg-[#E5E0D8] rounded-[14px] border-2 border-black/30" />
              <div className="h-56 bg-[#E5E0D8] rounded-[14px] border-2 border-black/30" />
            </div>
          ) : error && !displayWallet ? (
            <div className="rounded-[10px] border-2 border-black bg-[#FFD9D0] p-4 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          ) : displayWallet ? (
            <>
              {/* Massive Live Balance Banner */}
              <div className="rounded-[14px] border-2 border-black bg-[#FFDF58] p-5 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Total Live Wallet Balance
                  </span>
                  {/* Auto-Credit Status Pill */}
                  {displayWallet.autoCreditEnabled ? (
                    <span className="bg-[#B8E8B8] border border-black text-xs font-mono font-bold px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000000] text-emerald-950 inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
                      ● AUTO-CREDIT ACTIVE
                    </span>
                  ) : (
                    <span className="bg-[#FFE58F] border border-black text-xs font-mono font-bold px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000000] text-amber-950 inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-600 inline-block" />
                      ● FIRST CREDIT PENDING APPROVAL
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-mono text-3xl sm:text-4xl font-black tabular-nums text-[#1A1A1A]">
                    {formatCurrency(displayWallet.balancePaise / 100)}
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase bg-black text-[#FFDF58] px-2 py-0.5 rounded-[4px]">
                    Current Balance
                  </span>
                </div>
              </div>

              {/* Architecture Info Banner */}
              <div className="rounded-[10px] border-2 border-black bg-[#FFFDF7] p-3 text-xs font-bold text-[#1A1A1A] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
                <Info className="h-4 w-4 shrink-0 text-[#1A1A1A] mt-0.5" />
                <p className="text-[11px] leading-relaxed text-[#5C5647]">
                  <strong className="text-[#1A1A1A]">Per-Wallet Policy:</strong> First top-ups ALWAYS require manual admin verification to flip auto-credit to active. Subsequent verified online top-ups credit immediately; physical cash collections always wait for manual confirmation.
                </p>
              </div>

              {/* Customer Profile Card */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000000] space-y-2">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-1.5">
                  <User className="h-3.5 w-3.5 stroke-[2.5]" />
                  Account Holder Information
                </span>
                <div className="text-xs font-bold space-y-1">
                  <div className="font-black text-sm text-[#1A1A1A]">
                    {displayWallet.customer?.name}
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

              {/* Summary Cards: 2-Column Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[12px] border-2 border-black bg-[#B8E8B8]/40 p-3.5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Total Credits
                  </span>
                  <div className="mt-1">
                    <span className="font-mono text-xl font-black text-[#1A1A1A]">
                      {formatCurrency(displayWallet.summary.totalCreditsPaise / 100)}
                    </span>
                    <p className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                      {displayWallet.summary.totalCreditsCount} Recharge(s)
                    </p>
                  </div>
                </div>

                <div className="rounded-[12px] border-2 border-black bg-[#FF8E72]/30 p-3.5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Total Debits
                  </span>
                  <div className="mt-1">
                    <span className="font-mono text-xl font-black text-[#1A1A1A]">
                      {formatCurrency(displayWallet.summary.totalDebitsPaise / 100)}
                    </span>
                    <p className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                      {displayWallet.summary.totalDebitsCount} Consumption(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions Table */}
              <div className="rounded-[14px] border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
                <div className="p-3.5 bg-[#FAF7EC] border-b-2 border-black flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                    Transaction History
                  </span>
                  <span className="font-mono text-[10px] font-bold text-[#5C5647]">
                    {displayWallet.recentTransactions.length} Entries
                  </span>
                </div>

                <div className="divide-y-2 divide-black/10 max-h-96 overflow-y-auto">
                  {displayWallet.recentTransactions.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-[#5C5647]">
                      No transactions found for this customer.
                    </div>
                  ) : (
                    displayWallet.recentTransactions.map((tx) => {
                      const isCredit = tx.type === "CREDIT";
                      return (
                        <div key={tx.id} className="p-3.5 hover:bg-[#FAF7EC]/60 transition-colors space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-[4px] border border-black px-1.5 py-0.2 text-[9px] font-mono font-black uppercase ${
                                  isCredit
                                    ? "bg-[#B8E8B8] text-[#1A1A1A]"
                                    : "bg-[#FFD9D0] text-[#1A1A1A]"
                                }`}
                              >
                                {tx.type}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-[#5C5647]">
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
                            <div className="text-[10px] font-mono text-[#5C5647]">
                              Ref: {tx.referenceId}
                            </div>
                          )}
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
