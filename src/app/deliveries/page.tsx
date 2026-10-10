"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AdminOrder,
  OrderStatus,
  PlanType,
  OrdersApiResponse,
} from "@/types/order";
import { fetchOrders, OrderQueryParams } from "@/services/order-service";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { BulkMarkDeliveredModal } from "@/components/orders/bulk-mark-delivered-modal";
import { BulkUpdateQuantityModal } from "@/components/orders/bulk-update-quantity-modal";
import { BulkResultsModal } from "@/components/orders/bulk-results-modal";
import { BulkOperationResponse } from "@/services/order-service";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Truck,
  Search,
  SlidersHorizontal,
  Clock,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  XCircle,
  Check,
  PackageCheck,
  Milk,
  MapPin,
  RefreshCw,
  Copy,
  Phone,
  Eye,
  Calendar,
} from "lucide-react";
import {
  formatDeliveryDateOrLabel,
  formatDeliveryWindowOrLabel,
} from "@/lib/utils";

export default function ManageDeliveriesPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const pageSize = 20;

  // Filter States
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [planTypeFilter, setPlanTypeFilter] = useState<PlanType | "ALL">("ALL");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Debounced search queries
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState<string>("");

  // Drawer & Modal States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Bulk Management State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeliveredOpen, setIsBulkDeliveredOpen] = useState<boolean>(false);
  const [isBulkQuantityOpen, setIsBulkQuantityOpen] = useState<boolean>(false);
  const [bulkResults, setBulkResults] = useState<BulkOperationResponse | null>(null);
  const [isBulkResultsOpen, setIsBulkResultsOpen] = useState<boolean>(false);
  const [bulkActionTitle, setBulkActionTitle] = useState<string>("Bulk Action");

  // Single Action Direct Modals
  const [singleActionOrder, setSingleActionOrder] = useState<AdminOrder | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Debounce customer search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // Load orders function with SWR caching
  const loadOrders = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);
      setError(null);

      const params: OrderQueryParams = {
        page: pageToLoad,
        limit: pageSize,
      };

      if (statusFilter !== "ALL") params.status = statusFilter;
      if (planTypeFilter !== "ALL") params.planType = planTypeFilter;
      if (debouncedCustomerSearch) params.customerSearch = debouncedCustomerSearch;
      if (selectedDate) {
        params.startDate = selectedDate;
        params.endDate = selectedDate;
      }

      try {
        const response: OrdersApiResponse = await fetchOrders(params, {
          forceRefresh,
          onFreshData: (fresh) => {
            if (fresh && Array.isArray(fresh.data)) {
              setOrders(fresh.data);
              setTotalPages(fresh.pagination?.totalPages || 1);
              setTotalOrders(fresh.pagination?.total || 0);
              setCurrentPage(fresh.pagination?.page || pageToLoad);
              setIsLoading(false);
            }
          },
        });

        if (response && Array.isArray(response.data)) {
          setOrders(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalOrders(response.pagination?.total || 0);
          setCurrentPage(response.pagination?.page || pageToLoad);
        }
      } catch (err: unknown) {
        console.error("Failed to load deliveries:", err);
        const msg = err instanceof Error ? err.message : "Failed to load deliveries.";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      pageSize,
      statusFilter,
      planTypeFilter,
      debouncedCustomerSearch,
      selectedDate,
    ]
  );

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      await Promise.resolve();
      if (isMounted) {
        loadOrders(currentPage);
      }
    };
    fetchAsync();
    return () => {
      isMounted = false;
    };
  }, [loadOrders, currentPage]);

  const handleResetFilters = () => {
    setCustomerSearch("");
    setDebouncedCustomerSearch("");
    setStatusFilter("ALL");
    setPlanTypeFilter("ALL");
    setSelectedDate(todayStr);
    setCurrentPage(1);
    setSelectedOrderIds([]);
  };

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailOpen(true);
  };

  // Eligibility helpers
  const isEligibleForDeliveryMarking = (order: AdminOrder) => {
    return (
      !["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(order.status) &&
      order.planDelivery?.status !== "SKIPPED"
    );
  };

  const isEligibleForQuantityUpdate = (order: AdminOrder) => {
    return (
      !["DELIVERED", "COMPLETED", "CANCELLED", "FAILED"].includes(order.status) &&
      order.planDelivery?.status !== "SKIPPED" &&
      order.planDelivery?.status !== "DELIVERED"
    );
  };

  const eligibleVisibleOrders = orders.filter(isEligibleForDeliveryMarking);
  const selectedVisibleOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
  const isAllEligibleSelected =
    eligibleVisibleOrders.length > 0 &&
    eligibleVisibleOrders.every((o) => selectedOrderIds.includes(o.id));
  const isIndeterminate =
    selectedVisibleOrders.length > 0 && !isAllEligibleSelected;

  // Selected Total Litres
  const totalSelectedLitres = selectedVisibleOrders.reduce((sum, o) => {
    const qty = o.items && o.items[0] ? o.items[0].quantity : o.planDelivery?.quantityLitres || 1;
    return sum + qty;
  }, 0);

  const handleToggleSelectAll = () => {
    if (isAllEligibleSelected) {
      setSelectedOrderIds((prev) =>
        prev.filter((id) => !eligibleVisibleOrders.some((o) => o.id === id))
      );
    } else {
      const newSet = new Set(selectedOrderIds);
      eligibleVisibleOrders.forEach((o) => newSet.add(o.id));
      setSelectedOrderIds(Array.from(newSet));
    }
  };

  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBulkDeliveredCompleted = (res: BulkOperationResponse) => {
    setBulkResults(res);
    setBulkActionTitle("Bulk Mark as Delivered");
    setIsBulkResultsOpen(true);
    setSelectedOrderIds([]);
    loadOrders(currentPage, true);
  };

  const handleBulkQuantityCompleted = (res: BulkOperationResponse) => {
    setBulkResults(res);
    setBulkActionTitle("Bulk Quantity Update");
    setIsBulkResultsOpen(true);
    setSelectedOrderIds([]);
    loadOrders(currentPage, true);
  };

  // Metrics Counters based on current orders
  const scheduledCount = orders.filter((o) => ["CONFIRMED", "PROCESSING"].includes(o.status)).length;
  const outForDeliveryCount = orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length;
  const deliveredCount = orders.filter((o) => ["DELIVERED", "COMPLETED"].includes(o.status)).length;
  const skippedCount = orders.filter((o) => o.planDelivery?.status === "SKIPPED").length;
  const totalVolumeLitres = orders.reduce((sum, o) => {
    const qty = o.items && o.items[0] ? o.items[0].quantity : o.planDelivery?.quantityLitres || 1;
    return sum + qty;
  }, 0);

  const getOrderStatusBadge = (status: OrderStatus, deliveryStatus?: string) => {
    if (deliveryStatus === "SKIPPED") {
      return {
        label: "Skipped",
        className: "bg-[#FFD9D0] text-[#7F1D1D] border-2 border-black font-black",
        icon: <XCircle className="h-3.5 w-3.5 stroke-[2.5]" />,
      };
    }

    switch (status) {
      case "COMPLETED":
        return {
          label: "Completed",
          className: "bg-[#8FD694] text-[#14532D] border-2 border-black font-black",
          icon: <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      case "DELIVERED":
        return {
          label: "Delivered",
          className: "bg-[#B8E8B8] text-[#14532D] border-2 border-black font-black",
          icon: <Check className="h-3.5 w-3.5 stroke-[3]" />,
        };
      case "OUT_FOR_DELIVERY":
        return {
          label: "In Transit",
          className: "bg-[#FFDF58] text-[#713F12] border-2 border-black font-black",
          icon: <Truck className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      case "PROCESSING":
        return {
          label: "Processing",
          className: "bg-[#FFDF58] text-[#713F12] border-2 border-black font-black",
          icon: <PackageCheck className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      case "CONFIRMED":
        return {
          label: "Confirmed",
          className: "bg-[#B8E8B8] text-[#14532D] border-2 border-black font-black",
          icon: <Check className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      case "PENDING":
        return {
          label: "Pending",
          className: "bg-[#D8CEF6] text-[#4C1D95] border-2 border-black font-black",
          icon: <Clock className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          className: "bg-[#FFD9D0] text-[#7F1D1D] border-2 border-black font-black",
          icon: <X className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      case "FAILED":
        return {
          label: "Failed",
          className: "bg-[#FFD9D0] text-[#7F1D1D] border-2 border-black font-black",
          icon: <AlertTriangle className="h-3.5 w-3.5 stroke-[2.5]" />,
        };
      default:
        return {
          label: status,
          className: "bg-gray-100 text-[#1A1A1A] border-2 border-black font-black",
          icon: <Clock className="h-3.5 w-3.5" />,
        };
    }
  };

  const getPlanBadge = (planType: PlanType) => {
    switch (planType) {
      case "MONTHLY":
        return { label: "Monthly", bg: "bg-[#D8CEF6] border-2 border-black font-black text-[#1A1A1A]" };
      case "SEVEN_DAY_TRIAL":
        return { label: "7-Day Trial", bg: "bg-[#B8E8B8] border-2 border-black font-black text-[#1A1A1A]" };
      case "BUY_ONCE":
        return { label: "Buy Once", bg: "bg-[#FAF7EC] border-2 border-black font-black text-[#1A1A1A]" };
      default:
        return { label: planType, bg: "bg-gray-100 border-2 border-black font-black text-[#1A1A1A]" };
    }
  };

  const hasActiveFilters =
    customerSearch !== "" ||
    statusFilter !== "ALL" ||
    planTypeFilter !== "ALL" ||
    selectedDate !== todayStr;

  const getCustomerInitials = (name?: string) => {
    if (!name) return "CU";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 pb-24">
      {/* ========================================================= */}
      {/* 1. HEADER STRIP                                           */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] border-2 border-black bg-[#FFDF58] shadow-[1.5px_1.5px_0px_0px_#000000]">
              <Truck className="h-4 w-4 stroke-[2.5] text-[#1A1A1A]" />
            </span>
            <span className="text-[10px] font-mono font-black uppercase text-[#5C5647] tracking-wider">
              Dispatch Console • Raipur Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A]">
            Manage Deliveries
          </h1>
          <p className="text-xs font-bold text-[#5C5647] mt-0.5">
            Morning milk dispatch batches, quantity updates, and delivery fulfillment confirmation.
          </p>
        </div>

        {/* Date Tabs & Sync Live Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Date Segmented Switch */}
          <div className="inline-flex rounded-[10px] border-2 border-black bg-white p-0.5 shadow-[2px_2px_0px_0px_#000000]">
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setCurrentPage(1);
              }}
              className={`h-8 px-3.5 rounded-[7px] text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                  : "text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
              }`}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                const tmrw = new Date();
                tmrw.setDate(tmrw.getDate() + 1);
                setSelectedDate(tmrw.toISOString().slice(0, 10));
                setCurrentPage(1);
              }}
              className={`h-8 px-3.5 rounded-[7px] text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
                selectedDate !== todayStr && selectedDate !== ""
                  ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                  : "text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
              }`}
            >
              Tomorrow
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedDate("");
                setCurrentPage(1);
              }}
              className={`h-8 px-3.5 rounded-[7px] text-xs font-black uppercase tracking-tight transition-all cursor-pointer ${
                selectedDate === ""
                  ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                  : "text-[#5C5647] hover:text-[#1A1A1A] hover:bg-[#FAF7EC]"
              }`}
            >
              All Dates
            </button>
          </div>

          {/* Sync Live Refresh Button */}
          <button
            type="button"
            onClick={() => loadOrders(currentPage, true)}
            disabled={isRefreshing || isLoading}
            className="h-9 px-3.5 rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] text-[#1A1A1A] text-xs font-black uppercase tracking-tight shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync Live"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. INTERACTIVE KPI METRIC CARDS                           */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Volume */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
          className={`text-left border-2 border-black p-3.5 rounded-[12px] shadow-[3px_3px_0px_0px_#000000] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
            statusFilter === "ALL"
              ? "bg-[#FFDF58] ring-2 ring-black"
              : "bg-white hover:bg-[#FAF7EC]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1A1A]">Total Volume</span>
            <div className="h-6 w-6 rounded-md border border-black bg-white flex items-center justify-center">
              <Milk className="h-3.5 w-3.5 text-[#1A1A1A]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-black text-[#1A1A1A]">
              {totalVolumeLitres}
            </span>
            <span className="text-xs font-bold text-[#5C5647]">{totalVolumeLitres === 1 ? "Litre" : "Litres"}</span>
          </div>
          <div className="text-[10px] text-[#5C5647] font-bold mt-1">
            {totalOrders} {totalOrders === 1 ? "order" : "orders"} on view
          </div>
        </button>

        {/* Scheduled / Ready */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "CONFIRMED" ? "ALL" : "CONFIRMED");
            setCurrentPage(1);
          }}
          className={`text-left border-2 border-black p-3.5 rounded-[12px] shadow-[3px_3px_0px_0px_#000000] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
            statusFilter === "CONFIRMED"
              ? "bg-[#B8E8B8] ring-2 ring-black"
              : "bg-white hover:bg-[#FAF7EC]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#14532D]">Scheduled</span>
            <div className="h-6 w-6 rounded-md border border-black bg-[#B8E8B8] flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-[#14532D] stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-black text-[#1A1A1A]">
              {scheduledCount}
            </span>
            <span className="text-xs font-bold text-[#5C5647]">Orders</span>
          </div>
          <div className="text-[10px] text-[#14532D] font-black mt-1">Ready for dispatch</div>
        </button>

        {/* In Transit */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "OUT_FOR_DELIVERY" ? "ALL" : "OUT_FOR_DELIVERY");
            setCurrentPage(1);
          }}
          className={`text-left border-2 border-black p-3.5 rounded-[12px] shadow-[3px_3px_0px_0px_#000000] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
            statusFilter === "OUT_FOR_DELIVERY"
              ? "bg-[#FFDF58] ring-2 ring-black"
              : "bg-white hover:bg-[#FAF7EC]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#713F12]">In Transit</span>
            <div className="h-6 w-6 rounded-md border border-black bg-[#FFDF58] flex items-center justify-center">
              <Truck className="h-3.5 w-3.5 text-[#713F12] stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-black text-[#1A1A1A]">
              {outForDeliveryCount}
            </span>
            <span className="text-xs font-bold text-[#5C5647]">Orders</span>
          </div>
          <div className="text-[10px] text-[#713F12] font-black mt-1">Out for delivery</div>
        </button>

        {/* Delivered */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === "DELIVERED" ? "ALL" : "DELIVERED");
            setCurrentPage(1);
          }}
          className={`text-left border-2 border-black p-3.5 rounded-[12px] shadow-[3px_3px_0px_0px_#000000] transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
            statusFilter === "DELIVERED"
              ? "bg-[#8FD694] ring-2 ring-black"
              : "bg-white hover:bg-[#FAF7EC]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#14532D]">Delivered</span>
            <div className="h-6 w-6 rounded-md border border-black bg-[#8FD694] flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#14532D] stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-black text-[#1A1A1A]">
              {deliveredCount}
            </span>
            <span className="text-xs font-bold text-[#5C5647]">Orders</span>
          </div>
          <div className="text-[10px] text-[#14532D] font-black mt-1">Doorstep confirmed</div>
        </button>

        {/* Skipped */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
          className="text-left border-2 border-black p-3.5 rounded-[12px] shadow-[3px_3px_0px_0px_#000000] col-span-2 lg:col-span-1 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 bg-white hover:bg-[#FAF7EC]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7F1D1D]">Skipped</span>
            <div className="h-6 w-6 rounded-md border border-black bg-[#FFD9D0] flex items-center justify-center">
              <XCircle className="h-3.5 w-3.5 text-[#7F1D1D] stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-black text-[#1A1A1A]">
              {skippedCount}
            </span>
            <span className="text-xs font-bold text-[#5C5647]">Paused</span>
          </div>
          <div className="text-[10px] text-[#7F1D1D] font-black mt-1">Paused / Skipped today</div>
        </button>
      </div>

      {/* ERROR STATE */}
      {error && (
        <ErrorState
          error={error}
          onRetry={() => loadOrders(currentPage, true)}
        />
      )}

      {/* ========================================================= */}
      {/* 3. COMPREHENSIVE FILTER BAR                               */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-black p-3.5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
            <Input
              placeholder="Search customer, phone, or address..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] placeholder:text-[#5C5647]/70 shadow-[1px_1px_0px_0px_#000000]"
            />
            {customerSearch && (
              <button
                type="button"
                onClick={() => setCustomerSearch("")}
                aria-label="Clear customer search"
                className="absolute right-2.5 top-2.5 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="h-3.5 w-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Delivery Date Picker */}
          <div className="sm:col-span-3 relative">
            <div className="relative flex items-center">
              <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5] pointer-events-none" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Filter by delivery date"
                className="pl-8 h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrderStatus | "ALL");
                setCurrentPage(1);
              }}
              aria-label="Filter by delivery status"
              className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-2.5 text-xs font-black uppercase text-[#1A1A1A] focus:outline-none cursor-pointer shadow-[1px_1px_0px_0px_#000000]"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Plan Type Filter */}
          <div className="sm:col-span-2">
            <select
              value={planTypeFilter}
              onChange={(e) => {
                setPlanTypeFilter(e.target.value as PlanType | "ALL");
                setCurrentPage(1);
              }}
              aria-label="Filter by subscription plan type"
              className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-2.5 text-xs font-black uppercase text-[#1A1A1A] focus:outline-none cursor-pointer shadow-[1px_1px_0px_0px_#000000]"
            >
              <option value="ALL">All Plans</option>
              <option value="BUY_ONCE">Buy Once</option>
              <option value="SEVEN_DAY_TRIAL">7-Day Trial</option>
              <option value="MONTHLY">Monthly Plan</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="sm:col-span-1 flex items-center justify-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset all active filters"
                className="w-full h-9 rounded-[8px] border-2 border-black bg-[#FFD9D0] hover:bg-[#FFC6B8] text-[#1A1A1A] font-black uppercase text-xs shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5 stroke-[3]" />
                <span className="sm:hidden lg:inline">Reset</span>
              </button>
            ) : (
              <div className="h-9 w-full flex items-center justify-center text-[10px] font-mono font-bold text-[#5C5647]/50">
                LIVE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. DISPATCH TABLE VIEW (DESKTOP & TABLET)                  */}
      {/* ========================================================= */}
      <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
              <tr>
                {/* SELECT ALL CHECKBOX */}
                <th className="py-3.5 px-3 border-r-2 border-black text-center w-12">
                  <input
                    type="checkbox"
                    checked={isAllEligibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleToggleSelectAll}
                    disabled={eligibleVisibleOrders.length === 0}
                    aria-label="Select all eligible deliveries"
                    className="h-4 w-4 rounded border-2 border-black accent-[#FFDF58] cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th className="py-3.5 px-4 border-r-2 border-black w-36">Delivery Date</th>
                <th className="py-3.5 px-4 border-r-2 border-black w-32">Order #</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Customer & Address</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-28">Milk Qty</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-28">Plan</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-36">Status</th>
                <th className="py-3.5 px-4 text-center w-48">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black bg-white">
              {isLoading ? (
                <TableSkeleton columns={8} rows={6} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      icon={<Truck className="h-6 w-6 stroke-[2.5]" />}
                      title={hasActiveFilters ? "No deliveries match active filters" : "No deliveries scheduled"}
                      description={
                        hasActiveFilters
                          ? "Try adjusting search query, delivery date, or status filter."
                          : "Scheduled milk deliveries for Raipur will appear here."
                      }
                      isFiltered={hasActiveFilters}
                      onClearFilters={handleResetFilters}
                    />
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const windowTime = formatDeliveryWindowOrLabel(
                    order.deliveryStartTime,
                    order.deliveryEndTime,
                    "Morning Slot"
                  );

                  const quantity =
                    order.items && order.items[0]
                      ? order.items[0].quantity
                      : order.planDelivery?.quantityLitres || 1;

                  const statusBadge = getOrderStatusBadge(order.status, order.planDelivery?.status);
                  const planBadge = getPlanBadge(order.planType);
                  const isEligibleMarkDelivered = isEligibleForDeliveryMarking(order);
                  const isEligibleEditQty = isEligibleForQuantityUpdate(order);

                  const addressLine = [
                    order.addressSnapshot?.houseNumber,
                    order.addressSnapshot?.buildingName,
                    order.addressSnapshot?.area,
                    order.addressSnapshot?.city,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  const initials = getCustomerInitials(order.customer?.name);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FFFDF8] transition-colors group"
                    >
                      {/* CHECKBOX */}
                      <td
                        className="py-3.5 px-3 border-r-2 border-black text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          aria-label={`Select order ${order.orderNumber}`}
                          className="h-4 w-4 rounded border-2 border-black accent-[#FFDF58] cursor-pointer"
                        />
                      </td>

                      {/* DELIVERY DATE & WINDOW */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="font-mono text-xs font-black text-[#1A1A1A]">
                          {formatDeliveryDateOrLabel(order.deliveryDate)}
                        </div>
                        <div className="inline-flex items-center gap-1 mt-1 rounded border border-black/20 bg-[#FAF7EC] px-1.5 py-0.5 text-[10px] font-mono text-[#5C5647]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{windowTime}</span>
                        </div>
                      </td>

                      {/* ORDER NUMBER WITH COPY */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-[#1A1A1A] rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 shadow-[1px_1px_0px_0px_#000000]">
                            {order.orderNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.orderNumber, `order-${order.id}`)}
                            title="Copy Order #"
                            className="p-1 rounded border border-black/30 hover:border-black hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                          >
                            {copiedKey === `order-${order.id}` ? (
                              <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* CUSTOMER & ADDRESS */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle min-w-0">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-full border-2 border-black bg-[#E8DEF8] flex items-center justify-center text-xs font-black text-[#1A1A1A] shrink-0 shadow-[1px_1px_0px_0px_#000000]">
                            {initials}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs text-[#1A1A1A] truncate">
                                {order.customer?.name || "Customer"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#5C5647] mt-0.5">
                              <Phone className="h-2.5 w-2.5 shrink-0" />
                              <span>{order.customer?.mobile || "No phone"}</span>
                              {order.customer?.mobile && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(order.customer!.mobile, `phone-${order.id}`)}
                                  title="Copy Phone"
                                  className="text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer ml-0.5"
                                >
                                  {copiedKey === `phone-${order.id}` ? (
                                    <Check className="h-2.5 w-2.5 text-emerald-600 stroke-[3]" />
                                  ) : (
                                    <Copy className="h-2.5 w-2.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {addressLine && (
                              <div className="text-[10px] text-[#5C5647] flex items-center gap-1 mt-1 truncate" title={addressLine}>
                                <MapPin className="h-3 w-3 shrink-0 text-[#1A1A1A]" />
                                <span className="truncate max-w-[260px] font-medium">{addressLine}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* MILK QUANTITY (NEVER SQUISHED) */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle text-center">
                        <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-[8px] border-2 border-black bg-[#FFDF58] font-mono text-xs font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000] min-w-[72px]">
                          <Milk className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>{quantity} L</span>
                        </span>
                      </td>

                      {/* PLAN TYPE */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider ${planBadge.bg}`}>
                          {planBadge.label}
                        </span>
                      </td>

                      {/* STATUS BADGE */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle text-center">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider ${statusBadge.className}`}>
                          {statusBadge.icon}
                          <span>{statusBadge.label}</span>
                        </span>
                      </td>

                      {/* ROW ACTIONS */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEligibleMarkDelivered && (
                            <button
                              type="button"
                              onClick={() => {
                                setSingleActionOrder(order);
                                setIsBulkDeliveredOpen(true);
                              }}
                              title="Mark Delivered"
                              className="h-8 px-2.5 rounded-[8px] border-2 border-black bg-[#8FD694] hover:bg-[#7bc880] text-[#1A1A1A] font-black uppercase text-[10px] shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Deliver</span>
                            </button>
                          )}

                          {isEligibleEditQty && (
                            <button
                              type="button"
                              onClick={() => {
                                setSingleActionOrder(order);
                                setIsBulkQuantityOpen(true);
                              }}
                              title="Edit Quantity"
                              className="h-8 px-2.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FFDF58] text-[#1A1A1A] font-black uppercase text-[10px] shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                            >
                              <SlidersHorizontal className="h-3 w-3 stroke-[2.5]" />
                              <span>Qty</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDetail(order.id)}
                            title="Inspect Order Details"
                            className="h-8 px-2.5 rounded-[8px] border-2 border-black bg-[#FAF7EC] hover:bg-white text-[#1A1A1A] font-black uppercase text-[10px] shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3 stroke-[2.5]" />
                            <ArrowRight className="h-3 w-3 stroke-[3]" />
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

        {/* MOBILE CARD VIEW */}
        <div className="space-y-3 p-3 md:hidden" aria-busy={isLoading}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-[12px] border-2 border-black bg-[#FAF7EC] animate-pulse" />
            ))
          ) : orders.length === 0 ? (
            <div className="p-4 text-center font-bold text-xs text-[#5C5647]">
              No deliveries found for this date.
            </div>
          ) : (
            orders.map((order) => {
              const quantity =
                order.items && order.items[0]
                  ? order.items[0].quantity
                  : order.planDelivery?.quantityLitres || 1;
              const statusBadge = getOrderStatusBadge(order.status, order.planDelivery?.status);
              const planBadge = getPlanBadge(order.planType);
              const isEligibleMarkDelivered = isEligibleForDeliveryMarking(order);
              const isEligibleEditQty = isEligibleForQuantityUpdate(order);

              const addressLine = [
                order.addressSnapshot?.houseNumber,
                order.addressSnapshot?.buildingName,
                order.addressSnapshot?.area,
                order.addressSnapshot?.city,
              ]
                .filter(Boolean)
                .join(", ");

              return (
                <article
                  key={order.id}
                  className="space-y-3 rounded-[12px] border-2 border-black bg-white p-3.5 shadow-[3px_3px_0px_0px_#000000]"
                >
                  {/* Top Bar: Checkbox, Order #, Status */}
                  <div className="flex items-start justify-between gap-2 border-b-2 border-black/10 pb-2.5">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => handleToggleSelectOrder(order.id)}
                        aria-label={`Select order ${order.orderNumber}`}
                        className="h-4 w-4 rounded border-2 border-black accent-[#FFDF58] cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="font-mono font-black text-xs text-[#1A1A1A] block">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs font-black text-[#1A1A1A] block">
                          {order.customer?.name || "Customer"}
                        </span>
                        {order.customer?.mobile && (
                          <a
                            href={`tel:${order.customer.mobile}`}
                            className="text-[11px] font-mono text-[#5C5647] flex items-center gap-1 mt-0.5 hover:underline"
                          >
                            <Phone className="h-2.5 w-2.5" />
                            <span>{order.customer.mobile}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${planBadge.bg}`}>
                        {planBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Quantity & Date */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#FAF7EC] p-2.5 rounded-[8px] border border-black/20">
                    <div>
                      <span className="text-[10px] text-[#5C5647] block font-sans font-bold uppercase">Delivery Date</span>
                      <span className="font-bold text-[#1A1A1A]">{formatDeliveryDateOrLabel(order.deliveryDate)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5C5647] block font-sans font-bold uppercase">Milk Quantity</span>
                      <span className="inline-flex items-center gap-1 font-black text-[#1A1A1A]">
                        <Milk className="h-3 w-3" />
                        {quantity} Litres
                      </span>
                    </div>
                  </div>

                  {addressLine && (
                    <div className="text-[11px] text-[#5C5647] flex items-start gap-1 font-sans">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-[#1A1A1A]" />
                      <span className="leading-tight">{addressLine}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {isEligibleMarkDelivered && (
                      <button
                        type="button"
                        onClick={() => {
                          setSingleActionOrder(order);
                          setIsBulkDeliveredOpen(true);
                        }}
                        className="flex-1 h-9 rounded-[8px] border-2 border-black bg-[#8FD694] font-black text-xs uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Deliver</span>
                      </button>
                    )}

                    {isEligibleEditQty && (
                      <button
                        type="button"
                        onClick={() => {
                          setSingleActionOrder(order);
                          setIsBulkQuantityOpen(true);
                        }}
                        className="px-3 h-9 rounded-[8px] border-2 border-black bg-white font-black text-xs uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        <span>Qty</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenDetail(order.id)}
                      className="px-3 h-9 rounded-[8px] border-2 border-black bg-[#FAF7EC] font-black text-xs uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* PAGINATION BAR */}
        <div className="p-4 bg-[#FAF7EC] border-t-2 border-black flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-xs">
          <div className="font-bold text-[#1A1A1A]">
            Showing page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong> (
            <strong>{totalOrders}</strong> total deliveries)
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              aria-label="Previous page"
              className="h-8 px-3 bg-white text-[#1A1A1A] font-black uppercase text-xs border-2 border-black rounded-[8px] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFDF58] disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              aria-label="Next page"
              className="h-8 px-3 bg-white text-[#1A1A1A] font-black uppercase text-xs border-2 border-black rounded-[8px] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFDF58] disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. FLOATING BATCH ACTIONS TOOLBAR                          */}
      {/* ========================================================= */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto bg-white border-[3px] border-black rounded-[14px] p-2.5 sm:p-3 shadow-[6px_6px_0px_0px_#000000] flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="rounded-[8px] border-2 border-black bg-[#FFDF58] px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]">
              {selectedOrderIds.length} Selected
            </span>
            <span className="rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-xs font-mono font-black text-[#1A1A1A]">
              {totalSelectedLitres} Litres
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSingleActionOrder(null);
                setIsBulkQuantityOpen(true);
              }}
              className="h-8 px-3 rounded-[8px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFDF58] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Update Qty</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSingleActionOrder(null);
                setIsBulkDeliveredOpen(true);
              }}
              className="h-8 px-3.5 rounded-[8px] border-2 border-black bg-[#8FD694] hover:bg-[#79c97f] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Mark Delivered</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="h-8 px-2.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FFD9D0] text-[#1A1A1A] font-black uppercase text-xs shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODALS & DRAWERS                                       */}
      {/* ========================================================= */}
      <OrderDetailSheet
        orderId={selectedOrderId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOrderId(null);
        }}
        onStatusUpdated={(updated) => {
          setOrders((current) =>
            current.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
        }}
      />

      <BulkMarkDeliveredModal
        isOpen={isBulkDeliveredOpen}
        onClose={() => {
          setIsBulkDeliveredOpen(false);
          setSingleActionOrder(null);
        }}
        selectedOrders={
          singleActionOrder
            ? [singleActionOrder]
            : orders.filter((o) => selectedOrderIds.includes(o.id))
        }
        onCompleted={handleBulkDeliveredCompleted}
      />

      <BulkUpdateQuantityModal
        isOpen={isBulkQuantityOpen}
        onClose={() => {
          setIsBulkQuantityOpen(false);
          setSingleActionOrder(null);
        }}
        selectedOrders={
          singleActionOrder
            ? [singleActionOrder]
            : orders.filter((o) => selectedOrderIds.includes(o.id))
        }
        onCompleted={handleBulkQuantityCompleted}
      />

      <BulkResultsModal
        isOpen={isBulkResultsOpen}
        onClose={() => setIsBulkResultsOpen(false)}
        results={bulkResults}
        actionTitle={bulkActionTitle}
      />
    </div>
  );
}
