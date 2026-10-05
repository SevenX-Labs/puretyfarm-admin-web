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
  { name: "Daily Milk", value: 65, color: "#FFD84D" },
  { name: "Alternate Days", value: 20, color: "#4A1515" },
  { name: "7-Day Trials", value: 10, color: "#8FD694" },
  { name: "Paused / At Risk", value: 5, color: "#FFD9D0" },
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
      <div className="bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="border-2 border-[#1A1A1A] bg-white px-2.5 py-1 text-xs font-black uppercase text-[#1A1A1A] rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
            ⚡ 10:00 PM CUTOFF
          </div>
          <div className="font-extrabold text-sm uppercase text-[#1A1A1A]">
            Early Morning Milk Dispatch Target:{" "}
            <span className="underline decoration-2 font-mono">
              Before 09:00 AM
            </span>
          </div>
          <span className="hidden lg:inline font-bold text-[#1A1A1A]">•</span>
          <div className="text-xs font-bold text-[#1A1A1A] font-mono">
            9 Raipur Delivery Zones Configured
          </div>
        </div>

        <Link
          href="/orders"
          className="shrink-0 flex items-center gap-1.5 border-2 border-[#1A1A1A] bg-white px-3 py-1.5 text-xs font-black uppercase text-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <span>View Dispatch Queue</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
        </Link>
      </div>

      {/* Row 2: 4 Neo-Brutalist Data Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tomorrow's A2 Milk */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-5 flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-[#1A1A1A]">
              Tomorrow&apos;s A2 Milk
            </span>
            <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 text-[10px] font-mono font-black uppercase rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              Demand
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-[#1A1A1A]">
              482 L
            </div>
            <div className="text-xs font-bold text-[#5C5647] mt-1">
              +14L scheduled across Raipur
            </div>
          </div>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-5 flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-[#1A1A1A]">
              Active Subscriptions
            </span>
            <span className="bg-[#D8CEF6] border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 text-[10px] font-mono font-black uppercase rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              Daily
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-[#1A1A1A]">
              318
            </div>
            <div className="text-xs font-bold text-[#5C5647] mt-1">
              Raipur households subscribed
            </div>
          </div>
        </div>

        {/* Card 3: Delivery Fleet */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-5 flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-[#1A1A1A]">
              Delivery Fleet
            </span>
            <span className="bg-[#FFD9D0] border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 text-[10px] font-mono font-black uppercase rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              Notice
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-[#1A1A1A]">
              6 / 7
            </div>
            <div className="text-xs font-bold text-[#4A1515] mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 stroke-[3]" />
              1 Unassigned in Samta Colony
            </div>
          </div>
        </div>

        {/* Card 4: Wallet Float */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-5 flex flex-col justify-between hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
          <div className="flex items-start justify-between">
            <span className="text-xs font-extrabold uppercase tracking-tight text-[#1A1A1A]">
              Wallet Float
            </span>
            <span className="bg-[#B9E8B4] border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 text-[10px] font-mono font-black uppercase rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              Prepaid
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black font-mono tabular-nums text-[#1A1A1A]">
              ₹2,48,910
            </div>
            <div className="text-xs font-bold text-[#5C5647] mt-1">
              14 accounts below ₹100
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Two-Column Analytics Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Milk & Order Volume Overview */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-6 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3.5 mb-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                Daily Desi Milk Volume (Liters)
              </h2>
              <p className="text-xs font-semibold text-[#5C5647]">
                Last 7 days milk output delivered across Raipur.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border-2 border-[#1A1A1A] bg-[#FFD84D]" />
              <span className="text-[11px] font-mono font-black text-[#1A1A1A] uppercase">
                A2 Gir Cow Milk
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={VOLUME_DATA}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="0"
                    stroke="#1A1A1A"
                    strokeOpacity={0.15}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="#1A1A1A"
                    tick={{ fill: "#1A1A1A", fontSize: 11, fontWeight: "bold" }}
                    axisLine={{ stroke: "#1A1A1A", strokeWidth: 2 }}
                    tickLine={{ stroke: "#1A1A1A", strokeWidth: 2 }}
                  />
                  <YAxis
                    stroke="#1A1A1A"
                    tick={{ fill: "#1A1A1A", fontSize: 11, fontWeight: "bold" }}
                    axisLine={{ stroke: "#1A1A1A", strokeWidth: 2 }}
                    tickLine={{ stroke: "#1A1A1A", strokeWidth: 2 }}
                    domain={[400, 500]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "2px solid #1A1A1A",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 0px 0px #1A1A1A",
                      fontWeight: "bold",
                      fontSize: "12px",
                      color: "#1A1A1A",
                    }}
                    cursor={{ fill: "rgba(255, 216, 77, 0.2)" }}
                    formatter={(val) => [`${val} Liters`, "A2 Puretyfarm Milk"]}
                  />
                  <Bar
                    dataKey="liters"
                    fill="#FFD84D"
                    stroke="#1A1A1A"
                    strokeWidth={2}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center font-bold text-xs uppercase text-stone-400">
                Loading Volume Analytics...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Plans Distribution */}
        <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] p-6 hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[6px_6px_0px_0px_#1A1A1A] transition-all">
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3.5 mb-4">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                Subscription Plan Mix
              </h2>
              <p className="text-xs font-semibold text-[#5C5647]">
                Customer frequency breakdown across active accounts.
              </p>
            </div>
            <span className="border-2 border-[#1A1A1A] bg-[#FAF7EC] px-2 py-0.5 text-[10px] font-mono font-black uppercase rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A]">
              Live Mix
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            <div className="h-60 w-52 shrink-0 flex items-center justify-center">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DONUT_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="#1A1A1A"
                      strokeWidth={2}
                    >
                      {DONUT_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #1A1A1A",
                        borderRadius: "8px",
                        boxShadow: "3px 3px 0px 0px #1A1A1A",
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
                  className="flex items-center justify-between p-2.5 border-2 border-[#1A1A1A] bg-[#FAF7EC] rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 border-2 border-[#1A1A1A] rounded-[4px]"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#1A1A1A]">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Morning Dispatch Queue Table */}
      <div className="border-2 border-[#1A1A1A] rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] bg-white overflow-hidden">
        <div className="p-5 border-b-2 border-[#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF7EC]">
          <div>
            <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
              Morning Dispatch Queue
            </h2>
            <p className="text-xs font-semibold text-[#5C5647]">
              Orders assigned for doorstep delivery before 09:00 AM.
            </p>
          </div>

          {/* Area Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {areaTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedAreaTab(tab)}
                className={`border-2 border-[#1A1A1A] px-3 py-1.5 text-xs font-black uppercase tracking-tight rounded-[10px] transition-all cursor-pointer ${
                  selectedAreaTab === tab
                    ? "bg-[#FFD84D] shadow-[3px_3px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white hover:bg-stone-50 shadow-[1px_1px_0px_0px_#1A1A1A]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#4A1515] text-[#FFD84D] uppercase font-mono text-[10px] font-black tracking-wider border-b-2 border-[#1A1A1A]">
              <tr>
                <th className="py-3 px-5 border-r-2 border-[#1A1A1A]">Customer</th>
                <th className="py-3 px-5 border-r-2 border-[#1A1A1A]">Raipur Area</th>
                <th className="py-3 px-5 border-r-2 border-[#1A1A1A]">Product & Qty</th>
                <th className="py-3 px-5 border-r-2 border-[#1A1A1A]">Plan Type</th>
                <th className="py-3 px-5 border-r-2 border-[#1A1A1A]">Status</th>
                <th className="py-3 px-5 text-right">Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#1A1A1A] bg-white">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => handleRowClick(order)}
                  className="hover:bg-[#FFF9D2] transition-colors cursor-pointer group"
                >
                  {/* Customer */}
                  <td className="py-3.5 px-5 border-r-2 border-[#1A1A1A]">
                    <div className="font-extrabold text-[#1A1A1A] group-hover:underline">
                      {order.customerName}
                    </div>
                    <div className="text-[11px] font-mono font-bold text-[#5C5647] mt-0.5">
                      {order.phone}
                    </div>
                  </td>

                  {/* Area */}
                  <td className="py-3.5 px-5 border-r-2 border-[#1A1A1A] font-bold text-xs text-[#1A1A1A]">
                    {order.area}
                  </td>

                  {/* Product & Qty */}
                  <td className="py-3.5 px-5 border-r-2 border-[#1A1A1A] text-xs">
                    <div className="font-bold text-[#1A1A1A]">{order.product}</div>
                    <div className="text-[11px] font-mono text-[#5C5647]">
                      {order.quantity}
                    </div>
                  </td>

                  {/* Plan Type */}
                  <td className="py-3.5 px-5 border-r-2 border-[#1A1A1A]">
                    <span className="inline-block border-2 border-[#1A1A1A] bg-white px-2 py-0.5 text-[10px] font-mono font-black uppercase text-[#1A1A1A] rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A]">
                      {order.type}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-5 border-r-2 border-[#1A1A1A]">
                    {order.status === "Delivered" ? (
                      <span className="inline-block border-2 border-[#1A1A1A] bg-[#B9E8B4] px-2 py-0.5 text-[10px] font-mono font-black uppercase text-[#1A1A1A] rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A]">
                        Delivered
                      </span>
                    ) : order.status === "Skipped" ? (
                      <span className="inline-block border-2 border-[#1A1A1A] bg-[#FFD9D0] px-2 py-0.5 text-[10px] font-mono font-black uppercase text-[#1A1A1A] rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A]">
                        Skipped (Low Balance)
                      </span>
                    ) : (
                      <span className="inline-block border-2 border-[#1A1A1A] bg-[#FFD84D] px-2 py-0.5 text-[10px] font-mono font-black uppercase text-[#1A1A1A] rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A]">
                        Pending Dispatch
                      </span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="py-3.5 px-5 text-right font-mono font-black tabular-nums text-[#1A1A1A] text-sm">
                    {formatCurrency(order.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#FAF7EC] border-t-2 border-[#1A1A1A] text-xs font-bold text-[#1A1A1A] flex items-center justify-between px-5">
          <span>
            Total: <strong className="font-mono">{filteredOrders.length}</strong> orders scheduled
          </span>
          <span className="font-mono text-[#5C5647] text-[11px]">
            Click any row to manage customer wallet & credit override
          </span>
        </div>
      </div>

      {/* Customer Quick Detail Drawer (Uses shared component) */}
      <CustomerDetailSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        customer={selectedCustomer}
      />
    </div>
  );
}
