import { apiClient } from "@/lib/api-client";
import { StateItem, CityItem, AreaItem } from "@/types/location";
import { swrFetch, SwrOptions, setCachedData, invalidateCache } from "@/lib/cache";

function normalizeArray<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.states)) return obj.states as T[];
    if (Array.isArray(obj.cities)) return obj.cities as T[];
    if (Array.isArray(obj.areas)) return obj.areas as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
  }
  return [];
}

function normalizeItem<T>(res: unknown): T {
  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
    if (obj.data && typeof obj.data === "object") return obj.data as T;
  }
  return res as T;
}

// States
export const getStates = async (options?: SwrOptions<StateItem[]>): Promise<StateItem[]> => {
  const cacheKey = "locations:states";
  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        const res = await apiClient<unknown>("/admin/locations/states");
        return normalizeArray<StateItem>(res);
      },
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    return promise;
  }

  const res = await apiClient<unknown>("/admin/locations/states");
  const data = normalizeArray<StateItem>(res);
  setCachedData(cacheKey, data);
  return data;
};

export const createState = async (name: string): Promise<StateItem> => {
  const res = await apiClient<unknown>("/admin/locations/states", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  const item = normalizeItem<StateItem>(res);
  invalidateCache("locations:states");
  return item;
};

export const updateState = async (
  id: string,
  payload: { name?: string; isActive?: boolean }
): Promise<StateItem> => {
  const res = await apiClient<unknown>(`/admin/locations/states/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const item = normalizeItem<StateItem>(res);
  invalidateCache("locations:states");
  return item;
};

export const deleteState = async (
  id: string
): Promise<{ id: string; deleted: boolean }> => {
  const res = await apiClient<{ id: string; deleted: boolean }>(
    `/admin/locations/states/${id}`,
    { method: "DELETE" }
  );
  invalidateCache("locations:states");
  return res;
};

// Cities
export const getCitiesByState = async (
  stateId: string,
  options?: SwrOptions<CityItem[]>
): Promise<CityItem[]> => {
  const cacheKey = `locations:cities:${stateId}`;
  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        const res = await apiClient<unknown>(`/admin/locations/states/${stateId}/cities`);
        return normalizeArray<CityItem>(res);
      },
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    return promise;
  }

  const res = await apiClient<unknown>(`/admin/locations/states/${stateId}/cities`);
  const data = normalizeArray<CityItem>(res);
  setCachedData(cacheKey, data);
  return data;
};

export const createCity = async (
  stateId: string,
  name: string
): Promise<CityItem> => {
  const res = await apiClient<unknown>("/admin/locations/cities", {
    method: "POST",
    body: JSON.stringify({ stateId, name }),
  });
  const item = normalizeItem<CityItem>(res);
  invalidateCache(`locations:cities:${stateId}`);
  return item;
};

export const updateCity = async (
  id: string,
  payload: { name?: string; isActive?: boolean },
  stateId?: string
): Promise<CityItem> => {
  const res = await apiClient<unknown>(`/admin/locations/cities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const item = normalizeItem<CityItem>(res);
  if (stateId) invalidateCache(`locations:cities:${stateId}`);
  invalidateCache("locations:cities");
  return item;
};

export const deleteCity = async (
  id: string,
  stateId?: string
): Promise<{ id: string; deleted: boolean }> => {
  const res = await apiClient<{ id: string; deleted: boolean }>(
    `/admin/locations/cities/${id}`,
    { method: "DELETE" }
  );
  if (stateId) invalidateCache(`locations:cities:${stateId}`);
  invalidateCache("locations:cities");
  return res;
};

// Areas
export const getAreasByCity = async (
  cityId: string,
  options?: SwrOptions<AreaItem[]>
): Promise<AreaItem[]> => {
  const cacheKey = `locations:areas:${cityId}`;
  if (options) {
    const { cachedData, promise } = swrFetch(
      cacheKey,
      async () => {
        const res = await apiClient<unknown>(`/admin/locations/cities/${cityId}/areas`);
        return normalizeArray<AreaItem>(res);
      },
      options
    );
    if (cachedData && !options.forceRefresh) {
      return cachedData;
    }
    return promise;
  }

  const res = await apiClient<unknown>(`/admin/locations/cities/${cityId}/areas`);
  const data = normalizeArray<AreaItem>(res);
  setCachedData(cacheKey, data);
  return data;
};

export const createArea = async (
  cityId: string,
  name: string,
  pincode: string
): Promise<AreaItem> => {
  const res = await apiClient<unknown>("/admin/locations/areas", {
    method: "POST",
    body: JSON.stringify({ cityId, name, pincode }),
  });
  const item = normalizeItem<AreaItem>(res);
  invalidateCache(`locations:areas:${cityId}`);
  return item;
};

export const updateArea = async (
  id: string,
  payload: { name?: string; pincode?: string; isActive?: boolean },
  cityId?: string
): Promise<AreaItem> => {
  const res = await apiClient<unknown>(`/admin/locations/areas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const item = normalizeItem<AreaItem>(res);
  if (cityId) invalidateCache(`locations:areas:${cityId}`);
  invalidateCache("locations:areas");
  return item;
};

export const deleteArea = async (
  id: string,
  cityId?: string
): Promise<{ id: string; deleted: boolean }> => {
  const res = await apiClient<{ id: string; deleted: boolean }>(
    `/admin/locations/areas/${id}`,
    { method: "DELETE" }
  );
  if (cityId) invalidateCache(`locations:areas:${cityId}`);
  invalidateCache("locations:areas");
  return res;
};
