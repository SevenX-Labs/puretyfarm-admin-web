import { apiClient } from "@/lib/api-client";
import {
  AdminOrder,
  OrdersApiResponse,
  OrderStatus,
  PaymentStatus,
  PlanType,
} from "@/types/order";
import {
  swrFetch,
  SwrOptions,
  getCachedData,
  setCachedData,
  invalidateCache,
} from "@/lib/cache";

export const ORDER_STATE_MACHINE: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "FAILED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["OUT_FOR_DELIVERY", "CANCELLED", "FAILED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};

/**
 * Mirrors the backend's COMPLETION_ELIGIBLE_STATUSES.
 *
 * This only decides whether the button is worth showing — the server
 * re-checks the status and the order's delivery record before writing, so a
 * stale list here can never complete an order that should not be completed.
 */
export const COMPLETION_ELIGIBLE_STATUSES: OrderStatus[] = ["DELIVERED"];

export function canCompleteOrder(order: Pick<AdminOrder, "status">): boolean {
  return COMPLETION_ELIGIBLE_STATUSES.includes(order.status);
}

export interface OrderQueryParams {
  status?: OrderStatus | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
  planType?: PlanType | "ALL";
  customerSearch?: string;
  orderNumber?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const EMPTY_ORDERS_RESPONSE: OrdersApiResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

/**
 * Normalizes backend response
 */
function normalizeOrdersResponse(res: unknown): OrdersApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as AdminOrder[])
      : Array.isArray(obj.orders)
      ? (obj.orders as AdminOrder[])
      : Array.isArray(res)
      ? (res as AdminOrder[])
      : [];

    const pagination = (obj.pagination as OrdersApiResponse["pagination"]) || {
      page: 1,
      limit: data.length || 20,
      total: data.length,
      totalPages: Math.max(1, Math.ceil((data.length || 1) / (data.length || 20))),
    };

    return { data, pagination };
  }

  return EMPTY_ORDERS_RESPONSE;
}

/**
 * Fetch list of orders with filters and SWR client caching
 */
export async function fetchOrders(
  params: OrderQueryParams = {},
  options?: SwrOptions<OrdersApiResponse>
): Promise<OrdersApiResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      query.set(key, value.toString().trim());
    }
  });

  const cacheKey = `orders:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/orders?${query.toString()}`, {
            skipAuthRedirect: true,
          });
          return normalizeOrdersResponse(res);
        } catch {
          const cached = getCachedData<OrdersApiResponse>(cacheKey);
          return cached || EMPTY_ORDERS_RESPONSE;
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<OrdersApiResponse>(cacheKey) || EMPTY_ORDERS_RESPONSE;
  }

  try {
    const res = await apiClient<unknown>(`/admin/orders?${query.toString()}`, {
      skipAuthRedirect: true,
    });
    const normalized = normalizeOrdersResponse(res);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<OrdersApiResponse>(cacheKey);
    return cached || EMPTY_ORDERS_RESPONSE;
  }
}

/**
 * Fetch detailed order object with snapshot records
 */
export async function fetchOrderDetail(
  id: string,
  options?: SwrOptions<AdminOrder>
): Promise<AdminOrder> {
  const cacheKey = `order:${id}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/orders/${id}`, {
            skipAuthRedirect: true,
          });
          if (res && typeof res === "object") {
            const obj = res as Record<string, unknown>;
            if (obj.order && typeof obj.order === "object") return obj.order as AdminOrder;
            if (obj.data && typeof obj.data === "object") return obj.data as AdminOrder;
          }
          return res as AdminOrder;
        } catch (err) {
          const cached = getCachedData<AdminOrder>(cacheKey);
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
    return res || (getCachedData<AdminOrder>(cacheKey) as AdminOrder);
  }

  const res = await apiClient<unknown>(`/admin/orders/${id}`, {
    skipAuthRedirect: true,
  });
  let item = res as AdminOrder;
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.order && typeof obj.order === "object") item = obj.order as AdminOrder;
    else if (obj.data && typeof obj.data === "object") item = obj.data as AdminOrder;
  }
  setCachedData(cacheKey, item);
  return item;
}

/**
 * Update order status obeying the backend state machine
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<{ success: boolean; message: string; order: AdminOrder }> {
  const res = await apiClient<{ success: boolean; message: string; order: AdminOrder }>(
    `/admin/orders/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  invalidateCache("orders:");
  invalidateCache(`order:${id}`);
  return res;
}

export interface CompleteOrderResponse {
  success: boolean;
  message: string;
  /** True when the order was already completed and nothing changed. */
  alreadyCompleted?: boolean;
  order: AdminOrder;
}

/**
 * Closes a delivered order.
 *
 * Sends no body: the backend derives the target status from the route and
 * decides eligibility itself from the order and its delivery record.
 */
export async function completeOrder(id: string): Promise<CompleteOrderResponse> {
  const res = await apiClient<CompleteOrderResponse>(
    `/admin/orders/${id}/complete`,
    { method: "PATCH" }
  );

  invalidateCache("orders:");
  invalidateCache(`order:${id}`);
  return res;
}
