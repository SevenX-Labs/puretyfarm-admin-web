/**
 * High-performance client-side SWR (Stale-While-Revalidate) Cache Manager.
 * Provides instant render from localStorage/in-memory cache, in-flight request
 * deduplication, and silent background revalidation without external paid services.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry<unknown>>();
const PENDING_PROMISES = new Map<string, Promise<unknown>>();
const DEFAULT_TTL_MS = 30 * 1000; // 30 seconds freshness window for real-time responsiveness
const CACHE_PREFIX = "pf_cache_";

/**
 * Retrieve cached data synchronously from in-memory cache or localStorage.
 * Checks expiry against TTL so stale/deleted data is never served.
 */
export function getCachedData<T>(key: string, allowStale: boolean = false): T | null {
  if (typeof window === "undefined") return null;

  const fullKey = `${CACHE_PREFIX}${key}`;
  const now = Date.now();

  // 1. Check in-memory Map first for microsecond retrieval
  const memEntry = MEMORY_CACHE.get(fullKey) as CacheEntry<T> | undefined;
  if (memEntry) {
    if (allowStale || now - memEntry.timestamp <= memEntry.ttl) {
      return memEntry.data;
    }
    // Expired
    MEMORY_CACHE.delete(fullKey);
  }

  // 2. Fall back to localStorage
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.data === undefined) return null;

    if (allowStale || now - parsed.timestamp <= (parsed.ttl || DEFAULT_TTL_MS)) {
      // Cache to in-memory map for subsequent reads
      MEMORY_CACHE.set(fullKey, parsed);
      return parsed.data;
    }
    // Expired from storage
    localStorage.removeItem(fullKey);
    return null;
  } catch {
    return null;
  }
}

/**
 * Store data synchronously in in-memory cache and asynchronously in localStorage.
 */
export function setCachedData<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (typeof window === "undefined") return;

  const fullKey = `${CACHE_PREFIX}${key}`;
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };

  // Set memory cache
  MEMORY_CACHE.set(fullKey, entry);

  // Set localStorage (safely handle quota exceed)
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // If quota exceeded, clear older puretyfarm cache items
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(fullKey, JSON.stringify(entry));
    } catch {
      // Ignore if localStorage unavailable
    }
  }
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 * Also clears in-flight promises so stale requests don't repopulate.
 */
export function invalidateCache(keyPrefix?: string): void {
  if (typeof window === "undefined") return;

  const prefix = keyPrefix ? `${CACHE_PREFIX}${keyPrefix}` : CACHE_PREFIX;

  // Clear memory cache
  for (const k of MEMORY_CACHE.keys()) {
    if (k.startsWith(prefix) || (keyPrefix && k.includes(keyPrefix))) {
      MEMORY_CACHE.delete(k);
    }
  }

  // Clear in-flight promise deduplications
  for (const k of PENDING_PROMISES.keys()) {
    if (k.startsWith(prefix) || (keyPrefix && k.includes(keyPrefix))) {
      PENDING_PROMISES.delete(k);
    }
  }

  // Clear localStorage
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(prefix) || (keyPrefix && k.includes(keyPrefix)))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}

export interface SwrOptions<T> {
  ttlMs?: number;
  forceRefresh?: boolean;
  onFreshData?: (fresh: T) => void;
  onError?: (error: unknown) => void;
}

/**
 * Stale-While-Revalidate execution helper:
 * 1. Synchronously returns cached data if available and fresh.
 * 2. Deduplicates concurrent in-flight requests for the same key.
 * 3. Fetches fresh data in background, updates cache, and triggers callback.
 */
export function swrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SwrOptions<T> = {}
): {
  cachedData: T | null;
  promise: Promise<T>;
} {
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false, onFreshData, onError } = options;

  // 1. Get cached data immediately (unless forceRefresh requested)
  const cachedData = forceRefresh ? null : getCachedData<T>(key, true);

  // 2. Prevent duplicate in-flight network requests
  const existingPromise = PENDING_PROMISES.get(key) as Promise<T> | undefined;
  if (existingPromise && !forceRefresh) {
    return {
      cachedData,
      promise: existingPromise,
    };
  }

  // 3. Initiate fresh background fetch
  const fetchPromise = (async () => {
    try {
      const freshData = await fetcher();
      setCachedData(key, freshData, ttlMs);
      if (onFreshData) {
        onFreshData(freshData);
      }
      return freshData;
    } catch (err) {
      if (onError) {
        onError(err);
      }
      // If cached data is present, resolve to cached data to prevent crashing background SWR
      const fallback = cachedData || getCachedData<T>(key, true);
      if (fallback) {
        return fallback;
      }
      // Do not throw unhandled rejection in background SWR to prevent Turbopack error overlay
      return null as unknown as T;
    } finally {
      PENDING_PROMISES.delete(key);
    }
  })();

  // Catch unhandled rejection for background promise
  fetchPromise.catch(() => {});

  PENDING_PROMISES.set(key, fetchPromise);

  return {
    cachedData,
    promise: fetchPromise,
  };
}
