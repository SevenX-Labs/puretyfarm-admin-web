import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLiters(liters: number): string {
  return `${liters.toLocaleString("en-IN")} L`;
}

export function formatKg(kg: number): string {
  return `${kg.toLocaleString("en-IN")} kg`;
}

export function formatDate(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** 24-hour "HH:MM" — the format the API stores and accepts. */
export const DELIVERY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Shown wherever operational data the backend has not configured would go. */
export const NOT_CONFIGURED_LABEL = "Not configured";

/** Parses a 24h "HH:MM" time into minutes since midnight, or null if malformed. */
export function parseTimeToMinutes(
  timeStr: string | null | undefined
): number | null {
  if (!timeStr || !DELIVERY_TIME_PATTERN.test(timeStr)) return null;
  const [h, m] = timeStr.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

/**
 * Renders a 24h "HH:MM" time as 12h "h:mm AM/PM", or null if there is nothing
 * valid to render.
 *
 * Returns null rather than a placeholder time so callers must decide how to
 * present missing configuration. Silently emitting "12:00 AM" for a null
 * window is how an unset field starts looking like a real delivery promise.
 */
export function formatTime(timeStr: string | null | undefined): string | null {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return null;
  const h24 = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, "0");
  return `${h24 % 12 || 12}:${mm} ${h24 >= 12 ? "PM" : "AM"}`;
}

/**
 * Renders a delivery window as "6:00 AM – 11:00 AM", or null when either end
 * is missing or malformed.
 *
 * There is deliberately no default window: the delivery window is operational
 * data owned by the backend, so an unconfigured plan must read as unconfigured.
 */
export function formatDeliveryWindow(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const from = formatTime(start);
  const to = formatTime(end);
  if (!from || !to) return null;
  return `${from} – ${to}`;
}

/**
 * Renders a server-provided delivery date, or an explicit label when there
 * isn't one.
 *
 * Never substitutes another timestamp. `formatDate(null)` yields
 * "1 Jan 1970", and falling back to `createdAt` presents the day the order was
 * placed as the day it will arrive — both read as real delivery dates.
 */
export function formatDeliveryDateOrLabel(
  dateStr: string | null | undefined,
  label: string = "Not scheduled"
): string {
  if (!dateStr) return label;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return label;
  return formatDate(d);
}

/** Window for display, falling back to an explicit "not configured" label. */
export function formatDeliveryWindowOrLabel(
  start: string | null | undefined,
  end: string | null | undefined,
  label: string = NOT_CONFIGURED_LABEL
): string {
  return formatDeliveryWindow(start, end) ?? label;
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || isNaN(paise)) return "—";
  return formatCurrency(paise / 100);
}
