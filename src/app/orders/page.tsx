"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AdminOrder,
  OrderStatus,
  PaymentStatus,
  PlanType,
  OrdersApiResponse,
} from "@/types/order";
import { fetchOrders, OrderQueryParams } from "@/services/order-service";
import { OrderDetailSheet } from "@/components/orders/order-detail-sheet";
import { Input } from "@/components/ui/input";
import {
  Package,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  CheckCheck,
  X,
  XCircle,
  Truck,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter expander state
  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const pageSize = 20;

  // Filter States
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [orderNumberInput, setOrderNumberInput] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [planTypeFilter, setPlanTypeFilter] = useState<PlanType | "ALL">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Debounced search queries
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState<string>("");
  const [debouncedOrderNumber, setDebouncedOrderNumber] = useState<string>("");

  // Drawer state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Copy order number handler
  const handleCopyOrderNumber = (e: React.MouseEvent, orderNum: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orderNum);
    setCopiedId(orderNum);
    setTimeout(() => {
      setCopiedId((current) => (current === orderNum ? null : current));
    }, 2000);
  };

  // Debounce customer search input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // Debounce order number input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOrderNumber(orderNumberInput.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [orderNumberInput]);

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
      if (paymentStatusFilter !== "ALL") params.paymentStatus = paymentStatusFilter;
      if (planTypeFilter !== "ALL") params.planType = planTypeFilter;
      if (debouncedCustomerSearch) params.customerSearch = debouncedCustomerSearch;
      if (debouncedOrderNumber) params.orderNumber = debouncedOrderNumber;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const response: OrdersApiResponse = await fetchOrders(params, {
          forceRefresh,
          onFreshData: (fresh) => {
            if (fresh && Array.isArray(fresh.data)) {
              setOrders(fresh.data);
              setTotalPages(fresh.pagination?.totalPages || 1);
              setTotalOrders(fresh.pagination?.total || fresh.data.length);
              setIsLoading(false);
            }
          },
        });

        if (response && Array.isArray(response.data)) {
          setOrders(response.data);
          setTotalPages(response.pagination?.totalPages || 1);
          setTotalOrders(response.pagination?.total || response.data.length);
        }
      } catch (err: unknown) {
        console.error("Failed to load orders:", err);
        const msg = err instanceof Error ? err.message : "Failed to load orders.";
        setError(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      statusFilter,
      paymentStatusFilter,
      planTypeFilter,
      debouncedCustomerSearch,
      debouncedOrderNumber,
      startDate,
      endDate,
    ]
  );

  // Trigger search on filter / page change
  useEffect(() => {
    setCurrentPage(1);
    loadOrders(1, false);
  }, [loadOrders]);

  const handleResetFilters = () => {
    setCustomerSearch("");
    setOrderNumberInput("");
    setDebouncedCustomerSearch("");
    setDebouncedOrderNumber("");
    setStatusFilter("ALL");
    setPaymentStatusFilter("ALL");
    setPlanTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== "ALL" ||
      paymentStatusFilter !== "ALL" ||
      planTypeFilter !== "ALL" ||
      debouncedCustomerSearch.length > 0 ||
      debouncedOrderNumber.length > 0 ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [
    statusFilter,
    paymentStatusFilter,
    planTypeFilter,
    debouncedCustomerSearch,
    debouncedOrderNumber,
    startDate,
    endDate,
  ]);

  // Count active filters in the collapsible section
  const extraFiltersCount = useMemo(() => {
    let count = 0;
    if (planTypeFilter !== "ALL") count++;
    if (paymentStatusFilter !== "ALL") count++;
    if (debouncedOrderNumber.length > 0) count++;
    if (Boolean(endDate)) count++;
    return count;
  }, [planTypeFilter, paymentStatusFilter, debouncedOrderNumber, endDate]);

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailOpen(true);
  };

  const handleOrderUpdated = (updatedOrder: AdminOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
    );
  };

  // Helper for quick status pills
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "DELIVERED":
        return {
          className: "bg-[#B8E8B8] border-2 border-black text-[#14532D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <CheckCircle2 className="h-3 w-3 stroke-[3]" />,
          label: "Delivered",
        };
      case "OUT_FOR_DELIVERY":
        return {
          className: "bg-[#FED7AA] border-2 border-black text-[#9A3412] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Truck className="h-3 w-3 stroke-[2.5]" />,
          label: "Out for Delivery",
        };
      case "CONFIRMED":
        return {
          className: "bg-[#D8CEF6] border-2 border-black text-[#4C1D95] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Check className="h-3 w-3 stroke-[3]" />,
          label: "Confirmed",
        };
      case "PROCESSING":
        return {
          className: "bg-[#BAE6FD] border-2 border-black text-[#0369A1] shadow-[1px_1px_0px_0px_#000000]",
          icon: <RefreshCw className="h-3 w-3 stroke-[2.5]" />,
          label: "Processing",
        };
      case "PENDING":
        return {
          className: "bg-[#FFDF58] border-2 border-black text-[#713F12] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Clock className="h-3 w-3 stroke-[3]" />,
          label: "Pending",
        };
      case "CANCELLED":
        return {
          className: "bg-stone-200 border-2 border-black text-stone-700 shadow-[1px_1px_0px_0px_#000000]",
          icon: <XCircle className="h-3 w-3 stroke-[2.5]" />,
          label: "Cancelled",
        };
      case "FAILED":
        return {
          className: "bg-[#FFD9D0] border-2 border-black text-[#7F1D1D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <AlertTriangle className="h-3 w-3 stroke-[2.5]" />,
          label: "Failed",
        };
      default:
        return {
          className: "bg-white border-2 border-black text-black",
          icon: <Package className="h-3 w-3" />,
          label: status,
        };
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "PAID":
        return {
          className: "bg-[#B8E8B8] border border-black text-[#14532D] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Check className="h-2.5 w-2.5 stroke-[3]" />,
          label: "Paid",
        };
      case "PENDING":
        return {
          className: "bg-[#FFE58F] border border-black text-[#854D0E] shadow-[1px_1px_0px_0px_#000000]",
          icon: <Clock className="h-2.5 w-2.5 stroke-[2.5]" />,
          label: "Payment Pending",
        };
      case "FAILED":
        return {
          className: "bg-[#FFD9D0] border border-black text-[#991B1B] shadow-[1px_1px_0px_0px_#000000]",
          icon: <AlertTriangle className="h-2.5 w-2.5 stroke-[2.5]" />,
          label: "Failed",
        };
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return {
          className: "bg-[#D8CEF6] border border-black text-[#4C1D95] shadow-[1px_1px_0px_0px_#000000]",
          icon: <RotateCcw className="h-2.5 w-2.5 stroke-[2.5]" />,
          label: status === "REFUNDED" ? "Refunded" : "Partial Refund",
        };
      default:
        return {
          className: "bg-stone-100 border border-black/30 text-stone-700",
          icon: null,
          label: status,
        };
    }
  };

  const getPlanBadge = (planType: PlanType) => {
    switch (planType) {
      case "BUY_ONCE":
        return {
          bg: "bg-[#FFF9D6] border border-black/40 text-[#713F12]",
          label: "Buy Once",
        };
      case "SEVEN_DAY_TRIAL":
        return {
          bg: "bg-[#F3E8FF] border border-black/40 text-[#581C87]",
          label: "7-Day Trial",
        };
      case "MONTHLY":
      default:
        return {
          bg: "bg-[#E0F2FE] border border-black/40 text-[#075985]",
          label: "Monthly",
        };
    }
  };

  const quickFilterTabs: Array<{ key: OrderStatus | "ALL"; label: string }> = [
    { key: "ALL", label: "All Orders" },
    { key: "PENDING", label: "Pending" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { key: "DELIVERED", label: "Delivered" },
  ];

  return (
    <div className="space-y-5">
      {/* ========================================================= */}
      {/* 1. TOP HEADER                                             */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
            Order Dispatch & Fulfillment
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-[#5C5647] mt-0.5">
            Manage daily morning dispatches, delivery windows, and status updates across Raipur.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadOrders(currentPage, true)}
            disabled={isRefreshing}
            aria-label="Sync orders from server"
            className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Syncing..." : "Sync Orders"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-[12px] border-2 border-black bg-[#FFD9D0] p-3.5 text-xs font-black text-[#7F1D1D] shadow-[3px_3px_0px_0px_#1A1A1A]"
        >
          <AlertTriangle className="h-4 w-4 stroke-[3] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. QUICK STATUS CHIPS                                     */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center gap-1.5">
        {quickFilterTabs.map((tab) => {
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
              {tab.key !== "ALL" && (
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

      {/* ========================================================= */}
      {/* 3. MINIMAL FILTER BLOCK (Collapsed by Default)            */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-black p-3.5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
        {/* Primary Single Row: Search + Status + Date + Expander */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          {/* Search Box (Customer Name/Phone/Email) */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
            <Input
              placeholder="Search customer name, phone, or email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] placeholder:text-[#5C5647]/70"
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

          {/* Order Status Select */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as OrderStatus | "ALL");
                setCurrentPage(1);
              }}
              aria-label="Filter by order status"
              className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-2.5 text-xs font-black uppercase text-[#1A1A1A] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Quick Date Selector */}
          <div className="sm:col-span-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by delivery date"
              className="h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
            />
          </div>

          {/* Actions: More Filters Toggle + Reset */}
          <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsMoreFiltersOpen(!isMoreFiltersOpen)}
              aria-expanded={isMoreFiltersOpen}
              aria-label={isMoreFiltersOpen ? "Collapse extra filters" : "Expand extra filters"}
              className={`h-9 px-3 rounded-[8px] border-2 border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                isMoreFiltersOpen || extraFiltersCount > 0
                  ? "bg-[#FFDF58] text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]"
                  : "bg-white hover:bg-[#FAF7EC] text-[#5C5647] hover:text-[#1A1A1A]"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3 stroke-[2.5]" />
              <span>Filters</span>
              {extraFiltersCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-black text-[#FFDF58] text-[10px] font-mono font-black flex items-center justify-center">
                  {extraFiltersCount}
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
                aria-label="Reset all active filters"
                title="Reset all filters"
                className="h-9 px-2.5 rounded-[8px] border-2 border-black/30 hover:border-black bg-[#FAF7EC] hover:bg-stone-200 text-[#1A1A1A] text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="h-3 w-3 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Secondary Filters (Only rendered when expanded) */}
        {isMoreFiltersOpen && (
          <div className="pt-3 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
            {/* Order Number Input */}
            <div className="relative">
              <Package className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#5C5647] stroke-[2.5]" />
              <Input
                placeholder="Order # (e.g. PF10001)..."
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                className="pl-9 h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px] bg-white text-[#1A1A1A]"
              />
            </div>

            {/* Plan Type Dropdown */}
            <div>
              <select
                value={planTypeFilter}
                onChange={(e) => {
                  setPlanTypeFilter(e.target.value as PlanType | "ALL");
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-3 text-xs font-black uppercase text-[#1A1A1A] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Plan Types</option>
                <option value="MONTHLY">Monthly Subscription</option>
                <option value="SEVEN_DAY_TRIAL">7-Day Intro Trial</option>
                <option value="BUY_ONCE">Buy Once Trial</option>
              </select>
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value as PaymentStatus | "ALL");
                  setCurrentPage(1);
                }}
                className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-3 text-xs font-black uppercase text-[#1A1A1A] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending Payment</option>
                <option value="FAILED">Payment Failed</option>
                <option value="REFUNDED">Refunded</option>
                <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
              </select>
            </div>

            {/* Date To */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase text-[#5C5647] shrink-0">
                To:
              </span>
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
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. ORDERS DISPATCH TABLE                                  */}
      {/* ========================================================= */}
      <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3.5 px-4 border-r-2 border-black w-36">Order #</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                <th className="py-3.5 px-4 border-r-2 border-black w-40">Delivery Window</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-32">Plan</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-right w-32">Order Total</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-40">Status</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center w-36">Payment</th>
                <th className="py-3.5 px-4 text-center w-32">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black bg-white">
              {isLoading && orders.length === 0 ? (
                // SKELETON LOADING STATE
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-5 bg-[#E5E0D8] rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-36 mb-1.5" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-24" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-24 mb-1" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-5 bg-[#E5E0D8] rounded-full w-20 mx-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-right">
                      <div className="h-5 bg-[#E5E0D8] rounded w-16 ml-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-6 bg-[#E5E0D8] rounded-full w-28 mx-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-5 bg-[#E5E0D8] rounded-full w-20 mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-7 bg-[#E5E0D8] rounded-[8px] w-20 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                // FRIENDLY EMPTY STATE
                <tr>
                  <td colSpan={8} className="py-14 px-4 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7EC] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                          <Package className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-tight text-[#1A1A1A]">
                          {hasActiveFilters
                            ? "No orders for these filters"
                            : "No dispatched orders yet"}
                        </h3>
                        <p className="text-xs font-semibold text-[#5C5647]">
                          {hasActiveFilters
                            ? "Try adjusting your search terms, status filter, or date range."
                            : "New customer orders will appear here automatically for morning dispatch."}
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
                orders.map((order) => {
                  const windowTime =
                    order.deliveryStartTime && order.deliveryEndTime
                      ? `${order.deliveryStartTime} - ${order.deliveryEndTime}`
                      : "06:00 - 08:00";

                  const planBadge = getPlanBadge(order.planType);
                  const isPrepaidPlan = ["BUY_ONCE", "SEVEN_DAY_TRIAL", "MONTHLY"].includes(order.planType);
                  const displayPaymentStatus: PaymentStatus = isPrepaidPlan ? "PAID" : order.paymentStatus;

                  const statusBadge = getOrderStatusBadge(order.status);
                  const paymentBadge = getPaymentStatusBadge(displayPaymentStatus);
                  const isCopied = copiedId === order.orderNumber;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FAF7EC]/80 transition-colors group"
                    >
                      {/* ORDER # with Copy Button */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="rounded-[6px] border border-black bg-[#FAF7EC] px-2 py-0.5 text-xs font-mono font-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]"
                            title={`Order Number: ${order.orderNumber}`}
                          >
                            {order.orderNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyOrderNumber(e, order.orderNumber)}
                            title="Copy Order Number"
                            aria-label={`Copy order number ${order.orderNumber}`}
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

                      {/* CUSTOMER NAME + PHONE */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(order.id)}
                          className="font-black text-[#1A1A1A] text-xs hover:underline cursor-pointer text-left block"
                        >
                          {order.customer?.name || "Customer"}
                        </button>
                        <div className="text-[11px] font-mono font-medium text-[#5C5647]">
                          {order.customer?.mobile || "No phone"}
                        </div>
                      </td>

                      {/* DELIVERY WINDOW */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="font-mono font-bold text-xs text-[#1A1A1A]">
                          {order.deliveryDate || formatDate(order.createdAt)}
                        </div>
                        <div className="text-[10px] font-mono text-[#5C5647] flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 stroke-[2]" />
                          {windowTime}
                        </div>
                      </td>

                      {/* PLAN */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-mono font-black uppercase ${planBadge.bg}`}
                        >
                          {planBadge.label}
                        </span>
                      </td>

                      {/* ORDER TOTAL */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-black text-sm tabular-nums text-[#1A1A1A] align-middle">
                        {formatCurrency(order.totalPaise / 100)}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${statusBadge.className}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* PAYMENT STATUS */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-bold uppercase ${paymentBadge.className}`}
                        >
                          {paymentBadge.icon}
                          {paymentBadge.label}
                        </span>
                      </td>

                      {/* ACTION (Clear Primary Button) */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(order.id)}
                          aria-label={`Manage order ${order.orderNumber}`}
                          className="rounded-[8px] bg-[#FFDF58] hover:bg-[#fcd033] font-black text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3 w-3 stroke-[3]" />
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
        <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Showing <strong className="font-mono">{orders.length}</strong> of{" "}
            <strong className="font-mono">{totalOrders}</strong> dispatched orders
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => {
                const prev = currentPage - 1;
                setCurrentPage(prev);
                loadOrders(prev, false);
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
                loadOrders(next, false);
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
      {/* 5. ORDER INSPECTION & LIFECYCLE MANAGEMENT DRAWER         */}
      {/* ========================================================= */}
      <OrderDetailSheet
        orderId={selectedOrderId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onStatusUpdated={handleOrderUpdated}
      />
    </div>
  );
}
