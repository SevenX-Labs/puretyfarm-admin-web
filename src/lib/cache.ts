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
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default freshness window
const CACHE_PREFIX = "pf_cache_";

/**
 * Retrieve cached data synchronously from in-memory cache or localStorage.
 */
export function getCachedData<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  const fullKey = `${CACHE_PREFIX}${key}`;

  // 1. Check in-memory Map first for microsecond retrieval
  const memEntry = MEMORY_CACHE.get(fullKey) as CacheEntry<T> | undefined;
  if (memEntry) {
    return memEntry.data;
  }

  // 2. Fall back to localStorage
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || !parsed.data) return null;

    // Cache to in-memory map for subsequent reads
    MEMORY_CACHE.set(fullKey, parsed);
    return parsed.data;
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
 */
export function invalidateCache(keyPrefix?: string): void {
  if (typeof window === "undefined") return;

  const prefix = keyPrefix ? `${CACHE_PREFIX}${keyPrefix}` : CACHE_PREFIX;

  // Clear memory cache
  for (const k of MEMORY_CACHE.keys()) {
    if (k.startsWith(prefix)) {
      MEMORY_CACHE.delete(k);
    }
  }

  // Clear localStorage
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
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
}

/**
 * Stale-While-Revalidate execution helper:
 * 1. Synchronously returns cached data if available (instant 0ms render).
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
  const { ttlMs = DEFAULT_TTL_MS, forceRefresh = false, onFreshData } = options;

  // 1. Get cached data immediately (unless forceRefresh requested)
  const cachedData = forceRefresh ? null : getCachedData<T>(key);

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
    } finally {
      PENDING_PROMISES.delete(key);
    }
  })();

  PENDING_PROMISES.set(key, fetchPromise);

  return {
    cachedData,
    promise: fetchPromise,
  };
}
