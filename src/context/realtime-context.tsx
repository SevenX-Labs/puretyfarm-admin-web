import { RealtimeStreamClient } from "@/lib/realtime/realtime-stream-client";
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/context/auth-context";
import { getCookie } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/api-client";
import { invalidateCache } from "@/lib/cache";
import { SSEParser } from "@/lib/realtime/sse-parser";
import { triggerGlobalLiveSync } from "@/lib/use-realtime-sync";

export type AdminRealtimeEventType =
  | "admin.wallets.updated"
  | "admin.payments.updated"
  | "admin.orders.updated"
  | "admin.deliveries.updated"
  | "admin.plans.updated"
  | "admin.customers.updated"
  | "admin.dashboard.updated"
  | (string & {});

interface RealtimeContextType {
  isStreamHealthy: boolean;
  subscribe: (
    events: AdminRealtimeEventType[],
    callback: (eventTypes: AdminRealtimeEventType[]) => void
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function getResolvedApiUrl(): string | null {
  const envUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.trim()
      : "";

  if (!envUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RealtimeContext (Admin)] NEXT_PUBLIC_API_URL is not configured. Realtime SSE connection disabled for local development/testing."
      );
    }
    return null;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    envUrl.includes("api-puretyfarm.onrender.com")
  ) {
    console.warn(
      "[RealtimeContext (Admin)] Refusing to connect to production API URL in non-production environment. Realtime SSE connection disabled."
    );
    return null;
  }

  return envUrl.replace(/\/+$/, "").replace(/\/api\/v1\/?$/, "");
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { admin, isAuthenticated } = useAuth();
  const [isStreamHealthy, setIsStreamHealthy] = useState(false);
  const isHealthyRef = useRef(false);

  const listenersRef = useRef<
    Set<{
      types: AdminRealtimeEventType[];
      callback: (types: AdminRealtimeEventType[]) => void;
    }>
  >(new Set());

  const subscribe = useCallback(
    (
      types: AdminRealtimeEventType[],
      callback: (eventTypes: AdminRealtimeEventType[]) => void
    ) => {
      const listener = { types, callback };
      listenersRef.current.add(listener);
      return () => {
        listenersRef.current.delete(listener);
      };
    },
    []
  );

  const dispatchEvents = useCallback(
    (eventTypes: AdminRealtimeEventType[]) => {
      // 1. Invalidate matching SWR cache entries
      for (const ev of eventTypes) {
        if (ev === "admin.wallets.updated") {
          invalidateCache("wallet");
        } else if (ev === "admin.payments.updated") {
          invalidateCache("payment");
          invalidateCache("cash-collection");
          invalidateCache("credit-request");
        } else if (ev === "admin.orders.updated") {
          invalidateCache("order");
        } else if (ev === "admin.deliveries.updated") {
          invalidateCache("deliver");
          invalidateCache("change-request");
        } else if (ev === "admin.plans.updated") {
          invalidateCache("plan");
          invalidateCache("admin-subscription");
        } else if (ev === "admin.customers.updated") {
          invalidateCache("customer");
        } else if (ev === "admin.dashboard.updated") {
          invalidateCache("dashboard");
        }
      }

      // 2. Notify subscribers
      for (const listener of listenersRef.current) {
        const matches = eventTypes.some((t) => listener.types.includes(t));
        if (matches) {
          try {
            listener.callback(eventTypes);
          } catch (err) {
            console.error("[realtime-admin] Error in event listener", err);
          }
        }
      }

      // 3. Trigger cross-tab sync channel
      triggerGlobalLiveSync(`realtime:${eventTypes.join(",")}`);
    },
    []
  );

  useEffect(() => {
    const resolvedApiUrl = getResolvedApiUrl();
    if (!resolvedApiUrl) {
      setIsStreamHealthy(false);
      isHealthyRef.current = false;
      return;
    }

    if (!isAuthenticated || !admin?.id) {
      setIsStreamHealthy(false);
      isHealthyRef.current = false;
      return;
    }

    let hiddenCloseTimer: NodeJS.Timeout | null = null;

    const getBearerToken = (): string | null => {
      let token = getCookie("admin_access_token");
      if (!token && typeof window !== "undefined") {
        token = localStorage.getItem("admin_access_token");
      }
      return token;
    };

    const client = new RealtimeStreamClient({
      streamUrl: `${resolvedApiUrl}/api/v1/admin/events/stream`,
      getAccessToken: getBearerToken,
      refreshAccessToken: () => refreshAccessToken(),
      onEvents: (types) => dispatchEvents(types as AdminRealtimeEventType[]),
      onConnected: () => triggerGlobalLiveSync("stream_connected"),
      createParser: () => new SSEParser(),
      onHealthChange: (healthy) => {
        isHealthyRef.current = healthy;
        setIsStreamHealthy(healthy);
      },
    });

    void client.connect();

    // Close stream when tab hidden > 2 minutes; reopen when visible
    const handleVisibilityChange = () => {
      if (typeof document === "undefined") return;

      if (document.visibilityState === "hidden") {
        if (hiddenCloseTimer) clearTimeout(hiddenCloseTimer);
        hiddenCloseTimer = setTimeout(() => {
          if (document.visibilityState === "hidden") {
            client.disconnect();
          }
        }, 120000);
      } else if (document.visibilityState === "visible") {
        if (hiddenCloseTimer) {
          clearTimeout(hiddenCloseTimer);
          hiddenCloseTimer = null;
        }
        if (!isHealthyRef.current) {
          void client.connect();
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      if (hiddenCloseTimer) clearTimeout(hiddenCloseTimer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      client.disconnect();
    };
  }, [admin?.id, isAuthenticated, dispatchEvents]);

  return (
    <RealtimeContext.Provider value={{ isStreamHealthy, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext(): RealtimeContextType | null {
  return useContext(RealtimeContext);
}
