"use client";

import React, { useState, useMemo } from "react";
import {
  MOCK_WALLET_TRANSACTIONS,
  MOCK_RECONCILIATION,
  MOCK_CUSTOMERS,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  Receipt,
  FileCheck2,
  Building2,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type PaymentViewTab = "TRANSACTIONS" | "SETTLEMENTS";

interface OnlineTransaction {
  id: string;
  paymentId: string;
  customerName: string;
  customerId: string;
  amount: number;
  method: "UPI" | "Net Banking" | "Cards" | "Cash / Manual";
  status: "SUCCESS" | "PENDING" | "FAILED";
  date: string;
  gatewayRef: string;
  purpose: string;
}

const INITIAL_TRANSACTIONS: OnlineTransaction[] = [
  {
    id: "PAY-1001",
    paymentId: "pay_Nq99xKa2891Z",
    customerName: "Kavita Verma",
    customerId: "CUST-1007",
    amount: 3000,
    method: "UPI",
    status: "SUCCESS",
    date: "2026-10-04 18:42:10",
    gatewayRef: "upi_kavita@okhdfcbank",
    purpose: "Monthly Float Top-up",
  },
  {
    id: "PAY-1002",
    paymentId: "pay_Nq81bWk1044A",
    customerName: "Rajesh Baghel",
    customerId: "CUST-1004",
    amount: 1500,
    method: "Net Banking",
    status: "SUCCESS",
    date: "2026-10-04 15:10:02",
    gatewayRef: "HDFC-NET-9912048",
    purpose: "Prepaid Wallet Recharge",
  },
  {
    id: "PAY-1003",
    paymentId: "pay_Np76uX0192L",
    customerName: "Abhishek Singhania",
    customerId: "CUST-1008",
    amount: 2000,
    method: "UPI",
    status: "SUCCESS",
    date: "2026-10-03 09:15:30",
    gatewayRef: "upi_singhania@icici",
    purpose: "Trial Pack & Wallet Advance",
  },
  {
    id: "PAY-1004",
    paymentId: "pay_Np12aM4491X",
    customerName: "Ritika Kothari",
    customerId: "CUST-1011",
    amount: 1000,
    method: "Cards",
    status: "SUCCESS",
    date: "2026-10-03 08:30:11",
    gatewayRef: "VISA-****-4019",
    purpose: "Weekly Milk Float",
  },
  {
    id: "PAY-1005",
    paymentId: "pay_No88zP9182K",
    customerName: "Vikram Agrawal",
    customerId: "CUST-1002",
    amount: 1200,
    method: "UPI",
    status: "PENDING",
    date: "2026-10-04 21:15:40",
    gatewayRef: "upi_vikram@axl",
    purpose: "Auto-recharge attempt",
  },
  {
    id: "PAY-1006",
    paymentId: "pay_Nn44vB7100J",
    customerName: "Dr. Sunita Shukla",
    customerId: "CUST-1005",
    amount: 800,
    method: "UPI",
    status: "FAILED",
    date: "2026-10-02 14:10:05",
    gatewayRef: "UPI_BANK_TIMEOUT",
    purpose: "Top-up attempt",
  },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<PaymentViewTab>("TRANSACTIONS");
  const [transactions, setTransactions] = useState<OnlineTransaction[]>(INITIAL_TRANSACTIONS);
  const [reconciliations] = useState(MOCK_RECONCILIATION);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [selectedTx, setSelectedTx] = useState<OnlineTransaction | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSyncGateway = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setNotice("Gateway settlements and webhooks synchronized successfully with Razorpay.");
      setTimeout(() => setNotice(null), 4000);
    }, 1200);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.toLowerCase();
      const matchesSearch =
        tx.customerName.toLowerCase().includes(q) ||
        tx.paymentId.toLowerCase().includes(q) ||
        tx.gatewayRef.toLowerCase().includes(q) ||
        tx.id.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || tx.status === statusFilter;
      const matchesMethod = methodFilter === "ALL" || tx.method === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [transactions, search, statusFilter, methodFilter]);

  const metrics = useMemo(() => {
    const totalCollected = transactions
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSettled = reconciliations.reduce((sum, r) => sum + r.netSettled, 0);
    const failedCount = transactions.filter((t) => t.status === "FAILED").length;
    const pendingCount = transactions.filter((t) => t.status === "PENDING").length;

    return {
      totalCollected,
      totalSettled,
      failedCount,
      pendingCount,
    };
  }, [transactions, reconciliations]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[30px] font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            Payments & Gateway
          </h1>
          <p className="text-xs font-bold text-[#5C5647]">
            Online payment gateway collections, Razorpay settlements, and payout reconciliation.
          </p>
        </div>

        {/* View Switcher & Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#FAF7EC] p-1.5 rounded-[12px] border-2 border-black shadow-[3px_3px_0px_0px_#1A1A1A]">
            <button
              type="button"
              onClick={() => setActiveTab("TRANSACTIONS")}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "TRANSACTIONS"
                  ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                  : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A]"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Gateway Log</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("SETTLEMENTS")}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "SETTLEMENTS"
                  ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                  : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A]"
              }`}
            >
              <Building2 className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Settlements</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSyncGateway}
            disabled={isSyncing}
            className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 stroke-[2.5] ${isSyncing ? "animate-spin" : ""}`} />
            Sync Gateway
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#B9E8B4] p-3 text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A]">
          <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          <span>{notice}</span>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="rounded-[14px] bg-[#FFDF58] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
            Digital Collections
          </span>
          <div className="mt-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A]">
              {formatCurrency(metrics.totalCollected)}
            </span>
            <p className="text-[10px] font-bold text-[#1A1A1A]/80 mt-0.5">
              Online UPI & Card Payments
            </p>
          </div>
        </div>

        {/* Total Settled */}
        <div className="rounded-[14px] bg-[#B8E8B8] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
            Net Bank Settled
          </span>
          <div className="mt-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A]">
              {formatCurrency(metrics.totalSettled)}
            </span>
            <p className="text-[10px] font-bold text-[#1A1A1A]/80 mt-0.5">
              Credited to Current Account
            </p>
          </div>
        </div>

        {/* Pending Payouts */}
        <div className="rounded-[14px] bg-[#D8CEF6] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
            Pending / In-Transit
          </span>
          <div className="mt-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A]">
              {metrics.pendingCount} Txns
            </span>
            <p className="text-[10px] font-bold text-[#1A1A1A]/80 mt-0.5">
              Awaiting Gateway Webhook
            </p>
          </div>
        </div>

        {/* Failed / Disputed */}
        <div className="rounded-[14px] bg-[#FFD9D0] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
            Failed Attempts
          </span>
          <div className="mt-2">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A]">
              {metrics.failedCount} Failed
            </span>
            <p className="text-[10px] font-bold text-[#1A1A1A]/80 mt-0.5">
              Customer Re-attempt Alert
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: GATEWAY TRANSACTIONS LOG                          */}
      {/* ========================================================= */}
      {activeTab === "TRANSACTIONS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[4px_4px_0px_0px_#000000]">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status Segmented Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(["ALL", "SUCCESS", "PENDING", "FAILED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]"
                    }`}
                  >
                    {st === "ALL" ? "All Payments" : st}
                  </button>
                ))}
              </div>

              {/* Method select & Search */}
              <div className="flex items-center gap-2">
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="rounded-[8px] border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Methods</option>
                  <option value="UPI">UPI</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cards">Cards</option>
                </select>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                  <Input
                    placeholder="Search payment ID, customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Payment ID / Ref</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Method</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Purpose</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Date & Time</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center font-bold text-xs uppercase text-[#5C5647]">
                        No payment transactions match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => {
                          setSelectedTx(tx);
                          setIsReceiptOpen(true);
                        }}
                        className="hover:bg-[#FAF7EC]/80 transition-colors cursor-pointer"
                      >
                        {/* Payment ID */}
                        <td className="py-3.5 px-4 border-r-2 border-black">
                          <div className="font-mono font-black text-xs text-[#1A1A1A]">
                            {tx.paymentId}
                          </div>
                          <div className="text-[10px] font-mono text-[#5C5647]">
                            {tx.gatewayRef}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 border-r-2 border-black">
                          <div className="font-black text-[#1A1A1A] text-xs">
                            {tx.customerName}
                          </div>
                          <div className="text-[10px] font-mono text-[#5C5647]">
                            {tx.customerId}
                          </div>
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-4 border-r-2 border-black">
                          <span className="inline-block rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                            {tx.method}
                          </span>
                        </td>

                        {/* Purpose */}
                        <td className="py-3.5 px-4 border-r-2 border-black text-xs font-bold text-[#1A1A1A]">
                          {tx.purpose}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 border-r-2 border-black font-mono font-bold text-xs text-[#1A1A1A]">
                          {tx.date}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-black text-xs text-[#1A1A1A]">
                          {formatCurrency(tx.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block rounded-[6px] border-2 border-black px-2.5 py-0.5 text-[10px] font-mono font-black uppercase ${
                              tx.status === "SUCCESS"
                                ? "bg-[#B8E8B8] text-[#1A1A1A]"
                                : tx.status === "PENDING"
                                ? "bg-[#FFDF58] text-[#1A1A1A]"
                                : "bg-[#FFD9D0] text-[#1A1A1A]"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex items-center justify-between px-5">
              <span>
                Total: <strong className="font-mono">{filteredTransactions.length}</strong> online transactions
              </span>
              <span className="font-mono text-[#5C5647]">
                Click any row to inspect digital receipt
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: SETTLEMENTS & RECONCILIATION                      */}
      {/* ========================================================= */}
      {activeTab === "SETTLEMENTS" && (
        <div className="space-y-4">
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="p-4 bg-[#FAF7EC] border-b-2 border-black flex items-center justify-between">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                  Bank Payout Settlement Ledger
                </h3>
                <p className="text-xs font-bold text-[#5C5647]">
                  Automatic daily disbursements from Razorpay gateway to Raipur current account.
                </p>
              </div>
              <span className="rounded-[6px] border-2 border-black bg-[#B8E8B8] px-2.5 py-1 text-[10px] font-mono font-black uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]">
                All Matched
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Payout ID</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Settlement Date</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Gross Collected</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Gateway Fees</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">GST (18%)</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Net Settled to Bank</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {reconciliations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-[#FAF7EC]/80 transition-colors">
                      <td className="py-3.5 px-4 border-r-2 border-black font-mono font-black text-xs text-[#1A1A1A]">
                        {rec.payoutId}
                      </td>

                      <td className="py-3.5 px-4 border-r-2 border-black font-mono font-bold text-xs text-[#1A1A1A]">
                        {rec.settlementDate}
                      </td>

                      <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-bold text-xs text-[#1A1A1A]">
                        {formatCurrency(rec.grossCollected)}
                      </td>

                      <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-bold text-xs text-[#5C5647]">
                        - {formatCurrency(rec.platformFees)}
                      </td>

                      <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-bold text-xs text-[#5C5647]">
                        - {formatCurrency(rec.gstOnFees)}
                      </td>

                      <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-black text-xs text-emerald-800">
                        {formatCurrency(rec.netSettled)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="rounded-[6px] border-2 border-black bg-[#B8E8B8] px-2.5 py-0.5 text-[10px] font-mono font-black uppercase text-[#1A1A1A]">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DIGITAL RECEIPT MODAL                                      */}
      {/* ========================================================= */}
      <Dialog open={isReceiptOpen} onOpenChange={(open) => !open && setIsReceiptOpen(false)}>
        <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A] flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
              Digital Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-[#5C5647]">
              Verified gateway payment record and audit trace.
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 pt-2">
              <div className="rounded-[10px] border-2 border-black bg-[#FFDF58] p-4 text-center shadow-[2px_2px_0px_0px_#000000]">
                <div className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                  Payment Amount
                </div>
                <div className="text-3xl font-black font-mono mt-1 text-[#1A1A1A]">
                  {formatCurrency(selectedTx.amount)}
                </div>
                <span className="inline-block mt-2 rounded-[6px] border-2 border-black bg-white px-2.5 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                  STATUS: {selectedTx.status}
                </span>
              </div>

              <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 text-xs font-bold space-y-2 shadow-[2px_2px_0px_0px_#000000]">
                <div className="flex justify-between border-b border-black/10 pb-1.5">
                  <span className="text-[#5C5647]">Customer:</span>
                  <span className="font-black text-[#1A1A1A]">{selectedTx.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-1.5">
                  <span className="text-[#5C5647]">Payment ID:</span>
                  <span className="font-mono font-black text-[#1A1A1A]">{selectedTx.paymentId}</span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-1.5">
                  <span className="text-[#5C5647]">Payment Method:</span>
                  <span className="font-black text-[#1A1A1A]">{selectedTx.method}</span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-1.5">
                  <span className="text-[#5C5647]">Gateway Ref:</span>
                  <span className="font-mono text-[11px] font-bold text-[#1A1A1A]">{selectedTx.gatewayRef}</span>
                </div>
                <div className="flex justify-between border-b border-black/10 pb-1.5">
                  <span className="text-[#5C5647]">Date & Time:</span>
                  <span className="font-mono text-[#1A1A1A]">{selectedTx.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Description:</span>
                  <span className="font-black text-[#1A1A1A]">{selectedTx.purpose}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => setIsReceiptOpen(false)}
              className="w-full rounded-[10px] border-2 border-black bg-[#FFD84D] hover:bg-[#fcd033] py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
            >
              Done / Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
