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
import { CashCollectionDetailSheet } from "@/components/payments/cash-collection-detail-sheet";
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
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
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
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { StatCardSkeleton } from "@/components/ui/stat-card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ButtonLoader } from "@/components/ui/button-loader";


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

  // Cash Pagination (API default limit is 20)
  const [cashPage, setCashPage] = useState<number>(1);
  const [cashTotalPages, setCashTotalPages] = useState<number>(1);
  const [cashTotalCount, setCashTotalCount] = useState<number>(0);

  // Cash Filters
  const [cashStatusFilter, setCashStatusFilter] = useState<CashCollectionStatus | "ALL">("PENDING");
  const [cashSearch, setCashSearch] = useState<string>("");
  const [debouncedCashSearch, setDebouncedCashSearch] = useState<string>("");
  const [cashStartDate, setCashStartDate] = useState<string>("");
  const [cashEndDate, setCashEndDate] = useState<string>("");

  // Cash Action Modals & Inspection Sheet
  const [confirmItem, setConfirmItem] = useState<CashCollectionItem | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [cancelItem, setCancelItem] = useState<CashCollectionItem | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const [selectedCashCollectionId, setSelectedCashCollectionId] = useState<string | null>(null);
  const [isCashDetailOpen, setIsCashDetailOpen] = useState(false);

  // Top Metrics Cache
  const [cashMetrics, setCashMetrics] = useState<{
    pendingCount: number;
    unreconciledFloat: number;
  }>({ pendingCount: 0, unreconciledFloat: 0 });

  // =========================================================================
  // STATE: ONLINE PAYMENTS (TAB 2)
  // =========================================================================
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [isPaymentsLoading, setIsPaymentsLoading] = useState<boolean>(true);
  const [isPaymentsRefreshing, setIsPaymentsRefreshing] = useState<boolean>(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);
  const [isPaymentFiltersOpen, setIsPaymentFiltersOpen] = useState<boolean>(false);

  // Payment Pagination (API default limit is 20)
  const [paymentPage, setPaymentPage] = useState<number>(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState<number>(1);
  const [paymentTotalCount, setPaymentTotalCount] = useState<number>(0);

  // Payment Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentTransactionStatus | "ALL">("ALL");
  const [paymentSearch, setPaymentSearch] = useState<string>("");
  const [debouncedPaymentSearch, setDebouncedPaymentSearch] = useState<string>("");
  const [transactionIdSearch, setTransactionIdSearch] = useState<string>("");
  const [debouncedTxnIdSearch, setDebouncedTxnIdSearch] = useState<string>("");
  const [paymentPurposeFilter, setPaymentPurposeFilter] = useState<PaymentPurpose | "ALL">("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
  const [paymentStartDate, setPaymentStartDate] = useState<string>("");
  const [paymentEndDate, setPaymentEndDate] = useState<string>("");

  // Payment Inspection Sheet
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState<boolean>(false);

  // Notice & Feedback Banner
  const [notice, setNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);

  const showNotice = (message: string, type: "success" | "error" = "success") => {
    setNotice({ message, type });
    setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxnId(id);
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  // =========================================================================
  // DEBOUNCED SEARCH EFFECTS
  // =========================================================================
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCashSearch(cashSearch);
    }, 350);
    return () => clearTimeout(handler);
  }, [cashSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPaymentSearch(paymentSearch);
    }, 350);
    return () => clearTimeout(handler);
  }, [paymentSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTxnIdSearch(transactionIdSearch);
    }, 350);
    return () => clearTimeout(handler);
  }, [transactionIdSearch]);

  // =========================================================================
  // METRICS LOADER (Accurate Depot Pending Total & Unreconciled Float)
  // =========================================================================
  const refreshCashMetrics = useCallback(async () => {
    try {
      const pendingRes = await fetchCashCollections(
        { status: "PENDING", limit: 100 },
        { forceRefresh: true }
      );
      if (pendingRes && Array.isArray(pendingRes.data)) {
        const totalCount = pendingRes.pagination?.total ?? pendingRes.data.length;
        const totalPaise = pendingRes.data.reduce(
          (sum, item) => sum + (item.amountPaise || 0),
          0
        );
        setCashMetrics({
          pendingCount: totalCount,
          unreconciledFloat: totalPaise / 100,
        });
      }
    } catch {
      // Fallback is kept from local calculation
    }
  }, []);

  // =========================================================================
  // DATA FETCHING: PHYSICAL CASH HUB
  // =========================================================================
  const loadCashCollections = useCallback(
    async (targetPage = 1, forceRefresh = false) => {
      if (forceRefresh) {
        setIsCashRefreshing(true);
      } else {
        setIsCashLoading(true);
      }
      setCashError(null);

      const params: CashCollectionQueryParams = {
        page: targetPage,
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

          // Update metrics from pending response if currently on PENDING tab
          if (cashStatusFilter === "PENDING" && !debouncedCashSearch && !cashStartDate && !cashEndDate) {
            const totalPaise = response.data.reduce((sum, item) => sum + (item.amountPaise || 0), 0);
            setCashMetrics({
              pendingCount: response.pagination?.total ?? response.data.length,
              unreconciledFloat: totalPaise / 100,
            });
          }
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

  // =========================================================================
  // DATA FETCHING: ONLINE PAYMENTS AUDIT
  // =========================================================================
  const loadPayments = useCallback(
    async (targetPage = 1, forceRefresh = false) => {
      if (forceRefresh) {
        setIsPaymentsRefreshing(true);
      } else {
        setIsPaymentsLoading(true);
      }
      setPaymentsError(null);

      const params: PaymentQueryParams = {
        page: targetPage,
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

  // Initial load and metrics sync
  useEffect(() => {
    refreshCashMetrics();
  }, [refreshCashMetrics]);

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

  // Handle cash collection modal actions
  const handleCashUpdated = (updated: CashCollectionItem) => {
    setCashCollections((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
    );
    showNotice("Cash collection " + updated.status.toLowerCase() + " successfully!");
    loadCashCollections(cashPage, true);
    refreshCashMetrics();
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
          label: status === "COLLECTED" ? "Collected" : "Pending",
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
      case "PROCESSING":
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
      case "CANCELLED":
      case "EXPIRED":
        return {
          className: "bg-[#FFD9D0] border-2 border-black text-[#7F1D1D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <XCircle className="h-3 w-3 stroke-[2.5]" />,
          label: status === "FAILED" ? "Failed" : status === "EXPIRED" ? "Expired" : "Cancelled",
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
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & UNIFIED CONTROLS (TABS + SYNC ON ONE ROW) */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            PAYMENTS & CASH COLLECTION
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#5C5647] mt-0.5">
            Reconcile physical depot cash floats, audit PayU gateway logs, and manage refunds.
          </p>
        </div>

        {/* Aligned Top-Right Control Group: Segmented Tabs + Sync Live on ONE Row */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Segmented Tab Control */}
          <div className="inline-flex items-center bg-[#FAF7EC] p-1 rounded-[12px] border-2 border-black shadow-[2px_2px_0px_0px_#000000] flex-1 sm:flex-initial">
            <button
              type="button"
              onClick={() => setActiveTab("CASH_COLLECTIONS")}
              aria-selected={activeTab === "CASH_COLLECTIONS"}
              className={"flex-1 sm:flex-initial px-3.5 py-1.5 rounded-[8px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[36px] sm:min-h-[34px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black " + (
                activeTab === "CASH_COLLECTIONS"
                  ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]"
                  : "bg-transparent text-[#5C5647] hover:text-[#1A1A1A] hover:bg-black/5 border border-transparent"
              )}
            >
              <Banknote className="h-4 w-4 stroke-[2.5]" />
              <span>Physical Cash Hub</span>
              {cashMetrics.pendingCount > 0 && (
                <span className="ml-0.5 rounded-full bg-black text-[#FFDF58] px-1.5 py-0.2 text-[10px] font-mono font-black">
                  {cashMetrics.pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ONLINE_PAYMENTS")}
              aria-selected={activeTab === "ONLINE_PAYMENTS"}
              className={"flex-1 sm:flex-initial px-3.5 py-1.5 rounded-[8px] text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[36px] sm:min-h-[34px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black " + (
                activeTab === "ONLINE_PAYMENTS"
                  ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]"
                  : "bg-transparent text-[#5C5647] hover:text-[#1A1A1A] hover:bg-black/5 border border-transparent"
              )}
            >
              <CreditCard className="h-4 w-4 stroke-[2.5]" />
              <span>PayU Audit Ledger</span>
            </button>
          </div>

          {/* Sync Live Button (Lighter secondary button beside the tabs) */}
          <button
            type="button"
            onClick={() => {
              if (activeTab === "CASH_COLLECTIONS") {
                loadCashCollections(cashPage, true);
                refreshCashMetrics();
              } else {
                loadPayments(paymentPage, true);
              }
            }}
            disabled={isCashRefreshing || isPaymentsRefreshing}
            aria-label="Sync live payment data"
            className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black shrink-0"
          >
            <RefreshCw
              className={"h-3.5 w-3.5 stroke-[2.5] " + (
                isCashRefreshing || isPaymentsRefreshing ? "animate-spin" : ""
              )}
            />
            <span>
              {isCashRefreshing || isPaymentsRefreshing ? "Syncing..." : "Sync Live"}
            </span>
          </button>
        </div>
      </div>

      {/* Notice Feedback Banner */}
      {notice && (
        <div
          role="alert"
          className={"flex items-center gap-2.5 rounded-[12px] border-2 border-black p-3 text-xs font-black shadow-[2.5px_2.5px_0px_0px_#1A1A1A] animate-in fade-in duration-200 " + (
            notice.type === "success"
              ? "bg-[#B9E8B4] text-[#14532D]"
              : "bg-[#FFD9D0] text-[#7F1D1D]"
          )}
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
      {/* TAB 1: PHYSICAL CASH RECONCILIATION HUB                  */}
      {/* ========================================================= */}
      {activeTab === "CASH_COLLECTIONS" && (
        <div className="space-y-4">
          {/* Top Stat Cards: Equal height, clean alignment */}
          {isCashLoading && cashCollections.length === 0 ? (
            <StatCardSkeleton count={2} />
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
            {/* Stat 1: Pending Collections */}
            <div className="rounded-[14px] bg-[#FFDF58] border-2 border-black p-4 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between min-h-[96px]">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                  Pending Collections
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums leading-none">
                    {cashMetrics.pendingCount}
                  </span>
                  <span className="text-xs font-bold text-[#1A1A1A]">collections</span>
                </div>
                <p className="text-xs font-semibold text-[#423918] mt-1">
                  Depot deliveries awaiting confirmation
                </p>
              </div>

              <div className="rounded-[10px] border-2 border-black bg-white p-2.5 shadow-[2px_2px_0px_0px_#000000] shrink-0">
                <Banknote className="h-6 w-6 text-[#1A1A1A] stroke-[2.5]" />
              </div>
            </div>

            {/* Stat 2: Total Unreconciled Cash Float */}
            <div className="rounded-[14px] bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between min-h-[96px]">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                  Total Unreconciled Cash Float
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-mono text-3xl font-black text-[#1A1A1A] tabular-nums leading-none">
                    {formatCurrency(cashMetrics.unreconciledFloat)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#5C5647] mt-1">
                  Physical currency pending wallet ledger credit
                </p>
              </div>

              <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8] p-2.5 shadow-[2px_2px_0px_0px_#000000] shrink-0">
                <Building2 className="h-6 w-6 text-[#14532D] stroke-[2.5]" />
              </div>
            </div>
          
          </div>
          )}

          {cashError && (
            <ErrorState
              error={cashError}
              onRetry={() => loadCashCollections(cashPage, true)}
            />
          )}

          {/* Cash Filter Bar */}
          <div className="bg-white border-2 border-black p-3 rounded-[14px] shadow-[3px_3px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "PENDING", label: "Pending" },
                    { key: "COLLECTED", label: "Collected" },
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
                      className={"rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black " + (
                        isActive
                          ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                          : "bg-white text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
                      )}
                    >
                      {(tab.key === "PENDING" || tab.key === "COLLECTED") && (
                        <span
                          className={"h-2 w-2 rounded-full " + (
                            isActive ? "bg-black" : "bg-[#FFDF58]"
                          )}
                        />
                      )}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search, Date toggle & Quiet Reset */}
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
                  className={"h-9 px-3 rounded-[8px] border-2 border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 " + (
                    cashStartDate || cashEndDate || isCashFiltersOpen
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A]"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Dates</span>
                  {isCashFiltersOpen ? (
                    <ChevronUp className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <ChevronDown className="h-3 w-3 stroke-[3]" />
                  )}
                </button>

                {/* Quiet Reset Filters button (only shown when filters applied) */}
                {hasActiveCashFilters && (
                  <button
                    type="button"
                    onClick={handleResetCashFilters}
                    aria-label="Reset all cash filters"
                    title="Reset filters"
                    className="h-9 px-3 rounded-[8px] border-2 border-black/30 hover:border-black bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">Reset</span>
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
          <div className="hidden md:block border-2 border-black bg-white rounded-[14px] shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3 px-4 border-r-2 border-black w-48">Customer</th>
                    <th className="py-3 px-4 border-r-2 border-black text-right w-36">Amount (₹)</th>
                    <th className="py-3 px-4 border-r-2 border-black">Purpose</th>
                    <th className="py-3 px-4 border-r-2 border-black text-center w-36">Status</th>
                    <th className="py-3 px-4 border-r-2 border-black w-44">Collection Date</th>
                    <th className="py-3 px-4 text-center w-52">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {isCashLoading && cashCollections.length === 0 ? (
                    <TableSkeleton colSpan={6} rows={5} />
                  ) : cashCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <EmptyState
                          icon={<Banknote className="h-6 w-6 stroke-[2.5]" />}
                          title="No Cash Collections Found"
                          description={
                            hasActiveCashFilters
                              ? "No cash collections match your filter criteria."
                              : "No pending or historical cash collections are recorded."
                          }
                          isFiltered={hasActiveCashFilters}
                          onClearFilters={handleResetCashFilters}
                        />
                      </td>
                    </tr>
                  ) : (
                    cashCollections.map((item) => {
                      const isPending =
                        item.status === "PENDING" || item.status === "COLLECTED";
                      const statusBadge = getCashStatusBadge(item.status);
                      const isPlan = item.purpose === "PLAN_PAYMENT" || Boolean(item.planSelectionId);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-[#FFFDF8] transition-colors"
                        >
                          {/* Customer */}
                          <td className="py-3 px-4 border-r-2 border-black">
                            <span className="font-black text-[#1A1A1A] block">
                              {item.customer?.name || "Unknown Customer"}
                            </span>
                            <span className="font-mono text-xs text-[#5C5647]">
                              {item.customer?.mobile || "No phone"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 border-r-2 border-black text-right font-mono font-black text-[#1A1A1A] tabular-nums">
                            {formatCurrency((item.amountPaise || 0) / 100)}
                          </td>

                          {/* Purpose */}
                          <td className="py-3 px-4 border-r-2 border-black">
                            <div className="flex flex-col gap-1">
                              <span className="inline-block max-w-[200px] truncate rounded-md border border-black/30 bg-[#FAF7EC] px-2 py-0.5 text-[11px] font-bold text-[#1A1A1A]">
                                {isPlan ? "Plan Payment" : "Wallet Top-up"}
                              </span>
                              {item.adminNote && (
                                <span className="text-[10px] text-[#5C5647] truncate max-w-[200px]">
                                  Note: {item.adminNote}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 border-r-2 border-black text-center">
                            <span
                              className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider " + statusBadge.className}
                            >
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 border-r-2 border-black font-mono text-xs text-[#5C5647]">
                            {formatDate(item.collectedAt || item.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            {isPending ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmItem(item);
                                    setIsConfirmOpen(true);
                                  }}
                                  className="cursor-pointer rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#fcd033] px-3 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 min-h-[34px]"
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelItem(item);
                                    setIsCancelOpen(true);
                                  }}
                                  className="cursor-pointer rounded-[8px] border-2 border-black/30 hover:border-black bg-white hover:bg-[#FFD9D0] px-2.5 py-1.5 text-xs font-bold uppercase text-[#7F1D1D] transition-all flex items-center gap-1 min-h-[34px]"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[2.5]" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCashCollectionId(item.id);
                                  setIsCashDetailOpen(true);
                                }}
                                className="cursor-pointer rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3 py-1.5 text-xs font-bold uppercase text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all inline-flex items-center gap-1 min-h-[34px]"
                              >
                                <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                                Inspect
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Pagination */}
            <div className="p-3 bg-[#FAF7EC] border-t-2 border-black flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
              <div>
                Showing page <span className="font-black">{cashPage}</span> of{" "}
                <span className="font-black">{cashTotalPages || 1}</span> ({cashTotalCount} total records)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={cashPage <= 1 || isCashLoading}
                  onClick={() => {
                    const prev = cashPage - 1;
                    setCashPage(prev);
                    loadCashCollections(prev, false);
                  }}
                  className="px-3 py-1.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 stroke-[3]" />
                  Prev
                </button>

                <button
                  type="button"
                  disabled={cashPage >= cashTotalPages || isCashLoading}
                  onClick={() => {
                    const next = cashPage + 1;
                    setCashPage(next);
                    loadCashCollections(next, false);
                  }}
                  className="px-3 py-1.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* CASH HUB: MOBILE CARD LIST (< 768px)                    */}
          {/* ======================================================= */}
          <div className="md:hidden space-y-3">
            {isCashLoading && cashCollections.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[2.5px_2.5px_0px_0px_#000000] animate-pulse space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#E5E0D8] rounded w-28" />
                    <div className="h-5 bg-[#E5E0D8] rounded w-16" />
                  </div>
                  <div className="h-6 bg-[#E5E0D8]/60 rounded" />
                  <div className="h-10 bg-[#E5E0D8] rounded w-full" />
                </div>
              ))
            ) : cashCollections.length === 0 ? (
              <div className="border-2 border-black bg-white rounded-[14px] p-6 text-center space-y-2.5 shadow-[2.5px_2.5px_0px_0px_#000000]">
                <div className="flex justify-center">
                  <Banknote className="h-8 w-8 text-[#5C5647]" />
                </div>
                <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                  No cash collections
                </h3>
                <p className="text-xs font-semibold text-[#5C5647]">
                  Try clearing search or changing filters.
                </p>
                {hasActiveCashFilters && (
                  <button
                    type="button"
                    onClick={handleResetCashFilters}
                    className="w-full py-2.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] text-xs font-bold uppercase text-[#1A1A1A]"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              cashCollections.map((item) => {
                const isPending =
                  item.status === "PENDING" || item.status === "COLLECTED";
                const statusBadge = getCashStatusBadge(item.status);
                const isPlan = item.purpose === "PLAN_PAYMENT" || Boolean(item.planSelectionId);

                return (
                  <div
                    key={item.id}
                    className="border-2 border-black bg-white rounded-[14px] p-3.5 shadow-[2.5px_2.5px_0px_0px_#000000] space-y-2.5"
                  >
                    {/* Top Row: Customer & Status */}
                    <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
                      <div>
                        <span className="font-black text-sm text-[#1A1A1A] block">
                          {item.customer?.name || "Unknown Customer"}
                        </span>
                        <span className="font-mono text-xs text-[#5C5647]">
                          {item.customer?.mobile || "No phone"}
                        </span>
                      </div>

                      <span
                        className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider " + statusBadge.className}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Amount & Purpose */}
                    <div className="flex items-center justify-between bg-[#FAF7EC] p-2.5 rounded-[10px] border border-black/20">
                      <div>
                        <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                          Amount
                        </span>
                        <span className="font-mono text-xl font-black text-[#1A1A1A]">
                          {formatCurrency((item.amountPaise || 0) / 100)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="rounded-md border border-black/30 bg-white px-2 py-0.5 text-[10px] font-bold text-[#1A1A1A]">
                          {isPlan ? "Plan Payment" : "Wallet Top-up"}
                        </span>
                      </div>
                    </div>

                    {/* Date and Note */}
                    <div className="text-[11px] font-mono text-[#5C5647] flex items-center gap-1">
                      <Clock className="h-3 w-3 stroke-[2]" />
                      Date: {formatDate(item.collectedAt || item.createdAt)}
                    </div>

                    {/* Actions (Min 44px) */}
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmItem(item);
                            setIsConfirmOpen(true);
                          }}
                          className="min-h-[44px] rounded-[8px] border-2 border-black bg-[#FFDF58] active:bg-[#fcd033] font-black text-xs uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancelItem(item);
                            setIsCancelOpen(true);
                          }}
                          className="min-h-[44px] rounded-[8px] border-2 border-black/30 bg-white active:bg-[#FFD9D0] font-bold text-xs uppercase text-[#7F1D1D] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 stroke-[2.5]" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCashCollectionId(item.id);
                          setIsCashDetailOpen(true);
                        }}
                        className="w-full min-h-[44px] rounded-[8px] border-2 border-black bg-white active:bg-[#FAF7EC] font-bold text-xs uppercase text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                        Inspect Details
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {/* Mobile Pagination */}
            <div className="p-3 bg-[#FAF7EC] border-2 border-black rounded-[14px] shadow-[2px_2px_0px_0px_#000000] text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={cashPage <= 1 || isCashLoading}
                onClick={() => {
                  const prev = cashPage - 1;
                  setCashPage(prev);
                  loadCashCollections(prev, false);
                }}
                className="min-h-[44px] px-3.5 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1px_1px_0px_0px_#000000] flex items-center gap-1"
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
                className="min-h-[44px] px-3.5 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1px_1px_0px_0px_#000000] flex items-center gap-1"
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
            <ErrorState
              error={paymentsError}
              onRetry={() => loadPayments(paymentPage, true)}
            />
          )}

          {/* Payments Filter Card */}
          <div className="bg-white border-2 border-black p-3 rounded-[14px] shadow-[3px_3px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                      className={"rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black " + (
                        isActive
                          ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                          : "bg-white text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Search, Filter Toggle & Quiet Reset */}
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
                  className={"h-9 px-3 rounded-[8px] border-2 border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 " + (
                    transactionIdSearch || paymentPurposeFilter !== "ALL" || paymentMethodFilter !== "ALL" || paymentStartDate || paymentEndDate || isPaymentFiltersOpen
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A]"
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Filters</span>
                  {isPaymentFiltersOpen ? (
                    <ChevronUp className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <ChevronDown className="h-3 w-3 stroke-[3]" />
                  )}
                </button>

                {/* Quiet Reset Filters button */}
                {hasActivePaymentFilters && (
                  <button
                    type="button"
                    onClick={handleResetPaymentFilters}
                    aria-label="Reset all payment filters"
                    title="Reset filters"
                    className="h-9 px-3 rounded-[8px] border-2 border-black/30 hover:border-black bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Secondary Payment Filters */}
            {isPaymentFiltersOpen && (
              <div className="pt-2.5 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
                {/* Transaction ID */}
                <div className="relative">
                  <Receipt className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
                  <Input
                    placeholder="Merchant TXN ID (PFMH...)..."
                    value={transactionIdSearch}
                    onChange={(e) => setTransactionIdSearch(e.target.value)}
                    className="pl-9 h-8 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                  />
                </div>

                {/* Purpose Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
                    Purpose:
                  </span>
                  <select
                    value={paymentPurposeFilter}
                    onChange={(e) => setPaymentPurposeFilter(e.target.value as PaymentPurpose | "ALL")}
                    className="h-8 flex-1 rounded-[8px] border-2 border-black bg-white px-2 text-xs font-bold text-[#1A1A1A]"
                  >
                    <option value="ALL">All Purposes</option>
                    <option value="WALLET_TOPUP">Wallet Top-up</option>
                    <option value="ORDER">Order Checkout</option>
                  </select>
                </div>

                {/* From Date */}
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

                {/* To Date */}
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
          <div className="hidden md:block border-2 border-black bg-white rounded-[14px] shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3 px-4 border-r-2 border-black w-44">Transaction ID</th>
                    <th className="py-3 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3 px-4 border-r-2 border-black text-right w-36">Amount (₹)</th>
                    <th className="py-3 px-4 border-r-2 border-black w-40">Method / Provider</th>
                    <th className="py-3 px-4 border-r-2 border-black text-center w-40">Gateway Status</th>
                    <th className="py-3 px-4 border-r-2 border-black w-36">Date</th>
                    <th className="py-3 px-4 text-center w-36">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {isPaymentsLoading && payments.length === 0 ? (
                    <TableSkeleton colSpan={7} rows={5} />
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4">
                        <EmptyState
                          icon={<CreditCard className="h-6 w-6 stroke-[2.5]" />}
                          title="No Online Payments Found"
                          description={
                            hasActivePaymentFilters
                              ? "No payment records match your filter criteria."
                              : "No payment gateway transactions have been recorded yet."
                          }
                          isFiltered={hasActivePaymentFilters}
                          onClearFilters={handleResetPaymentFilters}
                        />
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const statusBadge = getPaymentStatusBadge(p.status);

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-[#FFFDF8] transition-colors"
                        >
                          {/* Transaction ID */}
                          <td className="py-3 px-4 border-r-2 border-black">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-[#1A1A1A]">
                                {p.transactionId}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(p.transactionId, p.id)}
                                title="Copy TXN ID"
                                className="text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                              >
                                {copiedTxnId === p.id ? (
                                  <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            {p.providerPaymentId && (
                              <span className="font-mono text-[10px] text-[#5C5647] block truncate max-w-[140px]">
                                Ref: {p.providerPaymentId}
                              </span>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-4 border-r-2 border-black">
                            <span className="font-black text-[#1A1A1A] block">
                              {p.customer?.name || "Anonymous User"}
                            </span>
                            <span className="font-mono text-xs text-[#5C5647]">
                              {p.customer?.mobile || "No phone"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 border-r-2 border-black text-right font-mono font-black text-[#1A1A1A] tabular-nums">
                            {formatCurrency(p.amountPaise / 100)}
                          </td>

                          {/* Method / Provider */}
                          <td className="py-3 px-4 border-r-2 border-black">
                            <span className="inline-block rounded-md border border-black/30 bg-[#FAF7EC] px-2 py-0.5 text-[11px] font-bold text-[#1A1A1A]">
                              {p.paymentMethod} • {p.provider}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 border-r-2 border-black text-center">
                            <span
                              className={"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider " + statusBadge.className}
                            >
                              {statusBadge.icon}
                              {statusBadge.label}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-4 border-r-2 border-black font-mono text-xs text-[#5C5647]">
                            {formatDate(p.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPaymentId(p.id);
                                setIsPaymentSheetOpen(true);
                              }}
                              className="cursor-pointer rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3 py-1.5 text-xs font-bold uppercase text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all inline-flex items-center gap-1 min-h-[34px]"
                            >
                              <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Desktop Table Pagination */}
            <div className="p-3 bg-[#FAF7EC] border-t-2 border-black flex items-center justify-between text-xs font-bold text-[#1A1A1A]">
              <div>
                Showing page <span className="font-black">{paymentPage}</span> of{" "}
                <span className="font-black">{paymentTotalPages || 1}</span> ({paymentTotalCount} total payments)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paymentPage <= 1 || isPaymentsLoading}
                  onClick={() => {
                    const prev = paymentPage - 1;
                    setPaymentPage(prev);
                    loadPayments(prev, false);
                  }}
                  className="px-3 py-1.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 stroke-[3]" />
                  Prev
                </button>

                <button
                  type="button"
                  disabled={paymentPage >= paymentTotalPages || isPaymentsLoading}
                  onClick={() => {
                    const next = paymentPage + 1;
                    setPaymentPage(next);
                    loadPayments(next, false);
                  }}
                  className="px-3 py-1.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] font-black text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[1px_1px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1 cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* ONLINE PAYMENTS: MOBILE CARD LIST (< 768px)             */}
          {/* ======================================================= */}
          <div className="md:hidden space-y-3">
            {isPaymentsLoading && payments.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[2.5px_2.5px_0px_0px_#000000] animate-pulse space-y-3"
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
              <div className="border-2 border-black bg-white rounded-[14px] p-6 text-center space-y-2.5 shadow-[2.5px_2.5px_0px_0px_#000000]">
                <div className="flex justify-center">
                  <CreditCard className="h-8 w-8 text-[#5C5647]" />
                </div>
                <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                  No payment records
                </h3>
                <p className="text-xs font-semibold text-[#5C5647]">
                  Try clearing search or filters.
                </p>
                {hasActivePaymentFilters && (
                  <button
                    type="button"
                    onClick={handleResetPaymentFilters}
                    className="w-full py-2.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] text-xs font-bold uppercase text-[#1A1A1A]"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              payments.map((p) => {
                const statusBadge = getPaymentStatusBadge(p.status);

                return (
                  <div
                    key={p.id}
                    className="border-2 border-black bg-white rounded-[14px] p-3.5 shadow-[2.5px_2.5px_0px_0px_#000000] space-y-2.5"
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
                        className={"inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase " + statusBadge.className}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Amount & Method */}
                    <div className="flex items-center justify-between bg-[#FAF7EC] p-2.5 rounded-[10px] border border-black/20">
                      <div>
                        <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                          Amount Paid
                        </span>
                        <span className="font-mono text-xl font-black text-[#1A1A1A]">
                          {formatCurrency(p.amountPaise / 100)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="rounded-md border border-black/30 bg-white px-2 py-0.5 text-[10px] font-bold text-[#1A1A1A]">
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
                      className="w-full min-h-[44px] rounded-[8px] border-2 border-black bg-white active:bg-[#FAF7EC] font-bold text-xs uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 stroke-[2.5]" />
                      Inspect Payment Details
                    </button>
                  </div>
                );
              })
            )}

            {/* Mobile Pagination */}
            <div className="p-3 bg-[#FAF7EC] border-2 border-black rounded-[14px] shadow-[2px_2px_0px_0px_#000000] text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={paymentPage <= 1 || isPaymentsLoading}
                onClick={() => {
                  const prev = paymentPage - 1;
                  setPaymentPage(prev);
                  loadPayments(prev, false);
                }}
                className="min-h-[44px] px-3.5 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1px_1px_0px_0px_#000000] flex items-center gap-1"
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
                className="min-h-[44px] px-3.5 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1px_1px_0px_0px_#000000] flex items-center gap-1"
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

      {/* Cash Collection Inspection Sheet */}
      <CashCollectionDetailSheet
        collectionId={selectedCashCollectionId}
        isOpen={isCashDetailOpen}
        onClose={() => {
          setIsCashDetailOpen(false);
          setSelectedCashCollectionId(null);
        }}
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
