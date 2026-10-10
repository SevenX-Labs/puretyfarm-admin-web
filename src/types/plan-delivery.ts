export type PlanType = "BUY_ONCE" | "SEVEN_DAY_TRIAL" | "MONTHLY";
export type RequestType =
  | "PAUSE"
  | "RESUME"
  | "SKIP"
  | "CHANGE_QUANTITY"
  | "CHANGE_SCHEDULE";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface PlanConfig {
  type: PlanType;
  isActive: boolean;
  actualPricePerLitre: number; // In integer paise (e.g. 9500 = ₹95.00)
  sellingPricePerLitre: number; // In integer paise (e.g. 8500 = ₹85.00)
  quantityMin: number;
  quantityMax: number;
  deliveryFeePaise: number; // In integer paise
  /**
   * Configured delivery window, 24h "HH:MM". Null means the admin has not set
   * one — render it as "not configured", never as a plausible default.
   */
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  maxUsages?: number; // For BUY_ONCE (1-100)
  trialDurationDays?: number; // For SEVEN_DAY_TRIAL (usually 7)
  dailyEnabled?: boolean; // For MONTHLY
  alternateDaysEnabled?: boolean; // For MONTHLY
  fixedQuantityEnabled?: boolean; // For MONTHLY
  alternatingQuantityEnabled?: boolean; // For MONTHLY
  frequencies?: string[];
  quantityModes?: string[];
  createdAt?: string;
  updatedAt?: string;
  /**
   * False for a plan type the server has no PlanConfig row for. Such a card is
   * a placeholder: its prices and window are not real configuration.
   */
  isConfigured?: boolean;
}

export interface ChangeRequestCustomer {
  id: string;
  mobile: string;
  email: string | null;
  name: string;
}

export interface ChangeRequestItem {
  id: string;
  requestType: RequestType;
  status: RequestStatus;
  currentConfiguration: Record<string, any>;
  requestedConfiguration: Record<string, any>;
  adminId?: string | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer: ChangeRequestCustomer;
}

export interface ChangeRequestsApiResponse {
  data: ChangeRequestItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * The server's order cut-off policy. A business-wide rule, deliberately
 * separate from each plan's delivery window, and never restated client-side.
 */
export interface OrderCutoffPolicy {
  /** 24h "HH:MM" in `timezone`. */
  time: string;
  /** Human-readable form, e.g. "11:00 PM". */
  timeLabel: string;
  /** IANA zone the cut-off is evaluated in. */
  timezone: string;
  leadDaysBeforeCutoff: number;
  leadDaysAfterCutoff: number;
}

export interface PlansApiResponse {
  plans: PlanConfig[];
  unconfigured?: string[];
  orderCutoff?: OrderCutoffPolicy;
}

export interface PlansResult {
  plans: PlanConfig[];
  /** Null when the server did not send a policy; show "unavailable", not a guess. */
  orderCutoff: OrderCutoffPolicy | null;
}

export interface CustomerSubscriptionItem {
  id: string;
  userId: string;
  planType: PlanType;
  status: string;
  frequency: string | null;
  quantityMode: string | null;
  quantity: number | null;
  startDate: string | null;
  endDate: string | null;
  paymentMethod: string | null;
  paidAmountPaise: number | null;
  paidAt: string | null;
  createdAt: string;
  deliveriesCount: number;
  customer: {
    id: string;
    mobile: string;
    email: string | null;
    name: string | null;
    address: {
      fullName?: string;
      houseNumber?: string;
      buildingName?: string;
      streetName?: string;
      area?: string;
      city?: string;
      pincode?: string;
    } | null;
  };
}

export interface CustomerSubscriptionsApiResponse {
  data: CustomerSubscriptionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
