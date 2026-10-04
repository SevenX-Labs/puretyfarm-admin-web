"use client";

import React, { useState, useMemo } from "react";
import { WalletTransaction, Customer } from "@/types";
import {
  MOCK_WALLET_TRANSACTIONS,
  MOCK_CUSTOMERS,
} from "@/lib/mock-data";
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
  AlertTriangle,
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            Wallets & Payments
          </h1>
          <p className="text-xs font-medium text-stone-600">
            Prepaid customer balances, daily cutoff auto-debits, and manual balance adjustments.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Manual Balance Adjustment
        </Button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 border-2 border-black bg-[#B8E8B8] p-3 text-xs font-black text-black shadow-[3px_3px_0px_0px_#000000]">
          <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-black uppercase tracking-tight text-black">
              Total Customer Funds Held
            </span>
            <span className="border-2 border-black bg-[#B8E8B8] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
              Float
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-black">
              {formatCurrency(totalFundsHeld)}
            </div>
            <p className="text-xs font-bold text-stone-600 mt-1">
              Active prepaid float across Raipur customer accounts
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-black uppercase tracking-tight text-black">
              Low Balance Accounts
            </span>
            <span className="border-2 border-black bg-[#FF8E72] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
              Alert
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-black">
              {lowBalanceCount} Accounts
            </div>
            <p className="text-xs font-bold text-stone-600 mt-1">
              Balance below ₹100 threshold (SMS reminder dispatched)
            </p>
          </div>
        </div>
      </div>

      {/* Transactions Ledger Card */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="p-5 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBF8EE]">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-black">
              Transaction History
            </h2>
            <p className="text-xs font-medium text-stone-600">
              Chronological log of wallet top-ups, daily debits, and adjustments.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black stroke-[2.5]" />
            <Input
              placeholder="Search by customer, reason, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Chronological Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#4A1513] text-[#FFDF58] uppercase text-[10px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3 px-5 border-r-2 border-black">Date & Time</th>
                <th className="py-3 px-5 border-r-2 border-black">Customer</th>
                <th className="py-3 px-5 border-r-2 border-black">Type</th>
                <th className="py-3 px-5 border-r-2 border-black">Reason / Notes</th>
                <th className="py-3 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-white">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.type === "Credit";
                return (
                  <tr key={tx.id} className="hover:bg-[#FFF9D2] transition-colors">
                    {/* Date */}
                    <td className="py-3.5 px-5 border-r-2 border-black font-mono font-bold text-xs text-black">
                      {tx.date}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-5 border-r-2 border-black font-extrabold text-black text-xs">
                      {tx.customerName}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-5 border-r-2 border-black">
                      <span
                        className={`inline-block border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000] ${
                          isCredit ? "bg-[#B8E8B8]" : "bg-[#FFDF58]"
                        }`}
                      >
                        {isCredit ? "Credit (+)" : "Debit (-)"}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-xs font-medium text-stone-800 max-w-sm">
                      {tx.reason}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 text-right font-mono tabular-nums font-black text-xs text-black">
                      <span className={isCredit ? "text-emerald-800" : "text-stone-900"}>
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

        <div className="p-4 bg-[#FBF8EE] border-t-2 border-black text-xs font-black text-black flex items-center justify-between px-5">
          <span>
            Total: <strong className="font-mono">{filteredTransactions.length}</strong> transactions
          </span>
          <span className="font-mono text-stone-600">
            Cutoff debits run nightly at 10:00 PM
          </span>
        </div>
      </div>

      {/* Manual Balance Adjustment Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-tight text-black">
              Manual Balance Adjustment
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-stone-600">
              Credit or debit a customer&apos;s prepaid wallet balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-4 pt-2">
            {error && (
              <div className="flex items-center gap-1.5 border-2 border-black bg-[#FF8E72] p-2.5 text-xs font-black text-black shadow-[2px_2px_0px_0px_#000000]">
                <AlertTriangle className="h-4 w-4 stroke-[3]" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer Select */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black">
                Customer
              </label>
              <Select
                value={selectedCustId}
                onChange={(e) => setSelectedCustId(e.target.value)}
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
              <label className="text-xs font-black uppercase text-black">
                Adjustment Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjType("Credit")}
                  className={`border-2 border-black py-2 text-xs font-black uppercase transition-all ${
                    adjType === "Credit"
                      ? "bg-[#B8E8B8] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-stone-50"
                  }`}
                >
                  Credit (+ Add)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjType("Debit")}
                  className={`border-2 border-black py-2 text-xs font-black uppercase transition-all ${
                    adjType === "Debit"
                      ? "bg-[#FF8E72] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-stone-50"
                  }`}
                >
                  Debit (- Deduct)
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black">
                Amount (₹)
              </label>
              <Input
                type="number"
                placeholder="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-mono"
                min="1"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black">
                Reason / Note
              </label>
              <Input
                placeholder="e.g. Cash collected at farm, UPI adjustment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
