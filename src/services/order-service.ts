import { apiClient } from "@/lib/api-client";
import {
  AdminOrder,
  OrdersApiResponse,
  OrderSettlement,
  OrderStatus,
  PaymentStatus,
  PlanType,
  SettlementOutcome,
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
  CONFIRMED: ["DELIVERED"],
  PROCESSING: ["DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
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
  deliveryDate?: string;
  page?: number;
  limit?: number;
}

function getEmptyOrdersResponse(page = 1, limit = 20): OrdersApiResponse {
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
 * Normalizes backend response preserving requested page
 */
function normalizeOrdersResponse(
  res: unknown,
  requestedPage = 1,
  requestedLimit = 20
): OrdersApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as AdminOrder[])
      : Array.isArray(obj.orders)
      ? (obj.orders as AdminOrder[])
      : Array.isArray(res)
      ? (res as AdminOrder[])
      : [];

    const rawPagination = obj.pagination as Record<string, unknown> | undefined;
    const pagination: OrdersApiResponse["pagination"] = {
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

  return getEmptyOrdersResponse(requestedPage, requestedLimit);
}

/**
 * Fetch list of orders with filters and SWR client caching
 */
export async function fetchOrders(
  params: OrderQueryParams = {},
  options?: SwrOptions<OrdersApiResponse>
): Promise<OrdersApiResponse> {
  const requestedPage = typeof params.page === "number" && params.page > 0 ? params.page : 1;
  const requestedLimit = typeof params.limit === "number" && params.limit > 0 ? params.limit : 20;

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
          return normalizeOrdersResponse(res, requestedPage, requestedLimit);
        } catch {
          const cached = getCachedData<OrdersApiResponse>(cacheKey);
          return cached || getEmptyOrdersResponse(requestedPage, requestedLimit);
        }
      },
      options
    );

    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<OrdersApiResponse>(cacheKey) || getEmptyOrdersResponse(requestedPage, requestedLimit);
  }

  try {
    const res = await apiClient<unknown>(`/admin/orders?${query.toString()}`, {
      skipAuthRedirect: true,
    });
    const normalized = normalizeOrdersResponse(res, requestedPage, requestedLimit);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<OrdersApiResponse>(cacheKey);
    return cached || getEmptyOrdersResponse(requestedPage, requestedLimit);
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
export interface UpdateOrderStatusResponse {
  success: boolean;
  message: string;
  order: AdminOrder;
  /** Present when the order was marked DELIVERED: what was charged, if anything. */
  settlement?: OrderSettlement;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<UpdateOrderStatusResponse> {
  const res = await apiClient<UpdateOrderStatusResponse>(
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

/**
 * Retries the wallet charge for a delivered order whose delivery charge is
 * outstanding. Sends no amount: the server charges the persisted order total.
 */
export async function settleOrder(id: string): Promise<UpdateOrderStatusResponse> {
  const res = await apiClient<UpdateOrderStatusResponse>(
    `/admin/orders/${id}/settle`,
    { method: "POST" }
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

export interface BulkOperationResultItem {
  orderId: string;
  orderNumber: string;
  success: boolean;
  status?: OrderStatus;
  oldQuantity?: number;
  newQuantity?: number;
  reason?: string;
  /** Billing outcome when marking delivered. */
  outcome?: SettlementOutcome;
  customerId?: string;
  requiredPaise?: number | null;
  availableBalancePaise?: number | null;
  /** Wallet balance when a quantity change was refused for lack of funds. */
  currentBalancePaise?: number;
  shortfallPaise?: number | null;
  oldTotalPaise?: number;
  newTotalPaise?: number;
}

export interface BulkOperationResponse {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: BulkOperationResultItem[];
}

/**
 * Bulk updates delivery status for multiple orders.
 */
export async function bulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatus
): Promise<BulkOperationResponse> {
  const res = await apiClient<BulkOperationResponse>(
    "/admin/orders/bulk/status",
    {
      method: "PATCH",
      body: JSON.stringify({ orderIds, status }),
    }
  );

  invalidateCache("orders:");
  return res;
}

/**
 * Bulk updates milk quantity for upcoming eligible orders.
 */
export async function bulkUpdateOrderQuantity(
  orderIds: string[],
  quantity: number,
  reason?: string
): Promise<BulkOperationResponse> {
  const res = await apiClient<BulkOperationResponse>(
    "/admin/orders/bulk/quantity",
    {
      method: "PATCH",
      body: JSON.stringify({
        orderIds,
        quantity,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    }
  );

  invalidateCache("orders:");
  return res;
}
