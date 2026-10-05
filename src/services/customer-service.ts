import { apiClient } from "@/lib/api-client";
import { CustomersApiResponse, CustomerDetail } from "@/types/customer";
import { swrFetch, SwrOptions } from "@/lib/cache";

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
      () => apiClient<CustomersApiResponse>(`/admin/customers?${query.toString()}`),
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    return promise;
  }

  return apiClient<CustomersApiResponse>(`/admin/customers?${query.toString()}`);
}

export async function fetchCustomerById(
  id: string,
  options?: SwrOptions<CustomerDetail>
): Promise<CustomerDetail> {
  const cacheKey = `customer:${id}`;

  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      () => apiClient<CustomerDetail>(`/admin/customers/${id}`),
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    return promise;
  }

  return apiClient<CustomerDetail>(`/admin/customers/${id}`);
}
