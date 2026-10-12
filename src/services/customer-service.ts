import { apiClient } from "@/lib/api-client";
import { CustomersApiResponse, CustomerDetail, CustomerListItem } from "@/types/customer";
import { swrFetch, SwrOptions, getCachedData, setCachedData } from "@/lib/cache";

function getEmptyCustomersResponse(page = 1, limit = 20): CustomersApiResponse {
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

function normalizeCustomersResponse(
  res: unknown,
  requestedPage = 1,
  requestedLimit = 20
): CustomersApiResponse {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    const data = Array.isArray(obj.data)
      ? (obj.data as CustomerListItem[])
      : Array.isArray(obj.customers)
      ? (obj.customers as CustomerListItem[])
      : Array.isArray(res)
      ? (res as CustomerListItem[])
      : [];

    const rawPagination = obj.pagination as Record<string, unknown> | undefined;
    const pagination = {
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

  return getEmptyCustomersResponse(requestedPage, requestedLimit);
}

export async function fetchCustomers(
  params: {
    page?: number;
    limit?: number;
    search?: string;
  },
  options?: SwrOptions<CustomersApiResponse>
): Promise<CustomersApiResponse> {
  const requestedPage = typeof params.page === "number" && params.page > 0 ? params.page : 1;
  const requestedLimit = typeof params.limit === "number" && params.limit > 0 ? params.limit : 20;

  const query = new URLSearchParams();
  if (params.page) query.set("page", params.page.toString());
  if (params.limit) query.set("limit", params.limit.toString());
  if (params.search?.trim()) query.set("search", params.search.trim());

  const cacheKey = `customers:${query.toString()}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          const res = await apiClient<unknown>(`/admin/customers?${query.toString()}`, {
            skipAuthRedirect: true,
          });
          return normalizeCustomersResponse(res, requestedPage, requestedLimit);
        } catch {
          const cached = getCachedData<CustomersApiResponse>(cacheKey);
          return cached || getEmptyCustomersResponse(requestedPage, requestedLimit);
        }
      },
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<CustomersApiResponse>(cacheKey) || getEmptyCustomersResponse(requestedPage, requestedLimit);
  }

  try {
    const res = await apiClient<unknown>(`/admin/customers?${query.toString()}`, {
      skipAuthRedirect: true,
    });
    const normalized = normalizeCustomersResponse(res, requestedPage, requestedLimit);
    setCachedData(cacheKey, normalized);
    return normalized;
  } catch {
    const cached = getCachedData<CustomersApiResponse>(cacheKey);
    return cached || getEmptyCustomersResponse(requestedPage, requestedLimit);
  }
}

export async function fetchCustomerById(
  id: string,
  options?: SwrOptions<CustomerDetail>
): Promise<CustomerDetail> {
  const cacheKey = `customer:${id}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        try {
          return await apiClient<CustomerDetail>(`/admin/customers/${id}`, {
            skipAuthRedirect: true,
          });
        } catch (err) {
          const cached = getCachedData<CustomerDetail>(cacheKey);
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
    return res || (getCachedData<CustomerDetail>(cacheKey) as CustomerDetail);
  }

  try {
    return await apiClient<CustomerDetail>(`/admin/customers/${id}`, {
      skipAuthRedirect: true,
    });
  } catch (err) {
    const cached = getCachedData<CustomerDetail>(cacheKey);
    if (cached) return cached;
    throw err;
  }
}
