import { apiClient } from "@/lib/api-client";
import {
  PaymentsApiResponse,
  PaymentItem,
  CashCollectionsApiResponse,
  CashCollectionItem,
  PaymentTransactionStatus,
  CashCollectionStatus,
  PaymentPurpose,
  PaymentMethod,
} from "@/types/payment";
import {
  swrFetch,
  SwrOptions,
  getCachedData,
  setCachedData,
  invalidateCache,
} from "@/lib/cache";

export interface PaymentQueryParams {
  status?: PaymentTransactionStatus | "ALL";
  purpose?: PaymentPurpose | "ALL";
  paymentMethod?: PaymentMethod | "ALL";
  transactionId?: string;
  customerSearch?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CashCollectionQueryParams {
  status?: CashCollectionStatus | "ALL";
  customerSearch?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

function getEmptyPaymentsResponse(page = 1, limit = 20): PaymentsApiResponse {
  return {
    data: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 1,
    },
  };
}

function getEmptyCashCollectionsResponse(page = 1, limit = 20): CashCollectionsApiResponse {
  return {
    data: [],
    pagination: {
      page,
      limit,
      total: 0,
      totalPages: 1,
    },
  };
}

/**
 * Normalizes payment API response preserving requested page
 */
function normalizePaymentsResponse(
  res: unknown,
  requestedPage = 1,
  requestedLimit = 20
): PaymentsApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as PaymentItem[])
      : Array.isArray(obj.payments)
      ? (obj.payments as PaymentItem[])
      : Array.isArray(res)
      ? (res as PaymentItem[])
      : [];

    const rawPagination = obj.pagination as Record<string, unknown> | undefined;
    const pagination: PaymentsApiResponse["pagination"] = {
      page:
        typeof rawPagination?.page === "number"
          ? rawPagination.page
          : requestedPage,
      limit:
        typeof rawPagination?.limit === "number"
          ? rawPagination.limit
          : requestedLimit,
      total:
        typeof rawPagination?.total === "number"
          ? rawPagination.total
          : data.length,
      totalPages:
        typeof rawPagination?.totalPages === "number"
          ? Math.max(1, rawPagination.totalPages)
          : Math.max(1, Math.ceil((data.length || 1) / requestedLimit)),
    };

    return { data, pagination };
  }
  return getEmptyPaymentsResponse(requestedPage, requestedLimit);
}

/**
 * Normalizes cash collections API response preserving requested page
 */
function normalizeCashCollectionsResponse(
  res: unknown,
  requestedPage = 1,
  requestedLimit = 20
): CashCollectionsApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as CashCollectionItem[])
      : Array.isArray(obj.cashCollections)
      ? (obj.cashCollections as CashCollectionItem[])
      : Array.isArray(res)
      ? (res as CashCollectionItem[])
      : [];

    const rawPagination = obj.pagination as Record<string, unknown> | undefined;
    const pagination: CashCollectionsApiResponse["pagination"] = {
      page:
        typeof rawPagination?.page === "number"
          ? rawPagination.page
          : requestedPage,
      limit:
        typeof rawPagination?.limit === "number"
          ? rawPagination.limit
          : requestedLimit,
      total:
        typeof rawPagination?.total === "number"
          ? rawPagination.total
          : data.length,
      totalPages:
        typeof rawPagination?.totalPages === "number"
          ? Math.max(1, rawPagination.totalPages)
          : Math.max(1, Math.ceil((data.length || 1) / requestedLimit)),
    };

    return { data, pagination };
  }
  return getEmptyCashCollectionsResponse(requestedPage, requestedLimit);
}

// ============================================================================
// ONLINE PAYMENTS SERVICE
// ============================================================================

/**
 * Fetch online payment transactions with SWR caching
 */
export async function fetchPayments(
  params: PaymentQueryParams = {},
  options?: SwrOptions<PaymentsApiResponse>
): Promise<PaymentsApiResponse> {
  const requestedPage = typeof params.page === "number" && params.page > 0 ? params.page : 1;
  const requestedLimit = typeof params.limit === "number" && params.limit > 0 ? params.limit : 20;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      query.set(key, value.toString().trim());
    }
  });

  const cacheKey = `payments:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/payments?${query.toString()}`, {
            skipAuthRedirect: true,
          });
          return normalizePaymentsResponse(res, requestedPage, requestedLimit);
        } catch {
          const cached = getCachedData<PaymentsApiResponse>(cacheKey);
          return cached || getEmptyPaymentsResponse(requestedPage, requestedLimit);
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<PaymentsApiResponse>(cacheKey) || getEmptyPaymentsResponse(requestedPage, requestedLimit);
  }

  try {
    const res = await apiClient<unknown>(`/admin/payments?${query.toString()}`, {
      skipAuthRedirect: true,
    });
    const normalized = normalizePaymentsResponse(res, requestedPage, requestedLimit);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<PaymentsApiResponse>(cacheKey);
    return cached || getEmptyPaymentsResponse(requestedPage, requestedLimit);
  }
}

/**
 * Fetch detailed payment item with provider response & linked wallet credit
 */
export async function fetchPaymentDetail(
  id: string,
  options?: SwrOptions<PaymentItem>
): Promise<PaymentItem> {
  const cacheKey = `payment:${id}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/payments/${id}`, {
            skipAuthRedirect: true,
          });
          if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (obj.payment && typeof obj.payment === "object") return obj.payment as PaymentItem;
            if (obj.data && typeof obj.data === "object") return obj.data as PaymentItem;
          }
          return res as PaymentItem;
        } catch (err) {
          const cached = getCachedData<PaymentItem>(cacheKey);
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
    return res || (getCachedData<PaymentItem>(cacheKey) as PaymentItem);
  }

  const res = await apiClient<unknown>(`/admin/payments/${id}`, {
    skipAuthRedirect: true,
  });
  let item = res as PaymentItem;
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.payment && typeof obj.payment === "object") item = obj.payment as PaymentItem;
    else if (obj.data && typeof obj.data === "object") item = obj.data as PaymentItem;
  }
  setCachedData(cacheKey, item);
  return item;
}

// ============================================================================
// CASH COLLECTIONS SERVICE
// ============================================================================

/**
 * Fetch cash collection records with SWR caching
 */
export async function fetchCashCollections(
  params: CashCollectionQueryParams = {},
  options?: SwrOptions<CashCollectionsApiResponse>
): Promise<CashCollectionsApiResponse> {
  const requestedPage = typeof params.page === "number" && params.page > 0 ? params.page : 1;
  const requestedLimit = typeof params.limit === "number" && params.limit > 0 ? params.limit : 20;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      query.set(key, value.toString().trim());
    }
  });

  const cacheKey = `cash-collections:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(
            `/admin/payments/cash-collections?${query.toString()}`,
            {
              skipAuthRedirect: true,
            }
          );
          return normalizeCashCollectionsResponse(res, requestedPage, requestedLimit);
        } catch {
          const cached = getCachedData<CashCollectionsApiResponse>(cacheKey);
          return cached || getEmptyCashCollectionsResponse(requestedPage, requestedLimit);
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return (
      res ||
      getCachedData<CashCollectionsApiResponse>(cacheKey) ||
      getEmptyCashCollectionsResponse(requestedPage, requestedLimit)
    );
  }

  try {
    const res = await apiClient<unknown>(
      `/admin/payments/cash-collections?${query.toString()}`,
      {
        skipAuthRedirect: true,
      }
    );
    const normalized = normalizeCashCollectionsResponse(res, requestedPage, requestedLimit);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<CashCollectionsApiResponse>(cacheKey);
    return cached || getEmptyCashCollectionsResponse(requestedPage, requestedLimit);
  }
}

/**
 * Fetch single cash collection detail
 */
export async function fetchCashCollectionDetail(
  id: string,
  options?: SwrOptions<CashCollectionItem>
): Promise<CashCollectionItem> {
  const cacheKey = `cash-collection:${id}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/payments/cash-collections/${id}`, {
            skipAuthRedirect: true,
          });
          if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (obj.cashCollection && typeof obj.cashCollection === "object")
              return obj.cashCollection as CashCollectionItem;
            if (obj.data && typeof obj.data === "object")
              return obj.data as CashCollectionItem;
          }
          return res as CashCollectionItem;
        } catch (err) {
          const cached = getCachedData<CashCollectionItem>(cacheKey);
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
    return res || (getCachedData<CashCollectionItem>(cacheKey) as CashCollectionItem);
  }

  const res = await apiClient<unknown>(`/admin/payments/cash-collections/${id}`, {
    skipAuthRedirect: true,
  });
  let item = res as CashCollectionItem;
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.cashCollection && typeof obj.cashCollection === "object")
      item = obj.cashCollection as CashCollectionItem;
    else if (obj.data && typeof obj.data === "object")
      item = obj.data as CashCollectionItem;
  }
  setCachedData(cacheKey, item);
  return item;
}

/**
 * Confirm cash receipt by admin (credits wallet or activates subscription)
 */
export async function confirmCashCollection(
  id: string,
  note?: string
): Promise<{ success: boolean; message: string; cashCollection?: CashCollectionItem; walletCredit?: any }> {
  const res = await apiClient<{ success: boolean; message: string; cashCollection?: CashCollectionItem; walletCredit?: any }>(
    `/admin/payments/cash-collections/${id}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({
        note: note?.trim() || undefined,
      }),
    }
  );

  invalidateCache("cash-collections:");
  invalidateCache(`cash-collection:${id}`);
  invalidateCache("payments:");
  invalidateCache("credit-requests:");
  invalidateCache("admin-subscriptions:");
  invalidateCache("plans:");
  return res;
}

/**
 * Cancel cash collection request with required reason note (3-1000 chars)
 */
export async function cancelCashCollection(
  id: string,
  note: string
): Promise<{ success: boolean; message: string; cashCollection?: CashCollectionItem }> {
  const res = await apiClient<{ success: boolean; message: string; cashCollection?: CashCollectionItem }>(
    `/admin/payments/cash-collections/${id}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ note: note.trim() }),
    }
  );

  invalidateCache("cash-collections:");
  invalidateCache(`cash-collection:${id}`);
  return res;
}

// ============================================================================
// MANUAL PAYU REFUND RETRY
// ============================================================================

/**
 * Trigger manual PayU refund retry for rejected credit requests whose auto-refund failed
 */
export async function retryPhonePeRefund(
  creditRequestId: string
): Promise<{ success: boolean; message: string; payment: any }> {
  const res = await apiClient<{ success: boolean; message: string; payment: any }>(
    `/admin/payments/credit-requests/${creditRequestId}/refund`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );

  invalidateCache("payments:");
  invalidateCache("credit-requests:");
  return res;
}

export const retryPayuRefund = retryPhonePeRefund;
