"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CreditRequestItem,
  CreditRequestStatus,
  CreditRequestsApiResponse,
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
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  User,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

export default function WalletPage() {
  const [requests, setRequests] = useState<CreditRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
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

  // Debounce customer search (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // Load credit requests with SWR caching
  const loadCreditRequests = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);

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
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [statusFilter, debouncedCustomerSearch, startDate, endDate]
  );

  useEffect(() => {
    setCurrentPage(1);
    loadCreditRequests(1, false);
  }, [loadCreditRequests]);

  const handleResetFilters = () => {
    setCustomerSearch("");
    setDebouncedCustomerSearch("");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Approve action
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
        `Approved ₹${(request.amountPaise / 100).toFixed(0)} credit for ${
          request.customer?.name || "customer"
        }.`,
        "success"
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showNotice(
          "Conflict: This credit request has already been processed by an administrator.",
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

  // Rejection callback
  const handleRequestRejected = (updated: CreditRequestItem) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
    showNotice(
      `Credit request rejected and flagged as REFUND_PENDING.`,
      "info"
    );
  };

  // Inspect Wallet Ledger Slide-over trigger
  const handleOpenWalletSheet = (userId: string) => {
    setInspectUserId(userId);
    setIsWalletSheetOpen(true);
  };

  // Status Badges
  const getStatusBadge = (status: CreditRequestStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-[#B8E8B8] border border-black text-black font-mono font-bold text-xs";
      case "REJECTED":
        return "bg-[#FF8E72] border border-black text-black font-mono font-bold text-xs";
      case "PENDING":
        return "bg-[#D8CEF6] border border-black text-black font-mono font-bold text-xs";
      default:
        return "bg-white border border-black text-black font-mono font-bold text-xs";
    }
  };

  // Pending Count Metric
  const pendingCount = useMemo(() => {
    return requests.filter((r) => r.status === "PENDING").length;
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & SYNC ACTION                               */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black leading-tight">
            Customer Wallets & Credit Management
          </h1>
          <p className="text-xs font-bold text-[#5C5647]">
            Review incoming prepaid wallet credit requests, approve float recharges, and inspect customer ledgers.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadCreditRequests(currentPage, true)}
          disabled={isRefreshing}
          className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin" : ""}`} />
          Sync Requests
        </button>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 rounded-[10px] border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#1A1A1A] animate-in fade-in duration-200 ${
            notice.type === "success"
              ? "bg-[#B9E8B4] text-[#1A1A1A]"
              : notice.type === "error"
              ? "bg-[#FFD9D0] text-[#1A1A1A]"
              : "bg-[#FFDF58] text-[#1A1A1A]"
          }`}
        >
          {notice.type === "success" && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
          {notice.type === "error" && <AlertTriangle className="h-4 w-4 stroke-[3]" />}
          {notice.type === "info" && <ShieldAlert className="h-4 w-4 stroke-[2.5]" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. OPERATIONAL BANNER STRIP                                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Pending Requests Metric */}
        <div className="rounded-[12px] bg-[#FFDF58] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
              Pending Credit Requests
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                {pendingCount}
              </span>
              <span className="text-[10px] font-bold text-[#1A1A1A] uppercase bg-black/10 px-2 py-0.5 rounded-[4px]">
                Awaiting Admin Verification
              </span>
            </div>
          </div>
          <Wallet className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
        </div>

        {/* Auto-Credit System Status */}
        <div className="rounded-[12px] bg-[#FFFDF7] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647] block">
              Automation Safeguards
            </span>
            <div className="text-xs font-black uppercase text-[#1A1A1A] mt-1">
              Auto-Credit: <span className="text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-black/30">DISABLED</span>
            </div>
            <p className="text-[10px] font-bold text-[#5C5647] mt-1">
              Manual bank/UPI validation enforced
            </p>
          </div>
          <ShieldCheck className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
        </div>

        {/* Total Ledger Float Status */}
        <div className="rounded-[12px] bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647] block">
              Audited Request Records
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                {totalRequests}
              </span>
              <span className="text-[10px] font-mono text-[#5C5647]">
                Total Requests
              </span>
            </div>
          </div>
          <Clock className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. INTERACTIVE MULTI-FILTER CARD                          */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-black p-4 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["ALL", "PENDING", "COMPLETED", "REJECTED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-[8px] border-2 border-black px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]"
                }`}
              >
                {st === "ALL" ? "All Requests" : st}
              </button>
            ))}
          </div>

          {/* Reset Filters button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="cursor-pointer rounded-[8px] bg-[#FF8E72] hover:bg-[#ff7b5a] border-2 border-black text-[#1A1A1A] font-black text-[11px] uppercase px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 self-start sm:self-auto"
          >
            <RotateCcw className="h-3 w-3 stroke-[2.5]" />
            Reset Filters
          </button>
        </div>

        {/* Row 2: Search input & Date filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
            <Input
              placeholder="Search Name, Phone, Email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
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
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
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
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
            />
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
                <th className="py-3.5 px-4 border-r-2 border-black">Request ID</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Amount</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center">Status</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center">Refund Status</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Created At</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black bg-white">
              {isLoading && requests.length === 0 ? (
                // Skeleton loading state
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-5 bg-[#E5E0D8] rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1.5" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-5 bg-[#E5E0D8] rounded w-16" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-6 bg-[#E5E0D8] rounded w-20 mx-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-4 bg-[#E5E0D8] rounded w-20 mx-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-24" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-7 bg-[#E5E0D8] rounded w-28 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center font-bold text-xs uppercase text-[#5C5647]"
                  >
                    No wallet credit requests match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isPending = req.status === "PENDING";
                  const uuidSnippet = req.id.length > 8 ? `${req.id.substring(0, 8)}...` : req.id;

                  return (
                    <tr key={req.id} className="hover:bg-[#FAF7EC]/80 transition-colors">
                      {/* REQUEST ID */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <span
                          className="rounded-[6px] border border-black bg-white px-2 py-0.5 text-xs font-mono font-bold text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000] inline-block"
                          title={req.id}
                        >
                          {uuidSnippet}
                        </span>
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="flex items-center justify-between gap-1">
                          <div>
                            <button
                              type="button"
                              onClick={() => req.customer?.id && handleOpenWalletSheet(req.customer.id)}
                              className="font-black text-[#1A1A1A] text-xs hover:underline cursor-pointer text-left"
                            >
                              {req.customer?.name || "Customer"}
                            </button>
                            <div className="text-[11px] font-mono font-bold text-[#5C5647]">
                              {req.customer?.mobile || "No phone"}
                            </div>
                          </div>

                          {/* Quick Inspect Wallet icon */}
                          {req.customer?.id && (
                            <button
                              type="button"
                              onClick={() => handleOpenWalletSheet(req.customer.id)}
                              className="p-1 rounded text-[#5C5647] hover:text-black hover:bg-[#FAF7EC] cursor-pointer"
                              title="Inspect Customer Wallet Ledger"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="py-3.5 px-4 border-r-2 border-black font-mono font-black tabular-nums text-base text-black align-middle">
                        {formatCurrency(req.amountPaise / 100)}
                      </td>

                      {/* STATUS BADGES */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        <span className={`inline-block rounded-[6px] px-2.5 py-0.5 uppercase tracking-wider ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                      </td>

                      {/* REFUND STATUS */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        {req.refundStatus !== "NOT_REQUIRED" ? (
                          <span className="rounded-[4px] border border-black bg-amber-100 text-amber-900 font-mono text-[11px] font-bold px-1.5 py-0.5 inline-block">
                            {req.refundStatus}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#5C5647]">None</span>
                        )}
                      </td>

                      {/* CREATED AT */}
                      <td className="py-3.5 px-4 border-r-2 border-black font-mono text-xs text-[#1A1A1A] align-middle">
                        <div>{formatDate(req.createdAt)}</div>
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
                          <div className="flex items-center justify-center gap-1.5">
                            {/* APPROVE Button */}
                            <button
                              type="button"
                              disabled={approvingId === req.id}
                              onClick={() => handleApprove(req)}
                              className="rounded-[8px] border-2 border-black bg-[#B8E8B8] hover:bg-[#9fe09f] font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A]"
                            >
                              {approvingId === req.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin stroke-[2.5]" />
                              ) : (
                                <Check className="h-3 w-3 stroke-[3]" />
                              )}
                              Approve
                            </button>

                            {/* REJECT Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedForReject(req);
                                setIsRejectOpen(true);
                              }}
                              className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FF8E72] font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A]"
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
                            className="rounded-[8px] bg-[#FFDF58] hover:bg-[#fcd033] font-bold text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A]"
                          >
                            <span>View Details</span>
                            <ArrowRight className="h-3 w-3 stroke-[2.5]" />
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
              className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft className="h-3 w-3 stroke-[3]" />
              Prev
            </button>

            <span className="font-mono text-xs font-black px-2">
              {currentPage} / {totalPages || 1}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => {
                const next = currentPage + 1;
                setCurrentPage(next);
                loadCreditRequests(next, false);
              }}
              className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
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
