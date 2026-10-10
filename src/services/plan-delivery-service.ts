import { apiClient, ApiError } from "@/lib/api-client";
import {
  PlanConfig,
  PlanType,
  ChangeRequestsApiResponse,
  ChangeRequestItem,
  RequestStatus,
  RequestType,
  PlansApiResponse,
  PlansResult,
  OrderCutoffPolicy,
  ApproveRequestResult,
} from "@/types/plan-delivery";
import {
  swrFetch,
  SwrOptions,
  getCachedData,
  setCachedData,
  invalidateCache,
} from "@/lib/cache";

/**
 * Shape placeholders for the three fixed plan types.
 *
 * Used only to keep the grid's three cards present when the server has no row
 * for a plan yet. The delivery window is deliberately null: it is operational
 * data the business configures, and a plausible-looking "06:00-08:00" here was
 * being rendered as though it were the real configured schedule.
 */
export const DEFAULT_PLANS: PlanConfig[] = [
  {
    type: "BUY_ONCE",
    isActive: true,
    actualPricePerLitre: 9500, // ₹95
    sellingPricePerLitre: 8500, // ₹85
    quantityMin: 1,
    quantityMax: 5,
    deliveryFeePaise: 0,
    deliveryStartTime: null,
    deliveryEndTime: null,
    maxUsages: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    type: "SEVEN_DAY_TRIAL",
    isActive: true,
    actualPricePerLitre: 9000, // ₹90
    sellingPricePerLitre: 7500, // ₹75
    quantityMin: 1,
    quantityMax: 3,
    deliveryFeePaise: 0,
    deliveryStartTime: null,
    deliveryEndTime: null,
    trialDurationDays: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    type: "MONTHLY",
    isActive: true,
    actualPricePerLitre: 9500, // ₹95
    sellingPricePerLitre: 8000, // ₹80
    quantityMin: 1,
    quantityMax: 10,
    deliveryFeePaise: 0,
    deliveryStartTime: null,
    deliveryEndTime: null,
    dailyEnabled: true,
    alternateDaysEnabled: true,
    fixedQuantityEnabled: true,
    alternatingQuantityEnabled: true,
    frequencies: ["DAILY", "ALTERNATE_DAYS"],
    quantityModes: ["FIXED", "ALTERNATING"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const EMPTY_REQUESTS_RESPONSE: ChangeRequestsApiResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

/** Reads the server's cut-off policy, or null when it did not send one. */
function normalizeOrderCutoff(res: unknown): OrderCutoffPolicy | null {
  if (!res || typeof res !== "object") return null;
  const cutoff = (res as Record<string, unknown>).orderCutoff;
  if (!cutoff || typeof cutoff !== "object") return null;
  const c = cutoff as Record<string, unknown>;
  if (typeof c.time !== "string" || typeof c.timezone !== "string") return null;
  return cutoff as OrderCutoffPolicy;
}

/**
 * Normalizes plans response array
 */
function normalizePlans(res: unknown): PlanConfig[] {
  let list: PlanConfig[] = [];
  if (Array.isArray(res)) {
    list = res as PlanConfig[];
  } else if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.plans)) {
      list = obj.plans as PlanConfig[];
    } else if (Array.isArray(obj.data)) {
      list = obj.data as PlanConfig[];
    }
  }

  // Keep all three cards present even when the server has no row for a plan
  // type, but flag the placeholder so the UI never presents its numbers as
  // real configuration.
  const planOrder: PlanType[] = ["BUY_ONCE", "SEVEN_DAY_TRIAL", "MONTHLY"];
  return planOrder.map((type) => {
    const found = list.find((p) => p.type === type);
    if (found) return { ...found, isConfigured: true };
    return { ...DEFAULT_PLANS.find((p) => p.type === type)!, isConfigured: false };
  });
}

/**
 * Fetch all plan configurations, plus the server's order cut-off policy.
 *
 * A failed request now rejects instead of resolving with `DEFAULT_PLANS`. The
 * old behaviour made an outage indistinguishable from real configuration: the
 * page showed ₹95/L and a 06:00-08:00 window that nobody had set. Cached data
 * from a previous successful load is still served — that is stale, not
 * invented — but with nothing cached the caller gets the error and renders a
 * retry.
 */
export async function getAllPlans(
  options?: SwrOptions<PlansResult>
): Promise<PlansResult> {
  const cacheKey = "plans:all";

  const load = async (): Promise<PlansResult> => {
    const res = await apiClient<PlansApiResponse | PlanConfig[]>("/admin/plans", {
      skipAuthRedirect: true,
    });
    return {
      plans: normalizePlans(res),
      orderCutoff: normalizeOrderCutoff(res),
    };
  };

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          return await load();
        } catch (err) {
          const cached = getCachedData<PlansResult>(cacheKey);
          if (cached) return cached;
          throw err;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    return await promise;
  }

  try {
    const result = await load();
    setCachedData(cacheKey, result);
    return result;
  } catch (err) {
    const cached = getCachedData<PlansResult>(cacheKey);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Update plan configuration
 */
export async function updatePlanConfig(
  planType: PlanType,
  payload: Partial<PlanConfig>
): Promise<PlanConfig> {
  const res = await apiClient<PlanConfig | { data: PlanConfig; plan?: PlanConfig }>(
    `/admin/plans/${planType}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );

  let updatedItem: PlanConfig;
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.plan && typeof obj.plan === "object") {
      updatedItem = obj.plan as PlanConfig;
    } else if (obj.data && typeof obj.data === "object") {
      updatedItem = obj.data as PlanConfig;
    } else {
      updatedItem = res as PlanConfig;
    }
  } else {
    updatedItem = res as PlanConfig;
  }

  invalidateCache("plans:all");
  return updatedItem;
}

/**
 * Normalizes change requests API response
 */
function normalizeChangeRequestsResponse(res: unknown): ChangeRequestsApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as ChangeRequestItem[])
      : Array.isArray(obj.requests)
      ? (obj.requests as ChangeRequestItem[])
      : Array.isArray(res)
      ? (res as ChangeRequestItem[])
      : [];

    const pagination = (obj.pagination as ChangeRequestsApiResponse["pagination"]) || {
      page: 1,
      limit: data.length || 20,
      total: data.length,
      totalPages: Math.ceil((data.length || 1) / (data.length || 20)),
    };

    return { data, pagination };
  }

  return EMPTY_REQUESTS_RESPONSE;
}

export interface ChangeRequestQueryParams {
  status?: RequestStatus | "ALL";
  requestType?: RequestType | "ALL";
  page?: number;
  limit?: number;
}

/**
 * Fetch a single plan by its type
 */
export async function getPlanByType(planType: PlanType): Promise<PlanConfig> {
  const res = await apiClient<PlanConfig | { plan?: PlanConfig; data?: PlanConfig }>(
    `/admin/plans/${planType}`,
    { skipAuthRedirect: true }
  );
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.plan && typeof obj.plan === "object") return obj.plan as PlanConfig;
    if (obj.data && typeof obj.data === "object") return obj.data as PlanConfig;
  }
  return res as PlanConfig;
}

/**
 * Fetch delivery change requests with filters, pagination, and SWR caching
 */
export async function fetchChangeRequests(
  params: ChangeRequestQueryParams = {},
  options?: SwrOptions<ChangeRequestsApiResponse>
): Promise<ChangeRequestsApiResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.requestType && params.requestType !== "ALL") {
    query.set("requestType", params.requestType);
  }
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());

  const cacheKey = `change-requests:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(
            `/admin/manage-delivery/requests?${query.toString()}`,
            { skipAuthRedirect: true }
          );
          return normalizeChangeRequestsResponse(res);
        } catch {
          const cached = getCachedData<ChangeRequestsApiResponse>(cacheKey);
          return cached || EMPTY_REQUESTS_RESPONSE;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<ChangeRequestsApiResponse>(cacheKey) || EMPTY_REQUESTS_RESPONSE;
  }

  try {
    const res = await apiClient<unknown>(
      `/admin/manage-delivery/requests?${query.toString()}`,
      { skipAuthRedirect: true }
    );
    const normalized = normalizeChangeRequestsResponse(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<ChangeRequestsApiResponse>(cacheKey);
    return cached || EMPTY_REQUESTS_RESPONSE;
  }
}

/**
 * Approve a delivery change request
 */
export async function approveChangeRequest(
  requestId: string
): Promise<ApproveRequestResult> {
  try {
    const res = await apiClient<ApproveRequestResult>(
      `/admin/manage-delivery/requests/${requestId}/approve`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    invalidateCache("change-requests");
    return res;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.statusCode === 409) {
      throw new ApiError(
        "Conflict: This request has already been reviewed or status was updated.",
        409,
        err.data
      );
    }
    throw err;
  }
}

/**
 * Reject a delivery change request with an admin note
 */
export async function rejectChangeRequest(
  requestId: string,
  note: string
): Promise<{ success: boolean; message: string }> {
  if (!note || !note.trim()) {
    throw new ApiError("Rejection note is required.", 400);
  }

  try {
    const res = await apiClient<{ success: boolean; message: string }>(
      `/admin/manage-delivery/requests/${requestId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ note: note.trim() }),
      }
    );
    invalidateCache("change-requests");
    return res;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.statusCode === 409) {
      throw new ApiError(
        "Conflict: This request has already been reviewed or status was updated.",
        409,
        err.data
      );
    }
    throw err;
  }
}

/**
 * Fetch detailed change request by ID
 */
export async function fetchChangeRequestDetail(
  requestId: string
): Promise<ChangeRequestItem> {
  const res = await apiClient<ChangeRequestItem | { data: ChangeRequestItem; request?: ChangeRequestItem }>(
    `/admin/manage-delivery/requests/${requestId}`,
    { skipAuthRedirect: true }
  );
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.request && typeof obj.request === "object") return obj.request as ChangeRequestItem;
    if (obj.data && typeof obj.data === "object") return obj.data as ChangeRequestItem;
  }
  return res as ChangeRequestItem;
}

export const getChangeRequests = fetchChangeRequests;

import type { CustomerSubscriptionItem, CustomerSubscriptionsApiResponse } from "@/types/plan-delivery";

export async function fetchAdminSubscriptions(
  params: {
    page?: number;
    limit?: number;
    status?: string;
    planType?: string;
    search?: string;
  } = {},
  options?: SwrOptions<CustomerSubscriptionsApiResponse>
): Promise<CustomerSubscriptionsApiResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.planType && params.planType !== "ALL") query.set("planType", params.planType);
  if (params.search) query.set("search", params.search);

  const endpoint = `/admin/plans/subscriptions?${query.toString()}`;
  const cacheKey = `admin-subscriptions:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<CustomerSubscriptionsApiResponse>(endpoint, {
            skipAuthRedirect: true,
          });
          return res;
        } catch {
          const cached = getCachedData<CustomerSubscriptionsApiResponse>(cacheKey);
          return cached || { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<CustomerSubscriptionsApiResponse>(cacheKey) || { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  }

  try {
    const res = await apiClient<CustomerSubscriptionsApiResponse>(endpoint, {
      skipAuthRedirect: true,
    });
    setCachedData(cacheKey, res);
    return res;
  } catch {
    const cached = getCachedData<CustomerSubscriptionsApiResponse>(cacheKey);
    return cached || { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  }
}

/**
 * Admin approves a subscription plan and sets the first delivery date
 */
export async function approveSubscription(
  subscriptionId: string,
  payload: { firstDeliveryDate: string; note?: string }
): Promise<{ success: boolean; message: string; subscriptionId: string; startDate: string; endDate: string }> {
  const res = await apiClient<{
    success: boolean;
    message: string;
    subscriptionId: string;
    startDate: string;
    endDate: string;
  }>(`/admin/plans/subscriptions/${subscriptionId}/approve`, {
    method: "POST",
    body: JSON.stringify({
      firstDeliveryDate: payload.firstDeliveryDate,
      note: payload.note?.trim() || undefined,
    }),
  });

  invalidateCache("admin-subscriptions:");
  invalidateCache("plans:");
  return res;
}
