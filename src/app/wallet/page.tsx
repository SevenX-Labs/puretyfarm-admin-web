"use client";

import React, { useState, useMemo } from "react";
import { WalletTransaction, Customer } from "@/types";
import {
  MOCK_WALLET_TRANSACTIONS,
  MOCK_CUSTOMERS,
} from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function WalletPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>(
    MOCK_WALLET_TRANSACTIONS
  );
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal form states
  const [selectedCustId, setSelectedCustId] = useState("");
  const [adjType, setAdjType] = useState<"Credit" | "Debit">("Credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const totalFundsHeld = 248910;
  const lowBalanceCount = customers.filter((c) => c.walletBalance < 100).length;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.toLowerCase();
      return (
        tx.customerName.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q)
      );
    });
  }, [transactions, search]);

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustId) {
      setError("Please select a customer");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason (e.g. Cash collected at farm)");
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustId);

    const newTx: WalletTransaction = {
      id: `WT-${Math.floor(10000 + Math.random() * 90000)}`,
      customerId: selectedCustId,
      customerName: cust ? cust.name : "Customer",
      type: adjType === "Credit" ? "Credit" : "Auto-Debit",
      amount: numAmount,
      date: new Date().toISOString().replace("T", " ").substring(0, 19),
      reason: reason.trim(),
      method: "Manual Support",
    };

    setTransactions([newTx, ...transactions]);
    setIsModalOpen(false);
    setNotice(
      `${adjType === "Credit" ? "Credited" : "Debited"} ₹${numAmount} for ${
        cust?.name
      }.`
    );

    // Reset
    setSelectedCustId("");
    setAmount("");
    setReason("");
    setError("");
    setTimeout(() => setNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Wallets & Payments
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Prepaid customer balances, daily cutoff auto-debits, and manual balance adjustments.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs h-9 gap-1.5 shadow-2xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Manual Balance Adjustment
        </Button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200/60 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Stat Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Customer Funds Held
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#133826]">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
              {formatCurrency(totalFundsHeld)}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Active prepaid float across Raipur customer accounts
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Low Balance Accounts
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-700">
              {lowBalanceCount} Accounts
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Balance below ₹100 threshold (SMS reminder dispatched)
            </p>
          </div>
        </Card>
      </div>

      {/* Transactions Ledger Card */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Transaction History
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological log of wallet top-ups, daily debits, and adjustments.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search by customer, reason, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-stone-50/50 border-stone-200"
            />
          </div>
        </div>

        {/* Chronological Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/70 text-stone-500 uppercase text-[10px] font-semibold tracking-wider border-b border-stone-100">
              <tr>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Reason / Notes</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.type === "Credit";
                return (
                  <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Date */}
                    <td className="py-4 px-6 font-mono text-xs text-stone-600">
                      {tx.date}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-6 font-medium text-stone-900 text-xs">
                      {tx.customerName}
                    </td>

                    {/* Type */}
                    <td className="py-4 px-6">
                      <Badge
                        variant={isCredit ? "sage" : "stone"}
                        className="text-[11px]"
                      >
                        {isCredit ? "Credit (+)" : "Debit (-)"}
                      </Badge>
                    </td>

                    {/* Reason */}
                    <td className="py-4 px-6 text-xs text-stone-700 max-w-sm">
                      {tx.reason}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 text-right font-mono tabular-nums font-semibold text-xs">
                      <span className={isCredit ? "text-emerald-700" : "text-stone-800"}>
                        {isCredit ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between px-6">
          <span>
            Total: <strong className="text-stone-800">{filteredTransactions.length}</strong> transactions
          </span>
          <span className="text-stone-400">
            Automated debits run nightly at 10:00 PM for active daily milk plans
          </span>
        </div>
      </Card>

      {/* Manual Balance Adjustment Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-stone-900">
              Manual Balance Adjustment
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Credit or debit a customer&apos;s prepaid wallet balance with an audit reason.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-4 pt-2">
            {error && (
              <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer Select */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">
                Customer
              </label>
              <Select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
                className="text-xs bg-white"
              >
                <option value="">-- Choose customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.area}) - Current: ₹{c.walletBalance}
                  </option>
                ))}
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjType("Credit")}
                  className={`rounded-lg py-2 text-xs font-medium border transition-colors ${
                    adjType === "Credit"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Credit (+ Add Money)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjType("Debit")}
                  className={`rounded-lg py-2 text-xs font-medium border transition-colors ${
                    adjType === "Debit"
                      ? "bg-stone-100 text-stone-800 border-stone-300 font-semibold"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  Debit (- Deduct)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">
                Amount (₹)
              </label>
              <Input
                type="number"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono tabular-nums text-xs bg-white"
                min="1"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">
                Reason / Note
              </label>
              <Input
                placeholder="e.g. Cash collected at farm, UPI adjustment, Bottle return"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs bg-white"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs font-medium"
              >
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
