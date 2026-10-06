import { apiClient } from "@/lib/api-client";
import { DashboardOverviewResponse } from "@/types/dashboard";
import {
  swrFetch,
  SwrOptions,
  getCachedData,
  setCachedData,
} from "@/lib/cache";

export const DEFAULT_DASHBOARD_DATA: DashboardOverviewResponse = {
  period: {
    from: new Date().toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  },
  customers: {
    total: 0,
    new: 0,
    active: 0,
    withActivePlan: 0,
  },
  orders: {
    total: 0,
    pending: 0,
    confirmed: 0,
    processing: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    failed: 0,
  },
  sales: {
    totalPaise: 0,
    buyOncePaise: 0,
    trialPaise: 0,
    monthlyPaise: 0,
  },
  revenue: {
    collectedPaise: 0,
    walletPaise: 0,
    cashPaise: 0,
    buyOncePaise: 0,
    trialPaise: 0,
    monthlyPaise: 0,
    walletTopUpsPaise: 0,
    pendingCashPaise: 0,
    refundsPaise: 0,
  },
  plans: {
    activeMonthly: 0,
    activeTrial: 0,
    buyOnceCustomers: 0,
    newSelections: 0,
  },
  deliveries: {
    scheduled: 0,
    delivered: 0,
    skipped: 0,
    cancelled: 0,
    failed: 0,
    completionPercent: 0,
  },
  wallet: {
    totalCustomerBalancePaise: 0,
    walletTopUpsPaise: 0,
  },
  profit: {
    salesPaise: 0,
    productCostPaise: 0,
    deliveryCostPaise: 0,
    grossProfitPaise: 0,
    grossMarginPercent: 0,
    costDataAvailable: false,
  },
  alerts: {
    pendingCashCollections: 0,
    pendingWalletApprovals: 0,
    pendingDeliveryChangeRequests: 0,
    failedOrders: 0,
  },
  comparison: {
    previousPeriod: { from: "", to: "" },
    customersNewChangePercent: 0,
    ordersChangePercent: 0,
    salesChangePercent: 0,
    revenueChangePercent: 0,
    grossProfitChangePercent: 0,
  },
  trend: {
    daily: [],
  },
};

/**
 * Normalizes backend overview payload to avoid runtime field lookup failures
 */
function normalizeDashboardOverview(res: unknown): DashboardOverviewResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const root = (obj.data && typeof obj.data === "object")
      ? (obj.data as Record<string, unknown>)
      : obj;

    const customers = (root.customers as DashboardOverviewResponse["customers"]) || DEFAULT_DASHBOARD_DATA.customers;
    const orders = (root.orders as DashboardOverviewResponse["orders"]) || DEFAULT_DASHBOARD_DATA.orders;
    const sales = (root.sales as DashboardOverviewResponse["sales"]) || DEFAULT_DASHBOARD_DATA.sales;
    const revenue = (root.revenue as DashboardOverviewResponse["revenue"]) || DEFAULT_DASHBOARD_DATA.revenue;
    const plans = (root.plans as DashboardOverviewResponse["plans"]) || DEFAULT_DASHBOARD_DATA.plans;
    const rawDeliveries = (root.deliveries as DashboardOverviewResponse["deliveries"]) || DEFAULT_DASHBOARD_DATA.deliveries;
    const wallet = (root.wallet as DashboardOverviewResponse["wallet"]) || DEFAULT_DASHBOARD_DATA.wallet;
    const profit = (root.profit as DashboardOverviewResponse["profit"]) || DEFAULT_DASHBOARD_DATA.profit;
    const alerts = (root.alerts as DashboardOverviewResponse["alerts"]) || DEFAULT_DASHBOARD_DATA.alerts;
    const comparison = (root.comparison as DashboardOverviewResponse["comparison"]) || DEFAULT_DASHBOARD_DATA.comparison;
    const period = (root.period as DashboardOverviewResponse["period"]) || DEFAULT_DASHBOARD_DATA.period;

    // Calculate delivery completion rate if not pre-calculated
    const totalDeliv = (rawDeliveries.scheduled || 0) + (rawDeliveries.delivered || 0) + (rawDeliveries.skipped || 0);
    const completionPercent = typeof rawDeliveries.completionPercent === "number"
      ? rawDeliveries.completionPercent
      : totalDeliv > 0
      ? (rawDeliveries.delivered / totalDeliv) * 100
      : 0;

    const deliveries = {
      ...rawDeliveries,
      completionPercent,
    };

    const trend = (root.trend && typeof root.trend === "object")
      ? (root.trend as DashboardOverviewResponse["trend"])
      : { daily: [] };

    return {
      period,
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
    };
  }

  return DEFAULT_DASHBOARD_DATA;
}

/**
 * Fetch dashboard overview metrics with date ranges and SWR client caching
 */
export async function fetchDashboardOverview(
  params?: {
    from?: string;
    to?: string;
  },
  options?: SwrOptions<DashboardOverviewResponse>
): Promise<DashboardOverviewResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);

  const endpoint = query.toString()
    ? `/admin/dashboard/overview?${query.toString()}`
    : `/admin/dashboard/overview`;

  const cacheKey = `dashboard:overview:${params?.from || "today"}:${params?.to || "today"}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(endpoint, { skipAuthRedirect: true });
          return normalizeDashboardOverview(res);
        } catch {
          const cached = getCachedData<DashboardOverviewResponse>(cacheKey);
          return cached || DEFAULT_DASHBOARD_DATA;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<DashboardOverviewResponse>(cacheKey) || DEFAULT_DASHBOARD_DATA;
  }

  try {
    const res = await apiClient<unknown>(endpoint, { skipAuthRedirect: true });
    const normalized = normalizeDashboardOverview(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<DashboardOverviewResponse>(cacheKey);
    return cached || DEFAULT_DASHBOARD_DATA;
  }
}
