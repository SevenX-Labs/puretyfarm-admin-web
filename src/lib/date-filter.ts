/**
 * Shared Date Range & Filter Presets for PuretyFarm Admin
 * Supports Today (default), Tomorrow, Week (Last 7 Days), Month, All, and Custom (From -> Current/To).
 * Boundaries align with Asia/Kolkata (IST = UTC+05:30).
 */

export type DatePreset = "TODAY" | "TOMORROW" | "WEEK" | "MONTH" | "ALL" | "CUSTOM";

export interface DateRange {
  startDate: string; // YYYY-MM-DD or ""
  endDate: string;   // YYYY-MM-DD or ""
}

export function getTodayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

export function getTomorrowIST(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function getWeekStartIST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function getMonthStartIST(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function getDateRangeForPreset(preset: DatePreset, customRange?: Partial<DateRange>): DateRange {
  const today = getTodayIST();
  switch (preset) {
    case "TODAY":
      return { startDate: today, endDate: today };
    case "TOMORROW":
      const tomorrow = getTomorrowIST();
      return { startDate: tomorrow, endDate: tomorrow };
    case "WEEK":
      return { startDate: getWeekStartIST(), endDate: today };
    case "MONTH":
      return { startDate: getMonthStartIST(), endDate: today };
    case "ALL":
      return { startDate: "", endDate: "" };
    case "CUSTOM":
      return {
        startDate: customRange?.startDate ?? today,
        endDate: customRange?.endDate ?? today,
      };
  }
}

export function formatDateRangeLabel(preset: DatePreset, startDate: string, endDate: string): string {
  if (preset === "TODAY") return "Today";
  if (preset === "TOMORROW") return "Tomorrow";
  if (preset === "WEEK") return "This Week";
  if (preset === "MONTH") return "This Month";
  if (preset === "ALL") return "All Dates";
  if (startDate && endDate) {
    if (startDate === endDate) return startDate;
    return `${startDate} → ${endDate}`;
  }
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return "Custom Range";
}
