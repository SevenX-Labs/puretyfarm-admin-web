import { apiClient, ApiError } from "@/lib/api-client";
import {
  PlanConfig,
  PlanType,
  ChangeRequestsApiResponse,
  ChangeRequestItem,
  RequestStatus,
  RequestType,
  PlansApiResponse,
} from "@/types/plan-delivery";
import {
  swrFetch,
  SwrOptions,
  getCachedData,
  setCachedData,
  invalidateCache,
} from "@/lib/cache";

export const DEFAULT_PLANS: PlanConfig[] = [
  {
    type: "BUY_ONCE",
    isActive: true,
    actualPricePerLitre: 9500, // ₹95
    sellingPricePerLitre: 8500, // ₹85
    quantityMin: 1,
    quantityMax: 5,
    deliveryFeePaise: 0,
    deliveryStartTime: "06:00",
    deliveryEndTime: "08:00",
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
    deliveryStartTime: "06:00",
    deliveryEndTime: "08:00",
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
    deliveryStartTime: "06:00",
    deliveryEndTime: "08:00",
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

  // Ensure all 3 fixed plan types exist
  const planOrder: PlanType[] = ["BUY_ONCE", "SEVEN_DAY_TRIAL", "MONTHLY"];
  const finalPlans: PlanConfig[] = planOrder.map((type) => {
    const found = list.find((p) => p.type === type);
    if (found) return found;
    const fallback = DEFAULT_PLANS.find((p) => p.type === type)!;
    return fallback;
  });

  return finalPlans;
}

/**
 * Fetch all plan configurations with SWR cache
 */
export async function getAllPlans(
  options?: SwrOptions<PlanConfig[]>
): Promise<PlanConfig[]> {
  const cacheKey = "plans:all";

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<PlansApiResponse | PlanConfig[]>("/admin/plans", {
            skipAuthRedirect: true,
          });
          const normalized = normalizePlans(res);
          return normalized;
        } catch {
          const cached = getCachedData<PlanConfig[]>(cacheKey);
          if (cached && cached.length > 0) return cached;
          return DEFAULT_PLANS;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return (Array.isArray(res) ? res : getCachedData<PlanConfig[]>(cacheKey)) || DEFAULT_PLANS;
  }

  try {
    const res = await apiClient<PlansApiResponse | PlanConfig[]>("/admin/plans", {
      skipAuthRedirect: true,
    });
    const normalized = normalizePlans(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<PlanConfig[]>(cacheKey);
    return cached || DEFAULT_PLANS;
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
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await apiClient<{ success: boolean; message: string }>(
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
