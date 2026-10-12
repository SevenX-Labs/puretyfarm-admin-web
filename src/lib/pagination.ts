/**
 * Shared pagination state and clamping logic for Puretyfarm Admin.
 *
 * Enforces a single source of truth:
 * - Page changes ONLY on user action (Previous, Next, page select) or filter reset.
 * - Never resets to 1 on background refetch, polling, focus, or transient network errors.
 * - Clamps ONLY after a successful response, and only if page > totalPages.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationDisplay {
  page: number;
  totalPages: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  showingFrom: number;
  showingTo: number;
  label: string;
}

export function computePaginationDisplay(
  page: number,
  pageSize: number,
  total: number,
  totalPages: number
): PaginationDisplay {
  const safeTotal = Math.max(0, total);
  const safePageSize = Math.max(1, pageSize);
  const safeTotalPages = Math.max(1, totalPages || Math.ceil(safeTotal / safePageSize) || 1);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  const showingFrom = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const showingTo = Math.min(safeTotal, safePage * safePageSize);

  return {
    page: safePage,
    totalPages: safeTotalPages,
    total: safeTotal,
    hasPrev: safePage > 1,
    hasNext: safePage < safeTotalPages,
    showingFrom,
    showingTo,
    label: `Showing ${showingFrom}–${showingTo} of ${safeTotal}`,
  };
}

/**
 * Safely compute the next page when a new totalPages arrives after a successful fetch.
 * Returns the clamped page ONLY if the current page was beyond totalPages.
 * If totalPages is 0 or unknown, it preserves the current page.
 */
export function clampPageAfterSuccess(
  currentPage: number,
  serverTotalPages: number | undefined
): number {
  if (!serverTotalPages || serverTotalPages < 1) {
    return Math.max(1, currentPage);
  }
  if (currentPage > serverTotalPages) {
    return serverTotalPages;
  }
  return currentPage;
}
