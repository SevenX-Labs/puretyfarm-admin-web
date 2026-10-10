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
  OrderCutoffPolicy,
} from "@/types/plan-delivery";
import {
  getAllPlans,
  fetchAdminSubscriptions,
  updatePlanConfig,
  fetchChangeRequests,
  approveChangeRequest,
} from "@/services/plan-delivery-service";
import { RejectRequestModal } from "@/components/plans/reject-request-modal";
import { ApprovePlanModal } from "@/components/plans/approve-plan-modal";
import { EditPlanModal } from "@/components/plans/edit-plan-modal";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ButtonLoader } from "@/components/ui/button-loader";
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
import {
  formatCurrency,
  formatDate,
  formatDeliveryWindowOrLabel,
} from "@/lib/utils";
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
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
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
      setSubscriptionsError(null);

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
        const msg = err instanceof Error ? err.message : "Failed to load subscriptions.";
        setSubscriptionsError(msg);
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
  const [requestsError, setRequestsError] = useState<string | null>(null);
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

  // Approve Plan Modal State
  const [isApprovePlanModalOpen, setIsApprovePlanModalOpen] = useState(false);
  const [selectedSubForApprove, setSelectedSubForApprove] = useState<CustomerSubscriptionItem | null>(null);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] =
    useState<ChangeRequestItem | null>(null);

  // ==========================================
  // TAB 2: PLAN CONFIGURATIONS STATE
  // ==========================================
  // Starts empty on purpose: seeding with DEFAULT_PLANS meant the skeleton
  // never rendered and placeholder prices/windows were shown as though they
  // were the server's configuration.
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [orderCutoff, setOrderCutoff] = useState<OrderCutoffPolicy | null>(null);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [isRefreshingPlans, setIsRefreshingPlans] = useState<boolean>(false);
  const [plansError, setPlansError] = useState<string | null>(null);

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
      else setRequestsLoading(true);
      setRequestsError(null);

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
        setRequestsError(msg);
      } finally {
        setRequestsLoading(false);
        setIsRefreshingRequests(false);
      }
    },
    [statusFilter, typeFilter]
  );

  useEffect(() => {
    if (activeTab === "REQUESTS") {
      fetchRequestsData(currentPage, false);
    }
  }, [activeTab, currentPage, fetchRequestsData]);

  // ==========================================
  // DATA FETCHING: PLAN CONFIGURATIONS
  // ==========================================
  const fetchPlansData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshingPlans(true);
    else setPlansLoading(true);
    setPlansError(null);

    try {
      const data = await getAllPlans({
        forceRefresh,
        onFreshData: (fresh) => {
          if (fresh?.plans?.length) {
            setPlans(fresh.plans);
            setOrderCutoff(fresh.orderCutoff);
            setPlansLoading(false);
          }
        },
      });

      if (data?.plans?.length) {
        setPlans(data.plans);
        setOrderCutoff(data.orderCutoff);
      }
    } catch (err: unknown) {
      console.error("Error fetching plan configurations:", err);
      const msg = err instanceof Error ? err.message : "Failed to load plan settings.";
      setPlansError(msg);
    } finally {
      setPlansLoading(false);
      setIsRefreshingPlans(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "PLANS") {
      fetchPlansData(false);
    }
  }, [activeTab, fetchPlansData]);

  // ==========================================
  // ACTIONS: APPROVE / REJECT / TOGGLE PLAN
  // ==========================================
  const handleOpenApproveModal = (sub: CustomerSubscriptionItem) => {
    setSelectedSubForApprove(sub);
    setIsApprovePlanModalOpen(true);
  };

  const handleApprovePlanSuccess = (updated: { subscriptionId: string; startDate: string; endDate: string }) => {
    setSubscriptions((prev) =>
      prev.map((s) =>
        s.id === updated.subscriptionId
          ? { ...s, startDate: updated.startDate, endDate: updated.endDate, status: "CONFIRMED" }
          : s
      )
    );
    showNotice("Plan approved and delivery schedule generated successfully!");
    fetchSubscriptionsData(subPage, true);
  };

  const handleApprove = async (request: ChangeRequestItem) => {
    setApprovingId(request.id);
    try {
      await approveChangeRequest(request.id);
      showNotice(
        `Successfully approved ${request.requestType} for ${request.customer?.name || "customer"}.`
      );
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: "APPROVED", reviewedAt: new Date().toISOString() }
            : r
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve request.";
      showNotice(msg, "error");
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenRejectModal = (request: ChangeRequestItem) => {
    setSelectedRequestForReject(request);
    setIsRejectModalOpen(true);
  };

  const handleRejectSuccess = (updated: ChangeRequestItem) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
    showNotice("Change request has been rejected.");
  };

  const handleTogglePlanActive = async (plan: PlanConfig) => {
    const nextState = !plan.isActive;
    try {
      const updated = await updatePlanConfig(plan.type, { isActive: nextState });
      setPlans((prev) => prev.map((p) => (p.type === plan.type ? updated : p)));
      showNotice(
        `${plan.type.replace(/_/g, " ")} is now ${nextState ? "ACTIVE" : "INACTIVE"}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update plan status.";
      showNotice(msg, "error");
    }
  };

  const handleEditPlan = (plan: PlanConfig) => {
    setSelectedPlanForEdit(plan);
    setIsEditPlanModalOpen(true);
  };

  const handlePlanSaved = (updated: PlanConfig) => {
    setPlans((prev) => prev.map((p) => (p.type === updated.type ? updated : p)));
    showNotice("Plan configuration saved successfully.");
  };

  // Client-side search & filtering for requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (!debouncedSearch) return true;
      const term = debouncedSearch.toLowerCase();
      const name = req.customer?.name?.toLowerCase() || "";
      const mobile = req.customer?.mobile?.toLowerCase() || "";
      return name.includes(term) || mobile.includes(term);
    });
  }, [requests, debouncedSearch]);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "PENDING").length;
  }, [requests]);

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL"
  );

  // Format configurations readable for human operators
  const formatConfiguration = (config: any, type: RequestType) => {
    if (!config || typeof config !== "object") return { main: "—" };

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

    if (type === "CHANGE_QUANTITY") {
      const qty = config.quantity ?? config.liters ?? config.qty;
      const effective = config.effectiveDate || config.startDate;
      return {
        main: qty ? `${qty} Litre${Number(qty) > 1 ? "s" : ""}` : "Adjust Volume",
        meta: effective ? `Effective: ${effective}` : undefined,
      };
    }

    if (type === "CHANGE_PLAN") {
      const planType = config.planType || config.plan;
      return {
        main: planType ? String(planType).replace(/_/g, " ") : "Plan Change",
      };
    }

    if (type === "CHANGE_SCHEDULE" || type === "CHANGE_FREQUENCY") {
      const freq = config.frequency || config.schedule || config.cadence;
      const time = config.timeWindow || config.deliveryWindow;
      const effective = config.effectiveDate || config.startDate;
      const mode = config.quantityMode;
      const qty =
        config.quantityMode === "ALTERNATING"
          ? [config.quantityA, config.quantityB].filter((v) => v != null).join("L / ") +
            (config.quantityA != null ? "L" : "")
          : config.quantity != null
          ? `${config.quantity}L`
          : undefined;
      const metaParts = [
        time,
        mode ? String(mode).replace(/_/g, " ") : undefined,
        qty,
        effective ? `Effective: ${effective}` : undefined,
      ].filter(Boolean);
      return {
        main: freq ? `${String(freq).replace(/_/g, " ")}` : "Schedule Shift",
        meta: metaParts.length > 0 ? metaParts.join(" • ") : undefined,
      };
    }

    const parts = Object.entries(config)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`);
    return { main: parts.join(" • ") || "Configured" };
  };

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
      case "CHANGE_FREQUENCY":
        return {
          className: "bg-[#F3E8FF] border border-black text-[#581C87]",
          icon: <CalendarRange className="h-3 w-3 stroke-[2.5]" />,
          label: "Schedule Change",
        };
      case "CHANGE_PLAN":
        return {
          className: "bg-[#FFF9D6] border border-black text-[#713F12]",
          icon: <Calendar className="h-3 w-3 stroke-[2.5]" />,
          label: "Plan Change",
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
      {/* 1. TOP HEADER                                             */}
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
              disabled={isRefreshingSubscriptions || subscriptionsLoading}
              aria-label="Sync customer subscriptions from server"
              className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 min-h-[40px] disabled:opacity-50"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingSubscriptions ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshingSubscriptions ? "Syncing..." : "Sync Subscriptions"}</span>
            </button>
          ) : activeTab === "REQUESTS" ? (
            <button
              type="button"
              onClick={() => fetchRequestsData(currentPage, true)}
              disabled={isRefreshingRequests || requestsLoading}
              aria-label="Sync change requests from server"
              className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 min-h-[40px] disabled:opacity-50"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingRequests ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshingRequests ? "Syncing..." : "Sync Requests"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fetchPlansData(true)}
              disabled={isRefreshingPlans || plansLoading}
              aria-label="Sync plan catalog from server"
              className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 min-h-[40px] disabled:opacity-50"
            >
              <RotateCcw
                className={`h-3.5 w-3.5 stroke-[2.5] ${
                  isRefreshingPlans ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshingPlans ? "Syncing..." : "Sync Plans"}</span>
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
      {/* 2. SEGMENTED TABS                                         */}
      {/* ========================================================= */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FAF7EC] p-1.5 rounded-[14px] border-2 border-black shadow-[3px_3px_0px_0px_#000000]">
        <button
          type="button"
          onClick={() => setActiveTab("SUBSCRIPTIONS")}
          aria-selected={activeTab === "SUBSCRIPTIONS"}
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] ${
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
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] ${
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
          className={`w-full py-2.5 px-4 rounded-[10px] text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] ${
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
                  onClick={() => setSubStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-xs font-black uppercase rounded-[8px] border-2 border-black transition-all cursor-pointer ${
                    subStatusFilter === tab.key
                      ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                      : "bg-white text-[#5C5647] hover:text-[#1A1A1A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
              <div className="relative w-full min-w-0 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
                <Input
                  placeholder="Search customer, mobile..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
                />
                {subSearch && (
                  <button
                    type="button"
                    onClick={() => setSubSearch("")}
                    aria-label="Clear subscription search"
                    className="absolute right-2.5 top-2.5 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Subscriptions Error Alert */}
          {subscriptionsError && (
            <ErrorState
              error={subscriptionsError}
              onRetry={() => fetchSubscriptionsData(subPage, true)}
            />
          )}

          {/* Subscriptions Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm border-collapse" aria-busy={subscriptionsLoading}>
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black font-mono">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Plan Type</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Quantity & Cadence</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Billing Period</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-right">Paid Amount</th>
                    <th className="py-3.5 px-4 border-r-2 border-black text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {subscriptionsLoading ? (
                    <TableSkeleton columns={7} rows={5} />
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <EmptyState
                          icon={<Milk className="h-6 w-6 stroke-[2.5]" />}
                          title="No subscriptions found"
                          description={
                            debouncedSubSearch || subStatusFilter !== "ALL" || subPlanTypeFilter !== "ALL"
                              ? "Try adjusting active filters or clearing search criteria."
                              : "No subscription plans are currently recorded in Raipur database."
                          }
                          isFiltered={Boolean(debouncedSubSearch || subStatusFilter !== "ALL" || subPlanTypeFilter !== "ALL")}
                          onClearFilters={() => {
                            setSubSearch("");
                            setDebouncedSubSearch("");
                            setSubStatusFilter("ALL");
                            setSubPlanTypeFilter("ALL");
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const isActive = sub.status === "CONFIRMED" || sub.status === "ACTIVE";
                      const isPaused = sub.status === "PAUSED";
                      return (
                        <tr key={sub.id} className="hover:bg-[#FAF7EC]/80 transition-colors">
                          <td className="py-3.5 px-4 border-r-2 border-black">
                            <div className="font-black text-xs text-[#1A1A1A] uppercase">
                              {sub.customer?.name || "Raipur Customer"}
                            </div>
                            <div className="text-[11px] font-mono text-[#5C5647]">
                              {sub.customer?.mobile || "—"}
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
                              {sub.quantity ?? 1} Litre{Number(sub.quantity ?? 1) > 1 ? "s" : ""} ({sub.quantityMode || "FIXED"})
                            </div>
                            <div className="text-[11px] text-[#5C5647]">
                              Freq: <span className="font-bold">{sub.frequency || "DAILY"}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black font-mono text-xs">
                            <div className="font-bold">{sub.startDate ? sub.startDate.split("T")[0] : "—"}</div>
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
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(sub)}
                                aria-label={`Approve schedule for ${sub.customer?.name || "customer"}`}
                                className="bg-[#FFDF58] hover:bg-[#FFD84D] text-[#1A1A1A] font-black text-xs px-2.5 py-1.5 border-2 border-black rounded-[8px] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>{sub.status === "PENDING_PAYMENT" ? "Approve" : "Set Date"}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomerId(sub.userId);
                                  setIsCustomerDetailOpen(true);
                                }}
                                aria-label={`View profile for ${sub.customer?.name || "customer"}`}
                                className="bg-[#FAF7EC] hover:bg-[#FAF7EC]/80 text-[#1A1A1A] font-black text-xs px-2.5 py-1.5 border-2 border-black rounded-[8px] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                              >
                                Profile
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden" aria-busy={subscriptionsLoading}>
              {subscriptionsLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="animate-pulse space-y-3 rounded-[12px] border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_#000000]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-4 w-32 rounded bg-[#E4DFD0]" />
                      <div className="h-5 w-20 rounded bg-[#E4DFD0]" />
                    </div>
                    <div className="h-10 rounded-[8px] bg-[#FAF7EC]" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 rounded-[8px] bg-[#E4DFD0]" />
                      <div className="h-12 rounded-[8px] bg-[#E4DFD0]" />
                    </div>
                  </div>
                ))
              ) : subscriptions.length === 0 ? (
                <EmptyState
                  icon={<Milk className="h-6 w-6 stroke-[2.5]" />}
                  title="No subscriptions found"
                  description={
                    debouncedSubSearch || subStatusFilter !== "ALL" || subPlanTypeFilter !== "ALL"
                      ? "Try adjusting active filters or clearing search criteria."
                      : "No subscription plans are currently recorded in Raipur database."
                  }
                  isFiltered={Boolean(
                    debouncedSubSearch ||
                      subStatusFilter !== "ALL" ||
                      subPlanTypeFilter !== "ALL"
                  )}
                  onClearFilters={() => {
                    setSubSearch("");
                    setDebouncedSubSearch("");
                    setSubStatusFilter("ALL");
                    setSubPlanTypeFilter("ALL");
                  }}
                />
              ) : (
                subscriptions.map((sub) => {
                  const isActive = sub.status === "CONFIRMED" || sub.status === "ACTIVE";
                  const isPaused = sub.status === "PAUSED";

                  return (
                    <article
                      key={sub.id}
                      className="min-w-0 space-y-3 rounded-[12px] border-2 border-black bg-white p-3 shadow-[2.5px_2.5px_0px_0px_#000000]"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black uppercase text-[#1A1A1A]">
                            {sub.customer?.name || "Raipur Customer"}
                          </div>
                          <div className="mt-0.5 truncate font-mono text-[11px] text-[#5C5647]">
                            {sub.customer?.mobile || "—"}
                          </div>
                          {sub.customer?.address?.area && (
                            <div className="mt-0.5 flex min-w-0 items-center gap-1 truncate font-mono text-[10px] text-[#5C5647]">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{sub.customer.address.area}</span>
                            </div>
                          )}
                        </div>
                        <span
                          className={`inline-block shrink-0 rounded-[6px] border-2 border-black px-2 py-1 font-mono text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_#000000] ${
                            isActive
                              ? "bg-[#B9E8B4] text-[#14532D]"
                              : isPaused
                              ? "bg-[#FFDF58] text-[#713F12]"
                              : "bg-[#FFD9D0] text-[#7F1D1D]"
                          }`}
                        >
                          {sub.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-black/15 pt-2">
                        <span className="inline-block max-w-[70%] truncate rounded-[6px] border-2 border-black bg-[#FFD84D] px-2 py-1 font-mono text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000000]">
                          {sub.planType.replace(/_/g, " ")}
                        </span>
                        <span className="shrink-0 font-mono text-xs font-black text-[#1A1A1A]">
                          {sub.paidAmountPaise
                            ? formatCurrency(sub.paidAmountPaise / 100)
                            : "—"}
                          {sub.paymentMethod && (
                            <span className="ml-1 text-[9px] font-bold uppercase text-[#5C5647]">
                              {sub.paymentMethod}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="min-w-0 rounded-[8px] border border-black/20 bg-[#FAF7EC] px-2.5 py-2">
                          <div className="text-[9px] font-black uppercase text-[#5C5647]">
                            Quantity & Cadence
                          </div>
                          <div className="mt-1 break-words font-mono text-[11px] font-bold text-[#1A1A1A]">
                            {sub.quantity ?? 1} Litre
                            {Number(sub.quantity ?? 1) > 1 ? "s" : ""} (
                            {sub.quantityMode || "FIXED"})
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-[#5C5647]">
                            {sub.frequency || "DAILY"}
                          </div>
                        </div>
                        <div className="min-w-0 rounded-[8px] border border-black/20 bg-[#FAF7EC] px-2.5 py-2">
                          <div className="text-[9px] font-black uppercase text-[#5C5647]">
                            Billing Period
                          </div>
                          <div className="mt-1 break-words font-mono text-[10px] font-bold text-[#1A1A1A]">
                            {sub.startDate ? sub.startDate.split("T")[0] : "—"}
                          </div>
                          <div className="font-mono text-[10px] text-[#5C5647]">
                            to {sub.endDate ? sub.endDate.split("T")[0] : "—"}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(sub.userId);
                          setIsCustomerDetailOpen(true);
                        }}
                        aria-label={`View profile for ${sub.customer?.name || "customer"}`}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-[8px] border-2 border-black bg-[#FAF7EC] px-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] transition-all hover:bg-[#FFD84D] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      >
                        View Profile
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                    </article>
                  );
                })
              )}
            </div>

            {/* Pagination Strip */}
            <div className="flex flex-col gap-3 border-t-2 border-black bg-[#FAF7EC] p-3.5 text-xs font-bold sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing <strong className="font-mono">{subscriptions.length}</strong> of{" "}
                <strong className="font-mono">{totalSubscriptions}</strong> subscriptions
              </span>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  disabled={subPage <= 1 || subscriptionsLoading}
                  onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black disabled:opacity-40 hover:bg-[#FFDF58] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer"
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
                  aria-label="Next page"
                  className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black disabled:opacity-40 hover:bg-[#FFDF58] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer"
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
          {/* Filter Bar */}
          <div className="bg-white border-2 border-black rounded-[14px] p-3.5 shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "PENDING", label: "Pending" },
                  { key: "ALL", label: "All" },
                  { key: "APPROVED", label: "Approved" },
                  { key: "REJECTED", label: "Rejected" },
                ].map((tab) => {
                  const isActive = statusFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key as any)}
                      className={`rounded-[8px] border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
                        isActive
                          ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
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
          </div>

          {/* Requests Error Alert */}
          {requestsError && (
            <ErrorState
              error={requestsError}
              onRetry={() => fetchRequestsData(currentPage, true)}
            />
          )}

          {/* Requests Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse" aria-busy={requestsLoading}>
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black font-mono">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black w-48">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-36">Request Type</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Current Setting</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Requested Change</th>
                    <th className="py-3.5 px-4 border-r-2 border-black w-32">Submitted</th>
                    <th className="py-3.5 px-4 text-center w-40">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {requestsLoading ? (
                    <TableSkeleton columns={6} rows={5} />
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={<CalendarDays className="h-6 w-6 stroke-[2.5]" />}
                          title={statusFilter === "PENDING" ? "No pending change requests" : "No change requests found"}
                          description={
                            hasActiveFilters
                              ? "Try adjusting search or status filters."
                              : statusFilter === "PENDING"
                              ? "All customer delivery changes have been reviewed and approved."
                              : "No change requests recorded in this status."
                          }
                          isFiltered={hasActiveFilters}
                          onClearFilters={handleResetFilters}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isPending = req.status === "PENDING";
                      const currentParsed = formatConfiguration(req.currentConfiguration, req.requestType);
                      const requestedParsed = formatConfiguration(req.requestedConfiguration, req.requestType);
                      const typeBadge = getRequestTypeBadge(req.requestType);
                      const statusBadge = getStatusBadge(req.status);

                      return (
                        <tr key={req.id} className="hover:bg-[#FAF7EC]/80 transition-colors">
                          <td className="py-3.5 px-4 border-r-2 border-black">
                            <div className="font-black text-xs text-[#1A1A1A] uppercase">
                              {req.customer?.name || "Raipur Customer"}
                            </div>
                            <div className="text-[11px] font-mono text-[#5C5647]">
                              {req.customer?.mobile || "—"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black">
                            <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${typeBadge.className}`}>
                              {typeBadge.icon}
                              {typeBadge.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black text-xs text-[#5C5647]">
                            <span className="font-semibold text-[#1A1A1A] block">{currentParsed.main}</span>
                            {currentParsed.meta && (
                              <span className="text-[10px] font-mono text-[#5C5647] block mt-0.5">{currentParsed.meta}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black text-xs">
                            <span className="font-black text-[#1A1A1A] block">{requestedParsed.main}</span>
                            {requestedParsed.meta && (
                              <span className="text-[10px] font-mono text-[#5C5647] block mt-0.5">{requestedParsed.meta}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 border-r-2 border-black font-mono text-xs text-[#5C5647]">
                            {formatDate(req.createdAt)}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {isPending ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={approvingId === req.id}
                                  onClick={() => handleApprove(req)}
                                  aria-label={`Approve ${req.requestType} for ${req.customer?.name}`}
                                  className="rounded-[8px] border-2 border-black bg-[#B8E8B8] hover:bg-[#9fe09f] font-black text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#14532D] disabled:opacity-50"
                                >
                                  <ButtonLoader loading={approvingId === req.id} icon={<Check className="h-3 w-3 stroke-[3]" />}>
                                    Approve
                                  </ButtonLoader>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(req)}
                                  aria-label={`Reject ${req.requestType} for ${req.customer?.name}`}
                                  className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FFD9D0] font-black text-xs px-2.5 py-1.5 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#7F1D1D]"
                                >
                                  <X className="h-3 w-3 stroke-[3]" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-black uppercase ${statusBadge.className}`}>
                                {statusBadge.label}
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
            <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex items-center justify-between gap-3 font-mono">
              <span>
                Showing <strong>{filteredRequests.length}</strong> of <strong>{totalRequests}</strong> requests
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
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer"
                >
                  Prev
                </button>
                <span className="font-mono text-xs font-black px-1">
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
                  className="rounded-[8px] border-2 border-black bg-white px-2.5 py-1 text-xs font-black disabled:opacity-40 hover:bg-[#FFD84D] shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer"
                >
                  Next
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Milk Subscription Plans
              </h2>
              <p className="text-xs font-semibold text-[#5C5647]">
                Set milk prices, volume bounds, and delivery days in Raipur.
              </p>
            </div>
          </div>

          {plansError && (
            <ErrorState
              error={plansError}
              onRetry={() => fetchPlansData(true)}
            />
          )}

          {/* ORDER CUT-OFF — a business-wide policy, not a per-plan window.
              Rendered from the server's response so this screen can never
              disagree with the rule the backend actually applies. */}
          <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase text-[#1A1A1A]">
                <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
                Daily Order Cut-Off
              </span>
              {plansLoading && !orderCutoff ? (
                <span className="h-6 w-28 animate-pulse rounded-[6px] bg-[#E5E0D8]" />
              ) : orderCutoff ? (
                <span className="rounded-[6px] border-2 border-black bg-[#FFDF58] px-2.5 py-1 font-mono text-xs font-black text-[#1A1A1A]">
                  {orderCutoff.timeLabel} {orderCutoff.timezone}
                </span>
              ) : (
                <span className="rounded-[6px] border-2 border-black bg-[#FFD9D0] px-2.5 py-1 font-mono text-xs font-black text-[#1A1A1A]">
                  Unavailable
                </span>
              )}
            </div>
            {orderCutoff ? (
              <p className="mt-2 text-[11px] font-bold leading-snug text-[#5C5647]">
                Orders placed before {orderCutoff.timeLabel} deliver in{" "}
                {orderCutoff.leadDaysBeforeCutoff} day
                {orderCutoff.leadDaysBeforeCutoff === 1 ? "" : "s"}; from{" "}
                {orderCutoff.timeLabel} onwards they deliver in{" "}
                {orderCutoff.leadDaysAfterCutoff} days. This is separate from
                each plan&apos;s delivery window below, which is when the van
                arrives.
              </p>
            ) : (
              <p className="mt-2 text-[11px] font-bold leading-snug text-[#5C5647]">
                The cut-off policy could not be loaded.{" "}
                <button
                  type="button"
                  onClick={() => fetchPlansData(true)}
                  className="cursor-pointer underline decoration-2"
                >
                  Retry
                </button>
              </p>
            )}
          </div>

          {/* 3-Column Plan Grid */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            aria-busy={plansLoading}
          >
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
                const isUnconfigured = plan.isConfigured === false;
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
                    className={`h-full min-h-[390px] min-w-0 border-2 border-black rounded-[14px] p-5 shadow-[4px_4px_0px_0px_#000000] flex flex-col transition-all ${
                      plan.isActive ? "bg-white" : "bg-[#FAF7EC]/60 opacity-80"
                    }`}
                  >
                    <div className="flex flex-1 flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <span
                          className={`rounded-[6px] border border-black font-mono text-[11px] font-bold px-2 py-0.5 ${badgeBg}`}
                        >
                          {badgeLabel}
                        </span>

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

                      {isUnconfigured && (
                        <div className="mb-3 flex items-start gap-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-2.5 text-[11px] font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
                          <span className="leading-snug">
                            This plan has no saved configuration yet. The values
                            below are placeholders — save the plan to set its
                            real prices and delivery window.
                          </span>
                        </div>
                      )}

                      <div className="space-y-3 rounded-[10px] border-2 border-black/10 bg-[#FAF7EC] p-3 text-xs font-bold text-[#1A1A1A] mb-5">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-black/10 pb-2">
                          <span className="text-[#5C5647] flex items-center gap-1">
                            <SlidersHorizontal className="h-3 w-3 stroke-[2.5]" />
                            Volume Limits:
                          </span>
                          <span className="font-mono font-black">
                            {plan.quantityMin}L - {plan.quantityMax}L
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-black/10 pb-2">
                          <span className="text-[#5C5647] flex items-center gap-1">
                            <Clock className="h-3 w-3 stroke-[2.5]" />
                            Delivery Window:
                          </span>
                          <span className="font-mono font-black">
                            {formatDeliveryWindowOrLabel(
                              plan.deliveryStartTime,
                              plan.deliveryEndTime,
                              "Not configured"
                            )}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-black/10 pb-2">
                          <span className="text-[#5C5647]">Delivery Fee:</span>
                          <span className="font-mono font-black">
                            {plan.deliveryFeePaise === 0
                              ? "FREE (₹0)"
                              : `₹${Math.round(plan.deliveryFeePaise / 100)}`}
                          </span>
                        </div>

                        {isBuyOnce && (
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
                            <span className="text-[#5C5647]">Max Usages:</span>
                            <span className="font-mono font-black bg-[#FFDF58] px-2 py-0.5 rounded border border-black">
                              {plan.maxUsages || 3} orders per customer
                            </span>
                          </div>
                        )}

                        {isSevenDay && (
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1">
                            <span className="text-[#5C5647]">Parameters:</span>
                            <span className="font-mono font-black bg-[#D8CEF6] px-2 py-0.5 rounded border border-black">
                              Duration: 7 Days | Max Usages: 1 (Fixed)
                            </span>
                          </div>
                        )}

                        {isMonthly && (
                          <div className="space-y-3 border-t border-black/10 pt-3">
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

                            <div>
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

                    <button
                      type="button"
                      onClick={() => handleEditPlan(plan)}
                      aria-label={`Edit ${plan.type} plan pricing and parameters`}
                      className="w-full h-10 bg-[#FFDF58] hover:bg-[#FFD84D] text-[#1A1A1A] font-black uppercase text-xs border-2 border-black rounded-[10px] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                    >
                      <Edit2 className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Edit Plan Settings</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Approve Plan Modal */}
      <ApprovePlanModal
        isOpen={isApprovePlanModalOpen}
        onClose={() => {
          setIsApprovePlanModalOpen(false);
          setSelectedSubForApprove(null);
        }}
        subscription={selectedSubForApprove}
        onSuccess={handleApprovePlanSuccess}
      />

      {/* Rejection Modal */}
      <RejectRequestModal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedRequestForReject(null);
        }}
        request={selectedRequestForReject}
        onSuccess={handleRejectSuccess}
      />

      {/* Edit Plan Modal */}
      <EditPlanModal
        isOpen={isEditPlanModalOpen}
        onClose={() => {
          setIsEditPlanModalOpen(false);
          setSelectedPlanForEdit(null);
        }}
        plan={selectedPlanForEdit}
        onSuccess={handlePlanSaved}
      />

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        customerId={selectedCustomerId}
        isOpen={isCustomerDetailOpen}
        onClose={() => {
          setIsCustomerDetailOpen(false);
          setSelectedCustomerId(null);
        }}
      />
    </div>
  );
}
