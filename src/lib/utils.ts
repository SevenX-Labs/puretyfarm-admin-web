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

/** Default delivery window, mirroring the server's PlanConfig fallback. */
export const DEFAULT_DELIVERY_START_TIME = "06:00";
export const DEFAULT_DELIVERY_END_TIME = "11:00";

/** Parses a 24h "HH:MM" time into minutes since midnight, or null if malformed. */
export function parseTimeToMinutes(
  timeStr: string | null | undefined
): number | null {
  if (!timeStr || !DELIVERY_TIME_PATTERN.test(timeStr)) return null;
  const [h, m] = timeStr.split(":");
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

/**
 * Renders a 24h "HH:MM" time as 12h "h:mm AM/PM".
 *
 * Delivery windows are stored in 24h form but are always read by people, so
 * every surface shows AM/PM. Unparseable input is passed through rather than
 * rendered as a misleading "12:00 AM".
 */
export function formatTime(timeStr: string | null | undefined): string {
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes === null) return timeStr || "";
  const h24 = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, "0");
  return `${h24 % 12 || 12}:${mm} ${h24 >= 12 ? "PM" : "AM"}`;
}

/**
 * Renders a delivery window as "6:00 AM – 11:00 AM", falling back to the
 * default window when the plan has none configured.
 */
export function formatDeliveryWindow(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  return `${formatTime(start || DEFAULT_DELIVERY_START_TIME)} – ${formatTime(
    end || DEFAULT_DELIVERY_END_TIME
  )}`;
}

export function formatPaise(paise: number | null | undefined): string {
  if (paise === null || paise === undefined || isNaN(paise)) return "—";
  return formatCurrency(paise / 100);
}
