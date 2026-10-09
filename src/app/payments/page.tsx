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
  CheckCheck,
  Calendar,
  Clock,
  Building2,
  Receipt,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
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
  const [isCashFiltersOpen, setIsCashFiltersOpen] = useState<boolean>(false);

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
  const [isPaymentFiltersOpen, setIsPaymentFiltersOpen] = useState<boolean>(false);

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

  const handleCopy = (e: React.MouseEvent, text: string, key: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  // =========================================================================
  // DEBOUNCED SEARCH EFFECTS
  // =========================================================================
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCashSearch(cashSearch.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [cashSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPaymentSearch(paymentSearch.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [paymentSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTxnIdSearch(transactionIdSearch.trim());
    }, 350);
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

  // Active filters check
  const hasActiveCashFilters = useMemo(() => {
    return (
      cashStatusFilter !== "PENDING" ||
      debouncedCashSearch.length > 0 ||
      Boolean(cashStartDate) ||
      Boolean(cashEndDate)
    );
  }, [cashStatusFilter, debouncedCashSearch, cashStartDate, cashEndDate]);

  const hasActivePaymentFilters = useMemo(() => {
    return (
      paymentStatusFilter !== "ALL" ||
      debouncedPaymentSearch.length > 0 ||
      debouncedTxnIdSearch.length > 0 ||
      paymentPurposeFilter !== "ALL" ||
      paymentMethodFilter !== "ALL" ||
      Boolean(paymentStartDate) ||
      Boolean(paymentEndDate)
    );
  }, [
    paymentStatusFilter,
    debouncedPaymentSearch,
    debouncedTxnIdSearch,
    paymentPurposeFilter,
    paymentMethodFilter,
    paymentStartDate,
    paymentEndDate,
  ]);

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
  };

  // Status badge styling
  const getCashStatusBadge = (status: CashCollectionStatus) => {
    switch (status) {
      case "CONFIRMED":
        return {
          className: "bg-[#B8E8B8] border-2 border-black text-[#14532D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <CheckCircle2 className="h-3 w-3 stroke-[3]" />,
          label: "Confirmed",
        };
      case "PENDING":
      case "COLLECTED":
        return {
          className: "bg-[#FFDF58] border-2 border-black text-[#713F12] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Clock className="h-3 w-3 stroke-[3]" />,
          label: "Pending",
        };
      case "CANCELLED":
        return {
          className: "bg-[#FFD9D0] border-2 border-black text-[#7F1D1D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <XCircle className="h-3 w-3 stroke-[2.5]" />,
          label: "Cancelled",
        };
      default:
        return {
          className: "bg-white border border-black text-black",
          icon: null,
          label: status,
        };
    }
  };

  const getPaymentStatusBadge = (status: PaymentTransactionStatus) => {
    switch (status) {
      case "SUCCESS":
        return {
          className: "bg-[#B8E8B8] border-2 border-black text-[#14532D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <CheckCircle2 className="h-3 w-3 stroke-[3]" />,
          label: "Success",
        };
      case "PENDING":
        return {
          className: "bg-[#FFDF58] border-2 border-black text-[#713F12] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Clock className="h-3 w-3 stroke-[3]" />,
          label: "Pending",
        };
      case "REFUND_PENDING":
        return {
          className: "bg-[#FFE58F] border-2 border-black text-[#854D0E] shadow-[1px_1px_0px_0px_#000000]",
          icon: <RefreshCw className="h-3 w-3 stroke-[2.5]" />,
          label: "Refund Pending",
        };
      case "REFUNDED":
        return {
          className: "bg-[#D8CEF6] border-2 border-black text-[#4C1D95] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Check className="h-3 w-3 stroke-[3]" />,
          label: "Refunded",
        };
      case "FAILED":
      case "EXPIRED":
        return {
          className: "bg-[#FFD9D0] border-2 border-black text-[#7F1D1D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <XCircle className="h-3 w-3 stroke-[2.5]" />,
          label: status === "FAILED" ? "Failed" : "Expired",
        };
      default:
        return {
          className: "bg-white border border-black text-black",
          icon: null,
          label: status,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & PRIMARY SYNC                              */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            Payments & Cash Collection
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#5C5647] mt-0.5">
            Reconcile depot cash collections, audit payment gateway transactions, and process refunds.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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
            aria-label="Sync payment data from server"
            className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black min-h-[40px]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2.5] ${
                isCashRefreshing || isPaymentsRefreshing ? "animate-spin" : ""
              }`}
            />
            {isCashRefreshing || isPaymentsRefreshing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          role="alert"
          className={`flex items-center gap-2.5 rounded-[12px] border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#1A1A1A] animate-in fade-in duration-200 ${
            notice.type === "success"
              ? "bg-[#B9E8B4] text-[#14532D]"
              : "bg-[#FFD9D0] text-[#7F1D1D]"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 stroke-[3] shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 stroke-[3] shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SEGMENTED TABS (Physical Cash vs PayU Ledger)          */}
      {/* ========================================================= */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FAF7EC] p-1.5 rounded-[14px] border-2 border-black shadow-[3px_3px_0px_0px_#000000]">
        <button
          type="button"
          onClick={() => setActiveTab("CASH_COLLECTIONS")}
          aria-selected={activeTab === "CASH_COLLECTIONS"}
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            activeTab === "CASH_COLLECTIONS"
              ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
              : "bg-white text-[#5C5647] hover:text-[#1A1A1A] border border-black/20"
          }`}
        >
          <Banknote className="h-4 w-4 stroke-[2.5]" />
          <span>Physical Cash Hub</span>
          {cashMetrics.pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-black text-[#FFDF58] px-2 py-0.5 text-[11px] font-mono font-black">
              {cashMetrics.pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ONLINE_PAYMENTS")}
          aria-selected={activeTab === "ONLINE_PAYMENTS"}
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            activeTab === "ONLINE_PAYMENTS"
              ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
              : "bg-white text-[#5C5647] hover:text-[#1A1A1A] border border-black/20"
          }`}
        >
          <CreditCard className="h-4 w-4 stroke-[2.5]" />
          <span>PayU Audit Ledger</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PHYSICAL CASH RECONCILIATION HUB                  */}
      {/* ========================================================= */}
      {activeTab === "CASH_COLLECTIONS" && (
        <div className="space-y-4">
          {/* Top Stat Cards: Pending Emphasized */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Stat 1: Pending Collections (EMPHASIZED TO-DO) */}
            <div className="rounded-[14px] bg-[#FFDF58] border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-black text-[#FFDF58] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#FFDF58] animate-pulse" />
                    Pending Collections
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
                    {cashMetrics.pendingCount}
                  </span>
                  <span className="text-xs font-bold text-[#1A1A1A]">collections</span>
                </div>
                <p className="text-[11px] font-bold text-[#423918] mt-0.5">
                  Depot deliveries awaiting physical confirmation
                </p>
              </div>

              <div className="rounded-[10px] border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_0px_#000000] shrink-0">
                <Banknote className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
              </div>
            </div>

            {/* Stat 2: Total Unreconciled Cash Float */}
            <div className="rounded-[14px] bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#14532D] bg-[#B8E8B8] border border-black/30 px-2 py-0.5 rounded-md inline-block">
                  Unreconciled Cash Float
                </span>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
                    {formatCurrency(cashMetrics.unreconciledFloat)}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-[#5C5647] mt-0.5">
                  Physical currency pending wallet ledger credit
                </p>
              </div>

              <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-2.5 shadow-[2px_2px_0px_0px_#000000] shrink-0">
                <Building2 className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
              </div>
            </div>
          </div>

          {cashError && (
            <div className="flex items-center gap-2.5 rounded-[12px] border-2 border-black bg-[#FFD9D0] p-3.5 text-xs font-black text-[#7F1D1D] shadow-[3px_3px_0px_0px_#1A1A1A]">
              <AlertTriangle className="h-4 w-4 stroke-[3] shrink-0" />
              <span>{cashError}</span>
            </div>
          )}

          {/* Cash Filter Bar */}
          <div className="bg-white border-2 border-black p-3.5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "PENDING", label: "Pending" },
                    { key: "CONFIRMED", label: "Confirmed" },
                    { key: "CANCELLED", label: "Cancelled" },
                    { key: "ALL", label: "All Collections" },
                  ] as const
                ).map((tab) => {
                  const isActive = cashStatusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCashStatusFilter(tab.key)}
                      className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        isActive
                          ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                          : "bg-white text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
                      }`}
                    >
                      {tab.key === "PENDING" && (
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-black" : "bg-[#FFDF58]"
                          }`}
                        />
                      )}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search & Extra Filters on right */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
                  <Input
                    placeholder="Search name, phone..."
                    value={cashSearch}
                    onChange={(e) => setCashSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] placeholder:text-[#5C5647]/70"
                  />
                  {cashSearch && (
                    <button
                      type="button"
                      onClick={() => setCashSearch("")}
                      aria-label="Clear customer search"
                      className="absolute right-2.5 top-2.5 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* More Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setIsCashFiltersOpen(!isCashFiltersOpen)}
                  aria-expanded={isCashFiltersOpen}
                  aria-label="Toggle date filters"
                  className={`h-9 px-3 rounded-[8px] border-2 border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                    cashStartDate || cashEndDate || isCashFiltersOpen
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A]"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Dates</span>
                  {isCashFiltersOpen ? (
                    <ChevronUp className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <ChevronDown className="h-3 w-3 stroke-[3]" />
                  )}
                </button>

                {hasActiveCashFilters && (
                  <button
                    type="button"
                    onClick={handleResetCashFilters}
                    aria-label="Reset all cash filters"
                    title="Reset filters"
                    className="h-9 px-2.5 rounded-[8px] border-2 border-black/30 hover:border-black bg-[#FAF7EC] hover:bg-stone-200 text-[#1A1A1A] text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Date Filters */}
            {isCashFiltersOpen && (
              <div className="pt-2.5 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
                    From:
                  </span>
                  <Input
                    type="date"
                    value={cashStartDate}
                    onChange={(e) => setCashStartDate(e.target.value)}
                    className="h-8 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
                    To:
                  </span>
                  <Input
                    type="date"
                    value={cashEndDate}
                    onChange={(e) => setCashEndDate(e.target.value)}
                    className="h-8 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* CASH HUB: DESKTOP TABLE VIEW                            */}
          {/* ======================================================= */}
          <div className="hidden md:block border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black w-48">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right w-36">Amount (₹)</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Purpose</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-center w-36">Status</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-44">Collection Date</th>
                    <th className="py-3.5 px-4 text-center w-48">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {isCashLoading && cashCollections.length === 0 ? (
                    // Skeleton State
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1.5" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black text-right">
                          <div className="h-5 bg-[#E5E0D8] rounded w-20 ml-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded-full w-24" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black text-center">
                          <div className="h-6 bg-[#E5E0D8] rounded-full w-24 mx-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-24" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded-[8px] w-32 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : cashCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="flex justify-center">
                            {cashStatusFilter === "PENDING" ? (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B8E8B8] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                                <CheckCircle2 className="h-6 w-6 text-[#14532D] stroke-[3]" />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7EC] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                                <Banknote className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-tight text-[#1A1A1A]">
                              {cashStatusFilter === "PENDING" && !hasActiveCashFilters
                                ? "No pending cash collections"
                                : "No cash collections match this filter"}
                            </h3>
                            <p className="text-xs font-semibold text-[#5C5647]">
                              {cashStatusFilter === "PENDING" && !hasActiveCashFilters
                                ? "All physical depot cash collections have been confirmed and reconciled."
                                : "Try adjusting your search terms or status filter."}
                            </p>
                          </div>

                          {hasActiveCashFilters && (
                            <button
                              type="button"
                              onClick={handleResetCashFilters}
                              className="rounded-[8px] border-2 border-black bg-[#FFDF58] px-4 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cashCollections.map((item) => {
                      const isPending =
                        item.status === "PENDING" || item.status === "COLLECTED";
                      const statusBadge = getCashStatusBadge(item.status);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FAF7EC]/80 transition-colors group"
                        >
                          {/* Customer */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-black text-[#1A1A1A] text-xs">
                              {item.customer?.name || "Customer"}
                            </div>
                            <div className="text-[11px] font-mono font-medium text-[#5C5647]">
                              {item.customer?.mobile || "No phone"}
                            </div>
                          </td>

                          {/* Amount (₹) */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-right align-middle">
                            <span className="text-base font-mono font-black tabular-nums text-[#1A1A1A]">
                              {formatCurrency(item.amountPaise / 100)}
                            </span>
                          </td>

                          {/* Purpose */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            {item.purpose === "WALLET_TOPUP" ? (
                              <span className="rounded-md border border-black px-2 py-0.5 text-[11px] font-mono font-bold bg-[#D8CEF6] text-[#4C1D95]">
                                Wallet Top-up
                              </span>
                            ) : (
                              <span className="rounded-md border border-black px-2 py-0.5 text-[11px] font-mono font-bold bg-[#FFDF58] text-[#713F12]">
                                Order / Plan
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${statusBadge.className}`}
                            >
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* Collection Date */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-mono text-xs font-bold text-[#1A1A1A]">
                              {formatDate(item.collectedAt || item.createdAt)}
                            </div>
                            {item.adminNote && (
                              <div
                                className="text-[10px] font-mono font-medium text-[#5C5647] break-words max-w-[200px] mt-0.5"
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
                                  aria-label={`Confirm cash collection for ${item.customer?.name}`}
                                  className="rounded-[8px] bg-[#B8E8B8] hover:bg-[#9fe09f] border-2 border-black font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-[#14532D] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                                >
                                  <Check className="h-3 w-3 stroke-[3]" />
                                  Confirm Cash
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelItem(item);
                                    setIsCancelOpen(true);
                                  }}
                                  aria-label={`Cancel cash collection for ${item.customer?.name}`}
                                  className="rounded-[8px] bg-white hover:bg-[#FFD9D0] border-2 border-black font-black text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer text-[#7F1D1D] inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                                >
                                  <X className="h-3 w-3 stroke-[3]" />
                                  Cancel
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
            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-3">
              <span>
                Showing <strong className="font-mono">{cashCollections.length}</strong> of{" "}
                <strong className="font-mono">{cashTotalCount}</strong> cash records
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
                  aria-label="Previous cash page"
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <ChevronLeft className="h-3 w-3 stroke-[3]" />
                  Prev
                </button>

                <span className="font-mono text-xs font-black px-2">
                  Page {cashPage} of {cashTotalPages || 1}
                </span>

                <button
                  type="button"
                  disabled={cashPage >= cashTotalPages || isCashLoading}
                  onClick={() => {
                    const next = cashPage + 1;
                    setCashPage(next);
                    loadCashCollections(next, false);
                  }}
                  aria-label="Next cash page"
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  Next
                  <ChevronRight className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* CASH HUB: MOBILE CARDS VIEW (Visible below md)          */}
          {/* ======================================================= */}
          <div className="block md:hidden space-y-3">
            {isCashLoading && cashCollections.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] animate-pulse space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#E5E0D8] rounded w-32" />
                    <div className="h-5 bg-[#E5E0D8] rounded w-20" />
                  </div>
                  <div className="h-8 bg-[#E5E0D8]/60 rounded" />
                  <div className="h-10 bg-[#E5E0D8] rounded w-full" />
                </div>
              ))
            ) : cashCollections.length === 0 ? (
              <div className="border-2 border-black bg-white rounded-[14px] p-6 text-center space-y-3 shadow-[3px_3px_0px_0px_#000000]">
                <div className="flex justify-center">
                  <Banknote className="h-8 w-8 text-[#5C5647]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                    {cashStatusFilter === "PENDING"
                      ? "No pending cash collections"
                      : "No cash collections match filter"}
                  </h3>
                  <p className="text-xs font-semibold text-[#5C5647]">
                    {cashStatusFilter === "PENDING"
                      ? "All cash collections are reconciled."
                      : "Try clearing search or filters."}
                  </p>
                </div>
                {hasActiveCashFilters && (
                  <button
                    type="button"
                    onClick={handleResetCashFilters}
                    className="w-full py-2.5 rounded-[8px] border-2 border-black bg-[#FFDF58] text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              cashCollections.map((item) => {
                const isPending =
                  item.status === "PENDING" || item.status === "COLLECTED";
                const statusBadge = getCashStatusBadge(item.status);

                return (
                  <div
                    key={item.id}
                    className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] space-y-3"
                  >
                    {/* Top Row: Customer + Status Pill */}
                    <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
                      <div>
                        <div className="font-black text-sm text-[#1A1A1A]">
                          {item.customer?.name || "Customer"}
                        </div>
                        <div className="text-xs font-mono font-medium text-[#5C5647]">
                          {item.customer?.mobile || "No phone"}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${statusBadge.className}`}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Amount & Purpose Block */}
                    <div className="flex items-center justify-between bg-[#FAF7EC] p-3 rounded-[10px] border border-black/20">
                      <div>
                        <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                          Collection Amount
                        </span>
                        <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                          {formatCurrency(item.amountPaise / 100)}
                        </span>
                      </div>

                      <div>
                        {item.purpose === "WALLET_TOPUP" ? (
                          <span className="rounded-md border border-black px-2 py-0.5 text-[10px] font-mono font-bold bg-[#D8CEF6] text-[#4C1D95]">
                            Wallet Top-up
                          </span>
                        ) : (
                          <span className="rounded-md border border-black px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FFDF58] text-[#713F12]">
                            Order / Plan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date and Note */}
                    <div className="text-[11px] font-mono text-[#5C5647] space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 stroke-[2]" />
                        Collected: {formatDate(item.collectedAt || item.createdAt)}
                      </div>
                      {item.adminNote && (
                        <div className="text-[10px] text-[#1A1A1A] font-medium bg-stone-100 p-1.5 rounded border border-black/20 break-words">
                          Note: {item.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons (Min 44px) */}
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmItem(item);
                            setIsConfirmOpen(true);
                          }}
                          className="min-h-[44px] rounded-[10px] border-2 border-black bg-[#B8E8B8] active:bg-[#9fe09f] font-black text-xs uppercase text-[#14532D] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          Confirm Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancelItem(item);
                            setIsCancelOpen(true);
                          }}
                          className="min-h-[44px] rounded-[10px] border-2 border-black bg-white active:bg-[#FFD9D0] font-black text-xs uppercase text-[#7F1D1D] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {/* Mobile Pagination */}
            <div className="p-3.5 bg-[#FAF7EC] border-2 border-black rounded-[14px] shadow-[2px_2px_0px_0px_#000000] text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={cashPage <= 1 || isCashLoading}
                onClick={() => {
                  const prev = cashPage - 1;
                  setCashPage(prev);
                  loadCashCollections(prev, false);
                }}
                className="min-h-[44px] px-3 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5 stroke-[3]" />
                Prev
              </button>

              <span className="font-mono text-xs font-black">
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
                className="min-h-[44px] px-3 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: PAYU ONLINE PAYMENTS AUDIT LEDGER                  */}
      {/* ========================================================= */}
      {activeTab === "ONLINE_PAYMENTS" && (
        <div className="space-y-4">
          {paymentsError && (
            <div className="flex items-center gap-2.5 rounded-[12px] border-2 border-black bg-[#FFD9D0] p-3.5 text-xs font-black text-[#7F1D1D] shadow-[3px_3px_0px_0px_#1A1A1A]">
              <AlertTriangle className="h-4 w-4 stroke-[3] shrink-0" />
              <span>{paymentsError}</span>
            </div>
          )}

          {/* Payments Filter Card */}
          <div className="bg-white border-2 border-black p-3.5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "ALL", label: "All Statuses" },
                    { key: "SUCCESS", label: "Success" },
                    { key: "PENDING", label: "Pending" },
                    { key: "REFUND_PENDING", label: "Refund Pending" },
                    { key: "REFUNDED", label: "Refunded" },
                    { key: "FAILED", label: "Failed" },
                  ] as const
                ).map((tab) => {
                  const isActive = paymentStatusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setPaymentStatusFilter(tab.key)}
                      className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
                        isActive
                          ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                          : "bg-white text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search & Extra Filters on right */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
                  <Input
                    placeholder="Search customer, phone..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] placeholder:text-[#5C5647]/70"
                  />
                  {paymentSearch && (
                    <button
                      type="button"
                      onClick={() => setPaymentSearch("")}
                      aria-label="Clear payment search"
                      className="absolute right-2.5 top-2.5 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsPaymentFiltersOpen(!isPaymentFiltersOpen)}
                  aria-expanded={isPaymentFiltersOpen}
                  aria-label="Toggle extra payment filters"
                  className={`h-9 px-3 rounded-[8px] border-2 border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                    transactionIdSearch || paymentStartDate || paymentEndDate || isPaymentFiltersOpen
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Filters</span>
                  {isPaymentFiltersOpen ? (
                    <ChevronUp className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <ChevronDown className="h-3 w-3 stroke-[3]" />
                  )}
                </button>

                {hasActivePaymentFilters && (
                  <button
                    type="button"
                    onClick={handleResetPaymentFilters}
                    aria-label="Reset all payment filters"
                    title="Reset filters"
                    className="h-9 px-2.5 rounded-[8px] border-2 border-black/30 hover:border-black bg-[#FAF7EC] hover:bg-stone-200 text-[#1A1A1A] text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Secondary Payment Filters */}
            {isPaymentFiltersOpen && (
              <div className="pt-3 border-t border-black/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 animate-in fade-in duration-150">
                <div className="relative">
                  <Receipt className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
                  <Input
                    placeholder="Merchant TXN ID (PFMH...)..."
                    value={transactionIdSearch}
                    onChange={(e) => setTransactionIdSearch(e.target.value)}
                    className="pl-9 h-8 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
                    From:
                  </span>
                  <Input
                    type="date"
                    value={paymentStartDate}
                    onChange={(e) => setPaymentStartDate(e.target.value)}
                    className="h-8 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
                    To:
                  </span>
                  <Input
                    type="date"
                    value={paymentEndDate}
                    onChange={(e) => setPaymentEndDate(e.target.value)}
                    className="h-8 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* ONLINE PAYMENTS: DESKTOP TABLE VIEW                     */}
          {/* ======================================================= */}
          <div className="hidden md:block border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black w-44">Transaction ID</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right w-36">Amount (₹)</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-40">Method / Provider</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-center w-40">Gateway Status</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-36">Date</th>
                    <th className="py-3.5 px-4 text-center w-36">Actions</th>
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
                          <div className="h-5 bg-[#E5E0D8] rounded-full w-20 mx-auto" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-20" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded-[8px] w-24 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="flex justify-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7EC] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                              <CreditCard className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-tight text-[#1A1A1A]">
                              No payment transactions found
                            </h3>
                            <p className="text-xs font-semibold text-[#5C5647]">
                              {hasActivePaymentFilters
                                ? "No online transactions match your search and filter criteria."
                                : "No online payment records are logged in the ledger yet."}
                            </p>
                          </div>

                          {hasActivePaymentFilters && (
                            <button
                              type="button"
                              onClick={handleResetPaymentFilters}
                              className="rounded-[8px] border-2 border-black bg-[#FFDF58] px-4 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const isCopied = copiedKey === p.id;
                      const statusBadge = getPaymentStatusBadge(p.status);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#FAF7EC]/80 transition-colors group"
                        >
                          {/* Transaction ID */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-xs font-mono font-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                                title={`TXN ID: ${p.transactionId}`}
                              >
                                {p.transactionId.length > 12
                                  ? `${p.transactionId.substring(0, 10)}...`
                                  : p.transactionId}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopy(e, p.transactionId, p.id)}
                                title="Copy Transaction ID"
                                aria-label={`Copy transaction ID ${p.transactionId}`}
                                className="p-1 rounded text-[#5C5647] hover:text-[#1A1A1A] hover:bg-stone-200 cursor-pointer transition-colors"
                              >
                                {isCopied ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-green-700 stroke-[3]" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 stroke-[2]" />
                                )}
                              </button>
                            </div>
                            {p.providerPaymentId && (
                              <div className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                                Ref: {p.providerPaymentId}
                              </div>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-black text-[#1A1A1A] text-xs">
                              {p.customer?.name || "Customer"}
                            </div>
                            <div className="text-[11px] font-mono font-medium text-[#5C5647]">
                              {p.customer?.mobile || "No phone"}
                            </div>
                          </td>

                          {/* Amount (₹) */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-right align-middle">
                            <span className="font-mono font-black text-sm tabular-nums text-[#1A1A1A]">
                              {formatCurrency(p.amountPaise / 100)}
                            </span>
                          </td>

                          {/* Method / Provider */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <span className="rounded-md border border-black bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                              {p.paymentMethod} • {p.provider}
                            </span>
                          </td>

                          {/* Gateway Status */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${statusBadge.className}`}
                            >
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
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
                              aria-label={`Inspect details for transaction ${p.transactionId}`}
                              className="rounded-[8px] bg-white hover:bg-[#FFDF58] font-black text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                            >
                              <Eye className="h-3 w-3 stroke-[2.5]" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Payments Pagination */}
            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-3">
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
                  aria-label="Previous payment page"
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  <ChevronLeft className="h-3 w-3 stroke-[3]" />
                  Prev
                </button>

                <span className="font-mono text-xs font-black px-2">
                  Page {paymentPage} of {paymentTotalPages || 1}
                </span>

                <button
                  type="button"
                  disabled={paymentPage >= paymentTotalPages || isPaymentsLoading}
                  onClick={() => {
                    const next = paymentPage + 1;
                    setPaymentPage(next);
                    loadPayments(next, false);
                  }}
                  aria-label="Next payment page"
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  Next
                  <ChevronRight className="h-3 w-3 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* ONLINE PAYMENTS: MOBILE CARDS VIEW                      */}
          {/* ======================================================= */}
          <div className="block md:hidden space-y-3">
            {isPaymentsLoading && payments.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] animate-pulse space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#E5E0D8] rounded w-32" />
                    <div className="h-5 bg-[#E5E0D8] rounded w-20" />
                  </div>
                  <div className="h-8 bg-[#E5E0D8]/60 rounded" />
                  <div className="h-10 bg-[#E5E0D8] rounded w-full" />
                </div>
              ))
            ) : payments.length === 0 ? (
              <div className="border-2 border-black bg-white rounded-[14px] p-6 text-center space-y-3 shadow-[3px_3px_0px_0px_#000000]">
                <div className="flex justify-center">
                  <CreditCard className="h-8 w-8 text-[#5C5647]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                    No payment records
                  </h3>
                  <p className="text-xs font-semibold text-[#5C5647]">
                    Try clearing search or filters.
                  </p>
                </div>
                {hasActivePaymentFilters && (
                  <button
                    type="button"
                    onClick={handleResetPaymentFilters}
                    className="w-full py-2.5 rounded-[8px] border-2 border-black bg-[#FFDF58] text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              payments.map((p) => {
                const statusBadge = getPaymentStatusBadge(p.status);

                return (
                  <div
                    key={p.id}
                    className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] space-y-3"
                  >
                    {/* Top Row: TXN ID + Status Badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
                      <div>
                        <span className="font-mono text-xs font-black text-[#1A1A1A] block">
                          {p.transactionId}
                        </span>
                        <div className="text-[11px] font-semibold text-[#5C5647]">
                          {p.customer?.name} ({p.customer?.mobile || "No phone"})
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${statusBadge.className}`}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Amount & Method */}
                    <div className="flex items-center justify-between bg-[#FAF7EC] p-3 rounded-[10px] border border-black/20">
                      <div>
                        <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                          Amount Paid
                        </span>
                        <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                          {formatCurrency(p.amountPaise / 100)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="rounded-md border border-black bg-white px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                          {p.paymentMethod} • {p.provider}
                        </span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-[11px] font-mono text-[#5C5647] flex items-center gap-1">
                      <Clock className="h-3 w-3 stroke-[2]" />
                      Date: {formatDate(p.createdAt)}
                    </div>

                    {/* Action (Min 44px) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPaymentId(p.id);
                        setIsPaymentSheetOpen(true);
                      }}
                      className="w-full min-h-[44px] rounded-[10px] border-2 border-black bg-[#FFDF58] active:bg-[#fcd033] font-black text-xs uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                      Inspect Payment Details
                    </button>
                  </div>
                );
              })
            )}

            {/* Mobile Pagination */}
            <div className="p-3.5 bg-[#FAF7EC] border-2 border-black rounded-[14px] shadow-[2px_2px_0px_0px_#000000] text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={paymentPage <= 1 || isPaymentsLoading}
                onClick={() => {
                  const prev = paymentPage - 1;
                  setPaymentPage(prev);
                  loadPayments(prev, false);
                }}
                className="min-h-[44px] px-3 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5 stroke-[3]" />
                Prev
              </button>

              <span className="font-mono text-xs font-black">
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
                className="min-h-[44px] px-3 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />
              </button>
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
