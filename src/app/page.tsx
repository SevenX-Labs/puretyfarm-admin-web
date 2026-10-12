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
  IndianRupee,
  Truck,
  Users,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ShieldAlert,
  Wallet,
  Package,
  Layers,
  MapPin,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Activity,
  Milk,
} from "lucide-react";
import { StatCardSkeleton } from "@/components/ui/stat-card-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import { formatComparisonCaption, formatIndianNumber } from "@/lib/format-comparison";
import { useRealtimeSync } from "@/lib/use-realtime-sync";

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM";

const formatDateISO = (d: Date): string => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Date range state (defaults to overall/all-time)
  const [activePreset, setActivePreset] = useState<DatePreset>("ALL");
  const [fromDate, setFromDate] = useState<string>("2020-01-01");
  const [toDate, setToDate] = useState<string>(() => formatDateISO(new Date()));

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch overview data with SWR caching
  const loadDashboardData = useCallback(
    async (from: string, to: string, forceRefresh = false) => {
      if (forceRefresh) setIsRefreshing(true);
      setError(null);

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
        const msg = err instanceof Error ? err.message : "Failed to load dashboard overview.";
        setError(msg);
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

  useRealtimeSync(() => {
    loadDashboardData(fromDate, toDate, true);
  }, { intervalMs: 30000, events: ["admin.dashboard.updated", "admin.orders.updated", "admin.payments.updated", "admin.wallets.updated", "admin.plans.updated"] });

  // Handle Preset Clicks
  const handleSelectPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = formatDateISO(now);

    let start = todayStr;
    let end = todayStr;

    if (preset === "ALL") {
      start = "2020-01-01";
      end = todayStr;
    } else if (preset === "TODAY") {
      start = todayStr;
      end = todayStr;
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatDateISO(y);
      start = yStr;
      end = yStr;
    } else if (preset === "LAST_7_DAYS") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 6);
      start = formatDateISO(d7);
      end = todayStr;
    } else if (preset === "THIS_MONTH") {
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatDateISO(mStart);
      end = todayStr;
    }

    setFromDate(start);
    setToDate(end);
  };

  const revenue = data?.revenue;
  const customers = data?.customers;
  const deliveries = data?.deliveries;
  const orders = data?.orders;
  const plans = data?.plans;
  const comparison = data?.comparison;

  const trends = useMemo(() => {
    return (data?.trend?.daily || []).map((t) => ({
      date: t.date,
      deliveries: t.deliveries || 0,
      revenueRupees: Math.round((t.revenueCollectedPaise || 0) / 100),
      salesRupees: Math.round((t.salesPaise || 0) / 100),
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & DATE RANGE FILTER BAR                     */}
      {/* ========================================================= */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-[#1A1A1A]">
              Operations Command
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] border-2 border-black bg-[#B8E8B8] shadow-[1.5px_1.5px_0px_0px_#000000]">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-mono text-[10px] font-black uppercase text-[#14532D]">
                Raipur Hub Live
              </span>
            </div>
          </div>
          <p className="text-xs font-bold text-[#5C5647] mt-1">
            Real-time fulfillment, morning dispatch routes, and customer subscriptions.
          </p>
        </div>

        {/* Date Filter Controls & Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Preset Controller */}
          <div className="inline-flex flex-wrap sm:flex-nowrap rounded-[10px] border-2 border-black p-1 bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] gap-1">
            {(["ALL", "TODAY", "YESTERDAY", "LAST_7_DAYS", "THIS_MONTH"] as DatePreset[]).map((p) => {
              const label =
                p === "ALL"
                  ? "All"
                  : p === "TODAY"
                  ? "Today"
                  : p === "YESTERDAY"
                  ? "Yesterday"
                  : p === "LAST_7_DAYS"
                  ? "7 Days"
                  : "This Month";

              const isActive = activePreset === p;

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`h-7 sm:h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs font-black uppercase tracking-tight rounded-[6px] transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]"
                      : "text-[#5C5647] hover:text-[#1A1A1A] hover:bg-white border-2 border-transparent"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(fromDate, toDate, true)}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh dashboard data"
            className="h-9 px-3.5 bg-white hover:bg-[#FAF7EC] text-[#1A1A1A] font-black uppercase text-xs border-2 border-black rounded-[10px] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin text-amber-600" : ""}`}
            />
            <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync Live"}</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <ErrorState
          error={error}
          onRetry={() => loadDashboardData(fromDate, toDate, true)}
        />
      )}

      {/* ========================================================= */}
      {/* 2. ROW 1: CORE METRIC KPI STAT CARDS                      */}
      {/* ========================================================= */}
      {isLoading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Revenue */}
          <div className="min-w-0 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] transition-all duration-200 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                Total Revenue
              </span>
              <div className="w-8 h-8 rounded-[8px] bg-[#B8E8B8] border-2 border-black flex items-center justify-center text-[#14532D] shadow-[2px_2px_0px_0px_#000000]">
                <IndianRupee className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-4">
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                ₹{formatIndianNumber(Math.round((revenue?.collectedPaise || 0) / 100))}
              </div>

              <div className="mt-2 min-h-[20px] flex items-center gap-1.5 text-xs font-mono font-bold text-[#5C5647]">
                {activePreset === "ALL" ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-mono font-black bg-[#FAF7EC] text-[#5C5647]">
                    Overall Collected
                  </span>
                ) : (() => {
                  const currentRev = Math.round((revenue?.collectedPaise || 0) / 100);
                  const prevRev = comparison?.prevRevenueCollectedPaise != null
                    ? Math.round(comparison.prevRevenueCollectedPaise / 100)
                    : null;
                  const comp = formatComparisonCaption(currentRev, prevRev, activePreset === "TODAY" ? "yesterday" : "prev period");
                  return comp.caption ? (
                    <>
                      {comp.badgeText && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-black ${
                            comp.type === "positive"
                              ? "bg-[#B8E8B8] text-[#14532D]"
                              : comp.type === "negative"
                              ? "bg-[#FFD9D0] text-[#7F1D1D]"
                              : "bg-[#FAF7EC] text-[#1A1A1A]"
                          }`}
                        >
                          {comp.badgeText}
                        </span>
                      )}
                      <span>{comp.caption}</span>
                    </>
                  ) : null;
                })()}
              </div>

              <div className="text-[10px] font-bold text-[#5C5647]/70 mt-1">
                {activePreset === "ALL" ? "All-time collected revenue" : "Collected for selected period"}
              </div>
            </div>
          </div>

          {/* Card 2: Orders Placed */}
          <div className="min-w-0 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] transition-all duration-200 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                Orders Placed
              </span>
              <div className="w-8 h-8 rounded-[8px] bg-[#FFDF58] border-2 border-black flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                <Package className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-4">
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {formatIndianNumber(orders?.total || 0)}{" "}
                <span className="text-base sm:text-lg font-black text-[#5C5647]">Orders</span>
              </div>

              <div className="mt-2 min-h-[20px] flex items-center gap-1.5 text-xs font-mono font-bold text-[#5C5647]">
                {activePreset === "ALL" ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-mono font-black bg-[#FAF7EC] text-[#5C5647]">
                    Total Registered
                  </span>
                ) : (() => {
                  const currentOrders = orders?.total || 0;
                  const prevOrders = comparison?.prevOrdersTotal ?? (
                    comparison?.ordersChangePercent != null && comparison.ordersChangePercent !== 0
                      ? Math.max(0, Math.round(currentOrders / (1 + comparison.ordersChangePercent / 100)))
                      : null
                  );
                  const comp = formatComparisonCaption(currentOrders, prevOrders, activePreset === "TODAY" ? "yesterday" : "prev period");
                  return comp.caption ? (
                    <>
                      {comp.badgeText && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-black ${
                            comp.type === "positive"
                              ? "bg-[#B8E8B8] text-[#14532D]"
                              : comp.type === "negative"
                              ? "bg-[#FFD9D0] text-[#7F1D1D]"
                              : "bg-[#FAF7EC] text-[#1A1A1A]"
                          }`}
                        >
                          {comp.badgeText}
                        </span>
                      )}
                      <span>{comp.caption}</span>
                    </>
                  ) : null;
                })()}
              </div>

              <div className="text-[10px] font-bold text-[#5C5647]/70 mt-1">
                {activePreset === "ALL" ? "All-time orders scheduled or placed" : "Total orders scheduled or placed"}
              </div>
            </div>
          </div>

          {/* Card 3: Deliveries */}
          <div className="min-w-0 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] transition-all duration-200 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                Deliveries
              </span>
              <div className="w-8 h-8 rounded-[8px] bg-[#D8CEF6] border-2 border-black flex items-center justify-center text-[#4C1D95] shadow-[2px_2px_0px_0px_#000000]">
                <Truck className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-4">
              {(() => {
                const deliveredCount = deliveries?.delivered || 0;
                const totalDeliv = (deliveries?.scheduled || 0) + (deliveries?.delivered || 0) + (deliveries?.skipped || 0);
                const rate = deliveries?.completionPercent || (totalDeliv > 0 ? (deliveredCount / totalDeliv) * 100 : 0);
                return (
                  <>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                        {formatIndianNumber(deliveredCount)}
                      </span>
                      <span className="text-sm font-bold text-[#5C5647]">
                        / {formatIndianNumber(totalDeliv)} scheduled
                      </span>
                    </div>

                    <div className="mt-2 min-h-[20px] flex items-center gap-1.5 text-xs font-mono font-bold text-[#5C5647]">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-mono font-black bg-[#FAF7EC] text-[#1A1A1A]">
                        {totalDeliv > 0 ? `${rate.toFixed(0)}% Completion` : "No Scheduled Runs"}
                      </span>
                    </div>

                    <div className="text-[10px] font-bold text-[#5C5647]/70 mt-1">
                      {activePreset === "ALL" ? "All-time recurring deliveries" : "Recurring plan deliveries for period"}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Card 4: Customers */}
          <div className="min-w-0 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] transition-all duration-200 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                Customers
              </span>
              <div className="w-8 h-8 rounded-[8px] bg-[#FAF7EC] border-2 border-black flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                <Users className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>

            <div className="mt-4">
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                {formatIndianNumber(customers?.active || 0)}{" "}
                <span className="text-base sm:text-lg font-black text-[#5C5647]">Active</span>
              </div>

              <div className="mt-2 min-h-[20px] flex items-center gap-1.5 text-xs font-mono font-bold text-[#5C5647]">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-mono font-black bg-[#B8E8B8] text-[#14532D]">
                  {formatIndianNumber(customers?.total || 0)} Total Registered
                </span>
                {activePreset !== "ALL" && customers?.new ? (
                  <span className="text-[11px] font-bold text-[#5C5647]">
                    (+{customers.new} new)
                  </span>
                ) : null}
              </div>

              <div className="text-[10px] font-bold text-[#5C5647]/70 mt-1">
                Active customer accounts in Raipur
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ROW 2: FULFILLMENT TRAJECTORY & ENGINE LOCK STATUS      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left: Interactive Volume & Revenue Trajectory (8 Cols) */}
        <div className="lg:col-span-8 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-2 border-black/10 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                  Fulfillment & Volume Trajectory
                </h2>
              </div>
              <p className="text-xs font-bold text-[#5C5647] mt-0.5">
                Daily milk litres dispatched vs total daily revenue in Raipur.
              </p>
            </div>
            {/* Chart Legend Badges */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-black bg-[#FFDF58] text-[#1A1A1A] shadow-[1px_1px_0px_0px_#000000]">
                <span className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                Litres (L)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded border border-black bg-[#B8E8B8] text-[#14532D] shadow-[1px_1px_0px_0px_#000000]">
                <span className="w-2 h-2 rounded-full bg-[#14532D]" />
                Rev (₹)
              </span>
            </div>
          </div>

          <div className="h-64 w-full min-h-[256px]">
            {isLoading || !data ? (
              <div className="h-full w-full flex items-center justify-center bg-[#FAF7EC]/50 border-2 border-dashed border-black/20 rounded-[10px] animate-pulse">
                <span className="font-mono text-xs font-bold text-[#5C5647]">Loading trajectory metrics...</span>
              </div>
            ) : trends.length === 0 || trends.every((t) => t.deliveries === 0 && t.revenueRupees === 0 && t.salesRupees === 0) ? (
              <div className="h-full w-full flex flex-col items-center justify-center bg-[#FAF7EC]/40 border-2 border-dashed border-black/20 rounded-[10px] p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-black flex items-center justify-center mb-3 shadow-[2px_2px_0px_0px_#000000]">
                  <Truck className="h-6 w-6 text-[#1A1A1A] stroke-[2]" />
                </div>
                <p className="text-xs font-black uppercase text-[#1A1A1A] tracking-wider">No Trajectory Activity Recorded</p>
                <p className="text-[11px] font-bold text-[#5C5647] mt-1 max-w-sm">
                  {activePreset === "ALL"
                    ? "No milk batches or revenue transactions have been finalized yet. They will plot here automatically."
                    : `No dispatch batches recorded for ${activePreset === "TODAY" ? "today" : "this period"}.`}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href="/deliveries"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-[#FFDF58] text-[11px] font-black uppercase rounded-[6px] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000] transition-all cursor-pointer"
                  >
                    <span>Manage Deliveries</span>
                    <ArrowRight className="h-3 w-3 stroke-[2.5]" />
                  </Link>
                </div>
              </div>
            ) : isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fontFamily: "monospace", fill: "#5C5647" }}
                    tickFormatter={(val) => {
                      try {
                        const d = new Date(val);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      } catch {
                        return val;
                      }
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fontFamily: "monospace", fill: "#5C5647" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fontFamily: "monospace", fill: "#5C5647" }}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFDF7",
                      border: "2px solid #000000",
                      borderRadius: "8px",
                      boxShadow: "3px 3px 0px 0px #000000",
                      fontFamily: "monospace",
                      fontWeight: "bold",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="deliveries"
                    fill="#FFDF58"
                    stroke="#000000"
                    strokeWidth={1.5}
                    radius={[4, 4, 0, 0]}
                    name="Deliveries"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenueRupees"
                    stroke="#14532D"
                    strokeWidth={2.5}
                    dot={{ fill: "#B8E8B8", stroke: "#000000", strokeWidth: 1.5, r: 4 }}
                    name="Revenue (₹)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Right: Operational Status & Engine Cutoff Status (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Engine Cutoff & Next Run Card */}
          <div className="bg-[#FAF7EC] border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-5 rounded-[14px] space-y-3">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
                <span className="text-xs font-black uppercase text-[#1A1A1A] tracking-tight">
                  10 PM Engine Lock
                </span>
              </div>
              <span className="bg-[#B8E8B8] border border-black font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_#000000]">
                Active
              </span>
            </div>

            <p className="text-xs font-bold text-[#5C5647] leading-relaxed">
              Customer schedule changes, vacation pauses, and quantities lock automatically at{" "}
              <strong className="text-[#1A1A1A]">10:00 PM</strong> every evening for Raipur route packing.
            </p>

            <div className="p-3 bg-white border-2 border-black rounded-[8px] flex flex-col items-start gap-2 text-xs font-mono font-bold sm:flex-row sm:items-center sm:justify-between shadow-[1.5px_1.5px_0px_0px_#000000]">
              <span className="text-[#5C5647]">Next Morning Window:</span>
              <span className="bg-[#FFDF58] px-2 py-0.5 rounded border border-black text-[#1A1A1A] font-black">
                06:00 AM – 09:00 AM
              </span>
            </div>
          </div>

          {/* Morning Dispatch Status Breakdown */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-5 rounded-[14px] flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="text-xs font-black uppercase text-[#1A1A1A] tracking-tight">
                Order Breakdown by Status
              </span>
              <span className="font-mono text-xs font-black text-[#1A1A1A] bg-[#FAF7EC] px-2 py-0.5 rounded border border-black">
                {orders?.total || 0} Total
              </span>
            </div>

            <div className="space-y-2 mt-3">
              {/* Visual Progress Bar (Including PENDING orders) */}
              <div className="h-4 w-full rounded-full border-2 border-black overflow-hidden flex bg-stone-100 shadow-[1px_1px_0px_0px_#000000]">
                {orders?.total && orders.total > 0 ? (
                  <>
                    <div
                      style={{ width: `${((orders.delivered || 0) / orders.total) * 100}%` }}
                      className="bg-[#8FD694] h-full"
                      title={`Delivered: ${orders.delivered || 0}`}
                    />
                    <div
                      style={{ width: `${((orders.completed || 0) / orders.total) * 100}%` }}
                      className="bg-[#5FB266] h-full"
                      title={`Completed: ${orders.completed || 0}`}
                    />
                    <div
                      style={{ width: `${((orders.outForDelivery || 0) / orders.total) * 100}%` }}
                      className="bg-[#D8CEF6] h-full"
                      title={`Out for Delivery: ${orders.outForDelivery || 0}`}
                    />
                    <div
                      style={{ width: `${((orders.confirmed || 0) / orders.total) * 100}%` }}
                      className="bg-[#B8E8B8] h-full"
                      title={`Confirmed: ${orders.confirmed || 0}`}
                    />
                    <div
                      style={{ width: `${((orders.processing || 0) / orders.total) * 100}%` }}
                      className="bg-[#FFDF58] h-full"
                      title={`Processing: ${orders.processing || 0}`}
                    />
                    <div
                      style={{ width: `${((orders.pending || 0) / orders.total) * 100}%` }}
                      className="bg-[#D8CEF6] h-full"
                      title={`Pending: ${orders.pending || 0}`}
                    />
                    <div
                      style={{ width: `${(((orders.failed || 0) + (orders.cancelled || 0)) / orders.total) * 100}%` }}
                      className="bg-[#FF8E72] h-full"
                      title={`Failed/Cancelled: ${(orders.failed || 0) + (orders.cancelled || 0)}`}
                    />
                  </>
                ) : (
                  <div className="bg-stone-200 w-full h-full" />
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
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D8CEF6] border border-black shrink-0" />
                  <span>Pend: {orders?.pending || 0}</span>
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
      {/* 4. ROW 3: SUBSCRIPTION & OPERATIONAL SUMMARY              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Active Subscriptions Split */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-6 rounded-[14px] space-y-4">
          <div className="border-b-2 border-black/10 pb-3">
            <h2 className="text-base font-black uppercase tracking-tight text-[#1A1A1A]">
              Subscription Portfolio Distribution
            </h2>
            <p className="text-xs font-bold text-[#5C5647]">
              Current breakdown of active recurring milk plans and trial subscriptions.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8] p-3 shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 transition-all">
              <span className="text-[10px] font-black uppercase text-[#14532D] block">
                Monthly Recurring
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : plans?.activeMonthly || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#D8CEF6] p-3 shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 transition-all">
              <span className="text-[10px] font-black uppercase text-[#4C1D95] block">
                7-Day Trials
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : plans?.activeTrial || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#FFDF58] p-3 shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 transition-all">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                Buy Once Users
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : plans?.buyOnceCustomers || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3 shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 transition-all">
              <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                New Selections
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : `+${plans?.newSelections || 0}`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-6 rounded-[14px] space-y-4">
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
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Package className="h-4 w-4 stroke-[2.5]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5C5647] group-hover:text-black transition-colors" />
              </div>
              <span className="mt-2">Orders Hub</span>
            </Link>

            <Link
              href="/deliveries"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Truck className="h-4 w-4 stroke-[2.5]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5C5647] group-hover:text-black transition-colors" />
              </div>
              <span className="mt-2">Deliveries</span>
            </Link>

            <Link
              href="/customers"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Users className="h-4 w-4 stroke-[2.5]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5C5647] group-hover:text-black transition-colors" />
              </div>
              <span className="mt-2">Customers</span>
            </Link>

            <Link
              href="/plans"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Layers className="h-4 w-4 stroke-[2.5]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5C5647] group-hover:text-black transition-colors" />
              </div>
              <span className="mt-2">Plans & Subs</span>
            </Link>

            <Link
              href="/wallet"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <Wallet className="h-4 w-4 stroke-[2.5]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5C5647] group-hover:text-black transition-colors" />
              </div>
              <span className="mt-2">Wallets & Float</span>
            </Link>

            <Link
              href="/payments"
              className="rounded-[10px] border-2 border-black bg-[#FAF7EC] hover:bg-[#FFD84D] p-3 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <CreditCard className="h-4 w-4 stroke-[2.5]" />
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5C5647] group-hover:text-black transition-colors" />
              </div>
              <span className="mt-2">Payments Gateway</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
