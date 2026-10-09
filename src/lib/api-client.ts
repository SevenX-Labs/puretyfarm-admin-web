import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";

export class ApiError extends Error {
  statusCode: number;
  data?: unknown;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
  }
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "https://api-puretyfarm.onrender.com/api/v1";

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  skipAuthRedirect?: boolean;
  _retry?: boolean;
}

// In-flight refresh token promise so concurrent requests share a single refresh call
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const isBrowser = typeof window !== "undefined";
  if (!isBrowser) return null;

  const refreshToken =
    getCookie("admin_refresh_token") ||
    localStorage.getItem("admin_refresh_token");

  if (!refreshToken) return null;

  try {
    const refreshEndpoints = ["/auth/admin/refresh", "/auth/customer/refresh"];
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;

    for (const ep of refreshEndpoints) {
      try {
        const res = await fetch(`${BASE_URL}${ep}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (res.ok) {
          const body = await res.json();
          if (body && body.accessToken) {
            newAccessToken = body.accessToken;
            newRefreshToken = body.refreshToken || refreshToken;
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }

    if (newAccessToken) {
      setCookie("admin_access_token", newAccessToken, 30);
      localStorage.setItem("admin_access_token", newAccessToken);
      if (newRefreshToken) {
        setCookie("admin_refresh_token", newRefreshToken, 60);
        localStorage.setItem("admin_refresh_token", newRefreshToken);
      }
      return newAccessToken;
    }
  } catch {
    // refresh failed
  }

  return null;
}

/**
 * Centralized API client for Puretyfarm Admin.
 * Handles JWT bearer authentication, transparent token renewal, error normalization, and safe session handling.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, skipAuthRedirect = false, _retry = false, headers = {}, ...rest } = options;

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${normalizedEndpoint}`;

  const requestHeaders = new Headers(headers);

  // Set Content-Type: application/json by default unless sending FormData
  if (!requestHeaders.has("Content-Type") && !(rest.body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  // Attach Bearer token from cookies or localStorage unless explicitly skipped
  if (!skipAuth) {
    let token = getCookie("admin_access_token");
    if (!token && typeof window !== "undefined") {
      token = localStorage.getItem("admin_access_token");
      if (token) {
        setCookie("admin_access_token", token, 30);
      }
    }
    if (token && !requestHeaders.has("Authorization")) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    // Check for 401 Unauthorized
    if (response.status === 401) {
      const isBrowser = typeof window !== "undefined";

      // If we haven't already retried this request and it was authenticated, attempt silent token refresh
      if (!_retry && !skipAuth && isBrowser) {
        const refreshToken =
          getCookie("admin_refresh_token") ||
          localStorage.getItem("admin_refresh_token");

        if (refreshToken) {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
              refreshPromise = null;
            });
          }

          const freshToken = await refreshPromise;
          if (freshToken) {
            // Retry the request with the fresh token
            const retryHeaders = new Headers(requestHeaders);
            retryHeaders.set("Authorization", `Bearer ${freshToken}`);
            return apiClient<T>(endpoint, {
              ...options,
              _retry: true,
              headers: retryHeaders,
            });
          }
        }
      }

      let errorMsg = "Unauthorized: Session expired or invalid credentials.";
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
        if (errorBody && typeof errorBody === "object") {
          const m = (errorBody as { message?: unknown }).message;
          if (m) {
            errorMsg = Array.isArray(m) ? m.join(" • ") : String(m);
          }
        }
      } catch {
        // Non-JSON body — keep default message
      }

      if (isBrowser) {
        deleteCookie("admin_access_token");
        deleteCookie("admin_refresh_token");
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_refresh_token");
        localStorage.removeItem("pf_admin_user");

        // Broadcast unauthorized event to open UI modal across the admin dashboard
        window.dispatchEvent(
          new CustomEvent("pf:unauthorized", {
            detail: { message: errorMsg },
          })
        );

        if (!skipAuthRedirect && !skipAuth && window.location.pathname !== "/login") {
          window.location.href = "/login?expired=1";
        }
      }

      throw new ApiError(errorMsg, 401, errorBody);
    }

    // Try parsing response body
    let data: unknown = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
    }

    // Handle non-2xx HTTP responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (d.message) {
          errorMessage = Array.isArray(d.message)
            ? d.message.join(" • ")
            : String(d.message);
        } else if (d.error) {
          errorMessage = String(d.error);
        }
      }
      throw new ApiError(errorMessage, response.status, data);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message =
      err instanceof Error
        ? err.message
        : "Network request failed. Please verify connection.";
    throw new ApiError(message, 0);
  }
}

// Convenience REST methods
apiClient.get = <T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: "GET" });

apiClient.post = <T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

apiClient.put = <T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

apiClient.patch = <T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

apiClient.delete = <T = unknown>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: "DELETE" });
