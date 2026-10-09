"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CreditRequestItem,
  CreditRequestStatus,
  CreditRequestsApiResponse,
  RejectResponse,
  RefundStatus,
} from "@/types/wallet";
import {
  fetchCreditRequests,
  approveCreditRequest,
  CreditRequestQueryParams,
} from "@/services/wallet-service";
import { RejectRequestModal } from "@/components/wallet/reject-request-modal";
import { CreditRequestDetailModal } from "@/components/wallet/credit-request-detail-modal";
import { CustomerWalletSheet } from "@/components/wallet/customer-wallet-sheet";
import { Input } from "@/components/ui/input";
import {
  Wallet,
  Search,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  Copy,
  CheckCheck,
  Clock,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

export default function WalletPage() {
  const [requests, setRequests] = useState<CreditRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const pageSize = 20;

  // Filter states
  const [statusFilter, setStatusFilter] = useState<CreditRequestStatus | "ALL">("PENDING");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // In-flight approving ID
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Modals & Sheets
  const [selectedForReject, setSelectedForReject] = useState<CreditRequestItem | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const [selectedForDetail, setSelectedForDetail] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);

  const showNotice = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  };

  // Debounce customer search (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // Load credit requests with SWR caching
  const loadCreditRequests = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);
      setLoadError(null);

      const params: CreditRequestQueryParams = {
        page: pageToLoad,
        limit: pageSize,
      };

      if (statusFilter !== "ALL") params.status = statusFilter;
      if (debouncedCustomerSearch) params.customerSearch = debouncedCustomerSearch;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const response: CreditRequestsApiResponse = await fetchCreditRequests(params, {
          forceRefresh,
          onFreshData: (fresh) => {
            if (fresh && Array.isArray(fresh.data)) {
              setRequests(fresh.data);
              setTotalPages(fresh.pagination?.totalPages || 1);
              setTotalRequests(fresh.pagination?.total || fresh.data.length);
              setIsLoading(false);
            }
          },
        });

        if (response && Array.isArray(response.data)) {
          setRequests(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalRequests(response.pagination?.total || response.data.length);
        }
      } catch (err: unknown) {
        console.error("Failed to load credit requests:", err);
        setLoadError("Failed to fetch wallet requests. Please retry.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, debouncedCustomerSearch, startDate, endDate]
  );

  useEffect(() => {
    let ignore = false;
    (async () => {
      const params: CreditRequestQueryParams = {
        page: currentPage,
        limit: pageSize,
      };

      if (statusFilter !== "ALL") params.status = statusFilter;
      if (debouncedCustomerSearch) params.customerSearch = debouncedCustomerSearch;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const response = await fetchCreditRequests(params);
        if (!ignore && response && Array.isArray(response.data)) {
          setRequests(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalRequests(response.pagination?.total || response.data.length);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        console.error("Failed to load credit requests:", err);
        if (!ignore) {
          setIsLoading(false);
          setLoadError("Failed to load requests from server.");
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [currentPage, statusFilter, debouncedCustomerSearch, startDate, endDate]);

  const handleResetFilters = () => {
    setCustomerSearch("");
    setDebouncedCustomerSearch("");
    setStatusFilter("PENDING");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== "PENDING" ||
      debouncedCustomerSearch.length > 0 ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [statusFilter, debouncedCustomerSearch, startDate, endDate]);

  // Counts calculated from current view dataset
  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === "PENDING").length;
  }, [requests]);

  const completedCount = useMemo(() => {
    return requests.filter((r) => r.status === "COMPLETED").length;
  }, [requests]);

  const rejectedCount = useMemo(() => {
    return requests.filter((r) => r.status === "REJECTED").length;
  }, [requests]);

  // Approve action (enforces atomic autoCreditEnabled flip on first credit)
  const handleApprove = async (request: CreditRequestItem) => {
    setApprovingId(request.id);

    try {
      await approveCreditRequest(request.id);

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "COMPLETED",
                completedAt: new Date().toISOString(),
                reviewedAt: new Date().toISOString(),
              }
            : r
        )
      );

      showNotice(
        `Approved ₹${(request.amountPaise / 100).toFixed(0)} top-up for ${
          request.customer?.name || "Customer"
        }. Verified and credited.`,
        "success"
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showNotice(
          "Conflict: This request has already been processed by another administrator.",
          "error"
        );
      } else {
        const msg = err instanceof Error ? err.message : "Approval failed. Try again.";
        showNotice(msg, "error");
      }
      loadCreditRequests(currentPage, true);
    } finally {
      setApprovingId(null);
    }
  };

  // Rejection callback with automated refund feedback
  const handleRequestRejected = (
    updated: CreditRequestItem,
    refund?: RejectResponse["refund"]
  ) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );

    if (refund?.refundInitiated) {
      showNotice(
        "Top-up rejected. Online refund initiated to customer account.",
        "info"
      );
    } else if (refund && !refund.refundInitiated && refund.reason === "NO_REFUNDABLE_PAYMENT") {
      showNotice(
        "Cash top-up rejected. No online refund needed — reconcile cash offline.",
        "info"
      );
    } else {
      showNotice(
        "Top-up request rejected and marked as refund pending.",
        "info"
      );
    }
  };

  // Inspect Wallet Ledger Slide-over trigger
  const handleOpenWalletSheet = (userId: string) => {
    setInspectUserId(userId);
    setIsWalletSheetOpen(true);
  };

  // Status Badges with rich iconography and high contrast
  const renderStatusBadge = (status: CreditRequestStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-[#FFDF58] px-2.5 py-1 text-xs font-black uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]">
            <Clock className="h-3 w-3 stroke-[3]" />
            Pending Review
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-[#B8E8B8] px-2.5 py-1 text-xs font-black uppercase text-[#14532D] shadow-[1.5px_1.5px_0px_0px_#000000]">
            <CheckCircle2 className="h-3 w-3 stroke-[3]" />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-[#FFD9D0] px-2.5 py-1 text-xs font-black uppercase text-[#7F1D1D] shadow-[1.5px_1.5px_0px_0px_#000000]">
            <XCircle className="h-3 w-3 stroke-[3]" />
            Rejected
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-stone-200 px-2.5 py-1 text-xs font-bold uppercase text-stone-700 shadow-[1.5px_1.5px_0px_0px_#000000]">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-black bg-white px-2 py-0.5 text-xs font-bold uppercase text-black">
            {status}
          </span>
        );
    }
  };

  // Refund Status Badges
  const renderRefundBadge = (refundStatus: RefundStatus) => {
    switch (refundStatus) {
      case "REFUND_PENDING":
        return (
          <span
            title="Refund initiated; waiting for payment provider confirmation"
            className="inline-flex items-center gap-1 rounded-md border border-black bg-[#FFE58F] text-[#854D0E] font-mono text-[11px] font-bold px-2 py-0.5 shadow-[1px_1px_0px_0px_#000000]"
          >
            <RefreshCw className="h-2.5 w-2.5 stroke-[2.5]" />
            Refund Pending
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-black bg-[#D8CEF6] text-[#4C1D95] font-mono text-[11px] font-bold px-2 py-0.5 shadow-[1px_1px_0px_0px_#000000]">
            <Check className="h-2.5 w-2.5 stroke-[3]" />
            Refunded
          </span>
        );
      case "REFUND_FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-black bg-[#FFD9D0] text-[#991B1B] font-mono text-[11px] font-bold px-2 py-0.5 shadow-[1px_1px_0px_0px_#000000]">
            <AlertTriangle className="h-2.5 w-2.5 stroke-[3]" />
            Refund Failed
          </span>
        );
      case "NOT_REQUIRED":
      default:
        return (
          <span className="text-[11px] font-mono font-medium text-[#78716C]">
            —
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* ========================================================= */}
      {/* 1. PAGE HEADER                                            */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            Customer Wallets & Credit Management
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#5C5647] mt-0.5">
            Review and approve pending customer wallet top-ups and inspect account ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadCreditRequests(currentPage, true)}
            disabled={isRefreshing}
            aria-label="Sync credit requests from server"
            className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Syncing..." : "Sync Requests"}
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          role="alert"
          className={`flex items-center gap-2.5 rounded-[12px] border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#1A1A1A] animate-in fade-in slide-in-from-top-1 duration-200 ${
            notice.type === "success"
              ? "bg-[#B9E8B4] text-[#14532D]"
              : notice.type === "error"
              ? "bg-[#FFD9D0] text-[#7F1D1D]"
              : "bg-[#FFDF58] text-[#1A1A1A]"
          }`}
        >
          {notice.type === "success" && <CheckCircle2 className="h-4 w-4 stroke-[3] shrink-0" />}
          {notice.type === "error" && <AlertTriangle className="h-4 w-4 stroke-[3] shrink-0" />}
          {notice.type === "info" && <ShieldAlert className="h-4 w-4 stroke-[2.5] shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. STAT CARDS ROW (Pending Emphasized as Admin To-Do)      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stat 1: Pending Queue (EMPHASIZED TO-DO) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("PENDING");
            setCurrentPage(1);
          }}
          className={`text-left rounded-[14px] border-2 border-black p-4 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            statusFilter === "PENDING"
              ? "bg-[#FFDF58] shadow-[4px_4px_0px_0px_#000000] ring-2 ring-black ring-offset-1"
              : "bg-[#FFF9D6] hover:bg-[#FFDF58] shadow-[3px_3px_0px_0px_#000000]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black text-[#FFDF58] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFDF58] animate-pulse" />
              Your To-Do Queue
            </span>
            <Wallet className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-[#1A1A1A]">
                {statusFilter === "PENDING" ? requests.length : pendingCount}
              </span>
              <span className="text-xs font-bold text-[#1A1A1A]">pending</span>
            </div>
            <p className="text-[11px] font-bold text-[#423918] mt-0.5">
              Needs your verification & approval
            </p>
          </div>
        </button>

        {/* Stat 2: Completed / Approved */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("COMPLETED");
            setCurrentPage(1);
          }}
          className={`text-left rounded-[14px] border-2 border-black p-4 transition-all cursor-pointer flex flex-col justify-between ${
            statusFilter === "COMPLETED"
              ? "bg-[#D5F2D5] shadow-[4px_4px_0px_0px_#000000] ring-2 ring-black ring-offset-1"
              : "bg-white hover:bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#000000]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#14532D] bg-[#B8E8B8] border border-black/30 px-2 py-0.5 rounded-md">
              Approved
            </span>
            <CheckCircle2 className="h-4 w-4 text-[#14532D] stroke-[2.5]" />
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-[#1A1A1A]">
                {statusFilter === "COMPLETED" ? requests.length : completedCount}
              </span>
              <span className="text-xs font-bold text-[#5C5647]">credits</span>
            </div>
            <p className="text-[11px] font-bold text-[#5C5647] mt-0.5">
              Successfully added to balance
            </p>
          </div>
        </button>

        {/* Stat 3: Rejected */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("REJECTED");
            setCurrentPage(1);
          }}
          className={`text-left rounded-[14px] border-2 border-black p-4 transition-all cursor-pointer flex flex-col justify-between ${
            statusFilter === "REJECTED"
              ? "bg-[#FFE7E1] shadow-[4px_4px_0px_0px_#000000] ring-2 ring-black ring-offset-1"
              : "bg-white hover:bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#000000]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7F1D1D] bg-[#FFD9D0] border border-black/30 px-2 py-0.5 rounded-md">
              Rejected
            </span>
            <XCircle className="h-4 w-4 text-[#7F1D1D] stroke-[2.5]" />
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-[#1A1A1A]">
                {statusFilter === "REJECTED" ? requests.length : rejectedCount}
              </span>
              <span className="text-xs font-bold text-[#5C5647]">declined</span>
            </div>
            <p className="text-[11px] font-bold text-[#5C5647] mt-0.5">
              With auto-refund or cash reconcile
            </p>
          </div>
        </button>

        {/* Stat 4: Total Logged */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
          className={`text-left rounded-[14px] border-2 border-black p-4 transition-all cursor-pointer flex flex-col justify-between ${
            statusFilter === "ALL"
              ? "bg-[#FAF7EC] shadow-[4px_4px_0px_0px_#000000] ring-2 ring-black ring-offset-1"
              : "bg-white hover:bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#000000]"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] bg-stone-100 border border-black/30 px-2 py-0.5 rounded-md">
              Total Log
            </span>
            <SlidersHorizontal className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
          </div>

          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black text-[#1A1A1A]">
                {totalRequests}
              </span>
              <span className="text-xs font-bold text-[#5C5647]">requests</span>
            </div>
            <p className="text-[11px] font-bold text-[#5C5647] mt-0.5">
              Across all customer accounts
            </p>
          </div>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2b. PLAIN-LANGUAGE HOW-IT-WORKS GUIDE (Collapsible/Clean) */}
      {/* ========================================================= */}
      <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000000]">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FAF7EC] border border-black text-[#1A1A1A]">
              <HelpCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
              How wallet approvals work
            </h2>
          </div>
          <button
            type="button"
            aria-label={showGuide ? "Hide guide" : "Show guide"}
            className="text-[11px] font-bold text-[#5C5647] hover:text-[#1A1A1A] underline cursor-pointer"
          >
            {showGuide ? "Hide tips" : "Show tips"}
          </button>
        </div>

        {showGuide && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 border-t border-black/10 text-xs">
            <div className="flex items-start gap-2 bg-[#FAF7EC] p-2.5 rounded-[8px] border border-black/20">
              <span className="font-mono font-black text-xs bg-[#FFDF58] h-5 w-5 rounded flex items-center justify-center border border-black shrink-0 mt-0.5">
                1
              </span>
              <div>
                <span className="font-black text-[#1A1A1A] block">First-time top-ups</span>
                <span className="text-[11px] font-medium text-[#5C5647]">
                  Require your approval once to verify payment and unlock automatic future credits.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FAF7EC] p-2.5 rounded-[8px] border border-black/20">
              <span className="font-mono font-black text-xs bg-[#FFDF58] h-5 w-5 rounded flex items-center justify-center border border-black shrink-0 mt-0.5">
                2
              </span>
              <div>
                <span className="font-black text-[#1A1A1A] block">Cash top-ups</span>
                <span className="text-[11px] font-medium text-[#5C5647]">
                  Physical cash collections always require manual confirmation before funds are added.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FAF7EC] p-2.5 rounded-[8px] border border-black/20">
              <span className="font-mono font-black text-xs bg-[#FFDF58] h-5 w-5 rounded flex items-center justify-center border border-black shrink-0 mt-0.5">
                3
              </span>
              <div>
                <span className="font-black text-[#1A1A1A] block">Auto-refund on rejection</span>
                <span className="text-[11px] font-medium text-[#5C5647]">
                  Rejecting an online payment automatically initiates a full refund back to the customer.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. STATUS TABS & FILTER BAR                               */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-black p-4 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3.5">
        {/* Status Tabs Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: "PENDING", label: "Pending" },
                { key: "ALL", label: "All Requests" },
                { key: "COMPLETED", label: "Completed" },
                { key: "REJECTED", label: "Rejected" },
                { key: "CANCELLED", label: "Cancelled" },
              ] as const
            ).map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`rounded-[8px] border-2 border-black px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
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
                  {tab.key === "PENDING" && pendingCount > 0 && (
                    <span className="ml-1 rounded-full bg-black text-[#FFDF58] px-1.5 py-0.2 text-[10px] font-mono font-black">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Reset Filters button - Clean and Secondary */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              aria-label="Reset all search and date filters"
              className="cursor-pointer rounded-[8px] bg-[#FAF7EC] hover:bg-stone-200 border-2 border-black text-[#1A1A1A] font-black text-xs px-3 py-1.5 shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3 stroke-[2.5]" />
              Clear Filters
            </button>
          )}
        </div>

        {/* Search & Date Range Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Customer Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
            <Input
              placeholder="Search by customer name, phone, email, or request ID..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] placeholder:text-[#5C5647]/70"
            />
            {customerSearch && (
              <button
                type="button"
                onClick={() => setCustomerSearch("")}
                aria-label="Clear search input"
                className="absolute right-2.5 top-2.5 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Date Filter From */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
              From:
            </span>
            <div className="relative w-full">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
              />
            </div>
          </div>

          {/* Date Filter To */}
          <div className="md:col-span-3 flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
              To:
            </span>
            <div className="relative w-full">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. CREDIT REQUESTS TABLE                                  */}
      {/* ========================================================= */}
      <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3.5 px-4 border-r-2 border-black w-40">Request ID</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-right w-36">Amount</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-40">Status</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-36">Refund Status</th>
                <th className="py-3.5 px-4 border-r-2 border-black w-36">Created At</th>
                <th className="py-3.5 px-4 text-center w-44">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black bg-white">
              {isLoading && requests.length === 0 ? (
                // SKELETON LOADING STATE
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-5 bg-[#E5E0D8] rounded w-24" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-36 mb-1.5" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-24" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-right">
                      <div className="h-5 bg-[#E5E0D8] rounded w-20 ml-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-6 bg-[#E5E0D8] rounded-full w-28 mx-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-4 bg-[#E5E0D8] rounded w-16 mx-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-24 mb-1" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-16" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-7 bg-[#E5E0D8] rounded-[8px] w-28 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : loadError && requests.length === 0 ? (
                // ERROR RETRY STATE
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="flex justify-center">
                        <AlertTriangle className="h-8 w-8 text-[#FF8E72] stroke-[2.5]" />
                      </div>
                      <p className="text-sm font-black text-[#1A1A1A]">{loadError}</p>
                      <button
                        type="button"
                        onClick={() => loadCreditRequests(currentPage, true)}
                        className="rounded-[8px] border-2 border-black bg-[#FFDF58] px-4 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                // FRIENDLY EMPTY STATE
                <tr>
                  <td colSpan={7} className="py-14 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="flex justify-center">
                        {statusFilter === "PENDING" ? (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B8E8B8] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                            <CheckCircle2 className="h-6 w-6 text-[#14532D] stroke-[3]" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7EC] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                            <Wallet className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-tight text-[#1A1A1A]">
                          {statusFilter === "PENDING" && !hasActiveFilters
                            ? "All caught up! No pending requests"
                            : hasActiveFilters
                            ? "No matching requests found"
                            : "No credit requests recorded"}
                        </h3>
                        <p className="text-xs font-semibold text-[#5C5647]">
                          {statusFilter === "PENDING" && !hasActiveFilters
                            ? "All incoming customer wallet top-ups have been reviewed and processed."
                            : hasActiveFilters
                            ? "Try adjusting your search query, date range, or status filter."
                            : "There are currently no credit requests in this category."}
                        </p>
                      </div>

                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="rounded-[8px] border-2 border-black bg-[#FFDF58] px-4 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                          Clear Filters
                        </button>
                      ) : statusFilter === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter("ALL");
                            setCurrentPage(1);
                          }}
                          className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1.5"
                        >
                          View All Historical Requests
                          <ArrowRight className="h-3 w-3 stroke-[3]" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isPending = req.status === "PENDING";
                  const uuidSnippet =
                    req.id.length > 8 ? `${req.id.substring(0, 8)}...` : req.id;
                  const isCopied = copiedId === req.id;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-[#FAF7EC]/80 transition-colors group"
                    >
                      {/* REQUEST ID with Copy button */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-xs font-mono font-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                            title={`Full ID: ${req.id}`}
                          >
                            {uuidSnippet}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(e, req.id)}
                            title="Copy full Request ID"
                            aria-label={`Copy request ID ${req.id}`}
                            className="p-1 rounded text-[#5C5647] hover:text-[#1A1A1A] hover:bg-stone-200 cursor-pointer transition-colors"
                          >
                            {isCopied ? (
                              <CheckCheck className="h-3.5 w-3.5 text-green-700 stroke-[3]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 stroke-[2]" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* CUSTOMER PROFILE */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                req.customer?.id && handleOpenWalletSheet(req.customer.id)
                              }
                              className="font-black text-[#1A1A1A] text-xs hover:underline cursor-pointer text-left block"
                            >
                              {req.customer?.name || "Unknown Customer"}
                            </button>
                            <div className="text-[11px] font-mono font-bold text-[#5C5647]">
                              {req.customer?.mobile || "No mobile"}
                              {req.customer?.email ? ` • ${req.customer.email}` : ""}
                            </div>
                          </div>

                          {/* Inspect Wallet Ledger button */}
                          {req.customer?.id && (
                            <button
                              type="button"
                              onClick={() => handleOpenWalletSheet(req.customer.id)}
                              className="p-1.5 rounded-[6px] border border-black/30 bg-white hover:bg-[#FFDF58] text-[#1A1A1A] cursor-pointer shadow-[1px_1px_0px_0px_#000000] shrink-0"
                              title="Inspect customer wallet ledger"
                              aria-label={`Inspect wallet ledger for ${req.customer.name}`}
                            >
                              <ExternalLink className="h-3 w-3 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* AMOUNT (Right-aligned with clear currency symbol) */}
                      <td className="py-3.5 px-4 border-r-2 border-black font-mono font-black tabular-nums text-base text-right text-black align-middle">
                        {formatCurrency(req.amountPaise / 100)}
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        {renderStatusBadge(req.status)}
                      </td>

                      {/* REFUND STATUS */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        {renderRefundBadge(req.refundStatus)}
                      </td>

                      {/* CREATED AT */}
                      <td className="py-3.5 px-4 border-r-2 border-black font-mono text-xs text-[#1A1A1A] align-middle">
                        <div className="font-bold">{formatDate(req.createdAt)}</div>
                        <div className="text-[10px] text-[#5C5647]">
                          {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-2">
                            {/* APPROVE Button (Primary Action) */}
                            <button
                              type="button"
                              disabled={approvingId === req.id}
                              onClick={() => handleApprove(req)}
                              aria-label={`Approve request ${req.id}`}
                              className="rounded-[8px] border-2 border-black bg-[#B8E8B8] hover:bg-[#9fe09f] font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 text-[#14532D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
                            >
                              {approvingId === req.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin stroke-[3]" />
                              ) : (
                                <Check className="h-3 w-3 stroke-[3]" />
                              )}
                              Approve
                            </button>

                            {/* REJECT Button (Secondary Action) */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForReject(req);
                                setIsRejectOpen(true);
                              }}
                              aria-label={`Reject request ${req.id}`}
                              className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FFD9D0] font-black text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#7F1D1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                            >
                              <X className="h-3 w-3 stroke-[3]" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedForDetail(req.id);
                              setIsDetailOpen(true);
                            }}
                            aria-label={`View audit details for request ${req.id}`}
                            className="rounded-[8px] bg-white hover:bg-[#FFDF58] font-black text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                          >
                            <Eye className="h-3 w-3 stroke-[2.5]" />
                            <span>Details</span>
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

        {/* Pagination Strip */}
        <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Showing <strong className="font-mono">{requests.length}</strong> of{" "}
            <strong className="font-mono">{totalRequests}</strong> credit requests
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                const prev = currentPage - 1;
                setCurrentPage(prev);
                loadCreditRequests(prev, false);
              }}
              aria-label="Previous page"
              className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              <ChevronLeft className="h-3 w-3 stroke-[3]" />
              Prev
            </button>

            <span className="font-mono text-xs font-black px-2">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => {
                const next = currentPage + 1;
                setCurrentPage(next);
                loadCreditRequests(next, false);
              }}
              aria-label="Next page"
              className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Next
              <ChevronRight className="h-3 w-3 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. MODALS & SHEETS                                        */}
      {/* ========================================================= */}
      {/* Reject Modal */}
      <RejectRequestModal
        request={selectedForReject}
        isOpen={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setSelectedForReject(null);
        }}
        onRejected={handleRequestRejected}
      />

      {/* Credit Request Detail Modal */}
      <CreditRequestDetailModal
        requestId={selectedForDetail}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedForDetail(null);
        }}
        onRequestInspectWallet={(userId) => {
          handleOpenWalletSheet(userId);
        }}
      />

      {/* Customer Wallet Ledger Slide-Over Sheet */}
      <CustomerWalletSheet
        userId={inspectUserId}
        isOpen={isWalletSheetOpen}
        onClose={() => {
          setIsWalletSheetOpen(false);
          setInspectUserId(null);
        }}
      />
    </div>
  );
}
