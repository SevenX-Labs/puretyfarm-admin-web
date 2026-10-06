"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  fetchDashboardOverview,
  DEFAULT_DASHBOARD_DATA,
} from "@/services/dashboard-service";
import {
  DashboardOverviewResponse,
  DashboardTrendDay,
} from "@/types/dashboard";
import {
  ResponsiveContainer,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Truck,
  Users,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Package,
  Layers,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type DatePreset = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM";

const formatDateISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardOverviewResponse>(DEFAULT_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Date range state
  const [activePreset, setActivePreset] = useState<DatePreset>("TODAY");
  const [fromDate, setFromDate] = useState<string>(() => formatDateISO(new Date()));
  const [toDate, setToDate] = useState<string>(() => formatDateISO(new Date()));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch overview data with SWR caching
  const loadDashboardData = useCallback(
    async (from: string, to: string, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);

      try {
        const res = await fetchDashboardOverview(
          { from, to },
          {
            forceRefresh,
            onFreshData: (fresh) => {
              if (fresh) {
                setData(fresh);
                setIsLoading(false);
              }
            },
          }
        );

        if (res) {
          setData(res);
        }
      } catch (err: unknown) {
        console.error("Failed to load dashboard overview:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboardData(fromDate, toDate, false);
  }, [loadDashboardData, fromDate, toDate]);

  // Handle Preset Clicks
  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = formatDateISO(now);

    let start = todayStr;
    let end = todayStr;

    if (preset === "TODAY") {
      start = todayStr;
      end = todayStr;
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatDateISO(y);
      start = yStr;
      end = yStr;
    } else if (preset === "LAST_7_DAYS") {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      start = formatDateISO(s);
      end = todayStr;
    } else if (preset === "THIS_MONTH") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatDateISO(first);
      end = todayStr;
    }

    setFromDate(start);
    setToDate(end);
  };

  // Safe destructuring of live data
  const {
    customers,
    orders,
    sales,
    revenue,
    plans,
    deliveries,
    wallet,
    profit,
    alerts,
    comparison,
    trend,
  } = data;

  // Transform trend data for Recharts chart
  const chartData = useMemo(() => {
    if (!trend?.daily || trend.daily.length === 0) {
      return [
        {
          date: fromDate || "Today",
          sales: Math.round((sales?.totalPaise || 0) / 100),
          revenue: Math.round((revenue?.collectedPaise || 0) / 100),
          orders: orders?.total || 0,
        },
      ];
    }

    return trend.daily.map((item) => {
      // Format short date (e.g. "05 Oct")
      let displayDate = item.date;
      try {
        const d = new Date(item.date);
        displayDate = d.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        });
      } catch {
        // Fallback
      }

      return {
        date: displayDate,
        sales: Math.round(item.salesPaise / 100),
        revenue: Math.round(item.revenueCollectedPaise / 100),
        orders: item.orders,
      };
    });
  }, [trend, sales, revenue, orders, fromDate]);

  // Order status percentages for segmented bar
  const totalOrdersCount = orders.total || 1;
  const confirmedPct = Math.round(((orders.confirmed || 0) / totalOrdersCount) * 100);
  const processingPct = Math.round(((orders.processing || 0) / totalOrdersCount) * 100);
  const outForDeliveryPct = Math.round(((orders.outForDelivery || 0) / totalOrdersCount) * 100);
  const deliveredPct = Math.round(((orders.delivered || 0) / totalOrdersCount) * 100);
  const failedPct = Math.round((((orders.failed || 0) + (orders.cancelled || 0)) / totalOrdersCount) * 100);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & OPERATIONAL DATE FILTER BAR               */}
      {/* ========================================================= */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black leading-tight">
            Raipur Dispatch Command
          </h1>
          <p className="text-xs font-bold text-[#5C5647]">
            Real-time dairy dispatch oversight, sales volume, contribution margins, and delivery tracking.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF7EC] p-1.5 rounded-[12px] border-2 border-black shadow-[3px_3px_0px_0px_#1A1A1A]">
            {(
              [
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "LAST_7_DAYS", label: "Last 7 Days" },
                { id: "THIS_MONTH", label: "This Month" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleSelectPreset(btn.id)}
                className={`rounded-[8px] px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activePreset === btn.id
                    ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A] translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white text-[#5C5647] border border-transparent hover:text-[#1A1A1A] hover:bg-white/80"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-[10px] border-2 border-black shadow-[2px_2px_0px_0px_#1A1A1A]">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setActivePreset("CUSTOM");
                setFromDate(e.target.value);
              }}
              className="text-xs font-bold font-mono text-[#1A1A1A] px-2 py-1 outline-none bg-transparent"
              title="From Date"
            />
            <span className="text-xs font-bold text-[#5C5647]">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setActivePreset("CUSTOM");
                setToDate(e.target.value);
              }}
              className="text-xs font-bold font-mono text-[#1A1A1A] px-2 py-1 outline-none bg-transparent"
              title="To Date"
            />
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => loadDashboardData(fromDate, toDate, true)}
            disabled={isRefreshing}
            className="cursor-pointer rounded-[10px] border-2 border-black bg-[#FFD84D] hover:bg-[#fcd033] px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ACTIONABLE OPERATIONAL ALERTS BAR                      */}
      {/* ========================================================= */}
      <div className="space-y-2.5">
        {/* Pending Wallet Approvals */}
        {alerts?.pendingWalletApprovals > 0 && (
          <div className="rounded-[10px] bg-[#FFDF58] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                {alerts.pendingWalletApprovals} Wallet Credit Requests Require Verification
              </span>
            </div>
            <Link
              href="/wallet?status=PENDING"
              className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] inline-flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>Review in Wallet</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
            </Link>
          </div>
        )}

        {/* Pending Delivery Change Requests */}
        {alerts?.pendingDeliveryChangeRequests > 0 && (
          <div className="rounded-[10px] bg-[#D8CEF6] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📅</span>
              <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                {alerts.pendingDeliveryChangeRequests} Subscription Pause / Quantity Changes Pending
              </span>
            </div>
            <Link
              href="/plans"
              className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] inline-flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>Manage in Plans</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
            </Link>
          </div>
        )}

        {/* Failed Orders Alert */}
        {alerts?.failedOrders > 0 && (
          <div className="rounded-[10px] bg-[#FF8E72] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🚨</span>
              <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                {alerts.failedOrders} Failed Orders Detected
              </span>
            </div>
            <Link
              href="/orders"
              className="rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] inline-flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>Investigate in Orders</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
            </Link>
          </div>
        )}

        {/* Pending Cash Collections */}
        {alerts?.pendingCashCollections > 0 && (
          <div className="rounded-[10px] bg-[#FFFDF7] border-2 border-black p-3.5 shadow-[3px_3px_0px_0px_#000000] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">💵</span>
              <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                {alerts.pendingCashCollections} Pending Cash Collections
              </span>
            </div>
            <Link
              href="/orders"
              className="rounded-[8px] border-2 border-black bg-[#B8E8B8] hover:bg-[#9fe09f] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] inline-flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <span>Reconcile</span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
            </Link>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. ROW 1: PRIMARY METRIC CARDS (4 COLUMNS)                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sales Value */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 rounded-[14px] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647]">
                Total Sales Value
              </span>
              {comparison?.salesChangePercent !== undefined && (
                <span
                  className={`rounded-[6px] border border-black px-2 py-0.5 text-[10px] font-mono font-black ${
                    comparison.salesChangePercent >= 0
                      ? "bg-[#B8E8B8] text-[#1A1A1A]"
                      : "bg-[#FF8E72] text-[#1A1A1A]"
                  }`}
                >
                  {comparison.salesChangePercent >= 0 ? "+" : ""}
                  {comparison.salesChangePercent}% vs prev
                </span>
              )}
            </div>

            <div className="mt-2.5 font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
              ₹{Math.round((sales?.totalPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-black/10 text-[11px] font-mono font-bold text-[#5C5647]">
            Monthly: ₹{Math.round((sales?.monthlyPaise || 0) / 100).toLocaleString("en-IN")} | Trial: ₹{Math.round((sales?.trialPaise || 0) / 100).toLocaleString("en-IN")} | Buy Once: ₹{Math.round((sales?.buyOncePaise || 0) / 100).toLocaleString("en-IN")}
          </div>
        </div>

        {/* 2. Net Revenue Collected */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 rounded-[14px] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647]">
                Net Revenue Collected
              </span>
              {comparison?.revenueChangePercent !== undefined && (
                <span
                  className={`rounded-[6px] border border-black px-2 py-0.5 text-[10px] font-mono font-black ${
                    comparison.revenueChangePercent >= 0
                      ? "bg-[#B8E8B8] text-[#1A1A1A]"
                      : "bg-[#FF8E72] text-[#1A1A1A]"
                  }`}
                >
                  {comparison.revenueChangePercent >= 0 ? "+" : ""}
                  {comparison.revenueChangePercent}% vs prev
                </span>
              )}
            </div>

            <div className="mt-2.5 font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
              ₹{Math.round((revenue?.collectedPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-black/10 text-[11px] font-mono font-bold text-[#5C5647] space-y-0.5">
            <div>
              Wallet: ₹{Math.round((revenue?.walletPaise || 0) / 100).toLocaleString("en-IN")} | Cash: ₹{Math.round((revenue?.cashPaise || 0) / 100).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-amber-800">
              Customer Wallet Liability: ₹{Math.round((wallet?.totalCustomerBalancePaise || 0) / 100).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* 3. Delivery Completion Rate */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 rounded-[14px] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647]">
                Delivery Completion Rate
              </span>
              <span className="rounded-[4px] border border-black bg-[#B8E8B8] text-black font-mono font-bold text-xs px-2 py-0.5">
                {deliveries?.delivered || 0} Delivered
              </span>
            </div>

            <div className="mt-2.5 font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
              {(deliveries?.completionPercent || 0).toFixed(1)}%
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-black/10 text-[11px] font-mono font-bold text-[#5C5647]">
            {deliveries?.delivered || 0} Delivered / {deliveries?.scheduled || 0} Scheduled ({deliveries?.skipped || 0} Skipped)
          </div>
        </div>

        {/* 4. Active Customer Base */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-5 rounded-[14px] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#5C5647]">
                Active Customer Base
              </span>
              {comparison?.customersNewChangePercent !== undefined && (
                <span
                  className={`rounded-[6px] border border-black px-2 py-0.5 text-[10px] font-mono font-black ${
                    comparison.customersNewChangePercent >= 0
                      ? "bg-[#B8E8B8] text-[#1A1A1A]"
                      : "bg-[#FF8E72] text-[#1A1A1A]"
                  }`}
                >
                  {comparison.customersNewChangePercent >= 0 ? "+" : ""}
                  {comparison.customersNewChangePercent}% new cust
                </span>
              )}
            </div>

            <div className="mt-2.5 font-mono text-3xl font-black text-[#1A1A1A] tabular-nums">
              {customers?.active || 0}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-black/10 text-[11px] font-mono font-bold text-[#5C5647]">
            {customers?.withActivePlan || 0} active plans | +{customers?.new || 0} new registrations
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. ROW 2: ANALYTICS SPLIT (CHARTS & CONTRIBUTION MARGIN)  */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 Columns): Daily Revenue & Sales Trend */}
        <div className="lg:col-span-7 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6 rounded-[14px] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b-2 border-black/10 pb-3">
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                Sales & Revenue Inflow Trend
              </h2>
              <p className="text-xs font-bold text-[#5C5647]">
                Purchases vs Money Collected across selected period.
              </p>
            </div>

            {/* Custom Legend */}
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 bg-[#FFDF58] border border-black rounded-[2px]" />
                <span>Sales (₹)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1.5 bg-[#4A1513] rounded-[1px]" />
                <span>Revenue (₹)</span>
              </div>
            </div>
          </div>

          {/* Recharts Composed Chart */}
          <div className="h-[300px] w-full">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E0D8" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#1A1A1A"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#1A1A1A"
                    fontSize={11}
                    fontFamily="monospace"
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-[8px] border-2 border-black bg-[#FBF8EE] p-3 shadow-[3px_3px_0px_0px_#1A1A1A] font-mono text-xs space-y-1">
                            <div className="font-black text-black border-b border-black/20 pb-1">
                              {label}
                            </div>
                            <div className="text-[#1A1A1A] flex justify-between gap-4">
                              <span>Sales:</span>
                              <strong>₹{payload[0]?.value?.toLocaleString("en-IN")}</strong>
                            </div>
                            <div className="text-[#4A1513] flex justify-between gap-4">
                              <span>Revenue:</span>
                              <strong>₹{payload[1]?.value?.toLocaleString("en-IN")}</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="sales"
                    fill="#FFDF58"
                    stroke="#1A1A1A"
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4A1513"
                    strokeWidth={3}
                    dot={{ fill: "#4A1513", r: 4, stroke: "#1A1A1A", strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: "#FFDF58", stroke: "#1A1A1A", strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-[#FAF7EC] animate-pulse rounded-[8px]" />
            )}
          </div>
        </div>

        {/* Right (5 Columns): Contribution Margin & Order Pipeline */}
        <div className="lg:col-span-5 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6 rounded-[14px] flex flex-col justify-between">
          <div>
            <div className="border-b-2 border-black/10 pb-3 mb-4">
              <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                Contribution Margin Breakdown
              </h2>
              <p className="text-xs font-bold text-[#5C5647]">
                Gross profit analysis and operational fulfillment pipeline.
              </p>
            </div>

            {/* Procurement cost disclaimer pill */}
            <div className="rounded-[8px] bg-amber-100 border-2 border-black p-2.5 text-[11px] font-bold text-amber-900 mb-4 shadow-[2px_2px_0px_0px_#000000]">
              Notice: Contribution margin only (procurement costs untracked). Value reflects (Sales - Delivery Fees).
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center border-b-2 border-black/10 pb-4 mb-4">
              <div className="p-2 rounded-[8px] bg-[#FAF7EC] border border-black/30">
                <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                  Gross Profit
                </span>
                <span className="font-mono text-base font-black text-[#1A1A1A]">
                  ₹{Math.round((profit?.grossProfitPaise || 0) / 100).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="p-2 rounded-[8px] bg-[#FAF7EC] border border-black/30">
                <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                  Margin %
                </span>
                <span className="font-mono text-base font-black text-emerald-800">
                  {(profit?.grossMarginPercent || 0).toFixed(1)}%
                </span>
              </div>

              <div className="p-2 rounded-[8px] bg-[#FAF7EC] border border-black/30">
                <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                  Delivery Cost
                </span>
                <span className="font-mono text-base font-black text-[#1A1A1A]">
                  ₹{Math.round((profit?.deliveryCostPaise || 0) / 100).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase text-[#1A1A1A]">
                <span>Order Status Breakdown</span>
                <span className="font-mono">{orders?.total || 0} Orders</span>
              </div>

              {/* Segmented Bar */}
              <div className="h-4 w-full rounded-full border-2 border-black overflow-hidden flex bg-gray-100">
                {confirmedPct > 0 && (
                  <div
                    style={{ width: `${confirmedPct}%` }}
                    className="bg-[#B8E8B8] border-r border-black"
                    title={`Confirmed: ${orders.confirmed}`}
                  />
                )}
                {processingPct > 0 && (
                  <div
                    style={{ width: `${processingPct}%` }}
                    className="bg-[#FFDF58] border-r border-black"
                    title={`Processing: ${orders.processing}`}
                  />
                )}
                {outForDeliveryPct > 0 && (
                  <div
                    style={{ width: `${outForDeliveryPct}%` }}
                    className="bg-[#D8CEF6] border-r border-black"
                    title={`Out for Delivery: ${orders.outForDelivery}`}
                  />
                )}
                {deliveredPct > 0 && (
                  <div
                    style={{ width: `${deliveredPct}%` }}
                    className="bg-[#8FD694] border-r border-black"
                    title={`Delivered: ${orders.delivered}`}
                  />
                )}
                {failedPct > 0 && (
                  <div
                    style={{ width: `${failedPct}%` }}
                    className="bg-[#FF8E72]"
                    title={`Failed/Cancelled: ${(orders.failed || 0) + (orders.cancelled || 0)}`}
                  />
                )}
              </div>

              {/* Legend Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-2 text-[10px] font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B8E8B8] border border-black shrink-0" />
                  <span>Conf: {orders?.confirmed || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFDF58] border border-black shrink-0" />
                  <span>Proc: {orders?.processing || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D8CEF6] border border-black shrink-0" />
                  <span>Route: {orders?.outForDelivery || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8FD694] border border-black shrink-0" />
                  <span>Done: {orders?.delivered || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF8E72] border border-black shrink-0" />
                  <span>Fail: {(orders?.failed || 0) + (orders?.cancelled || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. ROW 3: SUBSCRIPTION & OPERATIONAL SUMMARY              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Active Subscriptions Split */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6 rounded-[14px] space-y-4">
          <div className="border-b-2 border-black/10 pb-3">
            <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
              Subscription Portfolio Distribution
            </h2>
            <p className="text-xs font-bold text-[#5C5647]">
              Current breakdown of active recurring milk plans and trials.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                Monthly Recurring
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {plans?.activeMonthly || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#D8CEF6] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                7-Day Trials
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {plans?.activeTrial || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#FFDF58] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                Buy Once Users
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {plans?.buyOnceCustomers || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                New Selections
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                +{plans?.newSelections || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-6 rounded-[14px] space-y-4">
          <div className="border-b-2 border-black/10 pb-3">
            <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
              Operational Quick Access Hub
            </h2>
            <p className="text-xs font-bold text-[#5C5647]">
              Jump directly to core management modules.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <Link
              href="/orders"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer"
            >
              <Package className="h-4 w-4 stroke-[2.5]" />
              <span className="mt-2">Orders Hub</span>
            </Link>

            <Link
              href="/plans"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer"
            >
              <Layers className="h-4 w-4 stroke-[2.5]" />
              <span className="mt-2">Plans & Delivery</span>
            </Link>

            <Link
              href="/customers"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer"
            >
              <Users className="h-4 w-4 stroke-[2.5]" />
              <span className="mt-2">Customers</span>
            </Link>

            <Link
              href="/wallet"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer"
            >
              <Wallet className="h-4 w-4 stroke-[2.5]" />
              <span className="mt-2">Wallets & Float</span>
            </Link>

            <Link
              href="/payments"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer"
            >
              <CreditCard className="h-4 w-4 stroke-[2.5]" />
              <span className="mt-2">Payments Gateway</span>
            </Link>

            <Link
              href="/serviceability"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer"
            >
              <MapPin className="h-4 w-4 stroke-[2.5]" />
              <span className="mt-2">Service Zones</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
