import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";

export class ApiError extends Error {
  statusCode: number;
  data?: unknown;
  isUnauthorized?: boolean;
  /** Stable machine-readable code from the API, e.g. `CASH_CONFIRMATION_TIMED_OUT`. */
  code?: string;
  /** Support reference the API logged alongside the failure, when it sent one. */
  reference?: string;
  /** True when the API states the call changed nothing and may be repeated. */
  retryable?: boolean;

  constructor(message: string, statusCode: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.data = data;
    this.isUnauthorized = statusCode === 401 || statusCode === 403;

    // Nest sends domain failures as `{ error, message, reference, retryable }`,
    // sometimes nested under `message` when a filter re-wraps the body.
    if (data && typeof data === "object") {
      const body = data as Record<string, unknown>;
      const inner =
        body.message && typeof body.message === "object"
          ? (body.message as Record<string, unknown>)
          : body;
      const code = inner.error ?? body.error;
      if (typeof code === "string") this.code = code;
      const reference = inner.reference ?? body.reference;
      if (typeof reference === "string") this.reference = reference;
      const retryable = inner.retryable ?? body.retryable;
      if (typeof retryable === "boolean") this.retryable = retryable;
    }
  }
}

/**
 * Verbose request/response logging, development only.
 *
 * Deliberately never logs the Authorization header or request cookies: this
 * output ends up pasted into bug reports, and a leaked admin bearer token is a
 * full account compromise.
 */
const DEBUG_API =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DEBUG_API === "true";

const REDACTED_HEADERS = ["authorization", "cookie", "set-cookie"];

function debugLog(label: string, detail: Record<string, unknown>) {
  if (!DEBUG_API) return;
  console.debug(`[api] ${label}`, detail);
}

function safeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = REDACTED_HEADERS.includes(key.toLowerCase())
      ? "<redacted>"
      : value;
  });
  return out;
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

  const method = (rest.method || "GET").toUpperCase();
  const startedAt = Date.now();

  debugLog(`-> ${method} ${url}`, {
    endpoint: normalizedEndpoint,
    headers: safeHeaders(requestHeaders),
    body:
      rest.body instanceof FormData
        ? "<FormData>"
        : typeof rest.body === "string"
        ? rest.body
        : rest.body ?? null,
    retry: _retry,
  });

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });

    // Check for 401 Unauthorized or 403 Forbidden with auth-expired symptoms
    if (response.status === 401 || (response.status === 403 && !skipAuth)) {
      const isBrowser = typeof window !== "undefined";

      // If we haven't already retried this request and it was authenticated, attempt silent token refresh FIRST
      if (!_retry && !skipAuth && isBrowser && response.status === 401) {
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
            // Retry the request exactly once with the fresh token
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

      let errorMsg = "Your session has expired. Please log in again to continue.";
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
        if (errorBody && typeof errorBody === "object") {
          const m = (errorBody as { message?: unknown; error?: unknown }).message || (errorBody as { error?: unknown }).error;
          if (m) {
            errorMsg = Array.isArray(m) ? m.join(" • ") : String(m);
          }
        }
      } catch {
        // Non-JSON body — keep default message
      }

      if (isBrowser) {
        try {
          const userRaw = localStorage.getItem("pf_admin_user");
          if (userRaw) {
            const u = JSON.parse(userRaw);
            if (u && u.email) {
              localStorage.setItem("pf_last_admin_email", u.email);
            }
          }
        } catch {
          // ignore parsing error
        }

        deleteCookie("admin_access_token");
        deleteCookie("admin_refresh_token");
        localStorage.removeItem("admin_access_token");
        localStorage.removeItem("admin_refresh_token");
        localStorage.removeItem("pf_admin_user");

        console.warn(
          "[Puretyfarm Admin Auth] 401 Unauthorized encountered. Dispatching unauthorized event to prompt re-login and live data refresh.",
          { endpoint: normalizedEndpoint, status: response.status, error: errorMsg }
        );

        // Broadcast unauthorized event to open UI modal across the admin dashboard
        const currentPath = window.location.pathname + window.location.search;
        window.dispatchEvent(
          new CustomEvent("pf:unauthorized", {
            detail: {
              message: errorMsg,
              status: response.status,
              returnUrl: currentPath,
            },
          })
        );
      }

      throw new ApiError(errorMsg, response.status, errorBody);
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

    debugLog(
      `<- ${response.status} ${method} ${url} (${Date.now() - startedAt}ms)`,
      { ok: response.ok, body: data },
    );

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
    // Reaching here means fetch itself rejected — DNS, TLS, offline, or a CORS
    // preflight the browser refused. Status 0 distinguishes it from any real
    // HTTP response, and the original message is useless to an operator, so
    // callers get something they can act on.
    debugLog(`!! ${method} ${url} (${Date.now() - startedAt}ms)`, {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0,
      { cause: err instanceof Error ? err.message : String(err) }
    );
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
