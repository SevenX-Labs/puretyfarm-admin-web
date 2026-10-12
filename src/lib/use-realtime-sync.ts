"use client";

import { createSyncExecutor } from "@/lib/realtime/sync-executor";

import { useEffect, useRef, useCallback } from "react";
import { ApiError } from "@/lib/api-client";
import { useRealtimeContext, AdminRealtimeEventType } from "@/context/realtime-context";

export interface RealtimeSyncOptions {
  /** Realtime SSE event types to listen for */
  events?: AdminRealtimeEventType[];
  /** Fallback polling interval in ms (default: 30000 when down, 120000 when healthy) */
  intervalMs?: number;
  enabled?: boolean;
  onFocus?: boolean;
}

const SYNC_EVENT_NAME = "puretyfarm:livesync";
const BROADCAST_CHANNEL_NAME = "puretyfarm_admin_live_sync";

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    broadcastChannel = null;
  }
}

export function triggerGlobalLiveSync(reason?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: { reason } }));
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ reason, timestamp: Date.now() });
      } catch {}
    }
  }
}

/**
 * Background auto-refresh sync for PuretyFarm Admin:
 * 1. Event-driven immediate refresh when matching backend events arrive.
 * 2. 300ms debounce with in-flight deduplication and trailing-refresh guarantee.
 * 3. Polling interval: 120s when stream is healthy, 30s when stream is down.
 * 4. Paused while the tab is hidden.
 * 5. Stopped immediately on 401 or 429.
 * 6. Rate-limited focus revalidation (avoids duplicate bursts on rapid tab switching).
 */
export function useRealtimeSync(
  refreshFn: () => void | Promise<void>,
  options: RealtimeSyncOptions = {}
) {
  const { events, intervalMs = 30000, enabled = true, onFocus = false } = options;
  // Ensure polling interval is at least 30s per hard constraint
  const baseIntervalMs = Math.max(30000, intervalMs);

  const fnRef = useRef(refreshFn);
  useEffect(() => {
    fnRef.current = refreshFn;
  }, [refreshFn]);

  const realtimeCtx = useRealtimeContext();
  const isStreamHealthy = realtimeCtx?.isStreamHealthy ?? false;
  const lastSyncTimeRef = useRef(0);
  const isStoppedRef = useRef(false);

  const executorRef = useRef<ReturnType<typeof createSyncExecutor> | null>(null);
  if (!executorRef.current) {
    executorRef.current = createSyncExecutor(() => {
      lastSyncTimeRef.current = Date.now();
      return fnRef.current();
    }, 300);
  }

  const executeSync = useCallback(() => {
    return executorRef.current?.executeRefresh();
  }, []);

  const triggerDebouncedSync = useCallback(() => {
    executorRef.current?.triggerDebounced();
  }, []);

  // 1. Subscribe to realtime SSE stream events if specified
  useEffect(() => {
    if (!enabled || !events || events.length === 0 || !realtimeCtx) return;

    const unsubscribe = realtimeCtx.subscribe(events, () => {
      triggerDebouncedSync();
    });

    return () => {
      unsubscribe();
      executorRef.current?.cancel();
    };
  }, [enabled, events, realtimeCtx, triggerDebouncedSync]);

  // 2. Periodic background safety-net polling timer
  useEffect(() => {
    if (!enabled) return;
    isStoppedRef.current = false;

    // Polling is relaxed to 120s when stream is healthy, or baseIntervalMs (30s) when down
    const effectiveIntervalMs = isStreamHealthy ? 120000 : baseIntervalMs;

    const intervalId = setInterval(executeSync, effectiveIntervalMs);

    // Focus & visibility change handler with cooldown
    const handleRevalidate = () => {
      const now = Date.now();
      if (now - lastSyncTimeRef.current >= 20000) {
        void executeSync();
      }
    };

    const handleGlobalLiveSync = () => {
      void executeSync();
    };

    const handleUnauthorizedEvent = () => {
      isStoppedRef.current = true;
    };

    if (typeof window !== "undefined") {
      window.addEventListener("pf:unauthorized", handleUnauthorizedEvent);
      window.addEventListener(SYNC_EVENT_NAME, handleGlobalLiveSync);
      if (broadcastChannel) {
        broadcastChannel.addEventListener("message", handleGlobalLiveSync);
      }
      if (onFocus) {
        window.addEventListener("focus", handleRevalidate);
        document.addEventListener("visibilitychange", handleRevalidate);
      }
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("pf:unauthorized", handleUnauthorizedEvent);
        window.removeEventListener(SYNC_EVENT_NAME, handleGlobalLiveSync);
        if (broadcastChannel) {
          broadcastChannel.removeEventListener("message", handleGlobalLiveSync);
        }
        if (onFocus) {
          window.removeEventListener("focus", handleRevalidate);
          document.removeEventListener("visibilitychange", handleRevalidate);
        }
      }
    };
  }, [enabled, isStreamHealthy, baseIntervalMs, onFocus, executeSync]);
}
