"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MOCK_ORDERS,
  MOCK_CUSTOMERS,
} from "@/lib/mock-data";
import { OrderItem, Customer } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Milk,
  Users,
  Truck,
  Wallet,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

const VOLUME_DATA = [
  { day: "28 Sep", liters: 440 },
  { day: "29 Sep", liters: 455 },
  { day: "30 Sep", liters: 462 },
  { day: "01 Oct", liters: 470 },
  { day: "02 Oct", liters: 475 },
  { day: "03 Oct", liters: 478 },
  { day: "04 Oct", liters: 482 },
];

const DONUT_DATA = [
  { name: "Daily Milk", value: 65, color: "#FFDF58" },
  { name: "Alternate Days", value: 20, color: "#4A1513" },
  { name: "7-Day Trials", value: 10, color: "#B8E8B8" },
  { name: "Paused / At Risk", value: 5, color: "#FF8E72" },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderItem[]>(MOCK_ORDERS);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAreaTab, setSelectedAreaTab] = useState<string>("All");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="space-y-6">
      {/* Row 1: Operational Readiness Banner */}
      <div className="bg-[#FFDF58] border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="border-2 border-black bg-white px-2.5 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000000]">
            ⚡ 10:00 PM CUTOFF
          </div>
          <div className="font-extrabold text-sm uppercase text-black">
            Early Morning Milk Dispatch Target:{" "}
            <span className="underline decoration-2 font-mono">
              Before 09:00 AM
            </span>
          </div>
          <span className="hidden lg:inline font-bold text-black">•</span>
          <div className="text-xs font-bold text-black font-mono">
            9 Raipur Delivery Zones Configured
          </div>
        </div>

        <Link
          href="/orders"
          className="shrink-0 flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <span>View Dispatch Queue</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
        </Link>
      </div>

      {/* Row 2: 4 Neo-Brutalist Data Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tomorrow's A2 Milk */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-black">
              Tomorrow&apos;s A2 Milk
            </span>
            <span className="bg-[#FFDF58] border-2 border-black text-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000]">
              Demand
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-black">
              482 L
            </div>
            <div className="text-xs font-bold text-stone-700 mt-1">
              +14L scheduled across Raipur
            </div>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-black">
              Active Subscriptions
            </span>
            <span className="bg-[#D8CEF6] border-2 border-black text-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000]">
              Daily
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-black">
              318
            </div>
            <div className="text-xs font-bold text-stone-700 mt-1">
              Raipur households subscribed
            </div>
          </div>
        </div>

        {/* Card 3: Delivery Fleet */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-black">
              Delivery Fleet
            </span>
            <span className="bg-[#FF8E72] border-2 border-black text-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000]">
              Notice
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-black">
              6 / 7
            </div>
            <div className="text-xs font-bold text-[#FF8E72] mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 stroke-[3]" />
              1 Unassigned in Samta Colony
            </div>
          </div>
        </div>

        {/* Card 4: Wallet Float */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-black">
              Wallet Float
            </span>
            <span className="bg-[#B8E8B8] border-2 border-black text-black px-2 py-0.5 text-[10px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_#000000]">
              Prepaid
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-black">
              ₹2,48,910
            </div>
            <div className="text-xs font-bold text-stone-700 mt-1">
              14 accounts below ₹100
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Two-Column Analytics Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Milk & Order Volume Overview */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-black">
                Milk & Order Volume Overview
              </h2>
              <p className="text-xs font-medium text-stone-600">
                Daily liter delivery demand across the past 7 days.
              </p>
            </div>
            <span className="bg-[#FFDF58] border-2 border-black px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
              482 L PEAK
            </span>
          </div>

          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={VOLUME_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0dcd0" />
                  <XAxis
                    dataKey="day"
                    stroke="#000000"
                    fontSize={11}
                    fontWeight="bold"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#000000"
                    fontSize={11}
                    fontWeight="bold"
                    tickLine={false}
                    unit="L"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFDF58",
                      border: "2px solid #000000",
                      boxShadow: "3px 3px 0px 0px #000000",
                      fontWeight: "bold",
                      fontSize: "12px",
                      color: "#000000",
                    }}
                  />
                  <Bar
                    dataKey="liters"
                    name="Liters"
                    fill="#FFDF58"
                    stroke="#000000"
                    strokeWidth={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center font-bold text-xs uppercase text-stone-400">
                Loading Volume Graph...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subscription Breakdown / Risk Profile */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-black">
                Subscription Breakdown & Risk Profile
              </h2>
              <p className="text-xs font-medium text-stone-600">
                Active plans vs tasting trials & paused accounts.
              </p>
            </div>
            <span className="bg-[#B8E8B8] border-2 border-black px-2 py-0.5 font-mono text-xs font-black text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
              95% HEALTHY
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="h-60 w-52 shrink-0">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DONUT_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="#000000"
                      strokeWidth={2}
                    >
                      {DONUT_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #000000",
                        boxShadow: "3px 3px 0px 0px #000000",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                      formatter={(val) => [`${val}%`, "Share"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 w-52 flex items-center justify-center font-bold text-xs uppercase text-stone-400">
                  Loading Chart...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 w-full">
              {DONUT_DATA.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 border-2 border-black bg-stone-50 shadow-[2px_2px_0px_0px_#000000]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 border-2 border-black"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold text-black uppercase">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-black">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Morning Dispatch Queue Table */}
      <div className="border-2 border-black shadow-[4px_4px_0px_0px_#000000] bg-white">
        <div className="p-5 border-b-2 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FBF8EE]">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-black">
              Morning Dispatch Queue
            </h2>
            <p className="text-xs font-medium text-stone-600">
              Orders assigned for doorstep delivery before 09:00 AM.
            </p>
          </div>

          {/* Area Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {areaTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedAreaTab(tab)}
                className={`border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-tight transition-all ${
                  selectedAreaTab === tab
                    ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white hover:bg-stone-100 hover:shadow-[1px_1px_0px_0px_#000000]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#4A1513] text-[#FFDF58] uppercase text-[10px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3 px-5 border-r-2 border-black">Customer</th>
                <th className="py-3 px-5 border-r-2 border-black">Raipur Area</th>
                <th className="py-3 px-5 border-r-2 border-black">Product & Qty</th>
                <th className="py-3 px-5 border-r-2 border-black">Plan Type</th>
                <th className="py-3 px-5 border-r-2 border-black">Status</th>
                <th className="py-3 px-5 text-right">Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-white">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => handleRowClick(order)}
                  className="hover:bg-[#FFF9D2] transition-colors cursor-pointer group"
                >
                  {/* Customer */}
                  <td className="py-3.5 px-5 border-r-2 border-black">
                    <div className="font-extrabold text-black group-hover:underline">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] font-mono font-bold text-stone-600 mt-0.5">
                      {order.phone}
                    </div>
                  </td>

                  {/* Area */}
                  <td className="py-3.5 px-5 border-r-2 border-black font-bold text-xs text-black">
                    {order.area}
                  </td>

                  {/* Product & Qty */}
                  <td className="py-3.5 px-5 border-r-2 border-black text-xs">
                    <div className="font-bold text-black">{order.product}</div>
                    <div className="text-[11px] font-mono text-stone-600">
                      {order.quantity}
                    </div>
                  </td>

                  {/* Plan Type */}
                  <td className="py-3.5 px-5 border-r-2 border-black">
                    <span className="inline-block border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                      {order.type}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-5 border-r-2 border-black">
                    {order.status === "Delivered" ? (
                      <span className="inline-block border-2 border-black bg-[#B8E8B8] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                        Delivered
                      </span>
                    ) : order.status === "Skipped" ? (
                      <span className="inline-block border-2 border-black bg-[#FF8E72] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                        Skipped (Low Balance)
                      </span>
                    ) : (
                      <span className="inline-block border-2 border-black bg-[#FFDF58] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                        Pending Dispatch
                      </span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="py-3.5 px-5 text-right font-mono font-black tabular-nums text-black text-sm">
                    {formatCurrency(order.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#FBF8EE] border-t-2 border-black text-xs font-bold text-black flex items-center justify-between px-5">
          <span>
            Total: <strong className="font-mono">{filteredOrders.length}</strong> orders scheduled
          </span>
          <span className="font-mono text-stone-600">
            Click any row to manage customer wallet & credit override
          </span>
        </div>
      </div>

      {/* Customer Detail Drawer */}
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
