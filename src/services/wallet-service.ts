import { apiClient, ApiError } from "@/lib/api-client";
import {
  CreditRequestsApiResponse,
  CreditRequestItem,
  CustomerWalletDetail,
  CreditRequestStatus,
  RejectResponse,
} from "@/types/wallet";
import {
  swrFetch,
  SwrOptions,
  getCachedData,
  setCachedData,
  invalidateCache,
} from "@/lib/cache";

export interface CreditRequestQueryParams {
  status?: CreditRequestStatus | "ALL";
  source?: "ONLINE" | "CASH";
  customerSearch?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const EMPTY_CREDIT_REQUESTS_RESPONSE: CreditRequestsApiResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

/**
 * Normalizes credit requests API response
 */
function normalizeCreditRequestsResponse(res: unknown): CreditRequestsApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as CreditRequestItem[])
      : Array.isArray(obj.requests)
      ? (obj.requests as CreditRequestItem[])
      : Array.isArray(res)
      ? (res as CreditRequestItem[])
      : [];

    const pagination = (obj.pagination as CreditRequestsApiResponse["pagination"]) || {
      page: 1,
      limit: data.length || 20,
      total: data.length,
      totalPages: Math.max(1, Math.ceil((data.length || 1) / (data.length || 20))),
    };

    return { data, pagination };
  }

  return EMPTY_CREDIT_REQUESTS_RESPONSE;
}

/**
 * Normalizes customer wallet detail response
 */
function normalizeCustomerWalletDetail(res: unknown, userId: string): CustomerWalletDetail {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const base = (obj.wallet && typeof obj.wallet === "object")
      ? (obj.wallet as Record<string, unknown>)
      : (obj.data && typeof obj.data === "object")
      ? (obj.data as Record<string, unknown>)
      : obj;

    const customer = (base.customer && typeof base.customer === "object")
      ? (base.customer as CustomerWalletDetail["customer"])
      : {
          id: userId,
          name: String(base.customerName || "Customer"),
          mobile: String(base.mobile || base.phone || ""),
          email: base.email ? String(base.email) : null,
        };

    const balancePaise = Number(base.balancePaise ?? base.walletBalancePaise ?? 0);
    const autoCreditEnabled = Boolean(base.autoCreditEnabled ?? false);
    const summary = (base.summary && typeof base.summary === "object")
      ? (base.summary as CustomerWalletDetail["summary"])
      : {
          totalCreditsPaise: Number(base.totalCreditsPaise ?? 0),
          totalCreditsCount: Number(base.totalCreditsCount ?? 0),
          totalDebitsPaise: Number(base.totalDebitsPaise ?? 0),
          totalDebitsCount: Number(base.totalDebitsCount ?? 0),
        };

    const recentTransactions = Array.isArray(base.recentTransactions)
      ? (base.recentTransactions as CustomerWalletDetail["recentTransactions"])
      : Array.isArray(base.transactions)
      ? (base.transactions as CustomerWalletDetail["recentTransactions"])
      : [];

    return {
      customer,
      balancePaise,
      autoCreditEnabled,
      summary,
      recentTransactions,
      createdAt: String(base.createdAt || new Date().toISOString()),
      updatedAt: String(base.updatedAt || new Date().toISOString()),
    };
  }

  return {
    customer: { id: userId, name: "Customer", mobile: "", email: null },
    balancePaise: 0,
    summary: { totalCreditsPaise: 0, totalCreditsCount: 0, totalDebitsPaise: 0, totalDebitsCount: 0 },
    recentTransactions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch credit requests with multi-criteria filtering, pagination, and SWR caching
 */
export async function fetchCreditRequests(
  params: CreditRequestQueryParams = {},
  options?: SwrOptions<CreditRequestsApiResponse>
): Promise<CreditRequestsApiResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      query.set(key, value.toString().trim());
    }
  });

  const cacheKey = `wallet:credit-requests:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(
            `/admin/wallet/credit-requests?${query.toString()}`,
            { skipAuthRedirect: true }
          );
          return normalizeCreditRequestsResponse(res);
        } catch {
          const cached = getCachedData<CreditRequestsApiResponse>(cacheKey);
          return cached || EMPTY_CREDIT_REQUESTS_RESPONSE;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<CreditRequestsApiResponse>(cacheKey) || EMPTY_CREDIT_REQUESTS_RESPONSE;
  }

  try {
    const res = await apiClient<unknown>(
      `/admin/wallet/credit-requests?${query.toString()}`,
      { skipAuthRedirect: true }
    );
    const normalized = normalizeCreditRequestsResponse(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<CreditRequestsApiResponse>(cacheKey);
    return cached || EMPTY_CREDIT_REQUESTS_RESPONSE;
  }
}

/**
 * Fetch credit request detail
 */
export async function fetchCreditRequestDetail(
  id: string,
  options?: SwrOptions<CreditRequestItem>
): Promise<CreditRequestItem> {
  const cacheKey = `wallet:credit-request:${id}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/wallet/credit-requests/${id}`, {
            skipAuthRedirect: true,
          });
          if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (obj.request && typeof obj.request === "object") return obj.request as CreditRequestItem;
            if (obj.data && typeof obj.data === "object") return obj.data as CreditRequestItem;
          }
          return res as CreditRequestItem;
        } catch (err) {
          const cached = getCachedData<CreditRequestItem>(cacheKey);
          if (cached) return cached;
          throw err;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || (getCachedData<CreditRequestItem>(cacheKey) as CreditRequestItem);
  }

  const res = await apiClient<unknown>(`/admin/wallet/credit-requests/${id}`, {
    skipAuthRedirect: true,
  });
  let item = res as CreditRequestItem;
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.request && typeof obj.request === "object") item = obj.request as CreditRequestItem;
    else if (obj.data && typeof obj.data === "object") item = obj.data as CreditRequestItem;
  }
  setCachedData(cacheKey, item);
  return item;
}

/**
 * Approve credit request
 */
export async function approveCreditRequest(
  id: string
): Promise<{ success: boolean; message: string; request?: Partial<CreditRequestItem> }> {
  try {
    const res = await apiClient<{ success: boolean; message: string; request?: Partial<CreditRequestItem> }>(
      `/admin/wallet/credit-requests/${id}/approve`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    invalidateCache("wallet:credit-requests");
    invalidateCache(`wallet:credit-request:${id}`);
    invalidateCache("wallet:customer");
    return res;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.statusCode === 409) {
      throw new ApiError(
        "Conflict: This credit request has already been processed by an administrator.",
        409,
        err.data
      );
    }
    throw err;
  }
}

/**
 * Reject credit request with mandatory note (Auto-initiates PayU refund on backend)
 */
export async function rejectCreditRequest(
  id: string,
  note: string
): Promise<RejectResponse> {
  const trimmed = note.trim();
  if (!trimmed || trimmed.length < 3) {
    throw new ApiError("Rejection reason note must be at least 3 characters.", 400);
  }
  if (trimmed.length > 1000) {
    throw new ApiError("Rejection reason note cannot exceed 1000 characters.", 400);
  }

  try {
    const res = await apiClient<RejectResponse>(
      `/admin/wallet/credit-requests/${id}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ note: trimmed }),
      }
    );

    invalidateCache("wallet:credit-requests");
    invalidateCache(`wallet:credit-request:${id}`);
    invalidateCache("wallet:customer");
    return res;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.statusCode === 409) {
      throw new ApiError(
        "Conflict: This credit request has already been processed by an administrator.",
        409,
        err.data
      );
    }
    throw err;
  }
}

/**
 * Fetch customer wallet balance, stats, and historical ledger transactions
 */
export async function fetchCustomerWallet(
  userId: string,
  options?: SwrOptions<CustomerWalletDetail>
): Promise<CustomerWalletDetail> {
  const cacheKey = `wallet:customer:${userId}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/wallet/customers/${userId}`, {
            skipAuthRedirect: true,
          });
          return normalizeCustomerWalletDetail(res, userId);
        } catch {
          const cached = getCachedData<CustomerWalletDetail>(cacheKey);
          return cached || normalizeCustomerWalletDetail({}, userId);
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<CustomerWalletDetail>(cacheKey) || normalizeCustomerWalletDetail({}, userId);
  }

  try {
    const res = await apiClient<unknown>(`/admin/wallet/customers/${userId}`, {
      skipAuthRedirect: true,
    });
    const normalized = normalizeCustomerWalletDetail(res, userId);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<CustomerWalletDetail>(cacheKey);
    return cached || normalizeCustomerWalletDetail({}, userId);
  }
}
