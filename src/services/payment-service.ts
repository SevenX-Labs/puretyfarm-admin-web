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

const EMPTY_PAYMENTS_RESPONSE: PaymentsApiResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

const EMPTY_CASH_COLLECTIONS_RESPONSE: CashCollectionsApiResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

/**
 * Normalizes payment API response
 */
function normalizePaymentsResponse(res: unknown): PaymentsApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as PaymentItem[])
      : Array.isArray(obj.payments)
      ? (obj.payments as PaymentItem[])
      : Array.isArray(res)
      ? (res as PaymentItem[])
      : [];

    const pagination = (obj.pagination as PaymentsApiResponse["pagination"]) || {
      page: 1,
      limit: data.length || 20,
      total: data.length,
      totalPages: Math.max(1, Math.ceil((data.length || 1) / (data.length || 20))),
    };

    return { data, pagination };
  }
  return EMPTY_PAYMENTS_RESPONSE;
}

/**
 * Normalizes cash collections API response
 */
function normalizeCashCollectionsResponse(res: unknown): CashCollectionsApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as CashCollectionItem[])
      : Array.isArray(obj.cashCollections)
      ? (obj.cashCollections as CashCollectionItem[])
      : Array.isArray(res)
      ? (res as CashCollectionItem[])
      : [];

    const pagination = (obj.pagination as CashCollectionsApiResponse["pagination"]) || {
      page: 1,
      limit: data.length || 20,
      total: data.length,
      totalPages: Math.max(1, Math.ceil((data.length || 1) / (data.length || 20))),
    };

    return { data, pagination };
  }
  return EMPTY_CASH_COLLECTIONS_RESPONSE;
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
          return normalizePaymentsResponse(res);
        } catch {
          const cached = getCachedData<PaymentsApiResponse>(cacheKey);
          return cached || EMPTY_PAYMENTS_RESPONSE;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<PaymentsApiResponse>(cacheKey) || EMPTY_PAYMENTS_RESPONSE;
  }

  try {
    const res = await apiClient<unknown>(`/admin/payments?${query.toString()}`, {
      skipAuthRedirect: true,
    });
    const normalized = normalizePaymentsResponse(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<PaymentsApiResponse>(cacheKey);
    return cached || EMPTY_PAYMENTS_RESPONSE;
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
          return normalizeCashCollectionsResponse(res);
        } catch {
          const cached = getCachedData<CashCollectionsApiResponse>(cacheKey);
          return cached || EMPTY_CASH_COLLECTIONS_RESPONSE;
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
      EMPTY_CASH_COLLECTIONS_RESPONSE
    );
  }

  try {
    const res = await apiClient<unknown>(
      `/admin/payments/cash-collections?${query.toString()}`,
      {
        skipAuthRedirect: true,
      }
    );
    const normalized = normalizeCashCollectionsResponse(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<CashCollectionsApiResponse>(cacheKey);
    return cached || EMPTY_CASH_COLLECTIONS_RESPONSE;
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
      body: JSON.stringify({ note: note?.trim() || undefined }),
    }
  );

  invalidateCache("cash-collections:");
  invalidateCache(`cash-collection:${id}`);
  invalidateCache("payments:");
  invalidateCache("credit-requests:");
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
