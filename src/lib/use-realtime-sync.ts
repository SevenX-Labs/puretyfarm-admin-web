import { useEffect, useRef } from "react";

export interface RealtimeSyncOptions {
  intervalMs?: number; // default: 12000 (12 seconds)
  enabled?: boolean;
  onFocus?: boolean;
}

/**
 * Automatically syncs fresh data in the background:
 * 1. Periodic background polling every `intervalMs` (only when browser tab is active/visible).
 * 2. Window focus and visibility change revalidation (when user switches back to tab).
 * Keeps admin dashboard and operational screens live in real-time without continuous manual page refreshes.
 */
export function useRealtimeSync(
  refreshFn: () => void | Promise<void>,
  options: RealtimeSyncOptions = {}
) {
  const { intervalMs = 12000, enabled = true, onFocus = true } = options;
  const fnRef = useRef(refreshFn);

  useEffect(() => {
    fnRef.current = refreshFn;
  }, [refreshFn]);

  useEffect(() => {
    if (!enabled) return;

    // 1. Periodic background timer
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          const res = fnRef.current();
          if (res && typeof (res as Promise<void>).catch === "function") {
            (res as Promise<void>).catch(() => {});
          }
        } catch {
          // Swallow background sync error
        }
      }
    }, intervalMs);

    // 2. Revalidate on window focus & tab visibility change
    const handleRevalidate = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        try {
          const res = fnRef.current();
          if (res && typeof (res as Promise<void>).catch === "function") {
            (res as Promise<void>).catch(() => {});
          }
        } catch {
          // Swallow background sync error
        }
      }
    };

    if (onFocus && typeof window !== "undefined") {
      window.addEventListener("focus", handleRevalidate);
      document.addEventListener("visibilitychange", handleRevalidate);
    }

    return () => {
      clearInterval(intervalId);
      if (onFocus && typeof window !== "undefined") {
        window.removeEventListener("focus", handleRevalidate);
        document.removeEventListener("visibilitychange", handleRevalidate);
      }
    };
  }, [enabled, intervalMs, onFocus]);
}
