"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlanConfig,
  PlanType,
  RequestType,
  RequestStatus,
  ChangeRequestItem,
  ChangeRequestsApiResponse,
} from "@/types/plan-delivery";
import {
  getAllPlans,
  updatePlanConfig,
  fetchChangeRequests,
  approveChangeRequest,
  DEFAULT_PLANS,
} from "@/services/plan-delivery-service";
import { RejectRequestModal } from "@/components/plans/reject-request-modal";
import { EditPlanModal } from "@/components/plans/edit-plan-modal";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Edit2,
  Check,
  X,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

type TabMode = "REQUESTS" | "PLANS";

export default function PlansAndDeliveryPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<TabMode>("REQUESTS");

  // Global Toast / Notice State
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotice = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  // ==========================================
  // TAB 1: DELIVERY CHANGE REQUESTS STATE
  // ==========================================
  const [requests, setRequests] = useState<ChangeRequestItem[]>([]);
  const [requestsLoading, setRequestsLoading] = useState<boolean>(true);
  const [isRefreshingRequests, setIsRefreshingRequests] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("PENDING");
  const [typeFilter, setTypeFilter] = useState<RequestType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRequests, setTotalRequests] = useState<number>(0);

  // In-flight action IDs
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] =
    useState<ChangeRequestItem | null>(null);

  // ==========================================
  // TAB 2: PLAN CONFIGURATIONS STATE
  // ==========================================
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [isRefreshingPlans, setIsRefreshingPlans] = useState<boolean>(false);

  // Edit Plan Modal State
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [selectedPlanForEdit, setSelectedPlanForEdit] = useState<PlanConfig | null>(null);

  // Debounce customer search (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ==========================================
  // DATA FETCHING: CHANGE REQUESTS
  // ==========================================
  const fetchRequestsData = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshingRequests(true);

      try {
        const response: ChangeRequestsApiResponse = await fetchChangeRequests(
          {
            page: pageToLoad,
            limit: 20,
            status: statusFilter !== "ALL" ? statusFilter : undefined,
            requestType: typeFilter !== "ALL" ? typeFilter : undefined,
          },
          {
            forceRefresh,
            onFreshData: (fresh) => {
              if (fresh && Array.isArray(fresh.data)) {
                setRequests(fresh.data);
                setTotalPages(fresh.pagination?.totalPages || 1);
                setTotalRequests(fresh.pagination?.total || fresh.data.length);
                setRequestsLoading(false);
              }
            },
          }
        );

        if (response && Array.isArray(response.data)) {
          setRequests(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalRequests(response.pagination?.total || response.data.length);
        }
      } catch (err: unknown) {
        console.error("Error fetching change requests:", err);
        const msg = err instanceof Error ? err.message : "Failed to load change requests.";
        showNotice(msg, "error");
      } finally {
        setRequestsLoading(false);
        setIsRefreshingRequests(false);
      }
    },
    [statusFilter, typeFilter]
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchRequestsData(1, false);
  }, [fetchRequestsData]);

  // ==========================================
  // DATA FETCHING: PLAN CONFIGURATIONS
  // ==========================================
  const fetchPlansData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshingPlans(true);

    try {
      const data = await getAllPlans({
        forceRefresh,
        onFreshData: (fresh) => {
          if (Array.isArray(fresh) && fresh.length > 0) {
            setPlans(fresh);
            setPlansLoading(false);
          }
        },
      });

      if (Array.isArray(data) && data.length > 0) {
        setPlans(data);
      }
    } catch (err: unknown) {
      console.error("Error fetching plan configs:", err);
      showNotice("Using default plan configurations while offline.", "info");
    } finally {
      setPlansLoading(false);
      setIsRefreshingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchPlansData(false);
  }, [fetchPlansData]);

  // Filtered requests by debounced search
  const filteredRequests = useMemo(() => {
    if (!debouncedSearch) return requests;
    const q = debouncedSearch.toLowerCase();
    return requests.filter(
      (item) =>
        item.customer?.name?.toLowerCase().includes(q) ||
        item.customer?.mobile?.toLowerCase().includes(q) ||
        item.customer?.email?.toLowerCase().includes(q) ||
        item.requestType?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q)
    );
  }, [requests, debouncedSearch]);

  // Pending count metric
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "PENDING").length;
  }, [requests]);

  // ==========================================
  // HANDLERS: CHANGE REQUEST APPROVAL
  // ==========================================
  const handleApprove = async (request: ChangeRequestItem) => {
    setApprovingId(request.id);
    try {
      await approveChangeRequest(request.id);

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? {
                ...r,
                status: "APPROVED",
                reviewedAt: new Date().toISOString(),
              }
            : r
        )
      );

      showNotice(
        `Successfully approved ${request.requestType.replace(/_/g, " ")} request for ${
          request.customer?.name || "customer"
        }.`,
        "success"
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showNotice(
          "Conflict: This request has already been reviewed or status changed.",
          "error"
        );
      } else {
        const msg = err instanceof Error ? err.message : "Approval failed. Try again.";
        showNotice(msg, "error");
      }
      fetchRequestsData(currentPage, true);
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenRejectModal = (request: ChangeRequestItem) => {
    setSelectedRequestForReject(request);
    setIsRejectModalOpen(true);
  };

  const handleOpenEditPlanModal = (plan: PlanConfig) => {
    setSelectedPlanForEdit(plan);
    setIsEditPlanModalOpen(true);
  };

  const handleTogglePlanActive = async (plan: PlanConfig) => {
    const nextState = !plan.isActive;

    // Optimistic toggle
    setPlans((prev) =>
      prev.map((p) => (p.type === plan.type ? { ...p, isActive: nextState } : p))
    );

    try {
      await updatePlanConfig(plan.type, { isActive: nextState });
      showNotice(
        `${plan.type.replace(/_/g, " ")} plan is now ${nextState ? "ACTIVE" : "INACTIVE"}.`,
        "success"
      );
    } catch (err: unknown) {
      // Rollback
      setPlans((prev) =>
        prev.map((p) => (p.type === plan.type ? { ...p, isActive: !nextState } : p))
      );
      const msg = err instanceof Error ? err.message : "Failed to update plan status.";
      showNotice(msg, "error");
    }
  };

  // ==========================================
  // CONFIGURATION DISPLAY FORMATTER
  // ==========================================
  const formatConfiguration = (
    config: Record<string, any> | null | undefined,
    type: RequestType
  ): { main: string; meta?: string } => {
    if (!config || Object.keys(config).length === 0) {
      return { main: "Standard Default" };
    }

    // Pause / Resume
    if (type === "PAUSE" || type === "RESUME") {
      const from = config.startDate || config.pauseStartDate || config.from;
      const to = config.endDate || config.pauseEndDate || config.to || config.resumeDate;
      if (from && to) return { main: `Pause: ${from} ➔ ${to}` };
      if (from) return { main: `Effective: ${from}` };
      if (to) return { main: `Resume Date: ${to}` };
      return { main: "Date Range Scheduled" };
    }

    if (type === "SKIP") {
      const date = config.skipDate || config.date;
      return {
        main: date ? `Skip delivery on ${date}` : "Single Day Skip",
      };
    }

    // Change quantity
    if (type === "CHANGE_QUANTITY") {
      const qty = config.quantity ?? config.liters ?? config.qty;
      const effective = config.effectiveDate || config.startDate;
      return {
        main: qty ? `${qty} Litre${Number(qty) > 1 ? "s" : ""}` : "Adjust Volume",
        meta: effective ? `Eff: ${effective}` : undefined,
      };
    }

    // Change schedule / frequency
    if (type === "CHANGE_SCHEDULE") {
      const freq = config.frequency || config.schedule || config.cadence;
      const time = config.timeWindow || config.deliveryWindow;
      const effective = config.effectiveDate || config.startDate;
      return {
        main: freq ? `${String(freq).replace(/_/g, " ")}` : "Schedule Shift",
        meta: time
          ? `${time}${effective ? ` • Eff: ${effective}` : ""}`
          : effective
          ? `Eff: ${effective}`
          : undefined,
      };
    }

    // Fallback display
    const parts = Object.entries(config)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${v}`);
    return { main: parts.join(" • ") || "Configured" };
  };

  // Helper for type badge colors
  const getTypeBadgeClass = (type: RequestType) => {
    switch (type) {
      case "PAUSE":
      case "SKIP":
        return "bg-[#FF8E72] text-[#1A1A1A] border border-black font-mono font-bold text-xs";
      case "RESUME":
        return "bg-[#B8E8B8] text-[#1A1A1A] border border-black font-mono font-bold text-xs";
      case "CHANGE_QUANTITY":
      case "CHANGE_SCHEDULE":
        return "bg-[#D8CEF6] text-[#1A1A1A] border border-black font-mono font-bold text-xs";
      default:
        return "bg-white text-[#1A1A1A] border border-black font-mono text-xs";
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & MAIN TAB BAR                              */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            Plans & Subscriptions
          </h1>
          <p className="text-xs font-bold text-[#5C5647]">
            Configure operational plan rules, pricing & manage live customer delivery modification requests.
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-2 bg-[#FAF7EC] p-1.5 rounded-[12px] border-2 border-black shadow-[3px_3px_0px_0px_#1A1A1A]">
          <button
            type="button"
            onClick={() => setActiveTab("REQUESTS")}
            className={`rounded-[8px] px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "REQUESTS"
                ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A] hover:bg-white/80"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Customer Change Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-[10px] font-mono font-black text-[#FFD84D]">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PLANS")}
            className={`rounded-[8px] px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "PLANS"
                ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A] hover:bg-white/80"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Plan Pricing & Configuration</span>
          </button>
        </div>
      </div>

      {/* Global Notification Toast */}
      {notice && (
        <div
          className={`flex items-center gap-2 rounded-[10px] border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#1A1A1A] ${
            notice.type === "success"
              ? "bg-[#B9E8B4] text-[#1A1A1A]"
              : notice.type === "error"
              ? "bg-[#FFD9D0] text-[#1A1A1A]"
              : "bg-[#FFDF58] text-[#1A1A1A]"
          }`}
        >
          {notice.type === "success" && <CheckCircle2 className="h-4 w-4 stroke-[3]" />}
          {notice.type === "error" && <AlertTriangle className="h-4 w-4 stroke-[3]" />}
          {notice.type === "info" && <Info className="h-4 w-4 stroke-[3]" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Operational Top Notice Card */}
      <div className="bg-[#FFFDF7] border-2 border-black p-3.5 rounded-[12px] shadow-[3px_3px_0px_0px_#000000] mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A]">
          <span className="text-base">ℹ️</span>
          <span>
            <strong>PREPAID PLAN ARCHITECTURE:</strong> All subscriptions are paid via customer wallet balance or confirmed cash. Approving delivery changes adjusts shipment schedules only with no monetary charge.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#FFDF58] border border-black font-mono font-bold text-xs px-2.5 py-1 rounded-[6px] shadow-[1px_1px_0px_0px_#000000]">
            {pendingRequestsCount} Pending Requests
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CUSTOMER DELIVERY CHANGE REQUESTS                  */}
      {/* ========================================================= */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Status Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const).map(
                  (st) => (
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
                      {st === "ALL" ? "All Statuses" : st}
                    </button>
                  )
                )}
              </div>

              {/* Request Type Dropdown & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as RequestType | "ALL")}
                  className="rounded-[8px] border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer h-9"
                >
                  <option value="ALL">All Request Types</option>
                  <option value="PAUSE">PAUSE</option>
                  <option value="RESUME">RESUME</option>
                  <option value="SKIP">SKIP SINGLE DAY</option>
                  <option value="CHANGE_QUANTITY">CHANGE QUANTITY</option>
                  <option value="CHANGE_SCHEDULE">CHANGE SCHEDULE</option>
                </select>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                  <Input
                    placeholder="Search name, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs font-bold border-2 border-black rounded-[8px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("PENDING");
                    setTypeFilter("ALL");
                    setSearchQuery("");
                  }}
                  className="rounded-[8px] border-2 border-black bg-[#FF8E72] hover:bg-[#ff7b5a] text-[#1A1A1A] font-black text-xs px-3 h-9 shadow-[2px_2px_0px_0px_#000000] cursor-pointer inline-flex items-center gap-1"
                  title="Reset Filters"
                >
                  <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* High-Contrast Requests Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Request Type</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Current Configuration</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Requested Change</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Submitted</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {requestsLoading && requests.length === 0 ? (
                    // Skeleton pulse
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded w-24" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-32" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-32" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-20" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded w-28 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-14 text-center font-bold text-xs uppercase text-[#5C5647]"
                      >
                        No delivery change requests match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isPending = req.status === "PENDING";
                      const currentParsed = formatConfiguration(
                        req.currentConfiguration,
                        req.requestType
                      );
                      const requestedParsed = formatConfiguration(
                        req.requestedConfiguration,
                        req.requestType
                      );

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-[#FAF7EC]/80 transition-colors"
                        >
                          {/* Customer */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-black text-[#1A1A1A] text-xs">
                              {req.customer?.name || "Customer"}
                            </div>
                            <div className="text-xs font-mono text-[#5C5647]">
                              {req.customer?.mobile || "No phone"}
                            </div>
                          </td>

                          {/* Request Type */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <span
                              className={`inline-block rounded-[6px] px-2.5 py-0.5 uppercase tracking-wider ${getTypeBadgeClass(
                                req.requestType
                              )}`}
                            >
                              {req.requestType.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Current Configuration */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle text-xs">
                            <div className="font-bold text-[#1A1A1A]">
                              {currentParsed.main}
                            </div>
                            {currentParsed.meta && (
                              <div className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                                {currentParsed.meta}
                              </div>
                            )}
                          </td>

                          {/* Requested Change */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle text-xs">
                            <div className="font-black text-[#1A1A1A] flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 shrink-0 stroke-[2.5]" />
                              <span>{requestedParsed.main}</span>
                            </div>
                            {requestedParsed.meta && (
                              <div className="text-[10px] font-mono text-[#5C5647] mt-0.5 pl-4">
                                {requestedParsed.meta}
                              </div>
                            )}
                          </td>

                          {/* Submitted */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-mono text-xs font-bold text-[#1A1A1A]">
                              {formatDate(req.createdAt)}
                            </div>
                          </td>

                          {/* Actions */}
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
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FF8E72] font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A]"
                                >
                                  <X className="h-3 w-3 stroke-[3]" />
                                  Reject
                                </button>
                              </div>
                            ) : req.status === "APPROVED" ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="rounded-[6px] border border-black bg-[#B8E8B8] px-2.5 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                                  APPROVED
                                </span>
                                {req.reviewedAt && (
                                  <span className="text-[9px] font-mono text-[#5C5647] mt-1">
                                    {formatDate(req.reviewedAt)}
                                  </span>
                                )}
                              </div>
                            ) : req.status === "REJECTED" ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="rounded-[6px] border border-black bg-[#FF8E72] px-2.5 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                                  REJECTED
                                </span>
                                {req.adminNote && (
                                  <div
                                    className="max-w-[170px] truncate text-[10px] font-bold text-[#1A1A1A] bg-[#FAF7EC] px-1.5 py-0.5 rounded border border-black/40 mt-1"
                                    title={req.adminNote}
                                  >
                                    Note: {req.adminNote}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="rounded-[6px] border border-black bg-[#E5E0D8] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                                {req.status}
                              </span>
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
                Showing <strong className="font-mono">{filteredRequests.length}</strong> of{" "}
                <strong className="font-mono">{totalRequests || filteredRequests.length}</strong>{" "}
                change requests
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || requestsLoading}
                  onClick={() => {
                    const prev = currentPage - 1;
                    setCurrentPage(prev);
                    fetchRequestsData(prev, false);
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
                  disabled={currentPage >= totalPages || requestsLoading}
                  onClick={() => {
                    const next = currentPage + 1;
                    setCurrentPage(next);
                    fetchRequestsData(next, false);
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
      {/* TAB 2: PLAN CATALOG & PRICING CONFIGURATION              */}
      {/* ========================================================= */}
      {activeTab === "PLANS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Fixed System Plans Catalog
              </h2>
              <p className="text-xs font-bold text-[#5C5647]">
                Live delivery pricing, litre thresholds, and active schedule toggles across Raipur.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchPlansData(true)}
              disabled={isRefreshingPlans}
              className="cursor-pointer px-3 py-1.5 bg-white text-[#1A1A1A] hover:bg-[#FAF7EC] rounded-[10px] border-2 border-black shadow-[2px_2px_0px_0px_#000000] text-xs font-black uppercase flex items-center gap-1.5 transition-all"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingPlans ? "animate-spin" : ""
                }`}
              />
              Sync Plans
            </button>
          </div>

          {/* 3-Column Plan Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plansLoading && plans.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border-2 border-black bg-white rounded-[14px] p-6 shadow-[4px_4px_0px_0px_#000000] animate-pulse space-y-4"
                >
                  <div className="h-6 bg-[#E5E0D8] rounded w-32" />
                  <div className="h-10 bg-[#E5E0D8] rounded w-24" />
                  <div className="space-y-2">
                    <div className="h-4 bg-[#E5E0D8]/60 rounded" />
                    <div className="h-4 bg-[#E5E0D8]/60 rounded" />
                    <div className="h-4 bg-[#E5E0D8]/60 rounded" />
                  </div>
                  <div className="h-10 bg-[#E5E0D8] rounded w-full" />
                </div>
              ))
            ) : (
              plans.map((plan) => {
                const isBuyOnce = plan.type === "BUY_ONCE";
                const isSevenDay = plan.type === "SEVEN_DAY_TRIAL";
                const isMonthly = plan.type === "MONTHLY";

                const badgeBg = isBuyOnce
                  ? "bg-[#FFDF58]"
                  : isSevenDay
                  ? "bg-[#D8CEF6]"
                  : "bg-[#B8E8B8]";

                const badgeLabel = isBuyOnce
                  ? "BUY ONCE TRIAL"
                  : isSevenDay
                  ? "7-DAY INTRO TRIAL"
                  : "MONTHLY RECURRING";

                return (
                  <div
                    key={plan.type}
                    className={`border-2 border-black rounded-[14px] p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between transition-all ${
                      plan.isActive ? "bg-white" : "bg-[#FAF7EC]/60 opacity-80"
                    }`}
                  >
                    <div>
                      {/* Top Header: Badge + Active Toggle */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span
                          className={`rounded-[6px] border border-black font-mono text-[11px] font-bold px-2 py-0.5 ${badgeBg}`}
                        >
                          {badgeLabel}
                        </span>

                        {/* Inline Active Switch */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlanActive(plan)}
                          className={`cursor-pointer rounded-full border-2 border-black px-2.5 py-0.5 text-[10px] font-mono font-black transition-all ${
                            plan.isActive
                              ? "bg-[#B8E8B8] text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                              : "bg-[#FFD9D0] text-[#1A1A1A]"
                          }`}
                        >
                          {plan.isActive ? "ACTIVE" : "INACTIVE"}
                        </button>
                      </div>

                      {/* Pricing Display */}
                      <div className="border-b-2 border-black pb-4 mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black font-mono text-[#1A1A1A]">
                            ₹{Math.round(plan.sellingPricePerLitre / 100)}
                          </span>
                          <span className="text-xs font-bold text-[#5C5647]">/ Litre</span>
                        </div>
                        <div className="text-[11px] font-mono text-[#5C5647] line-through mt-0.5">
                          Base actual: ₹{Math.round(plan.actualPricePerLitre / 100)}/L
                        </div>
                      </div>

                      {/* Allowed Litres & Delivery Window */}
                      <div className="space-y-2.5 text-xs font-bold text-[#1A1A1A] mb-5">
                        <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                          <span className="text-[#5C5647] flex items-center gap-1">
                            <SlidersHorizontal className="h-3 w-3 stroke-[2.5]" />
                            Volume Limits:
                          </span>
                          <span className="font-mono font-black">
                            Min: {plan.quantityMin}L • Max: {plan.quantityMax}L
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                          <span className="text-[#5C5647] flex items-center gap-1">
                            <Clock className="h-3 w-3 stroke-[2.5]" />
                            Delivery Window:
                          </span>
                          <span className="font-mono font-black">
                            {plan.deliveryStartTime} - {plan.deliveryEndTime}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                          <span className="text-[#5C5647]">Delivery Fee:</span>
                          <span className="font-mono font-black">
                            {plan.deliveryFeePaise === 0
                              ? "FREE (₹0)"
                              : `₹${Math.round(plan.deliveryFeePaise / 100)}`}
                          </span>
                        </div>

                        {/* Plan-specific properties */}
                        {isBuyOnce && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[#5C5647]">Max Usages:</span>
                            <span className="font-mono font-black bg-[#FFDF58] px-2 py-0.5 rounded border border-black">
                              {plan.maxUsages || 3} orders per customer
                            </span>
                          </div>
                        )}

                        {isSevenDay && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[#5C5647]">Parameters:</span>
                            <span className="font-mono font-black bg-[#D8CEF6] px-2 py-0.5 rounded border border-black">
                              Duration: 7 Days | Max Usages: 1 (Fixed)
                            </span>
                          </div>
                        )}

                        {isMonthly && (
                          <div className="pt-2 space-y-2">
                            <div>
                              <span className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                                Allowed Frequencies:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.dailyEnabled !== false
                                      ? "bg-[#B8E8B8]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Daily
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.alternateDaysEnabled !== false
                                      ? "bg-[#B8E8B8]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Alternate Days
                                </span>
                              </div>
                            </div>

                            <div className="pt-1">
                              <span className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                                Allowed Quantity Modes:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.fixedQuantityEnabled !== false
                                      ? "bg-[#D8CEF6]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Fixed Quantity
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.alternatingQuantityEnabled !== false
                                      ? "bg-[#D8CEF6]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Alternating (Qty A / Qty B)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditPlanModal(plan)}
                      className="w-full mt-4 rounded-[10px] border-2 border-black bg-[#FFD84D] hover:bg-[#fcd033] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5 stroke-[2.5]" />
                      Edit Configuration
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS                                                    */}
      {/* ========================================================= */}

      {/* Reject Subscription Change Request Modal */}
      <RejectRequestModal
        request={selectedRequestForReject}
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedRequestForReject(null);
        }}
        onSuccess={(updated) => {
          setRequests((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
          );
          showNotice("Subscription change request rejected with reason note.");
        }}
      />

      {/* Edit Plan Modal */}
      <EditPlanModal
        plan={selectedPlanForEdit}
        isOpen={isEditPlanModalOpen}
        onClose={() => {
          setIsEditPlanModalOpen(false);
          setSelectedPlanForEdit(null);
        }}
        onSuccess={(updated) => {
          setPlans((prev) =>
            prev.map((p) => (p.type === updated.type ? { ...p, ...updated } : p))
          );
          showNotice(`Plan configuration for ${updated.type} saved successfully!`);
        }}
      />
    </div>
  );
}
