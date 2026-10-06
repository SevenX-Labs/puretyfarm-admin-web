"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PaymentItem,
  CashCollectionItem,
  PaymentTransactionStatus,
  CashCollectionStatus,
  PaymentPurpose,
  PaymentMethod,
  PaymentsApiResponse,
  CashCollectionsApiResponse,
} from "@/types/payment";
import {
  fetchPayments,
  fetchCashCollections,
  PaymentQueryParams,
  CashCollectionQueryParams,
} from "@/services/payment-service";
import { ConfirmCashModal } from "@/components/payments/confirm-cash-modal";
import { CancelCashModal } from "@/components/payments/cancel-cash-modal";
import { PaymentDetailSheet } from "@/components/payments/payment-detail-sheet";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Banknote,
  Search,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  Building2,
  ShieldCheck,
  Receipt,
  FileCheck2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type ActiveTab = "CASH_COLLECTIONS" | "ONLINE_PAYMENTS";

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("CASH_COLLECTIONS");

  // =========================================================================
  // STATE: PHYSICAL CASH COLLECTIONS (TAB 1)
  // =========================================================================
  const [cashCollections, setCashCollections] = useState<CashCollectionItem[]>([]);
  const [isCashLoading, setIsCashLoading] = useState<boolean>(true);
  const [isCashRefreshing, setIsCashRefreshing] = useState<boolean>(false);
  const [cashError, setCashError] = useState<string | null>(null);

  // Cash Pagination
  const [cashPage, setCashPage] = useState<number>(1);
  const [cashTotalPages, setCashTotalPages] = useState<number>(1);
  const [cashTotalCount, setCashTotalCount] = useState<number>(0);

  // Cash Filters
  const [cashStatusFilter, setCashStatusFilter] = useState<CashCollectionStatus | "ALL">("PENDING");
  const [cashSearch, setCashSearch] = useState<string>("");
  const [debouncedCashSearch, setDebouncedCashSearch] = useState<string>("");
  const [cashStartDate, setCashStartDate] = useState<string>("");
  const [cashEndDate, setCashEndDate] = useState<string>("");

  // Cash Action Modals
  const [confirmItem, setConfirmItem] = useState<CashCollectionItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [cancelItem, setCancelItem] = useState<CashCollectionItem | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // =========================================================================
  // STATE: ONLINE PAYMENTS (TAB 2)
  // =========================================================================
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState<boolean>(true);
  const [isPaymentsRefreshing, setIsPaymentsRefreshing] = useState<boolean>(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Payments Pagination
  const [paymentPage, setPaymentPage] = useState<number>(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState<number>(1);
  const [paymentTotalCount, setPaymentTotalCount] = useState<number>(0);

  // Payments Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentTransactionStatus | "ALL">("ALL");
  const [paymentSearch, setPaymentSearch] = useState<string>("");
  const [debouncedPaymentSearch, setDebouncedPaymentSearch] = useState<string>("");
  const [transactionIdSearch, setTransactionIdSearch] = useState<string>("");
  const [debouncedTxnIdSearch, setDebouncedTxnIdSearch] = useState<string>("");
  const [paymentPurposeFilter, setPaymentPurposeFilter] = useState<PaymentPurpose | "ALL">("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
  const [paymentStartDate, setPaymentStartDate] = useState<string>("");
  const [paymentEndDate, setPaymentEndDate] = useState<string>("");

  // Payment Inspection Drawer
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);

  // Global Notice & Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // =========================================================================
  // DEBOUNCED SEARCH EFFECTS
  // =========================================================================
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCashSearch(cashSearch.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [cashSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPaymentSearch(paymentSearch.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [paymentSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTxnIdSearch(transactionIdSearch.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [transactionIdSearch]);

  // =========================================================================
  // DATA LOADERS
  // =========================================================================

  // Load Cash Collections
  const loadCashCollections = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsCashRefreshing(true);
      setCashError(null);

      const params: CashCollectionQueryParams = {
        page: pageToLoad,
        limit: 20,
      };

      if (cashStatusFilter !== "ALL") params.status = cashStatusFilter;
      if (debouncedCashSearch) params.customerSearch = debouncedCashSearch;
      if (cashStartDate) params.startDate = cashStartDate;
      if (cashEndDate) params.endDate = cashEndDate;

      try {
        const response: CashCollectionsApiResponse = await fetchCashCollections(params, {
          forceRefresh,
          onFreshData: (fresh) => {
            if (fresh && Array.isArray(fresh.data)) {
              setCashCollections(fresh.data);
              setCashTotalPages(fresh.pagination?.totalPages || 1);
              setCashTotalCount(fresh.pagination?.total || fresh.data.length);
              setIsCashLoading(false);
            }
          },
        });

        if (response && Array.isArray(response.data)) {
          setCashCollections(response.data);
          setCashTotalPages(response.pagination?.totalPages || 1);
          setCashTotalCount(response.pagination?.total || response.data.length);
        }
      } catch (err: unknown) {
        console.error("Failed to load cash collections:", err);
        const msg = err instanceof Error ? err.message : "Failed to load cash collections.";
        setCashError(msg);
      } finally {
        setIsCashLoading(false);
        setIsCashRefreshing(false);
      }
    },
    [cashStatusFilter, debouncedCashSearch, cashStartDate, cashEndDate]
  );

  // Load Online Payments
  const loadPayments = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsPaymentsRefreshing(true);
      setPaymentsError(null);

      const params: PaymentQueryParams = {
        page: pageToLoad,
        limit: 20,
      };

      if (paymentStatusFilter !== "ALL") params.status = paymentStatusFilter;
      if (paymentPurposeFilter !== "ALL") params.purpose = paymentPurposeFilter;
      if (paymentMethodFilter !== "ALL") params.paymentMethod = paymentMethodFilter;
      if (debouncedPaymentSearch) params.customerSearch = debouncedPaymentSearch;
      if (debouncedTxnIdSearch) params.transactionId = debouncedTxnIdSearch;
      if (paymentStartDate) params.startDate = paymentStartDate;
      if (paymentEndDate) params.endDate = paymentEndDate;

      try {
        const response: PaymentsApiResponse = await fetchPayments(params, {
          forceRefresh,
          onFreshData: (fresh) => {
            if (fresh && Array.isArray(fresh.data)) {
              setPayments(fresh.data);
              setPaymentTotalPages(fresh.pagination?.totalPages || 1);
              setPaymentTotalCount(fresh.pagination?.total || fresh.data.length);
              setIsPaymentsLoading(false);
            }
          },
        });

        if (response && Array.isArray(response.data)) {
          setPayments(response.data);
          setPaymentTotalPages(response.pagination?.totalPages || 1);
          setPaymentTotalCount(response.pagination?.total || response.data.length);
        }
      } catch (err: unknown) {
        console.error("Failed to load payments:", err);
        const msg = err instanceof Error ? err.message : "Failed to load payments.";
        setPaymentsError(msg);
      } finally {
        setIsPaymentsLoading(false);
        setIsPaymentsRefreshing(false);
      }
    },
    [
      paymentStatusFilter,
      paymentPurposeFilter,
      paymentMethodFilter,
      debouncedPaymentSearch,
      debouncedTxnIdSearch,
      paymentStartDate,
      paymentEndDate,
    ]
  );

  // Trigger cash collections on filter / page change
  useEffect(() => {
    setCashPage(1);
    loadCashCollections(1, false);
  }, [loadCashCollections]);

  // Trigger payments on filter / page change
  useEffect(() => {
    setPaymentPage(1);
    loadPayments(1, false);
  }, [loadPayments]);

  // Reset Cash Filters
  const handleResetCashFilters = () => {
    setCashStatusFilter("PENDING");
    setCashSearch("");
    setDebouncedCashSearch("");
    setCashStartDate("");
    setCashEndDate("");
    setCashPage(1);
  };

  // Reset Payment Filters
  const handleResetPaymentFilters = () => {
    setPaymentStatusFilter("ALL");
    setPaymentSearch("");
    setDebouncedPaymentSearch("");
    setTransactionIdSearch("");
    setDebouncedTxnIdSearch("");
    setPaymentPurposeFilter("ALL");
    setPaymentMethodFilter("ALL");
    setPaymentStartDate("");
    setPaymentEndDate("");
    setPaymentPage(1);
  };

  // =========================================================================
  // METRICS COMPUTATIONS
  // =========================================================================
  const cashMetrics = useMemo(() => {
    const pendingItems = cashCollections.filter(
      (c) => c.status === "PENDING" || c.status === "COLLECTED"
    );
    const pendingCount = pendingItems.length;
    const totalUnreconciledPaise = pendingItems.reduce(
      (sum, item) => sum + (item.amountPaise || 0),
      0
    );

    return {
      pendingCount,
      unreconciledFloat: totalUnreconciledPaise / 100,
    };
  }, [cashCollections]);

  // Handle cash collection modal actions
  const handleCashUpdated = (updated: CashCollectionItem) => {
    setCashCollections((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
    showNotice(`Cash collection ${updated.status.toLowerCase()} successfully!`);
    loadCashCollections(cashPage, true);
  };

  const handlePaymentUpdated = (updated: PaymentItem) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    showNotice(`Payment record updated successfully!`);
  };

  // Status badges helper for cash
  const getCashStatusBadge = (status: CashCollectionStatus) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-[#B8E8B8] border border-black text-black font-mono text-xs font-bold";
      case "PENDING":
      case "COLLECTED":
        return "bg-[#FFE58F] border border-black text-black font-mono text-xs font-bold";
      case "CANCELLED":
        return "bg-[#FF8E72] border border-black text-black font-mono text-xs font-bold";
      default:
        return "bg-white border border-black text-black font-mono text-xs font-bold";
    }
  };

  // Status badges helper for payments
  const getPaymentStatusBadge = (status: PaymentTransactionStatus) => {
    switch (status) {
      case "SUCCESS":
        return "bg-[#B8E8B8] border border-black font-mono font-bold text-xs";
      case "REFUND_PENDING":
        return "bg-[#FFE58F] border border-black font-mono font-bold text-xs";
      case "REFUNDED":
        return "bg-[#D8CEF6] border border-black font-mono font-bold text-xs";
      case "PENDING":
      case "PROCESSING":
        return "bg-[#FFDF58] border border-black font-mono font-bold text-xs";
      case "FAILED":
      case "CANCELLED":
      case "EXPIRED":
        return "bg-[#FF8E72] border border-black font-mono font-bold text-xs";
      default:
        return "bg-white border border-black font-mono font-bold text-xs";
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & WORKSPACE VIEW SWITCHER                   */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black leading-tight">
            Payments & Cash Collection
          </h1>
          <p className="text-xs font-bold text-[#5C5647]">
            Reconcile physical depot cash floats, audit PayU gateway logs, and manage refunds.
          </p>
        </div>

        {/* Workspace Switcher & Sync Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#FAF7EC] p-1.5 rounded-[12px] border-2 border-black shadow-[3px_3px_0px_0px_#1A1A1A]">
            <button
              type="button"
              onClick={() => setActiveTab("CASH_COLLECTIONS")}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "CASH_COLLECTIONS"
                  ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                  : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A]"
              }`}
            >
              <Banknote className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Physical Cash Hub</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ONLINE_PAYMENTS")}
              className={`rounded-[8px] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ONLINE_PAYMENTS"
                  ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                  : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A]"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>PayU Audit Ledger</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === "CASH_COLLECTIONS") {
                loadCashCollections(cashPage, true);
              } else {
                loadPayments(paymentPage, true);
              }
            }}
            disabled={isCashRefreshing || isPaymentsRefreshing}
            className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2.5] ${
                isCashRefreshing || isPaymentsRefreshing ? "animate-spin" : ""
              }`}
            />
            Sync Live
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-[10px] border-2 border-black p-3 text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A] ${
            notice.type === "success" ? "bg-[#B8E8B8]" : "bg-[#FFD9D0]"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          ) : (
            <AlertTriangle className="h-4 w-4 stroke-[3]" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: PHYSICAL CASH RECONCILIATION HUB                  */}
      {/* ========================================================= */}
      {activeTab === "CASH_COLLECTIONS" && (
        <div className="space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pending Collections Count */}
            <div className="rounded-[14px] bg-[#FFDF58] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                  Pending Collections
                </span>
                <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums mt-1 block">
                  {cashMetrics.pendingCount}
                </span>
                <p className="text-[10px] font-bold text-[#1A1A1A]/80 mt-0.5">
                  Depot deliveries awaiting confirmation
                </p>
              </div>
              <div className="rounded-[10px] border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_#000000]">
                <Banknote className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
              </div>
            </div>

            {/* Total Unreconciled Cash Float */}
            <div className="rounded-[14px] bg-[#FFFDF7] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                  Total Unreconciled Cash Float
                </span>
                <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums mt-1 block">
                  {formatCurrency(cashMetrics.unreconciledFloat)}
                </span>
                <p className="text-[10px] font-bold text-[#5C5647] mt-0.5">
                  Physical currency pending wallet ledger credit
                </p>
              </div>
              <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8] p-3 shadow-[2px_2px_0px_0px_#000000]">
                <Building2 className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
              </div>
            </div>
          </div>

          {cashError && (
            <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A]">
              <AlertTriangle className="h-4 w-4 stroke-[3]" />
              <span>{cashError}</span>
            </div>
          )}

          {/* Cash Filter Bar */}
          <div className="bg-white border-2 border-black p-4 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-2">
              {/* Filter Tabs: ALL, PENDING, CONFIRMED, CANCELLED */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(["PENDING", "CONFIRMED", "CANCELLED", "ALL"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCashStatusFilter(st)}
                    className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      cashStatusFilter === st
                        ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]"
                    }`}
                  >
                    {st === "ALL" ? "All Collections" : st}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleResetCashFilters}
                className="cursor-pointer rounded-[8px] bg-[#FF8E72] hover:bg-[#ff7b5a] border-2 border-black text-[#1A1A1A] font-black text-[11px] uppercase px-3 py-1 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                Reset Filters
              </button>
            </div>

            {/* Row 2: Search & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                <Input
                  placeholder="Search Name, Phone, Email..."
                  value={cashSearch}
                  onChange={(e) => setCashSearch(e.target.value)}
                  className="pl-9 h-9 text-xs font-bold border-2 border-black rounded-[8px]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#5C5647] shrink-0">
                  From:
                </span>
                <Input
                  type="date"
                  value={cashStartDate}
                  onChange={(e) => setCashStartDate(e.target.value)}
                  className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#5C5647] shrink-0">
                  To:
                </span>
                <Input
                  type="date"
                  value={cashEndDate}
                  onChange={(e) => setCashEndDate(e.target.value)}
                  className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
                />
              </div>
            </div>
          </div>

          {/* Cash Collections Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Purpose</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-center">Status</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Collection Date</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {isCashLoading && cashCollections.length === 0 ? (
                    // Skeleton State
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black text-right">
                          <div className="h-6 bg-[#E5E0D8] rounded w-20 ml-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded w-24" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black text-center">
                          <div className="h-5 bg-[#E5E0D8] rounded w-20 mx-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-24" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded w-28 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : cashCollections.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-14 text-center font-bold text-xs uppercase text-[#5C5647]"
                      >
                        No cash collections match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    cashCollections.map((item) => {
                      const isPending =
                        item.status === "PENDING" || item.status === "COLLECTED";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FAF7EC]/80 transition-colors"
                        >
                          {/* Customer */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-black text-[#1A1A1A] text-xs">
                              {item.customer?.name || "Customer"}
                            </div>
                            <div className="text-xs font-mono text-[#5C5647]">
                              {item.customer?.mobile || "No phone"}
                            </div>
                          </td>

                          {/* Amount (₹) */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-right align-middle">
                            <span className="text-base font-mono font-black tabular-nums text-[#1A1A1A]">
                              ₹{Math.round(item.amountPaise / 100)}
                            </span>
                          </td>

                          {/* Purpose */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            {item.purpose === "WALLET_TOPUP" ? (
                              <span className="rounded-[4px] border border-black px-2 py-0.5 text-xs font-mono font-bold bg-[#D8CEF6] text-[#1A1A1A]">
                                WALLET TOPUP
                              </span>
                            ) : (
                              <span className="rounded-[4px] border border-black px-2 py-0.5 text-xs font-mono font-bold bg-[#FFDF58] text-[#1A1A1A]">
                                ORDER / PLAN
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                            <span
                              className={`inline-block rounded-[6px] px-2.5 py-0.5 uppercase tracking-wider ${getCashStatusBadge(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>

                          {/* Collection Date */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-mono text-xs font-bold text-[#1A1A1A]">
                              {formatDate(item.collectedAt || item.createdAt)}
                            </div>
                            {item.adminNote && (
                              <div
                                className="text-[10px] font-bold text-[#5C5647] truncate max-w-[180px] mt-0.5"
                                title={item.adminNote}
                              >
                                Note: {item.adminNote}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center align-middle">
                            {isPending ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmItem(item);
                                    setIsConfirmOpen(true);
                                  }}
                                  className="rounded-[8px] bg-[#B8E8B8] hover:bg-[#9fe09f] border-2 border-black font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-[#1A1A1A]"
                                >
                                  CONFIRM CASH
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelItem(item);
                                    setIsCancelOpen(true);
                                  }}
                                  className="rounded-[8px] bg-white hover:bg-[#FF8E72] border-2 border-black font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-[#1A1A1A]"
                                >
                                  CANCEL
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] font-mono text-[#5C5647]">
                                {item.status === "CONFIRMED" && item.confirmedAt ? (
                                  <span>Confirmed: {formatDate(item.confirmedAt)}</span>
                                ) : (
                                  <span>Resolved</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Cash Pagination */}
            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>
                Showing <strong className="font-mono">{cashCollections.length}</strong> of{" "}
                <strong className="font-mono">{cashTotalCount}</strong> physical collections
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={cashPage <= 1 || isCashLoading}
                  onClick={() => {
                    const prev = cashPage - 1;
                    setCashPage(prev);
                    loadCashCollections(prev, false);
                  }}
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3 stroke-[3]" />
                  Prev
                </button>

                <span className="font-mono text-xs font-black px-2">
                  {cashPage} / {cashTotalPages || 1}
                </span>

                <button
                  type="button"
                  disabled={cashPage >= cashTotalPages || isCashLoading}
                  onClick={() => {
                    const next = cashPage + 1;
                    setCashPage(next);
                    loadCashCollections(next, false);
                  }}
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ONLINE PAYMENTS AUDIT LEDGER (PAYU)                */}
      {/* ========================================================= */}
      {activeTab === "ONLINE_PAYMENTS" && (
        <div className="space-y-6">
          {/* Read-Only Banner */}
          <div className="rounded-[10px] border-2 border-black bg-white p-3.5 text-xs font-bold text-[#1A1A1A] flex items-center justify-between shadow-[3px_3px_0px_0px_#000000]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700 stroke-[2.5]" />
              <div>
                <span className="font-black uppercase text-xs block">
                  PayU Gateway Audit Ledger (Read-Only)
                </span>
                <span className="text-[11px] text-[#5C5647]">
                  Online payments transition strictly via verified PayU callbacks. Admin forced transitions are forbidden.
                </span>
              </div>
            </div>
            <span className="rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-1 text-[10px] font-mono font-black uppercase text-[#1A1A1A]">
              PayU Webhook Verified
            </span>
          </div>

          {paymentsError && (
            <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A]">
              <AlertTriangle className="h-4 w-4 stroke-[3]" />
              <span>{paymentsError}</span>
            </div>
          )}

          {/* Payments Filter Card */}
          <div className="bg-white border-2 border-black p-4 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
            {/* Status Filter Pills */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b-2 border-black/10 pb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    "ALL",
                    "SUCCESS",
                    "PENDING",
                    "REFUND_PENDING",
                    "REFUNDED",
                    "FAILED",
                    "EXPIRED",
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      paymentStatusFilter === st
                        ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]"
                    }`}
                  >
                    {st === "ALL" ? "All Statuses" : st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleResetPaymentFilters}
                className="cursor-pointer rounded-[8px] bg-[#FF8E72] hover:bg-[#ff7b5a] border-2 border-black text-[#1A1A1A] font-black text-[11px] uppercase px-3 py-1 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 self-start sm:self-auto"
              >
                <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                Reset Filters
              </button>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Merchant Txn ID Search */}
              <div className="relative">
                <Receipt className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                <Input
                  placeholder="Merchant TXN ID (PFMH...)..."
                  value={transactionIdSearch}
                  onChange={(e) => setTransactionIdSearch(e.target.value)}
                  className="pl-9 h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
                />
              </div>

              {/* Customer Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                <Input
                  placeholder="Customer Name, Mobile, Email..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-9 h-9 text-xs font-bold border-2 border-black rounded-[8px]"
                />
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#5C5647] shrink-0">
                  From:
                </span>
                <Input
                  type="date"
                  value={paymentStartDate}
                  onChange={(e) => setPaymentStartDate(e.target.value)}
                  className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
                />
              </div>

              {/* End Date */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#5C5647] shrink-0">
                  To:
                </span>
                <Input
                  type="date"
                  value={paymentEndDate}
                  onChange={(e) => setPaymentEndDate(e.target.value)}
                  className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
                />
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Transaction ID</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Amount (₹)</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Method / Provider</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-center">Gateway Status</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Date</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {isPaymentsLoading && payments.length === 0 ? (
                    // Skeleton
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded w-28" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-24 mb-1" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-16" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black text-right">
                          <div className="h-5 bg-[#E5E0D8] rounded w-16 ml-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black text-center">
                          <div className="h-5 bg-[#E5E0D8] rounded w-20 mx-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-20" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded w-28 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-14 text-center font-bold text-xs uppercase text-[#5C5647]"
                      >
                        No online payment transactions match your query.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-[#FAF7EC]/80 transition-colors"
                      >
                        {/* Transaction ID */}
                        <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#1A1A1A]">
                              {p.transactionId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(p.transactionId, p.id)}
                              className="rounded border border-black p-0.5 hover:bg-[#FAF7EC] cursor-pointer"
                              title="Copy TXN ID"
                            >
                              {copiedKey === p.id ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-[#1A1A1A]" />
                              )}
                            </button>
                          </div>
                          {p.providerPaymentId && (
                            <div className="text-[10px] font-mono text-[#5C5647]">
                              Ref: {p.providerPaymentId}
                            </div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                          <div className="font-black text-[#1A1A1A] text-xs">
                            {p.customer?.name || "Customer"}
                          </div>
                          <div className="text-xs font-mono text-[#5C5647]">
                            {p.customer?.mobile || "No phone"}
                          </div>
                        </td>

                        {/* Amount (₹) */}
                        <td className="py-3.5 px-4 border-r-2 border-black text-right align-middle">
                          <span className="font-mono font-black text-sm tabular-nums text-[#1A1A1A]">
                            ₹{Math.round(p.amountPaise / 100)}
                          </span>
                        </td>

                        {/* Method / Provider */}
                        <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                          <span className="rounded-[4px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                            {p.paymentMethod} • {p.provider}
                          </span>
                        </td>

                        {/* Gateway Status */}
                        <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                          <span
                            className={`inline-block rounded-[6px] px-2.5 py-0.5 uppercase tracking-wider ${getPaymentStatusBadge(
                              p.status
                            )}`}
                            title={
                              p.status === "REFUND_PENDING"
                                ? "Awaiting PayU confirmation"
                                : undefined
                            }
                          >
                            {p.status.replace(/_/g, " ")}
                          </span>
                          {p.status === "REFUND_PENDING" && (
                            <span className="block text-[9px] font-bold text-[#5C5647] mt-0.5">
                              Awaiting PayU confirm
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 border-r-2 border-black font-mono font-bold text-xs text-[#1A1A1A] align-middle">
                          {formatDate(p.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPaymentId(p.id);
                              setIsPaymentSheetOpen(true);
                            }}
                            className="rounded-[8px] bg-[#FFDF58] hover:bg-[#fcd033] font-black text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A]"
                          >
                            <span>INSPECT DETAILS →</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments Pagination */}
            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span>
                Showing <strong className="font-mono">{payments.length}</strong> of{" "}
                <strong className="font-mono">{paymentTotalCount}</strong> gateway transactions
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={paymentPage <= 1 || isPaymentsLoading}
                  onClick={() => {
                    const prev = paymentPage - 1;
                    setPaymentPage(prev);
                    loadPayments(prev, false);
                  }}
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3 stroke-[3]" />
                  Prev
                </button>

                <span className="font-mono text-xs font-black px-2">
                  {paymentPage} / {paymentTotalPages || 1}
                </span>

                <button
                  type="button"
                  disabled={paymentPage >= paymentTotalPages || isPaymentsLoading}
                  onClick={() => {
                    const next = paymentPage + 1;
                    setPaymentPage(next);
                    loadPayments(next, false);
                  }}
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS & INSPECTION DRAWERS                               */}
      {/* ========================================================= */}

      {/* Confirm Physical Cash Modal */}
      <ConfirmCashModal
        item={confirmItem}
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setConfirmItem(null);
        }}
        onSuccess={handleCashUpdated}
      />

      {/* Cancel Physical Cash Modal */}
      <CancelCashModal
        item={cancelItem}
        isOpen={isCancelOpen}
        onClose={() => {
          setIsCancelOpen(false);
          setCancelItem(null);
        }}
        onSuccess={handleCashUpdated}
      />

      {/* Online Payment Inspection Sheet */}
      <PaymentDetailSheet
        paymentId={selectedPaymentId}
        isOpen={isPaymentSheetOpen}
        onClose={() => {
          setIsPaymentSheetOpen(false);
          setSelectedPaymentId(null);
        }}
        onPaymentUpdated={handlePaymentUpdated}
      />
    </div>
  );
}
