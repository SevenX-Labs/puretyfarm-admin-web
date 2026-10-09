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
  deliveryStartTime: string; // e.g. "06:00"
  deliveryEndTime: string; // e.g. "08:00"
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

export interface PlansApiResponse {
  plans: PlanConfig[];
  unconfigured?: string[];
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
