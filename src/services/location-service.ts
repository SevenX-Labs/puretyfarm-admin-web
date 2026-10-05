import { apiClient } from "@/lib/api-client";
import { StateItem, CityItem, AreaItem } from "@/types/location";

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
export const getStates = async (): Promise<StateItem[]> => {
  const res = await apiClient<unknown>("/admin/locations/states");
  return normalizeArray<StateItem>(res);
};

export const createState = async (name: string): Promise<StateItem> => {
  const res = await apiClient<unknown>("/admin/locations/states", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return normalizeItem<StateItem>(res);
};

export const updateState = async (
  id: string,
  payload: { name?: string; isActive?: boolean }
): Promise<StateItem> => {
  const res = await apiClient<unknown>(`/admin/locations/states/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeItem<StateItem>(res);
};

export const deleteState = async (
  id: string
): Promise<{ id: string; deleted: boolean }> => {
  return apiClient<{ id: string; deleted: boolean }>(
    `/admin/locations/states/${id}`,
    { method: "DELETE" }
  );
};

// Cities
export const getCitiesByState = async (stateId: string): Promise<CityItem[]> => {
  const res = await apiClient<unknown>(`/admin/locations/states/${stateId}/cities`);
  return normalizeArray<CityItem>(res);
};

export const createCity = async (
  stateId: string,
  name: string
): Promise<CityItem> => {
  const res = await apiClient<unknown>("/admin/locations/cities", {
    method: "POST",
    body: JSON.stringify({ stateId, name }),
  });
  return normalizeItem<CityItem>(res);
};

export const updateCity = async (
  id: string,
  payload: { name?: string; isActive?: boolean }
): Promise<CityItem> => {
  const res = await apiClient<unknown>(`/admin/locations/cities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeItem<CityItem>(res);
};

export const deleteCity = async (
  id: string
): Promise<{ id: string; deleted: boolean }> => {
  return apiClient<{ id: string; deleted: boolean }>(
    `/admin/locations/cities/${id}`,
    { method: "DELETE" }
  );
};

// Areas
export const getAreasByCity = async (cityId: string): Promise<AreaItem[]> => {
  const res = await apiClient<unknown>(`/admin/locations/cities/${cityId}/areas`);
  return normalizeArray<AreaItem>(res);
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
  return normalizeItem<AreaItem>(res);
};

export const updateArea = async (
  id: string,
  payload: { name?: string; pincode?: string; isActive?: boolean }
): Promise<AreaItem> => {
  const res = await apiClient<unknown>(`/admin/locations/areas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeItem<AreaItem>(res);
};

export const deleteArea = async (
  id: string
): Promise<{ id: string; deleted: boolean }> => {
  return apiClient<{ id: string; deleted: boolean }>(
    `/admin/locations/areas/${id}`,
    { method: "DELETE" }
  );
};
