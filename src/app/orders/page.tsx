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
  Receipt,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OrdersPage() {
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

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsDetailOpen(true);
  };

  const handleOrderUpdated = (updatedOrder: AdminOrder) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === updatedOrder.id ? { ...ord, ...updatedOrder } : ord))
    );
  };

  // Helper for Order Status Badge
  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "DELIVERED":
        return "bg-[#B8E8B8] border border-black text-black font-mono font-bold text-xs";
      case "OUT_FOR_DELIVERY":
      case "PROCESSING":
        return "bg-[#FFDF58] border border-black text-black font-mono font-bold text-xs";
      case "CONFIRMED":
        return "bg-[#B8E8B8] border border-black text-black font-mono font-bold text-xs";
      case "PENDING":
        return "bg-[#D8CEF6] border border-black text-black font-mono font-bold text-xs";
      case "CANCELLED":
      case "FAILED":
        return "bg-[#FF8E72] border border-black text-black font-mono font-bold text-xs";
      default:
        return "bg-white border border-black text-black font-mono font-bold text-xs";
    }
  };

  // Helper for Payment Status Badge
  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "PAID":
        return "bg-[#B8E8B8] border border-black text-black font-mono font-bold text-[10px]";
      case "PENDING":
        return "bg-[#FFDF58] border border-black text-black font-mono font-bold text-[10px]";
      case "FAILED":
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return "bg-[#FF8E72] border border-black text-black font-mono font-bold text-[10px]";
      default:
        return "bg-white border border-black text-black font-mono text-[10px]";
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER                                             */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black leading-tight">
            Order Dispatch & Fulfillment
          </h1>
          <p className="text-xs font-bold text-[#5C5647]">
            Manage daily morning delivery dispatches, order transitions, and customer invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadOrders(currentPage, true)}
          disabled={isRefreshing}
          className="cursor-pointer rounded-[10px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin" : ""}`} />
          Sync Orders
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A]">
          <AlertTriangle className="h-4 w-4 stroke-[3]" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. INTERACTIVE MULTI-FILTER CARD                          */}
      {/* ========================================================= */}
      <div className="bg-white border-2 border-black p-4 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] space-y-3">
        <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 stroke-[2.5]" />
            Multi-Criteria Search & Filter
          </span>

          <button
            type="button"
            onClick={handleResetFilters}
            className="cursor-pointer rounded-[8px] bg-[#FF8E72] hover:bg-[#ff7b5a] border-2 border-black text-[#1A1A1A] font-black text-[11px] uppercase px-3 py-1 shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3 stroke-[2.5]" />
            Reset Filters
          </button>
        </div>

        {/* Row 1: Search inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Customer Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
            <Input
              placeholder="Search Name, Phone, Email..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-9 h-9 text-xs font-bold border-2 border-black rounded-[8px]"
            />
          </div>

          {/* Order Number Input */}
          <div className="relative">
            <Package className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#1A1A1A] stroke-[2.5]" />
            <Input
              placeholder="Order Number (e.g. PF10001)..."
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              className="pl-9 h-9 text-xs font-bold font-mono border-2 border-black rounded-[8px]"
            />
          </div>

          {/* Plan Type Dropdown */}
          <div>
            <select
              value={planTypeFilter}
              onChange={(e) => setPlanTypeFilter(e.target.value as PlanType | "ALL")}
              className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="MONTHLY">Monthly Subscription</option>
              <option value="SEVEN_DAY_TRIAL">7-Day Intro Trial</option>
              <option value="BUY_ONCE">Buy Once Trial</option>
            </select>
          </div>
        </div>

        {/* Row 2: Statuses & Date filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Order Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "ALL")}
              className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Order Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatus | "ALL")}
              className="w-full h-9 rounded-[8px] border-2 border-black bg-white px-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
              <option value="REFUNDED">REFUNDED</option>
              <option value="PARTIALLY_REFUNDED">PARTIALLY REFUNDED</option>
            </select>
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
      {/* 3. HIGH-CONTRAST NEO-BRUTALIST ORDERS TABLE               */}
      {/* ========================================================= */}
      <div className="border-2 border-black bg-white rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3.5 px-4 border-r-2 border-black">Order #</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Customer</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Delivery Date & Time</th>
                <th className="py-3.5 px-4 border-r-2 border-black">Items & Plan</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-right">Total</th>
                <th className="py-3.5 px-4 border-r-2 border-black text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y-2 divide-black bg-white">
              {isLoading && orders.length === 0 ? (
                // SKELETON LOADING STATE
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-6 bg-[#E5E0D8] rounded w-24" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-28 mb-1.5" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-4 bg-[#E5E0D8] rounded w-24 mb-1" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black">
                      <div className="h-5 bg-[#E5E0D8] rounded w-28 mb-1" />
                      <div className="h-3 bg-[#E5E0D8]/60 rounded w-20" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-right">
                      <div className="h-5 bg-[#E5E0D8] rounded w-16 ml-auto" />
                    </td>
                    <td className="py-4 px-4 border-r-2 border-black text-center">
                      <div className="h-6 bg-[#E5E0D8] rounded w-20 mx-auto" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-7 bg-[#E5E0D8] rounded w-28 mx-auto" />
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-14 text-center font-bold text-xs uppercase text-[#5C5647]"
                  >
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const itemsCount = order.items?.length || 0;
                  const itemSummary =
                    order.items && order.items.length > 0
                      ? order.items[0].productNameSnapshot + (itemsCount > 1 ? ` +${itemsCount - 1} more` : "")
                      : "Standard Milk Dispatch";

                  const windowTime =
                    order.deliveryStartTime && order.deliveryEndTime
                      ? `${order.deliveryStartTime} - ${order.deliveryEndTime}`
                      : "06:00 - 08:00";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FAF7EC]/80 transition-colors"
                    >
                      {/* ORDER # */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <span className="rounded-[6px] border border-black bg-white px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000] inline-block">
                          {order.orderNumber}
                        </span>
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="font-black text-[#1A1A1A] text-xs">
                          {order.customer?.name || "Customer"}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-[#5C5647]">
                          {order.customer?.mobile || "No phone"}
                        </div>
                      </td>

                      {/* DELIVERY DATE & TIME */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="font-mono font-bold text-xs text-[#1A1A1A]">
                          {order.deliveryDate || formatDate(order.createdAt)}
                        </div>
                        <div className="text-[10px] font-mono text-[#5C5647] flex items-center gap-1">
                          <Clock className="h-3 w-3 stroke-[2]" />
                          {windowTime}
                        </div>
                      </td>

                      {/* ITEMS & PLAN */}
                      <td className="py-3.5 px-4 border-r-2 border-black align-middle">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="rounded-[4px] border border-black bg-[#FAF7EC] px-1.5 py-0.2 text-[10px] font-mono font-black text-[#1A1A1A]">
                            {order.planType.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#1A1A1A] truncate max-w-[200px]" title={itemSummary}>
                          {itemSummary}
                        </div>
                      </td>

                      {/* TOTAL */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-right font-mono font-black text-sm tabular-nums text-[#1A1A1A] align-middle">
                        ₹{Math.round(order.totalPaise / 100)}
                      </td>

                      {/* STATUS BADGES */}
                      <td className="py-3.5 px-4 border-r-2 border-black text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block rounded-[6px] px-2 py-0.5 uppercase tracking-wider ${getOrderStatusBadge(order.status)}`}>
                            {order.status.replace(/_/g, " ")}
                          </span>
                          <span className={`inline-block rounded-[4px] px-1.5 py-0.2 uppercase ${getPaymentStatusBadge(order.paymentStatus)}`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3.5 px-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(order.id)}
                          className="rounded-[8px] bg-[#FFDF58] hover:bg-[#fcd033] font-black text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer inline-flex items-center gap-1 text-[#1A1A1A]"
                        >
                          <span>Inspect & Manage</span>
                          <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
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
                loadOrders(next, false);
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
      {/* 4. ORDER INSPECTION & LIFECYCLE MANAGEMENT DRAWER         */}
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
