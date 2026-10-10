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
  RotateCcw,
} from "lucide-react";
import { StatCardSkeleton } from "@/components/ui/stat-card-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";

type DatePreset = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "THIS_MONTH" | "CUSTOM";

const formatDateISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border-2 border-black p-4 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000]">
        <div className="min-w-0">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A]">
              Operations Command
            </h1>
            <span className="bg-[#B8E8B8] border-2 border-black font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-[6px] shadow-[1px_1px_0px_0px_#000000]">
              Raipur Hub
            </span>
          </div>
          <p className="text-xs font-bold text-[#5C5647] mt-1">
            Real-time fulfillment, morning dispatch routes, and customer subscriptions.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {/* Preset Buttons */}
          <div className="grid min-w-0 flex-1 grid-cols-4 rounded-[10px] border-2 border-black p-0.5 bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] sm:inline-flex sm:flex-none">
            {(["TODAY", "YESTERDAY", "LAST_7_DAYS", "THIS_MONTH"] as DatePreset[]).map((p) => {
              const label =
                p === "TODAY"
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
                  className={`whitespace-nowrap px-1 py-1 text-[9px] font-black uppercase tracking-tight rounded-[6px] transition-all cursor-pointer sm:px-3 sm:text-xs sm:tracking-wider ${
                    isActive
                      ? "bg-[#FFDF58] text-[#1A1A1A] border-2 border-black shadow-[1px_1px_0px_0px_#000000]"
                      : "text-[#5C5647] hover:text-[#1A1A1A] hover:bg-white"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadDashboardData(fromDate, toDate, true)}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh dashboard data"
            className="h-9 w-9 shrink-0 justify-center px-0 bg-white hover:bg-[#FAF7EC] text-[#1A1A1A] font-black uppercase text-xs border-2 border-black rounded-[10px] shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 sm:w-auto sm:px-3"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 stroke-[2.5] ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Error / Session Expired State */}
      {error && (
        <ErrorState
          error={error}
          onRetry={() => loadDashboardData(fromDate, toDate, true)}
        />
      )}

      {/* ========================================================= */}
      {/* 2. ROW 1: CORE METRIC KPI STAT CARDS                      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-busy={isLoading}>
        {isLoading || !data ? (
          <StatCardSkeleton count={4} className="min-w-0 p-3 sm:p-5" />
        ) : (
          <>
            {/* Card 1: Revenue */}
            <div className="min-w-0 bg-white border-2 border-black p-3 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                  Total Revenue
                </span>
                <div className="w-8 h-8 rounded-[8px] bg-[#B8E8B8] border-2 border-black flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                  <DollarSign className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>

              <div className="mt-4">
                <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                  ₹{Math.round((revenue?.collectedPaise || 0) / 100).toLocaleString("en-IN")}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold mt-1 text-[#5C5647]">
                  {comparison?.revenueChangePercent !== undefined && comparison.revenueChangePercent !== 0 && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-black ${
                        comparison.revenueChangePercent >= 0
                          ? "bg-[#B8E8B8] text-[#14532D]"
                          : "bg-[#FFD9D0] text-[#7F1D1D]"
                      }`}
                    >
                      {comparison.revenueChangePercent >= 0 ? "+" : ""}
                      {comparison.revenueChangePercent.toFixed(1)}%
                    </span>
                  )}
                  <span>vs prev period</span>
                </div>
              </div>
            </div>

            {/* Card 2: Milk Volume (Litres) */}
            <div className="min-w-0 bg-white border-2 border-black p-3 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                  Volume Delivered
                </span>
                <div className="w-8 h-8 rounded-[8px] bg-[#FFDF58] border-2 border-black flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                  <Package className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>

              <div className="mt-4">
                <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                  {orders?.total || 0} <span className="text-lg font-black text-[#5C5647]">Orders</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold mt-1 text-[#5C5647]">
                  {comparison?.ordersChangePercent !== undefined && comparison.ordersChangePercent !== 0 && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-black text-[10px] font-black ${
                        comparison.ordersChangePercent >= 0
                          ? "bg-[#B8E8B8] text-[#14532D]"
                          : "bg-[#FFD9D0] text-[#7F1D1D]"
                      }`}
                    >
                      {comparison.ordersChangePercent >= 0 ? "+" : ""}
                      {comparison.ordersChangePercent.toFixed(1)}%
                    </span>
                  )}
                  <span>vs prev period</span>
                </div>
              </div>
            </div>

            {/* Card 3: Deliveries */}
            <div className="min-w-0 bg-white border-2 border-black p-3 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                  Deliveries
                </span>
                <div className="w-8 h-8 rounded-[8px] bg-[#D8CEF6] border-2 border-black flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                  <Truck className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>

              <div className="mt-4">
                <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                  {deliveries?.delivered || 0} <span className="text-sm font-bold text-[#5C5647]">/ {((deliveries?.scheduled || 0) + (deliveries?.delivered || 0) + (deliveries?.skipped || 0)) || 0}</span>
                </div>
                <div className="text-xs font-mono font-bold text-[#5C5647] mt-1">
                  {(deliveries?.completionPercent || 0).toFixed(0)}% Completion Rate
                </div>
              </div>
            </div>

            {/* Card 4: Active Customers */}
            <div className="min-w-0 bg-white border-2 border-black p-3 sm:p-5 rounded-[14px] shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#5C5647] tracking-wider">
                  Active Customers
                </span>
                <div className="w-8 h-8 rounded-[8px] bg-[#FAF7EC] border-2 border-black flex items-center justify-center text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                  <Users className="h-4 w-4 stroke-[2.5]" />
                </div>
              </div>

              <div className="mt-4">
                <div className="font-mono text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight">
                  {customers?.active || 0}
                </div>
                <div className="text-xs font-mono font-bold text-[#5C5647] mt-1">
                  {customers?.new ? `+${customers.new} new accounts` : "Across Raipur zones"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. ROW 2: 7-DAY DELIVERY & REVENUE TREND CHART + CUTOFF   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left: Trend Chart (8 Cols) */}
        <div className="min-w-0 lg:col-span-8 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-6 rounded-[14px] flex flex-col justify-between">
          <div className="flex flex-col items-start gap-3 border-b-2 border-black/10 pb-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-[#1A1A1A]">
                Fulfillment & Volume Trajectory
              </h2>
              <p className="text-xs font-bold text-[#5C5647]">
                Daily milk litres dispatched vs total daily revenue in Raipur.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono font-bold">
              <span className="inline-flex items-center gap-1.5 bg-[#FFDF58] px-2 py-0.5 rounded border border-black">
                <span className="w-2 h-2 rounded-full bg-[#1A1A1A]" /> Litres (L)
              </span>
              <span className="inline-flex items-center gap-1.5 bg-[#B8E8B8] px-2 py-0.5 rounded border border-black">
                <span className="w-2 h-2 rounded-full bg-[#14532D]" /> Rev (₹)
              </span>
            </div>
          </div>

          <div className="h-64 w-full min-h-[256px]">
            {isLoading || !data ? (
              <div className="h-full w-full flex items-center justify-center bg-[#FAF7EC]/50 border-2 border-dashed border-black/20 rounded-[10px] animate-pulse">
                <span className="font-mono text-xs font-bold text-[#5C5647]">Loading trajectory metrics...</span>
              </div>
            ) : trends.length === 0 ? (
              <EmptyState title="No trend metrics" description="No dispatch history recorded for selected range." />
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

            <div className="p-3 bg-white border-2 border-black rounded-[8px] flex flex-col items-start gap-2 text-xs font-mono font-bold sm:flex-row sm:items-center sm:justify-between">
              <span>Next Morning Delivery Window:</span>
              <span className="bg-[#FFDF58] px-2 py-0.5 rounded border border-black text-[#1A1A1A]">
                06:00 AM – 09:00 AM
              </span>
            </div>
          </div>

          {/* Morning Dispatch Status */}
          <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000000] p-4 sm:p-5 rounded-[14px] flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b-2 border-black/10 pb-2">
              <span className="text-xs font-black uppercase text-[#1A1A1A]">
                Order Breakdown by Status
              </span>
              <span className="font-mono text-xs font-black text-[#1A1A1A]">
                {orders?.total || 0} Total
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {/* Visual Progress Bar */}
              <div className="h-4 w-full rounded-full border-2 border-black overflow-hidden flex bg-stone-100">
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
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5FB266] border border-black shrink-0" />
                  <span>Compl: {orders?.completed || 0}</span>
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
            <div className="rounded-[10px] border-2 border-black bg-[#B8E8B8] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                Monthly Recurring
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : plans?.activeMonthly || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#D8CEF6] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                7-Day Trials
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : plans?.activeTrial || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#FFDF58] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
                Buy Once Users
              </span>
              <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-1 block">
                {isLoading ? "-" : plans?.buyOnceCustomers || 0}
              </span>
            </div>

            <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-[10px] font-black uppercase text-[#1A1A1A] block">
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
