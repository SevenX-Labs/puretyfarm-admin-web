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
}

/**
 * Centralized API client for Puretyfarm Admin.
 * Handles JWT bearer authentication, error normalization, and safe session handling.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, skipAuthRedirect = false, headers = {}, ...rest } = options;

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
      let errorMsg = "Unauthorized session.";
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) {
          errorMsg = Array.isArray(errJson.message)
            ? errJson.message.join(" • ")
            : String(errJson.message);
        }
      } catch {
        // Fallback to default message
      }

      // In browser, clean up dead token if unauthorized
      if (typeof window !== "undefined" && !skipAuthRedirect) {
        deleteCookie("admin_access_token");
        deleteCookie("admin_refresh_token");
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_refresh_token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login?expired=1";
        }
      }

      throw new ApiError(errorMsg, 401);
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
