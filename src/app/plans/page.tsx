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
  getChangeRequests,
  approveChangeRequest,
  rejectChangeRequest,
  DEFAULT_PLANS,
} from "@/services/plan-delivery-service";
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
  FileText,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  ShieldAlert,
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRequests, setTotalRequests] = useState<number>(0);

  // Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] =
    useState<ChangeRequestItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // In-flight action IDs
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // ==========================================
  // TAB 2: PLAN CONFIGURATIONS STATE
  // ==========================================
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [plansLoading, setPlansLoading] = useState<boolean>(true);
  const [isRefreshingPlans, setIsRefreshingPlans] = useState<boolean>(false);

  // Edit Plan Modal State
  const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
  const [editingPlanType, setEditingPlanType] = useState<PlanType | null>(null);
  const [editFormData, setEditFormData] = useState<{
    isActive: boolean;
    actualPriceRupees: number;
    sellingPriceRupees: number;
    deliveryFeeRupees: number;
    quantityMin: number;
    quantityMax: number;
    deliveryStartTime: string;
    deliveryEndTime: string;
    maxUsages: number;
    trialDurationDays: number;
    dailyEnabled: boolean;
    alternateDaysEnabled: boolean;
    fixedQuantityEnabled: boolean;
    alternatingQuantityEnabled: boolean;
  }>({
    isActive: true,
    actualPriceRupees: 95,
    sellingPriceRupees: 85,
    deliveryFeeRupees: 0,
    quantityMin: 1,
    quantityMax: 5,
    deliveryStartTime: "06:00",
    deliveryEndTime: "08:00",
    maxUsages: 3,
    trialDurationDays: 7,
    dailyEnabled: true,
    alternateDaysEnabled: true,
    fixedQuantityEnabled: true,
    alternatingQuantityEnabled: true,
  });
  const [planFormError, setPlanFormError] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // ==========================================
  // DATA FETCHING: CHANGE REQUESTS (SWR)
  // ==========================================
  const fetchRequestsData = useCallback(
    async (pageToFetch: number = 1, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshingRequests(true);
      try {
        const response: ChangeRequestsApiResponse = await getChangeRequests(
          {
            status: statusFilter,
            requestType: typeFilter,
            page: pageToFetch,
            limit: 20,
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
        console.error("Failed to load delivery change requests:", err);
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
  // DATA FETCHING: PLANS (SWR)
  // ==========================================
  const fetchPlansData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshingPlans(true);
    try {
      const data = await getAllPlans({
        forceRefresh,
        onFreshData: (freshPlans) => {
          if (freshPlans && freshPlans.length > 0) {
            setPlans(freshPlans);
            setPlansLoading(false);
          }
        },
      });
      if (data && data.length > 0) {
        setPlans(data);
      }
    } catch (err: unknown) {
      console.error("Failed to load plan configs:", err);
    } finally {
      setPlansLoading(false);
      setIsRefreshingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchPlansData(false);
  }, [fetchPlansData]);

  // ==========================================
  // METRICS STRIP CALCULATION
  // ==========================================
  const metrics = useMemo(() => {
    const pendingCount = requests.filter((r) => r.status === "PENDING").length;
    const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
    const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;
    return {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: totalRequests || requests.length,
    };
  }, [requests, totalRequests]);

  // Client-side search filtering on requests table
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;
    const q = searchQuery.toLowerCase().trim();
    return requests.filter(
      (item) =>
        item.customer?.name?.toLowerCase().includes(q) ||
        item.customer?.mobile?.includes(q) ||
        item.requestType?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q)
    );
  }, [requests, searchQuery]);

  // ==========================================
  // HANDLERS: CHANGE REQUEST APPROVAL / REJECTION
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
      // Re-fetch to sync
      fetchRequestsData(currentPage, true);
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenRejectModal = (request: ChangeRequestItem) => {
    setSelectedRequestForReject(request);
    setRejectNote("");
    setRejectError(null);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequestForReject) return;
    if (!rejectNote.trim()) {
      setRejectError("A clear rejection reason note is mandatory.");
      return;
    }

    setIsRejecting(true);
    setRejectError(null);
    try {
      await rejectChangeRequest(selectedRequestForReject.id, rejectNote.trim());

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequestForReject.id
            ? {
                ...r,
                status: "REJECTED",
                adminNote: rejectNote.trim(),
                reviewedAt: new Date().toISOString(),
              }
            : r
        )
      );

      setIsRejectModalOpen(false);
      showNotice(
        `Rejected ${selectedRequestForReject.requestType.replace(/_/g, " ")} request.`,
        "info"
      );
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setRejectError(
          "Conflict: This change request has already been processed or status was updated."
        );
      } else {
        const msg = err instanceof Error ? err.message : "Rejection failed.";
        setRejectError(msg);
      }
    } finally {
      setIsRejecting(false);
    }
  };

  // ==========================================
  // HANDLERS: PLAN TOGGLE & EDIT CONFIG
  // ==========================================
  const handleTogglePlanActive = async (plan: PlanConfig) => {
    const nextState = !plan.isActive;
    // Optimistic
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

  const handleOpenEditPlanModal = (plan: PlanConfig) => {
    setEditingPlanType(plan.type);
    setPlanFormError(null);
    setEditFormData({
      isActive: plan.isActive,
      actualPriceRupees: Math.round(plan.actualPricePerLitre / 100),
      sellingPriceRupees: Math.round(plan.sellingPricePerLitre / 100),
      deliveryFeeRupees: Math.round(plan.deliveryFeePaise / 100),
      quantityMin: plan.quantityMin ?? 1,
      quantityMax: plan.quantityMax ?? 5,
      deliveryStartTime: plan.deliveryStartTime || "06:00",
      deliveryEndTime: plan.deliveryEndTime || "08:00",
      maxUsages: plan.maxUsages ?? 3,
      trialDurationDays: plan.trialDurationDays ?? 7,
      dailyEnabled: plan.dailyEnabled ?? true,
      alternateDaysEnabled: plan.alternateDaysEnabled ?? true,
      fixedQuantityEnabled: plan.fixedQuantityEnabled ?? true,
      alternatingQuantityEnabled: plan.alternatingQuantityEnabled ?? true,
    });
    setIsEditPlanModalOpen(true);
  };

  const handleSavePlanConfig = async () => {
    if (!editingPlanType) return;

    // Validations
    if (editFormData.sellingPriceRupees > editFormData.actualPriceRupees) {
      setPlanFormError(
        "Validation error: Selling Price (₹) cannot be higher than Base Actual Price (₹)."
      );
      return;
    }
    if (editFormData.quantityMin > editFormData.quantityMax) {
      setPlanFormError(
        "Validation error: Minimum quantity cannot exceed Maximum quantity."
      );
      return;
    }
    if (editFormData.quantityMin < 1) {
      setPlanFormError("Validation error: Minimum quantity must be at least 1 Litre.");
      return;
    }

    if (editingPlanType === "MONTHLY") {
      if (!editFormData.dailyEnabled && !editFormData.alternateDaysEnabled) {
        setPlanFormError(
          "Validation error: At least one delivery cadence (Daily or Alternate Days) must remain enabled."
        );
        return;
      }
      if (!editFormData.fixedQuantityEnabled && !editFormData.alternatingQuantityEnabled) {
        setPlanFormError(
          "Validation error: At least one quantity mode (Fixed or Alternating) must remain enabled."
        );
        return;
      }
    }

    setIsSavingPlan(true);
    setPlanFormError(null);

    const payload: Partial<PlanConfig> = {
      isActive: editFormData.isActive,
      actualPricePerLitre: Math.round(editFormData.actualPriceRupees * 100),
      sellingPricePerLitre: Math.round(editFormData.sellingPriceRupees * 100),
      deliveryFeePaise: Math.round(editFormData.deliveryFeeRupees * 100),
      quantityMin: Number(editFormData.quantityMin),
      quantityMax: Number(editFormData.quantityMax),
      deliveryStartTime: editFormData.deliveryStartTime,
      deliveryEndTime: editFormData.deliveryEndTime,
    };

    if (editingPlanType === "BUY_ONCE") {
      payload.maxUsages = Number(editFormData.maxUsages);
    }

    if (editingPlanType === "MONTHLY") {
      payload.dailyEnabled = editFormData.dailyEnabled;
      payload.alternateDaysEnabled = editFormData.alternateDaysEnabled;
      payload.fixedQuantityEnabled = editFormData.fixedQuantityEnabled;
      payload.alternatingQuantityEnabled = editFormData.alternatingQuantityEnabled;
    }

    try {
      const updated = await updatePlanConfig(editingPlanType, payload);

      setPlans((prev) =>
        prev.map((p) => (p.type === editingPlanType ? { ...p, ...updated } : p))
      );

      setIsEditPlanModalOpen(false);
      showNotice(
        `Updated settings for ${editingPlanType.replace(/_/g, " ")} plan.`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save configuration.";
      setPlanFormError(msg);
    } finally {
      setIsSavingPlan(false);
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

    // Pause / Skip requests
    if (type === "PAUSE") {
      const until = config.resumeDate || config.pauseEndDate || config.endDate || config.until;
      const start = config.pauseStartDate || config.startDate;
      if (until) {
        return {
          main: `Paused until ${until}`,
          meta: start ? `From: ${start}` : undefined,
        };
      }
      return { main: "Subscription Paused" };
    }

    if (type === "RESUME") {
      const date = config.resumeDate || config.effectiveDate || config.date;
      return {
        main: date ? `Resume on ${date}` : "Resume Deliveries",
        meta: "Status: Active",
      };
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
        meta: time ? `${time}${effective ? ` • Eff: ${effective}` : ""}` : effective ? `Eff: ${effective}` : undefined,
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
        return "bg-[#FF8E72] text-[#1A1A1A] border-2 border-black font-black";
      case "RESUME":
        return "bg-[#B8E8B8] text-[#1A1A1A] border-2 border-black font-black";
      case "CHANGE_QUANTITY":
      case "CHANGE_SCHEDULE":
        return "bg-[#D8CEF6] text-[#1A1A1A] border-2 border-black font-black";
      default:
        return "bg-white text-[#1A1A1A] border-2 border-black font-bold";
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & MAIN TAB BAR                              */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[30px] font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
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
            <span>Change Requests</span>
            {metrics.pending > 0 && (
              <span className="rounded-full bg-[#1A1A1A] px-1.5 py-0.2 text-[10px] font-mono font-black text-[#FFD84D]">
                {metrics.pending}
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
            <span>Plan Configurations</span>
          </button>
        </div>
      </div>

      {/* Global Notification Toast */}
      {notice && (
        <div
          className={`flex items-center gap-2 rounded-[10px] border-2 border-black p-3.5 text-xs font-black shadow-[3px_3px_0px_0px_#1A1A1A] animate-in fade-in slide-in-from-top-2 duration-200 ${
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

      {/* ========================================================= */}
      {/* 2. VIEW 1: CUSTOMER DELIVERY CHANGE REQUESTS              */}
      {/* ========================================================= */}
      {activeTab === "REQUESTS" && (
        <div className="space-y-6">
          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Pending Action Count */}
            <div className="rounded-[12px] bg-[#FFDF58] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                Pending Actions
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                  {metrics.pending}
                </span>
                <span className="text-[10px] font-bold text-[#1A1A1A] uppercase bg-black/10 px-2 py-0.5 rounded-[4px]">
                  Requires Review
                </span>
              </div>
            </div>

            {/* Approved Badge */}
            <div className="rounded-[12px] bg-[#B8E8B8] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                Approved
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                  {metrics.approved}
                </span>
                <span className="text-[10px] font-bold text-[#1A1A1A] uppercase bg-black/10 px-2 py-0.5 rounded-[4px]">
                  Active In System
                </span>
              </div>
            </div>

            {/* Rejected Count */}
            <div className="rounded-[12px] bg-[#FFD9D0] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                Turned Down
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                  {metrics.rejected}
                </span>
                <span className="text-[10px] font-bold text-[#1A1A1A] uppercase bg-black/10 px-2 py-0.5 rounded-[4px]">
                  With Admin Reason
                </span>
              </div>
            </div>

            {/* Total Filtered */}
            <div className="rounded-[12px] bg-white border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647]">
                  Total Requests
                </span>
                <button
                  type="button"
                  onClick={() => fetchRequestsData(currentPage, true)}
                  disabled={isRefreshingRequests}
                  className="cursor-pointer p-1 text-[#1A1A1A] hover:bg-[#FAF7EC] rounded-[6px] border border-black transition-all"
                  title="Refresh Change Requests"
                >
                  <RefreshCw
                    className={`h-3 w-3 stroke-[2.5] ${
                      isRefreshingRequests ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-2xl font-black text-[#1A1A1A]">
                  {metrics.total}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#5C5647]">
                  Live Hub
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-[10px] border-2 border-black px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      statusFilter === st
                        ? "bg-[#FFDF58] shadow-[2.5px_2.5px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                        : "bg-white text-[#1A1A1A] hover:bg-[#FAF7EC]"
                    }`}
                  >
                    {st === "ALL" ? "All Status" : st}
                  </button>
                ))}
              </div>

              {/* Type Filter Dropdown & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as RequestType | "ALL")}
                  className="rounded-[10px] border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Request Types</option>
                  <option value="PAUSE">Pause Subscription</option>
                  <option value="RESUME">Resume Deliveries</option>
                  <option value="SKIP">Skip Single Day</option>
                  <option value="CHANGE_QUANTITY">Change Quantity</option>
                  <option value="CHANGE_SCHEDULE">Change Schedule</option>
                </select>

                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
                  <Input
                    placeholder="Search name, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Requests Table */}
          <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
                  <tr>
                    <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Type</th>
                    <th className="py-3.5 px-4 border-r-2 border-black">
                      Current Plan Config
                    </th>
                    <th className="py-3.5 px-4 border-r-2 border-black">
                      Requested Modification
                    </th>
                    <th className="py-3.5 px-4 border-r-2 border-black">Submitted</th>
                    <th className="py-3.5 px-4 text-center">Action / Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y-2 divide-black bg-white">
                  {/* SKELETON LOADING STATE */}
                  {requestsLoading && requests.length === 0 ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1.5" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-5 bg-[#E5E0D8] rounded w-24" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-36 mb-1" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-40 mb-1" />
                          <div className="h-3 bg-[#E5E0D8]/60 rounded w-24" />
                        </td>
                        <td className="py-4 px-4 border-r-2 border-black">
                          <div className="h-4 bg-[#E5E0D8] rounded w-20" />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="h-7 bg-[#E5E0D8] rounded w-24 mx-auto" />
                        </td>
                      </tr>
                    ))
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center font-bold text-xs uppercase text-[#5C5647]"
                      >
                        No delivery change requests match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const currentCfg = formatConfiguration(
                        req.currentConfiguration,
                        req.requestType
                      );
                      const requestedCfg = formatConfiguration(
                        req.requestedConfiguration,
                        req.requestType
                      );

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-[#FAF7EC]/70 transition-colors"
                        >
                          {/* Customer */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-top">
                            <div className="font-black text-[#1A1A1A]">
                              {req.customer?.name || "Customer"}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-[#5C5647]">
                              {req.customer?.mobile || "No phone"}
                            </div>
                          </td>

                          {/* Request Type Badge */}
                          <td className="py-3.5 px-4 border-r-2 border-black align-top">
                            <span
                              className={`inline-block rounded-[6px] px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${getTypeBadgeClass(
                                req.requestType
                              )}`}
                            >
                              {req.requestType.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Current Plan Config */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-xs align-top">
                            <div className="font-extrabold text-[#1A1A1A]">
                              {currentCfg.main}
                            </div>
                            {currentCfg.meta && (
                              <div className="text-[10px] font-mono font-bold text-[#5C5647] mt-0.5">
                                {currentCfg.meta}
                              </div>
                            )}
                          </td>

                          {/* Requested Modification (Side-by-side arrow visualization) */}
                          <td className="py-3.5 px-4 border-r-2 border-black text-xs align-top">
                            <div className="flex items-start gap-1.5">
                              <ArrowRight className="h-3.5 w-3.5 text-[#1A1A1A] shrink-0 mt-0.5 stroke-[3]" />
                              <div>
                                <span className="font-black text-[#1A1A1A]">
                                  {requestedCfg.main}
                                </span>
                                {requestedCfg.meta && (
                                  <div className="text-[10px] font-mono font-black text-[#1A1A1A] bg-[#FFD84D]/40 px-1.5 py-0.5 rounded border border-black/20 mt-1 inline-block">
                                    {requestedCfg.meta}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Submitted Timestamp */}
                          <td className="py-3.5 px-4 border-r-2 border-black font-mono font-bold text-xs text-[#1A1A1A] align-top">
                            <div>{formatDate(req.createdAt)}</div>
                            <div className="text-[10px] text-[#5C5647]">
                              {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>

                          {/* Actions / Status */}
                          <td className="py-3.5 px-4 text-center align-top">
                            {req.status === "PENDING" ? (
                              <div className="flex items-center justify-center gap-2">
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
                                <span className="rounded-[6px] border-2 border-black bg-[#B8E8B8] px-2.5 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
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
                                <span className="rounded-[6px] border-2 border-black bg-[#FF8E72] px-2.5 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
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
                              <span className="rounded-[6px] border-2 border-black bg-[#E5E0D8] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
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

            {/* Pagination strip */}
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
      {/* 3. VIEW 2: PLAN CATALOG & PRICING CONFIGURATION           */}
      {/* ========================================================= */}
      {activeTab === "PLANS" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#1A1A1A]">
                Fixed System Plans Catalog
              </h2>
              <p className="text-xs font-bold text-[#5C5647]">
                Live delivery pricing, litre thresholds, and active schedule toggles.
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
              // Skeleton cards
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
                            <span className="text-[#5C5647]">Customer Max:</span>
                            <span className="font-mono font-black bg-[#FFDF58] px-2 py-0.5 rounded border border-black">
                              {plan.maxUsages || 3} Orders
                            </span>
                          </div>
                        )}

                        {isSevenDay && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[#5C5647]">Fixed Duration:</span>
                            <span className="font-mono font-black bg-[#D8CEF6] px-2 py-0.5 rounded border border-black">
                              {plan.trialDurationDays || 7} Days (1x usage)
                            </span>
                          </div>
                        )}

                        {isMonthly && (
                          <div className="pt-2 space-y-2">
                            <div>
                              <span className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                                Enabled Cadences:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border border-black ${
                                    plan.dailyEnabled !== false
                                      ? "bg-[#B8E8B8]"
                                      : "bg-gray-100 line-through text-gray-400"
                                  }`}
                                >
                                  Daily Delivery
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
                                Enabled Quantity Modes:
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
                                  Alternating (A/B)
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
      {/* 4. MODAL: REJECT CHANGE REQUEST REASON                    */}
      {/* ========================================================= */}
      <Dialog
        open={isRejectModalOpen}
        onOpenChange={(open) => !open && setIsRejectModalOpen(false)}
      >
        <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#FF8E72] stroke-[2.5]" />
              Reject Subscription Change Request
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-[#5C5647]">
              Provide a clear reason note for the customer explaining why this delivery modification
              cannot be honored.
            </DialogDescription>
          </DialogHeader>

          {selectedRequestForReject && (
            <div className="space-y-4 pt-2">
              {/* Request Summary Strip */}
              <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 text-xs font-bold space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Customer:</span>
                  <span className="font-black text-[#1A1A1A]">
                    {selectedRequestForReject.customer?.name} ({selectedRequestForReject.customer?.mobile})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5C5647]">Request Type:</span>
                  <span className="font-black font-mono text-[#1A1A1A]">
                    {selectedRequestForReject.requestType.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Mandatory Reason Note Textarea */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 stroke-[2.5]" />
                  Admin Reason Note (Mandatory)
                </label>
                <textarea
                  rows={4}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g., Cutoff for tomorrow morning has passed at 10 PM. Modification effective day after tomorrow."
                  className="w-full rounded-[10px] border-2 border-black p-3 text-xs font-bold text-[#1A1A1A] focus:outline-none shadow-[2px_2px_0px_0px_#000000]"
                />
              </div>

              {rejectError && (
                <div className="rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                  <span>{rejectError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 gap-2">
            <button
              type="button"
              disabled={isRejecting}
              onClick={() => setIsRejectModalOpen(false)}
              className="rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isRejecting}
              onClick={handleConfirmReject}
              className="rounded-[10px] border-2 border-black bg-[#FF8E72] hover:bg-[#ff7b5a] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isRejecting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
              ) : (
                <X className="h-3.5 w-3.5 stroke-[3]" />
              )}
              Confirm Rejection
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* 5. MODAL: EDIT PLAN CONFIGURATION                         */}
      {/* ========================================================= */}
      <Dialog
        open={isEditPlanModalOpen}
        onOpenChange={(open) => !open && setIsEditPlanModalOpen(false)}
      >
        <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A] flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
              Edit {editingPlanType?.replace(/_/g, " ")} Configuration
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-[#5C5647]">
              Update live pricing, volume constraints, and delivery windows. Prices are converted
              automatically to paise for the API.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Active Toggle Switch */}
            <div className="flex items-center justify-between rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <div>
                <span className="text-xs font-black uppercase text-[#1A1A1A] block">
                  Plan Availability
                </span>
                <span className="text-[11px] font-bold text-[#5C5647]">
                  Allow customer apps to purchase this plan
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditFormData((prev) => ({ ...prev, isActive: !prev.isActive }))
                }
                className={`rounded-full border-2 border-black px-3 py-1 text-xs font-mono font-black transition-all cursor-pointer ${
                  editFormData.isActive
                    ? "bg-[#B8E8B8] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
                    : "bg-[#FFD9D0] text-[#1A1A1A]"
                }`}
              >
                {editFormData.isActive ? "ACTIVE" : "INACTIVE"}
              </button>
            </div>

            {/* Pricing: Base vs Selling (in Rupees) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Base Price (₹ / Litre)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editFormData.actualPriceRupees}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      actualPriceRupees: Number(e.target.value),
                    }))
                  }
                  className="font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Selling Price (₹ / Litre)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editFormData.sellingPriceRupees}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      sellingPriceRupees: Number(e.target.value),
                    }))
                  }
                  className="font-mono font-bold"
                />
              </div>
            </div>

            {/* Quantity Constraints */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Min Litres
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editFormData.quantityMin}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      quantityMin: Number(e.target.value),
                    }))
                  }
                  className="font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Max Litres
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editFormData.quantityMax}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      quantityMax: Number(e.target.value),
                    }))
                  }
                  className="font-mono font-bold"
                />
              </div>
            </div>

            {/* Delivery Window & Fee */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Start Window
                </label>
                <Input
                  type="time"
                  value={editFormData.deliveryStartTime}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      deliveryStartTime: e.target.value,
                    }))
                  }
                  className="font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  End Window
                </label>
                <Input
                  type="time"
                  value={editFormData.deliveryEndTime}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      deliveryEndTime: e.target.value,
                    }))
                  }
                  className="font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Delivery Fee (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={editFormData.deliveryFeeRupees}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      deliveryFeeRupees: Number(e.target.value),
                    }))
                  }
                  className="font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* BUY_ONCE specific: Max Usages */}
            {editingPlanType === "BUY_ONCE" && (
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block mb-1">
                  Max Usages Per Customer (1 - 100)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={editFormData.maxUsages}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      maxUsages: Number(e.target.value),
                    }))
                  }
                  className="font-mono font-bold"
                />
              </div>
            )}

            {/* MONTHLY specific: Cadences & Modes */}
            {editingPlanType === "MONTHLY" && (
              <div className="space-y-3 pt-2 border-t-2 border-black/10">
                <div>
                  <span className="text-[11px] font-black uppercase text-[#1A1A1A] block mb-1.5">
                    Delivery Cadence Options
                  </span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.dailyEnabled}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            dailyEnabled: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] focus:ring-0"
                      />
                      <span>Enable Daily Delivery Schedule</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.alternateDaysEnabled}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            alternateDaysEnabled: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] focus:ring-0"
                      />
                      <span>Enable Alternate Days Delivery Schedule</span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-black uppercase text-[#1A1A1A] block mb-1.5">
                    Quantity Selection Modes
                  </span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.fixedQuantityEnabled}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            fixedQuantityEnabled: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] focus:ring-0"
                      />
                      <span>Fixed Quantity (same volume every delivery)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-[#1A1A1A] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.alternatingQuantityEnabled}
                        onChange={(e) =>
                          setEditFormData((prev) => ({
                            ...prev,
                            alternatingQuantityEnabled: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] focus:ring-0"
                      />
                      <span>Alternating Quantity (Day A / Day B volume)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {planFormError && (
              <div className="rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                <span>{planFormError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2">
            <button
              type="button"
              disabled={isSavingPlan}
              onClick={() => setIsEditPlanModalOpen(false)}
              className="rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingPlan}
              onClick={handleSavePlanConfig}
              className="rounded-[10px] border-2 border-black bg-[#FFD84D] hover:bg-[#fcd033] px-5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {isSavingPlan ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
              ) : (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              )}
              Save Plan Settings
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
