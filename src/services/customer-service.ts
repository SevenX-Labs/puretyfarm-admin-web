import { apiClient } from "@/lib/api-client";
import { CustomersApiResponse, CustomerDetail } from "@/types/customer";
import { swrFetch, SwrOptions, getCachedData } from "@/lib/cache";

const EMPTY_CUSTOMERS_RESPONSE: CustomersApiResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
};

export async function fetchCustomers(
  params: {
    page?: number;
    limit?: number;
    search?: string;
  },
  options?: SwrOptions<CustomersApiResponse>
): Promise<CustomersApiResponse> {
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
          return await apiClient<CustomersApiResponse>(`/admin/customers?${query.toString()}`, {
            skipAuthRedirect: true,
          });
        } catch {
          const cached = getCachedData<CustomersApiResponse>(cacheKey);
          return cached || EMPTY_CUSTOMERS_RESPONSE;
        }
      },
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    const res = await promise;
    return res || getCachedData<CustomersApiResponse>(cacheKey) || EMPTY_CUSTOMERS_RESPONSE;
  }

  try {
    return await apiClient<CustomersApiResponse>(`/admin/customers?${query.toString()}`, {
      skipAuthRedirect: true,
    });
  } catch {
    const cached = getCachedData<CustomersApiResponse>(cacheKey);
    return cached || EMPTY_CUSTOMERS_RESPONSE;
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
