"use client";

import { useEffect, useRef } from "react";
import { ApiError } from "@/lib/api-client";

export interface RealtimeSyncOptions {
  intervalMs?: number; // minimum 30000 (30 seconds) per Issue B request budget
  enabled?: boolean;
  onFocus?: boolean;
}

/**
 * Background auto-refresh sync adhering to Issue B request budget:
 * 1. Default interval of at least 30 seconds.
 * 2. Paused while the tab is hidden.
 * 3. Skipped if a request is already in-flight.
 * 4. Cleared on unmount.
 * 5. Stopped immediately on 401 or 429.
 * 6. Rate-limited focus revalidation (avoids duplicate bursts on rapid tab switching).
 */
export function useRealtimeSync(
  refreshFn: () => void | Promise<void>,
  options: RealtimeSyncOptions = {}
) {
  const { intervalMs = 30000, enabled = true, onFocus = false } = options;
  // Ensure polling interval is at least 30s per hard constraint
  const effectiveIntervalMs = Math.max(30000, intervalMs);

  const fnRef = useRef(refreshFn);
  const inFlightRef = useRef(false);
  const isStoppedRef = useRef(false);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    fnRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    if (!enabled) return;
    isStoppedRef.current = false;

    const executeSync = async () => {
      if (isStoppedRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (inFlightRef.current) return; // Skip if a request is already in-flight

      inFlightRef.current = true;
      try {
        const res = fnRef.current();
        if (res && typeof (res as Promise<void>).then === "function") {
          await res;
        }
        lastSyncTimeRef.current = Date.now();
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.statusCode === 401 || err.statusCode === 429)) {
          console.warn("[realtime-sync] Stopping auto-sync due to auth or rate-limit status:", err.statusCode);
          isStoppedRef.current = true;
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    // 1. Periodic background timer
    const intervalId = setInterval(executeSync, effectiveIntervalMs);

    // 2. Focus & visibility change handler with cooldown
    const handleRevalidate = () => {
      const now = Date.now();
      // Require at least 20 seconds between revalidations on focus
      if (now - lastSyncTimeRef.current >= 20000) {
        executeSync();
      }
    };

    const handleUnauthorizedEvent = () => {
      isStoppedRef.current = true;
    };

    if (typeof window !== "undefined") {
      window.addEventListener("pf:unauthorized", handleUnauthorizedEvent);
      if (onFocus) {
        window.addEventListener("focus", handleRevalidate);
        document.addEventListener("visibilitychange", handleRevalidate);
      }
    }

    return () => {
      clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("pf:unauthorized", handleUnauthorizedEvent);
        if (onFocus) {
          window.removeEventListener("focus", handleRevalidate);
          document.removeEventListener("visibilitychange", handleRevalidate);
        }
      }
    };
  }, [enabled, effectiveIntervalMs, onFocus]);
}
