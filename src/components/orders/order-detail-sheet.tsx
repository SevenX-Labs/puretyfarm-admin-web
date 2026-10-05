"use client";

import React, { useState, useEffect } from "react";
import {
  AdminOrder,
  OrderStatus,
  PaymentStatus,
  OrderItemSnapshot,
} from "@/types/order";
import {
  fetchOrderDetail,
  updateOrderStatus,
  ORDER_STATE_MACHINE,
} from "@/services/order-service";
import { getCachedData } from "@/lib/cache";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Package,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Receipt,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface OrderDetailSheetProps {
  orderId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updatedOrder: AdminOrder) => void;
}

export function OrderDetailSheet({
  orderId,
  isOpen,
  onClose,
  onStatusUpdated,
}: OrderDetailSheetProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      let isMounted = true;
      setError(null);
      setActionSuccess(null);

      // 0ms instant display from cache if available
      const cached = getCachedData<AdminOrder>(`order:${orderId}`);
      if (cached) {
        setOrder(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      fetchOrderDetail(orderId, {
        onFreshData: (fresh) => {
          if (isMounted && fresh) {
            setOrder(fresh);
            setIsLoading(false);
          }
        },
      })
        .then((fresh) => {
          if (isMounted && fresh) {
            setOrder(fresh);
          }
        })
        .catch((err: unknown) => {
          if (isMounted && !cached) {
            const msg = err instanceof Error ? err.message : "Failed to load order details.";
            setError(msg);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else if (!isOpen) {
      setOrder(null);
      setError(null);
      setActionSuccess(null);
    }
  }, [isOpen, orderId]);

  const handleTransitionStatus = async (targetStatus: OrderStatus) => {
    if (!order) return;
    setIsUpdatingStatus(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await updateOrderStatus(order.id, targetStatus);
      const updated = res.order || { ...order, status: targetStatus, updatedAt: new Date().toISOString() };
      setOrder(updated);
      setActionSuccess(`Order successfully transitioned to ${targetStatus}.`);
      onStatusUpdated?.(updated);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      setError(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getOrderStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case "DELIVERED":
        return "bg-[#B8E8B8] text-[#1A1A1A] border-2 border-black font-black";
      case "OUT_FOR_DELIVERY":
      case "PROCESSING":
        return "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black font-black";
      case "CONFIRMED":
        return "bg-[#B8E8B8] text-[#1A1A1A] border-2 border-black font-black";
      case "PENDING":
        return "bg-[#D8CEF6] text-[#1A1A1A] border-2 border-black font-black";
      case "CANCELLED":
      case "FAILED":
        return "bg-[#FF8E72] text-[#1A1A1A] border-2 border-black font-black";
      default:
        return "bg-white text-[#1A1A1A] border-2 border-black font-bold";
    }
  };

  const getPaymentStatusBadgeClass = (status: PaymentStatus) => {
    switch (status) {
      case "PAID":
        return "bg-[#B8E8B8] text-[#1A1A1A] border border-black font-mono font-bold";
      case "PENDING":
        return "bg-[#FFDF58] text-[#1A1A1A] border border-black font-mono font-bold";
      case "FAILED":
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return "bg-[#FF8E72] text-[#1A1A1A] border border-black font-mono font-bold";
      default:
        return "bg-white text-[#1A1A1A] border border-black font-mono";
    }
  };

  const allowedTransitions = order ? ORDER_STATE_MACHINE[order.status] || [] : [];
  const isTerminal = allowedTransitions.length === 0;

  // Format delivery address snapshot nicely
  const addressSnap = order?.addressSnapshot || {};
  const formattedAddressLines = [
    [addressSnap.houseNumber, addressSnap.buildingName].filter(Boolean).join(", "),
    [addressSnap.streetName, addressSnap.landmark].filter(Boolean).join(" • Near "),
    [addressSnap.area, addressSnap.city].filter(Boolean).join(", "),
    [addressSnap.state, addressSnap.pincode].filter(Boolean).join(" - "),
  ].filter((line) => line && line.trim().length > 0);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-xl p-0 overflow-y-auto bg-[#FAF7EC] border-l-2 border-black shadow-[-5px_0px_0px_0px_#000000]"
      >
        {/* Header Strip */}
        <div className="p-5 border-b-2 border-black bg-white">
          <SheetHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-[6px] border-2 border-black bg-white px-2.5 py-1 text-xs font-mono font-black text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#000000]">
                  {order?.orderNumber || "ORDER"}
                </span>
                {order && (
                  <span
                    className={`rounded-[6px] px-2.5 py-1 text-[11px] font-mono uppercase tracking-wider ${getOrderStatusBadgeClass(
                      order.status
                    )}`}
                  >
                    {order.status.replace(/_/g, " ")}
                  </span>
                )}
              </div>

              {order && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-[6px] px-2 py-0.5 text-[10px] uppercase ${getPaymentStatusBadgeClass(
                      order.paymentStatus
                    )}`}
                  >
                    Payment: {order.paymentStatus}
                  </span>
                </div>
              )}
            </div>

            <SheetTitle className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-3">
              Order Dispatch Snapshot
            </SheetTitle>
            <SheetDescription className="text-xs font-bold text-[#5C5647]">
              Immutable order line items, customer address snapshot, and live delivery lifecycle controls.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {isLoading && !order ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
              <div className="h-32 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
              <div className="h-44 bg-[#E5E0D8] rounded-[10px] border-2 border-black/30" />
            </div>
          ) : error && !order ? (
            <div className="rounded-[10px] border-2 border-black bg-[#FFD9D0] p-4 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <>
              {/* Feedback Alert Banners */}
              {actionSuccess && (
                <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#B8E8B8] p-3 text-xs font-black text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[3]" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_#000000]">
                  <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. STATE MACHINE LIFECYCLE TRANSITION CONTROL */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
                    <span className="text-xs font-black uppercase text-[#1A1A1A]">
                      Lifecycle State Machine
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#5C5647]">
                    Current: {order.status}
                  </span>
                </div>

                {isTerminal ? (
                  <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3 text-xs font-bold text-[#5C5647] flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-[#1A1A1A]" />
                    <span>Order is in a terminal status. No further updates allowed.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647] block">
                      Allowed Transitions:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {allowedTransitions.map((target) => {
                        const isCancelOrFailed = target === "CANCELLED" || target === "FAILED";
                        const isSuccessDelivered = target === "DELIVERED" || target === "CONFIRMED";

                        return (
                          <button
                            key={target}
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleTransitionStatus(target)}
                            className={`rounded-[8px] border-2 border-black px-3.5 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 text-[#1A1A1A] ${
                              isCancelOrFailed
                                ? "bg-[#FF8E72] hover:bg-[#ff7b5a]"
                                : isSuccessDelivered
                                ? "bg-[#B8E8B8] hover:bg-[#9fe09f]"
                                : "bg-[#FFDF58] hover:bg-[#fcd033]"
                            }`}
                          >
                            {isUpdatingStatus ? (
                              <Loader2 className="h-3 w-3 animate-spin stroke-[2.5]" />
                            ) : (
                              <ArrowRight className="h-3 w-3 stroke-[3]" />
                            )}
                            Mark {target.replace(/_/g, " ")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. DELIVERY TIMING & PLAN INFO */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
                    Delivery Schedule
                  </span>
                  <span className="rounded-[6px] border border-black bg-[#FFDF58] px-2 py-0.5 text-[10px] font-mono font-bold text-[#1A1A1A]">
                    {order.planType.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-bold pt-1">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                      Target Date
                    </span>
                    <span className="font-mono font-black text-sm text-[#1A1A1A]">
                      {order.deliveryDate || formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                      Delivery Window
                    </span>
                    <span className="font-mono font-black text-sm text-[#1A1A1A]">
                      {order.deliveryStartTime && order.deliveryEndTime
                        ? `${order.deliveryStartTime} - ${order.deliveryEndTime}`
                        : "06:00 - 08:00 AM"}
                    </span>
                  </div>
                </div>

                {order.invoice && (
                  <div className="flex items-center justify-between pt-2 border-t border-black/10 text-xs font-bold">
                    <span className="text-[#5C5647] flex items-center gap-1">
                      <FileCheck2 className="h-3.5 w-3.5 stroke-[2.5]" />
                      Invoice Generated:
                    </span>
                    <span className="font-mono font-black text-[#1A1A1A]">
                      {order.invoice.invoiceNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* 3. CUSTOMER & DELIVERY ADDRESS SNAPSHOT */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 stroke-[2.5]" />
                    Customer & Address Snapshot
                  </span>
                  <span className="text-[10px] font-mono text-[#5C5647]">
                    Immutable Record
                  </span>
                </div>

                {/* Customer Details */}
                <div className="rounded-[10px] border border-black/20 bg-[#FAF7EC] p-3 text-xs font-bold space-y-1">
                  <div className="font-black text-sm text-[#1A1A1A]">
                    {order.customer?.name || "Customer"}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#5C5647]">
                    <span className="font-mono flex items-center gap-1">
                      <Phone className="h-3 w-3 stroke-[2]" />
                      {order.customer?.mobile || "No phone"}
                    </span>
                    {order.customer?.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 stroke-[2]" />
                        {order.customer.email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Address Lines */}
                <div className="space-y-1 text-xs font-bold text-[#1A1A1A]">
                  <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                    Dispatched Delivery Destination:
                  </span>
                  {formattedAddressLines.length > 0 ? (
                    formattedAddressLines.map((line, idx) => (
                      <div key={idx} className="text-xs leading-relaxed">
                        {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[#5C5647]">
                      Raipur Central Serviceable Hub
                    </div>
                  )}
                </div>
              </div>

              {/* 4. ORDERED ITEMS SNAPSHOT */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 stroke-[2.5]" />
                    Ordered Items Snapshot
                  </span>
                  <span className="font-mono text-xs font-bold text-[#5C5647]">
                    {order.items?.length || 0} Line Item(s)
                  </span>
                </div>

                <div className="divide-y divide-black/10">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-black text-[#1A1A1A]">
                            {item.productNameSnapshot}
                          </div>
                          <div className="text-[10px] font-mono text-[#5C5647]">
                            {item.quantity} Unit(s) × ₹{Math.round(item.unitPricePaise / 100)}
                          </div>
                        </div>

                        <div className="text-right font-mono font-black text-sm text-[#1A1A1A]">
                          ₹{Math.round(item.totalPaise / 100)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-3 text-center text-xs font-bold text-[#5C5647]">
                      1x Standard Daily Bottle (Snapshot Default)
                    </div>
                  )}
                </div>
              </div>

              {/* 5. FINANCIAL BREAKDOWN CARD */}
              <div className="rounded-[14px] border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_#000000] space-y-2.5">
                <span className="text-xs font-black uppercase text-[#1A1A1A] flex items-center gap-1.5 border-b border-black/10 pb-2">
                  <Receipt className="h-3.5 w-3.5 stroke-[2.5]" />
                  Financial Accounting
                </span>

                <div className="space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between text-[#5C5647]">
                    <span>Items Subtotal</span>
                    <span className="font-mono font-black text-[#1A1A1A]">
                      ₹{Math.round(order.subtotalPaise / 100)}
                    </span>
                  </div>

                  {order.discountPaise > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Promotional Discount</span>
                      <span className="font-mono font-black">
                        - ₹{Math.round(order.discountPaise / 100)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-[#5C5647]">
                    <span>Delivery Fee</span>
                    <span className="font-mono font-black text-[#1A1A1A]">
                      {order.deliveryFeePaise === 0 ? "FREE" : `₹${Math.round(order.deliveryFeePaise / 100)}`}
                    </span>
                  </div>

                  {order.taxPaise > 0 && (
                    <div className="flex justify-between text-[#5C5647]">
                      <span>Applicable Taxes</span>
                      <span className="font-mono font-black text-[#1A1A1A]">
                        ₹{Math.round(order.taxPaise / 100)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t-2 border-black text-sm">
                    <span className="font-black uppercase text-[#1A1A1A]">Grand Total</span>
                    <span className="font-mono font-black text-lg text-[#1A1A1A]">
                      ₹{Math.round(order.totalPaise / 100)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
