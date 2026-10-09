"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CustomerSubscriptionItem,
  CustomerSubscriptionsApiResponse,
  PlanConfig,
  PlanType,
  RequestType,
  RequestStatus,
  ChangeRequestItem,
  ChangeRequestsApiResponse,
} from "@/types/plan-delivery";
import {
  getAllPlans,
  fetchAdminSubscriptions,
  updatePlanConfig,
  fetchChangeRequests,
  approveChangeRequest,
  DEFAULT_PLANS,
} from "@/services/plan-delivery-service";
import { RejectRequestModal } from "@/components/plans/reject-request-modal";
import { EditPlanModal } from "@/components/plans/edit-plan-modal";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Milk,
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
  PauseCircle,
  PlayCircle,
  SkipForward,
  Scale,
  CalendarRange,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";

type TabMode = "SUBSCRIPTIONS" | "REQUESTS" | "PLANS";

export default function PlansAndDeliveryPage() {
  // Navigation tabs
    const [activeTab, setActiveTab] = useState<TabMode>("SUBSCRIPTIONS");

  // ==========================================
  // TAB 0: CUSTOMER SUBSCRIPTIONS STATE
  // ==========================================
  const [subscriptions, setSubscriptions] = useState<CustomerSubscriptionItem[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState<boolean>(true);
  const [isRefreshingSubscriptions, setIsRefreshingSubscriptions] = useState<boolean>(false);
  const [subStatusFilter, setSubStatusFilter] = useState<string>("ALL");
  const [subPlanTypeFilter, setSubPlanTypeFilter] = useState<string>("ALL");
  const [subSearch, setSubSearch] = useState<string>("");
  const [debouncedSubSearch, setDebouncedSubSearch] = useState<string>("");
  const [subPage, setSubPage] = useState<number>(1);
  const [subTotalPages, setSubTotalPages] = useState<number>(1);
  const [totalSubscriptions, setTotalSubscriptions] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSubSearch(subSearch.trim());
      setSubPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [subSearch]);

  const fetchSubscriptionsData = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshingSubscriptions(true);
      else setSubscriptionsLoading(true);

      try {
        const res = await fetchAdminSubscriptions(
          {
            page: pageToLoad,
            limit: 20,
            status: subStatusFilter,
            planType: subPlanTypeFilter,
            search: debouncedSubSearch,
          },
          {
            forceRefresh,
            onFreshData: (fresh) => {
              if (fresh && Array.isArray(fresh.data)) {
                setSubscriptions(fresh.data);
                setSubTotalPages(fresh.pagination?.totalPages || 1);
                setTotalSubscriptions(fresh.pagination?.total || fresh.data.length);
                setSubscriptionsLoading(false);
              }
            },
          }
        );

        if (res && Array.isArray(res.data)) {
          setSubscriptions(res.data);
          setSubTotalPages(res.pagination?.totalPages || 1);
          setTotalSubscriptions(res.pagination?.total || res.data.length);
        }
      } catch (err: unknown) {
        console.error("Failed to fetch subscriptions:", err);
      } finally {
        setSubscriptionsLoading(false);
        setIsRefreshingSubscriptions(false);
      }
    },
    [subStatusFilter, subPlanTypeFilter, debouncedSubSearch]
  );

  useEffect(() => {
    if (activeTab === "SUBSCRIPTIONS") {
      fetchSubscriptionsData(subPage, false);
    }
  }, [activeTab, subPage, fetchSubscriptionsData]);


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
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState<boolean>(false);
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

  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== "PENDING" ||
      typeFilter !== "ALL" ||
      debouncedSearch.length > 0
    );
  }, [statusFilter, typeFilter, debouncedSearch]);

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
        `Approved ${request.requestType.replace(/_/g, " ")} request for ${
          request.customer?.name || "Customer"
        }.`,
        "success"
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showNotice(
          "Conflict: This request has already been reviewed or its status changed.",
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

  const handleResetFilters = () => {
    setStatusFilter("PENDING");
    setTypeFilter("ALL");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
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
        meta: effective ? `Effective: ${effective}` : undefined,
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
          ? `${time}${effective ? ` • Effective: ${effective}` : ""}`
          : effective
          ? `Effective: ${effective}`
          : undefined,
      };
    }

    // Fallback display
    const parts = Object.entries(config)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`);
    return { main: parts.join(" • ") || "Configured" };
  };

  // Helper for type badge colors and icons
  const getRequestTypeBadge = (type: RequestType) => {
    switch (type) {
      case "PAUSE":
        return {
          className: "bg-[#FFE7E1] border border-black text-[#991B1B]",
          icon: <PauseCircle className="h-3 w-3 stroke-[2.5]" />,
          label: "Pause",
        };
      case "RESUME":
        return {
          className: "bg-[#D5F2D5] border border-black text-[#14532D]",
          icon: <PlayCircle className="h-3 w-3 stroke-[2.5]" />,
          label: "Resume",
        };
      case "SKIP":
        return {
          className: "bg-[#FFF9D6] border border-black text-[#854D0E]",
          icon: <SkipForward className="h-3 w-3 stroke-[2.5]" />,
          label: "Skip Day",
        };
      case "CHANGE_QUANTITY":
        return {
          className: "bg-[#E0F2FE] border border-black text-[#075985]",
          icon: <Scale className="h-3 w-3 stroke-[2.5]" />,
          label: "Qty Change",
        };
      case "CHANGE_SCHEDULE":
        return {
          className: "bg-[#F3E8FF] border border-black text-[#581C87]",
          icon: <CalendarRange className="h-3 w-3 stroke-[2.5]" />,
          label: "Schedule Change",
        };
      default:
        return {
          className: "bg-white border border-black text-[#1A1A1A]",
          icon: <Calendar className="h-3 w-3 stroke-[2]" />,
          label: type,
        };
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "PENDING":
        return {
          className: "bg-[#FFDF58] border-2 border-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Clock className="h-3 w-3 stroke-[3]" />,
          label: "Pending",
        };
      case "APPROVED":
        return {
          className: "bg-[#B8E8B8] border-2 border-black text-[#14532D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <CheckCircle2 className="h-3 w-3 stroke-[3]" />,
          label: "Approved",
        };
      case "REJECTED":
        return {
          className: "bg-[#FFD9D0] border-2 border-black text-[#7F1D1D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <XCircle className="h-3 w-3 stroke-[2.5]" />,
          label: "Rejected",
        };
      case "CANCELLED":
        return {
          className: "bg-stone-200 border-2 border-black text-stone-700 shadow-[1px_1px_0px_0px_#000000]",
          icon: <X className="h-3 w-3 stroke-[2.5]" />,
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

  return (
    <div className="space-y-5">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & PRIMARY SYNC                              */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            Plans & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#5C5647] mt-0.5">
            Review delivery changes requested by customers and manage milk subscription plans in Raipur.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === "SUBSCRIPTIONS" ? (
            <button
              type="button"
              onClick={() => fetchSubscriptionsData(subPage, true)}
              disabled={isRefreshingSubscriptions}
              aria-label="Sync customer subscriptions from server"
              className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black min-h-[40px]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingSubscriptions ? "animate-spin" : ""
                }`}
              />
              {isRefreshingSubscriptions ? "Syncing..." : "Sync Subscriptions"}
            </button>
          ) : activeTab === "REQUESTS" ? (
            <button
              type="button"
              onClick={() => fetchRequestsData(currentPage, true)}
              disabled={isRefreshingRequests}
              aria-label="Sync change requests from server"
              className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black min-h-[40px]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingRequests ? "animate-spin" : ""
                }`}
              />
              {isRefreshingRequests ? "Syncing..." : "Sync Requests"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fetchPlansData(true)}
              disabled={isRefreshingPlans}
              aria-label="Sync plan catalog from server"
              className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black min-h-[40px]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingPlans ? "animate-spin" : ""
                }`}
              />
              {isRefreshingPlans ? "Syncing..." : "Sync Plans"}
            </button>
          )}
        </div>
      </div>

      {/* Global Notification Toast */}
      {notice && (
        <div
          role="alert"
          className={`flex items-center gap-2.5 rounded-[12px] border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#1A1A1A] animate-in fade-in duration-200 ${
            notice.type === "success"
              ? "bg-[#B9E8B4] text-[#14532D]"
              : notice.type === "error"
              ? "bg-[#FFD9D0] text-[#7F1D1D]"
              : "bg-[#FFDF58] text-[#1A1A1A]"
          }`}
        >
          {notice.type === "success" && <CheckCircle2 className="h-4 w-4 stroke-[3] shrink-0" />}
          {notice.type === "error" && <AlertTriangle className="h-4 w-4 stroke-[3] shrink-0" />}
          {notice.type === "info" && <Info className="h-4 w-4 stroke-[3] shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SEGMENTED TABS (Customer Requests vs Plan Config)      */}
      {/* ========================================================= */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FAF7EC] p-1.5 rounded-[14px] border-2 border-black shadow-[3px_3px_0px_0px_#000000]">
        <button
          type="button"
          onClick={() => setActiveTab("SUBSCRIPTIONS")}
          aria-selected={activeTab === "SUBSCRIPTIONS"}
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            activeTab === "SUBSCRIPTIONS"
              ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
              : "bg-white text-[#5C5647] hover:text-[#1A1A1A] border border-black/20"
          }`}
        >
          <Milk className="h-4 w-4 stroke-[2.5]" />
          <span>Active Subscriptions</span>
          {totalSubscriptions > 0 && (
            <span className="ml-1 rounded-full bg-black text-[#FFDF58] px-2 py-0.5 text-[11px] font-mono font-black">
              {totalSubscriptions}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("REQUESTS")}
          aria-selected={activeTab === "REQUESTS"}
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            activeTab === "REQUESTS"
              ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
              : "bg-white text-[#5C5647] hover:text-[#1A1A1A] border border-black/20"
          }`}
        >
          <Clock className="h-4 w-4 stroke-[2.5]" />
          <span>Change Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="ml-1 rounded-full bg-black text-[#FFDF58] px-2 py-0.5 text-[11px] font-mono font-black">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PLANS")}
          aria-selected={activeTab === "PLANS"}
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            activeTab === "PLANS"
              ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
              : "bg-white text-[#5C5647] hover:text-[#1A1A1A] border border-black/20"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4 stroke-[2.5]" />
          <span>Pricing & Settings</span>
        </button>
      </div>

            {/* ========================================================= */}
      {/* TAB 0: CUSTOMER ACTIVE SUBSCRIPTIONS                      */}
      {/* ========================================================= */}
      {activeTab === "SUBSCRIPTIONS" && (
        <div className="space-y-4">
          {/* Subscriptions Filter Bar */}
          <div className="bg-white border-2 border-black p-3.5 rounded-[14px] shadow-[3px_3px_0px_0px_#000000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "ALL", label: "All" },
                { key: "CONFIRMED", label: "Confirmed" },
                { key: "ACTIVE", label: "Active" },
                { key: "PENDING_PAYMENT", label: "Pending Payment" },
                { key: "PAUSED", label: "Paused" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSubStatusFilter(tab.key);
                    setSubPage(1);
                  }}
                  className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer min-h-[36px] ${
                    subStatusFilter === tab.key
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "bg-white text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5647]" />
                <input
                  type="text"
                  placeholder="Search customer, phone..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-[8px] border-2 border-black bg-white text-xs font-bold text-[#1A1A1A] outline-none shadow-[1.5px_1.5px_0px_0px_#000000]"
                />
              </div>

              <select
                value={subPlanTypeFilter}
                onChange={(e) => {
                  setSubPlanTypeFilter(e.target.value);
                  setSubPage(1);
                }}
                className="h-9 px-3 rounded-[8px] border-2 border-black bg-white text-xs font-black uppercase text-[#1A1A1A] outline-none shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="BUY_ONCE">Buy Once</option>
                <option value="SEVEN_DAY_TRIAL">7-Day Trial</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="bg-white border-2 border-black rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#FAF7EC] border-b-2 border-black text-[#1A1A1A] font-black uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3 px-4 border-r-2 border-black">Plan</th>
                    <th className="py-3 px-4 border-r-2 border-black">Schedule & Volume</th>
                    <th className="py-3 px-4 border-r-2 border-black">Date Range</th>
                    <th className="py-3 px-4 border-r-2 border-black text-right">Payment</th>
                    <th className="py-3 px-4 border-r-2 border-black text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-xs">
                  {subscriptionsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#5C5647] font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          <span>Loading customer subscriptions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#5C5647]">
                        <div className="max-w-sm mx-auto space-y-2">
                          <CheckCircle2 className="h-10 w-10 mx-auto text-[#14532D]" />
                          <p className="font-black text-sm text-[#1A1A1A] uppercase">
                            No Customer Subscriptions Found
                          </p>
                          <p className="text-xs font-semibold">
                            {debouncedSubSearch || subStatusFilter !== "ALL" || subPlanTypeFilter !== "ALL"
                              ? "Try adjusting filters or clearing search criteria."
                              : "No subscription plans are currently recorded."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const isActive = sub.status === "CONFIRMED" || sub.status === "ACTIVE";
                      const isPaused = sub.status === "PAUSED";
                      return (
                        <tr key={sub.id} className="hover:bg-[#FFFDF7] transition-colors">
                          <td className="py-3.5 px-4 border-r-2 border-black">
                            <div className="font-black text-sm text-[#1A1A1A]">
                              {sub.customer?.name || "Customer"}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#5C5647]">
                              {sub.customer?.mobile}
                            </div>
                            {sub.customer?.address?.area && (
                              <div className="text-[10px] font-mono text-[#5C5647] truncate max-w-[180px]">
                                {sub.customer.address.area}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black">
                            <span className="inline-block bg-[#FFD84D] border-2 border-black rounded-[6px] font-mono font-black text-[10px] uppercase px-2 py-0.5 shadow-[1px_1px_0px_0px_#000000]">
                              {sub.planType}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black font-mono">
                            <div className="font-black text-xs text-[#1A1A1A]">
                              {sub.quantity ?? 1} Liters ({sub.quantityMode || "FIXED"})
                            </div>
                            <div className="text-[11px] text-[#5C5647]">
                              Frequency: <span className="font-bold">{sub.frequency || "DAILY"}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black font-mono text-xs">
                            <div>{sub.startDate ? sub.startDate.split("T")[0] : "—"}</div>
                            <div className="text-[11px] text-[#5C5647]">
                              to {sub.endDate ? sub.endDate.split("T")[0] : "—"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono">
                            <div className="font-black text-xs text-[#1A1A1A]">
                              {sub.paidAmountPaise ? formatCurrency(sub.paidAmountPaise / 100) : "—"}
                            </div>
                            <div className="text-[10px] text-[#5C5647] uppercase font-bold">
                              {sub.paymentMethod || "PAID"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-[6px] border-2 border-black font-mono font-black text-[10px] uppercase shadow-[1px_1px_0px_0px_#000000] ${
                                isActive
                                  ? "bg-[#B9E8B4] text-[#14532D]"
                                  : isPaused
                                  ? "bg-[#FFDF58] text-[#713F12]"
                                  : "bg-[#FFD9D0] text-[#7F1D1D]"
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(sub.userId);
                                setIsCustomerDetailOpen(true);
                              }}
                              className="bg-[#FFDF58] hover:bg-[#fcd033] text-[#1A1A1A] font-black text-xs px-3 py-1.5 border-2 border-black rounded-[8px] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Strip */}
            <div className="p-3 bg-[#FAF7EC] border-t-2 border-black flex items-center justify-between text-xs font-bold">
              <span>
                Showing <strong className="font-mono">{subscriptions.length}</strong> of{" "}
                <strong className="font-mono">{totalSubscriptions}</strong> subscriptions
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={subPage <= 1 || subscriptionsLoading}
                  onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 hover:bg-[#FFDF58] shadow-[1px_1px_0px_0px_#000000] cursor-pointer"
                >
                  Prev
                </button>
                <span className="font-mono text-xs font-black px-1">
                  Page {subPage} of {subTotalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={subPage >= subTotalPages || subscriptionsLoading}
                  onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))}
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 hover:bg-[#FFDF58] shadow-[1px_1px_0px_0px_#000000] cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: CUSTOMER DELIVERY CHANGE REQUESTS                  */}
      {/* ========================================================= */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-4">
          {/* Filter Bar (Clean & Collapsible) */}
          <div className="bg-white border-2 border-black rounded-[14px] p-3.5 shadow-[4px_4px_0px_0px_#000000] space-y-3">
            {/* Primary Row: Status Chips + Search + More Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "PENDING", label: "Pending" },
                    { key: "ALL", label: "All" },
                    { key: "APPROVED", label: "Approved" },
                    { key: "REJECTED", label: "Rejected" },
                    { key: "CANCELLED", label: "Cancelled" },
                  ] as const
                ).map((tab) => {
                  const isActive = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] placeholder:text-[#5C5647]/70"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search input"
                      className="absolute right-2.5 top-2.5 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* More Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMoreFiltersOpen(!isMoreFiltersOpen)}
                  aria-expanded={isMoreFiltersOpen}
                  aria-label="Toggle request type filter"
                  className={`h-9 px-3 rounded-[8px] border-2 border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                    typeFilter !== "ALL" || isMoreFiltersOpen
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A]"
                  }`}
                >
                  <SlidersHorizontal className="h-3 w-3 stroke-[2.5]" />
                  <span className="hidden sm:inline">Type</span>
                  {typeFilter !== "ALL" && (
                    <span className="h-4 w-4 rounded-full bg-black text-[#FFDF58] text-[10px] font-mono font-black flex items-center justify-center">
                      1
                    </span>
                  )}
                  {isMoreFiltersOpen ? (
                    <ChevronUp className="h-3 w-3 stroke-[3]" />
                  ) : (
                    <ChevronDown className="h-3 w-3 stroke-[3]" />
                  )}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    aria-label="Reset all filters"
                    title="Reset filters"
                    className="h-9 px-2.5 rounded-[8px] border-2 border-black/30 hover:border-black bg-[#FAF7EC] hover:bg-stone-200 text-[#1A1A1A] text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                  >
                    <RotateCcw className="h-3 w-3 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Secondary Filter: Request Type */}
            {isMoreFiltersOpen && (
              <div className="pt-2.5 border-t border-black/10 flex flex-wrap items-center gap-2 animate-in fade-in duration-150">
                <span className="text-[11px] font-black uppercase text-[#5C5647]">
                  Filter by Request Type:
                </span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as RequestType | "ALL")}
                  className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] focus:outline-none cursor-pointer h-8"
                >
                  <option value="ALL">All Request Types</option>
                  <option value="PAUSE">PAUSE</option>
                  <option value="RESUME">RESUME</option>
                  <option value="SKIP">SKIP SINGLE DAY</option>
                  <option value="CHANGE_QUANTITY">CHANGE QUANTITY</option>
                  <option value="CHANGE_SCHEDULE">CHANGE SCHEDULE</option>
                </select>
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* DESKTOP TABLE VIEW (Visible md and up)                  */}
          {/* ======================================================= */}
          <div className="hidden md:block border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black w-48">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-36">Request Type</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Current Configuration</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Requested Change</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-32">Submitted</th>
                    <th className="py-3.5 px-4 text-center w-40">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {requestsLoading && requests.length === 0 ? (
                    // Skeleton
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1.5" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded-full w-24" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-full max-w-[200px]" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-full max-w-[200px]" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-20" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded-[8px] w-28 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 px-4 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="flex justify-center">
                            {statusFilter === "PENDING" ? (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B8E8B8] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                                <CheckCircle2 className="h-6 w-6 text-[#14532D] stroke-[3]" />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7EC] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                                <CalendarDays className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-tight text-[#1A1A1A]">
                              {statusFilter === "PENDING" && !hasActiveFilters
                                ? "No pending change requests"
                                : "No delivery change requests match this filter"}
                            </h3>
                            <p className="text-xs font-semibold text-[#5C5647]">
                              {statusFilter === "PENDING" && !hasActiveFilters
                                ? "All incoming customer delivery schedule changes have been reviewed."
                                : "Try adjusting your search terms or status selection."}
                            </p>
                          </div>

                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={handleResetFilters}
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
                      const typeBadge = getRequestTypeBadge(req.requestType);
                      const statusBadge = getStatusBadge(req.status);

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-[#FAF7EC]/80 transition-colors group"
                        >
                          {/* Customer */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <div className="font-black text-[#1A1A1A] text-xs">
                              {req.customer?.name || "Customer"}
                            </div>
                            <div className="text-[11px] font-mono font-medium text-[#5C5647]">
                              {req.customer?.mobile || "No phone"}
                            </div>
                          </td>

                          {/* Request Type */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${typeBadge.className}`}
                            >
                              {typeBadge.icon}
                              {typeBadge.label}
                            </span>
                          </td>

                          {/* Current Configuration (Muted From) */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle text-xs break-words">
                            <div className="inline-block rounded-[6px] bg-stone-100 border border-black/20 px-2.5 py-1 text-xs text-[#5C5647]">
                              <span className="font-mono text-[10px] uppercase font-bold text-[#78716C] block">
                                Current
                              </span>
                              <span className="font-semibold text-[#1A1A1A] whitespace-normal">
                                {currentParsed.main}
                              </span>
                              {currentParsed.meta && (
                                <div className="text-[10px] font-mono text-[#78716C] mt-0.5">
                                  {currentParsed.meta}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Requested Change (Emphasized To) */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-middle text-xs break-words">
                            <div className="inline-block rounded-[6px] bg-[#FFF9D6] border-2 border-black px-2.5 py-1 text-xs text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]">
                              <span className="font-mono text-[10px] uppercase font-black text-[#854D0E] flex items-center gap-1">
                                <ArrowRight className="h-2.5 w-2.5 stroke-[3]" />
                                Requested
                              </span>
                              <span className="font-black text-[#1A1A1A] whitespace-normal">
                                {requestedParsed.main}
                              </span>
                              {requestedParsed.meta && (
                                <div className="text-[10px] font-mono text-[#5C5647] mt-0.5">
                                  {requestedParsed.meta}
                                </div>
                              )}
                            </div>
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
                                  aria-label={`Approve ${req.requestType} for ${req.customer?.name}`}
                                  className="rounded-[8px] border-2 border-black bg-[#B8E8B8] hover:bg-[#9fe09f] font-black text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#14532D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"
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
                                  aria-label={`Reject ${req.requestType} for ${req.customer?.name}`}
                                  className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FFD9D0] font-black text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#7F1D1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                                >
                                  <X className="h-3 w-3 stroke-[3]" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-mono font-black uppercase ${statusBadge.className}`}
                                >
                                  {statusBadge.icon}
                                  {statusBadge.label}
                                </span>
                                {req.reviewedAt && (
                                  <span className="text-[9px] font-mono text-[#5C5647]">
                                    {formatDate(req.reviewedAt)}
                                  </span>
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

            {/* Pagination Strip (Desktop) */}
            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-3">
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
                  disabled={currentPage >= totalPages || requestsLoading}
                  onClick={() => {
                    const next = currentPage + 1;
                    setCurrentPage(next);
                    fetchRequestsData(next, false);
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

          {/* ======================================================= */}
          {/* MOBILE CARDS VIEW (Visible below md)                    */}
          {/* ======================================================= */}
          <div className="block md:hidden space-y-3">
            {requestsLoading && requests.length === 0 ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] animate-pulse space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="h-4 bg-[#E5E0D8] rounded w-32" />
                    <div className="h-5 bg-[#E5E0D8] rounded w-20" />
                  </div>
                  <div className="h-12 bg-[#E5E0D8]/60 rounded" />
                  <div className="h-10 bg-[#E5E0D8] rounded w-full" />
                </div>
              ))
            ) : filteredRequests.length === 0 ? (
              <div className="border-2 border-black bg-white rounded-[14px] p-6 text-center space-y-3 shadow-[3px_3px_0px_0px_#000000]">
                <div className="flex justify-center">
                  <CalendarDays className="h-8 w-8 text-[#5C5647]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                    {statusFilter === "PENDING"
                      ? "No pending change requests"
                      : "No change requests match filter"}
                  </h3>
                  <p className="text-xs font-semibold text-[#5C5647]">
                    {statusFilter === "PENDING"
                      ? "All requests have been reviewed."
                      : "Try clearing search or filters."}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-full py-2.5 rounded-[8px] border-2 border-black bg-[#FFDF58] text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
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
                const typeBadge = getRequestTypeBadge(req.requestType);
                const statusBadge = getStatusBadge(req.status);

                return (
                  <div
                    key={req.id}
                    className="border-2 border-black bg-white rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] space-y-3"
                  >
                    {/* Top Row: Customer + Status/Type Pills */}
                    <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2.5">
                      <div>
                        <div className="font-black text-sm text-[#1A1A1A]">
                          {req.customer?.name || "Customer"}
                        </div>
                        <div className="text-xs font-mono font-medium text-[#5C5647]">
                          {req.customer?.mobile || "No phone"}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${typeBadge.className}`}
                        >
                          {typeBadge.icon}
                          {typeBadge.label}
                        </span>
                        {!isPending && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-mono font-black uppercase ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Change Comparison Block: From -> To */}
                    <div className="space-y-2">
                      {/* Current Configuration */}
                      <div className="rounded-[8px] bg-stone-100 border border-black/20 p-2.5 text-xs text-[#5C5647]">
                        <span className="font-mono text-[10px] uppercase font-bold text-[#78716C] block mb-0.5">
                          Current Setting
                        </span>
                        <span className="font-semibold text-[#1A1A1A] block">
                          {currentParsed.main}
                        </span>
                        {currentParsed.meta && (
                          <span className="text-[10px] font-mono text-[#78716C] block mt-0.5">
                            {currentParsed.meta}
                          </span>
                        )}
                      </div>

                      {/* Requested Change */}
                      <div className="rounded-[8px] bg-[#FFF9D6] border-2 border-black p-2.5 text-xs text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]">
                        <span className="font-mono text-[10px] uppercase font-black text-[#854D0E] flex items-center gap-1 mb-0.5">
                          <ArrowRight className="h-3 w-3 stroke-[3]" />
                          Requested Change
                        </span>
                        <span className="font-black text-[#1A1A1A] block">
                          {requestedParsed.main}
                        </span>
                        {requestedParsed.meta && (
                          <span className="text-[10px] font-mono text-[#5C5647] block mt-0.5">
                            {requestedParsed.meta}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date Info */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-[#5C5647] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 stroke-[2]" />
                        Submitted: {formatDate(req.createdAt)}
                      </span>
                    </div>

                    {/* Action Buttons (Min 44px Tap Target) */}
                    {isPending ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/10">
                        <button
                          type="button"
                          disabled={approvingId === req.id}
                          onClick={() => handleApprove(req)}
                          className="min-h-[44px] rounded-[10px] border-2 border-black bg-[#B8E8B8] active:bg-[#9fe09f] font-black text-xs uppercase text-[#14532D] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {approvingId === req.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[3]" />
                          ) : (
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          )}
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(req)}
                          className="min-h-[44px] rounded-[10px] border-2 border-black bg-white active:bg-[#FFD9D0] font-black text-xs uppercase text-[#7F1D1D] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5 stroke-[3]" />
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {/* Pagination Controls (Mobile) */}
            <div className="p-3.5 bg-[#FAF7EC] border-2 border-black rounded-[14px] shadow-[2px_2px_0px_0px_#000000] text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || requestsLoading}
                onClick={() => {
                  const prev = currentPage - 1;
                  setCurrentPage(prev);
                  fetchRequestsData(prev, false);
                }}
                className="min-h-[44px] px-3 rounded-[8px] border-2 border-black bg-white font-black text-xs disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5 stroke-[3]" />
                Prev
              </button>

              <span className="font-mono text-xs font-black">
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
      {/* TAB 2: PLAN CATALOG & PRICING CONFIGURATION              */}
      {/* ========================================================= */}
      {activeTab === "PLANS" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Milk Subscription Plans
              </h2>
              <p className="text-xs font-semibold text-[#5C5647]">
                Set milk prices, bottle limits, and active delivery days in Raipur.
              </p>
            </div>
          </div>

          {/* 3-Column Plan Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {plansLoading && plans.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border-2 border-black bg-white rounded-[14px] p-5 sm:p-6 shadow-[4px_4px_0px_0px_#000000] animate-pulse space-y-4"
                >
                  <div className="h-6 bg-[#E5E0D8] rounded w-32" />
                  <div className="h-10 bg-[#E5E0D8] rounded w-24" />
                  <div className="space-y-2">
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
                    className={`border-2 border-black rounded-[14px] p-5 sm:p-6 shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between transition-all ${
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
                          aria-label={`Toggle active state for ${plan.type}`}
                          className={`cursor-pointer rounded-full border-2 border-black px-2.5 py-0.5 text-[10px] font-mono font-black transition-all ${
                            plan.isActive
                              ? "bg-[#B8E8B8] text-[#14532D] shadow-[1px_1px_0px_0px_#000000]"
                              : "bg-[#FFD9D0] text-[#7F1D1D]"
                          }`}
                        >
                          {plan.isActive ? "ACTIVE" : "INACTIVE"}
                        </button>
                      </div>

                      {/* Pricing Display */}
                      <div className="border-b-2 border-black/15 pb-4 mb-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black font-mono text-[#1A1A1A]">
                            ₹{Math.round(plan.sellingPricePerLitre / 100)}
                          </span>
                          <span className="text-xs font-bold text-[#5C5647]">/ Litre</span>
                        </div>
                        <div className="text-[11px] font-mono text-[#5C5647] line-through mt-0.5">
                          Base price: ₹{Math.round(plan.actualPricePerLitre / 100)}/L
                        </div>
                      </div>

                      {/* Allowed Litres & Delivery Window */}
                      <div className="space-y-2 text-xs font-bold text-[#1A1A1A] mb-5">
                        <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                          <span className="text-[#5C5647] flex items-center gap-1">
                            <SlidersHorizontal className="h-3 w-3 stroke-[2.5]" />
                            Volume Limits:
                          </span>
                          <span className="font-mono font-black">
                            {plan.quantityMin}L - {plan.quantityMax}L
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
                              {plan.maxUsages || 3} orders max
                            </span>
                          </div>
                        )}

                        {isSevenDay && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[#5C5647]">Parameters:</span>
                            <span className="font-mono font-black bg-[#D8CEF6] px-2 py-0.5 rounded border border-black">
                              7 Days (1x order)
                            </span>
                          </div>
                        )}

                        {isMonthly && (
                          <div className="pt-2 space-y-2">
                            <div>
                              <span className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                                Delivery Days:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.dailyEnabled !== false
                                      ? "bg-[#B8E8B8] text-[#14532D]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Daily
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.alternateDaysEnabled !== false
                                      ? "bg-[#B8E8B8] text-[#14532D]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Alternate Days
                                </span>
                              </div>
                            </div>

                            <div className="pt-1">
                              <span className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                                Quantity Modes:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.fixedQuantityEnabled !== false
                                      ? "bg-[#D8CEF6] text-[#4C1D95]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Fixed Qty
                                </span>
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.alternatingQuantityEnabled !== false
                                      ? "bg-[#D8CEF6] text-[#4C1D95]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Alternating
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
                      aria-label={`Edit configuration for ${plan.type}`}
                      className="w-full mt-4 rounded-[10px] border-2 border-black bg-[#FFD84D] hover:bg-[#fcd033] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
