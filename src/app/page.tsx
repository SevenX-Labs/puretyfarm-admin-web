"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MOCK_ORDERS,
  MOCK_CUSTOMERS,
} from "@/lib/mock-data";
import { OrderItem, Customer } from "@/types";
import { formatCurrency, formatLiters } from "@/lib/utils";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import {
  Milk,
  Users,
  ShoppingBag,
  Wallet,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderItem[]>(MOCK_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAreaTab, setSelectedAreaTab] = useState<string>("All");

  const areaTabs = ["All", "Shankar Nagar", "Telibandha", "Samta Colony"];

  const filteredOrders = useMemo(() => {
    if (selectedAreaTab === "All") return orders;
    return orders.filter((o) => o.area === selectedAreaTab);
  }, [orders, selectedAreaTab]);

  const handleRowClick = (order: OrderItem) => {
    const cust = customers.find((c) => c.name === order.customerName);
    if (cust) {
      setSelectedCustomer(cust);
      setIsSheetOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Morning Operations Command
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Overview of morning deliveries, active subscriptions, and customer balances in Raipur.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          <Link href="/orders">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50"
            >
              View All Orders
              <ArrowRight className="h-3.5 w-3.5 ml-1.5 text-stone-400" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 1: Daily Operational Status Banner */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-stone-700">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-stone-900">Today&apos;s Deliveries:</span>
            <span className="font-mono tabular-nums text-stone-800 font-medium">
              482 Liters scheduled
            </span>
          </div>

          <span className="hidden md:inline text-stone-300">|</span>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#133826]" />
            <span>10:00 PM Cutoff active</span>
          </div>

          <span className="hidden md:inline text-stone-300">|</span>

          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#C85A32]" />
            <span className="text-[#C85A32] font-medium">
              12 low balance alerts
            </span>
          </div>
        </div>

        <Link href="/customers" className="shrink-0 text-xs font-semibold text-[#133826] hover:underline flex items-center gap-1">
          Review accounts <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Row 2: Key Metrics - 4 Simple Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tomorrow's Milk Demand */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Tomorrow&apos;s Milk Demand
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#133826]">
              <Milk className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
              482 L
            </div>
            <p className="text-xs text-stone-500 mt-1">
              318 active glass bottles
            </p>
          </div>
        </Card>

        {/* Card 2: Active Subscriptions */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#133826]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
              318
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Households across Raipur
            </p>
          </div>
        </Card>

        {/* Card 3: Total Orders Today */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Orders Today
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#133826]">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
              342
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Includes Buy Once ghee orders
            </p>
          </div>
        </Card>

        {/* Card 4: Customer Wallet Balance */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-medium uppercase tracking-wider">
              Customer Wallet Float
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-[#133826]">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-stone-900">
              ₹2,48,910
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Prepaid balance held across accounts
            </p>
          </div>
        </Card>
      </div>

      {/* Row 3: Recent Orders & Deliveries Table */}
      <Card className="overflow-hidden">
        {/* Table Header with Tabs */}
        <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Recent Orders & Deliveries
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Morning doorstep deliveries prepared for Raipur sectors.
            </p>
          </div>

          {/* Area Tabs */}
          <div className="flex items-center rounded-xl bg-stone-100/80 p-1 border border-stone-200/50">
            {areaTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedAreaTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedAreaTab === tab
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Clean, Spacious Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/70 text-stone-500 uppercase text-[10px] font-semibold tracking-wider border-b border-stone-100">
              <tr>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Area</th>
                <th className="py-3.5 px-6">Milk Qty</th>
                <th className="py-3.5 px-6">Plan Type</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => handleRowClick(order)}
                  className="hover:bg-stone-50/60 transition-colors cursor-pointer group"
                >
                  {/* Customer */}
                  <td className="py-4 px-6">
                    <div className="font-medium text-stone-900 group-hover:text-[#133826]">
                      {order.customerName}
                    </div>
                    <div className="text-xs text-stone-400 font-mono mt-0.5">
                      {order.phone}
                    </div>
                  </td>

                  {/* Area */}
                  <td className="py-4 px-6 text-stone-700 text-xs">
                    {order.area}
                  </td>

                  {/* Milk Qty */}
                  <td className="py-4 px-6 text-xs font-medium text-stone-800">
                    {order.product}
                    <span className="block text-[11px] text-stone-500 font-mono mt-0.5">
                      {order.quantity}
                    </span>
                  </td>

                  {/* Plan Type */}
                  <td className="py-4 px-6">
                    <Badge variant="stone" className="text-[11px]">
                      {order.type}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6">
                    {order.status === "Skipped" ? (
                      <Badge variant="error" className="text-[11px]">
                        Skipped (Low Balance)
                      </Badge>
                    ) : (
                      <Badge variant="sage" className="text-[11px]">
                        Scheduled
                      </Badge>
                    )}
                  </td>

                  {/* Value */}
                  <td className="py-4 px-6 text-right font-mono tabular-nums font-semibold text-stone-900 text-xs">
                    {formatCurrency(order.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between px-6">
          <span>
            Showing <strong className="text-stone-800">{filteredOrders.length}</strong> orders
          </span>
          <span className="text-stone-400">
            Click any row to view customer details & wallet float
          </span>
        </div>
      </Card>

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onUpdateCustomer={(updated) => {
          setCustomers((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
        }}
      />
    </div>
  );
}
