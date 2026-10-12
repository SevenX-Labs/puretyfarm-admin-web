/**
 * Shared Date Range & Filter Presets for PuretyFarm Admin
 * Supports Today, Tomorrow, Yesterday, This Week, Next Week, Last Week,
 * This Month, Next Month, Last Month, All Dates, and Custom Date Range.
 * Boundaries align with Asia/Kolkata (IST = UTC+05:30).
 */

export type DatePreset =
  | "TODAY"
  | "TOMORROW"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "NEXT_WEEK"
  | "LAST_WEEK"
  | "THIS_MONTH"
  | "NEXT_MONTH"
  | "LAST_MONTH"
  | "WEEK"
  | "MONTH"
  | "ALL"
  | "CUSTOM";

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

export function getYesterdayIST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function getISTDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

export function getDateRangeForPreset(preset: DatePreset, customRange?: Partial<DateRange>): DateRange {
  const now = new Date();
  const today = getTodayIST();

  switch (preset) {
    case "TODAY":
      return { startDate: today, endDate: today };

    case "TOMORROW": {
      const tmrw = getTomorrowIST();
      return { startDate: tmrw, endDate: tmrw };
    }

    case "YESTERDAY": {
      const yest = getYesterdayIST();
      return { startDate: yest, endDate: yest };
    }

    case "WEEK":
    case "THIS_WEEK": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { startDate: getISTDateStr(start), endDate: today };
    }

    case "NEXT_WEEK": {
      const start = new Date(now);
      start.setDate(start.getDate() + 1);
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return { startDate: getISTDateStr(start), endDate: getISTDateStr(end) };
    }

    case "LAST_WEEK": {
      const end = new Date(now);
      end.setDate(end.getDate() - 7);
      const start = new Date(now);
      start.setDate(start.getDate() - 13);
      return { startDate: getISTDateStr(start), endDate: getISTDateStr(end) };
    }

    case "MONTH":
    case "THIS_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: getISTDateStr(start), endDate: getISTDateStr(end) };
    }

    case "NEXT_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return { startDate: getISTDateStr(start), endDate: getISTDateStr(end) };
    }

    case "LAST_MONTH": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: getISTDateStr(start), endDate: getISTDateStr(end) };
    }

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
  if (preset === "YESTERDAY") return "Yesterday";
  if (preset === "THIS_WEEK" || preset === "WEEK") return "This Week";
  if (preset === "NEXT_WEEK") return "Next Week";
  if (preset === "LAST_WEEK") return "Last Week";
  if (preset === "THIS_MONTH" || preset === "MONTH") return "This Month";
  if (preset === "NEXT_MONTH") return "Next Month";
  if (preset === "LAST_MONTH") return "Last Month";
  if (preset === "ALL") return "All Dates";

  if (startDate && endDate) {
    if (startDate === endDate) return startDate;
    return `${startDate} → ${endDate}`;
  }
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return "Custom Range";
}
