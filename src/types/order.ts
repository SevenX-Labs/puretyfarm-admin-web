export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PlanType = "BUY_ONCE" | "SEVEN_DAY_TRIAL" | "MONTHLY";

export interface OrderItemSnapshot {
  id?: string;
  productNameSnapshot: string;
  unitPricePaise: number;
  quantity: number;
  discountPaise?: number;
  taxPaise?: number;
  totalPaise: number;
}

export interface OrderAddressSnapshot {
  fullName?: string;
  mobile?: string;
  houseNumber?: string;
  buildingName?: string;
  streetName?: string;
  landmark?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  [key: string]: any;
}

export interface OrderInvoice {
  invoiceNumber: string;
  issuedAt?: string;
}

export interface OrderCustomer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  /** Current wallet balance, in paise. */
  walletBalancePaise?: number;
}

/** How a plan's deliveries are paid for. */
export type BillingModel = "PREPAID_LEGACY" | "PER_DELIVERY";

/**
 * Per-delivery billing state. PENDING = not delivered yet, SETTLED = delivered
 * and charged, OUTSTANDING = delivered but the wallet could not cover it.
 */
export type SettlementStatus = "PENDING" | "SETTLED" | "OUTSTANDING";

/** What the server did when an order was marked delivered. */
export type SettlementOutcome =
  | "SETTLED"
  | "DELIVERED_PREPAID"
  | "INSUFFICIENT_BALANCE"
  | "ALREADY_DELIVERED"
  | "NOT_ELIGIBLE"
  | "ERROR";

export interface OrderSettlement {
  outcome: SettlementOutcome;
  customerId: string;
  orderNumber: string;
  scheduledDate: string | null;
  deliveredAt: string | null;
  settledAt: string | null;
  requiredPaise: number | null;
  availableBalancePaise: number | null;
  balanceAfterPaise: number | null;
  shortfallPaise: number | null;
  walletTransactionId: string | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  planType: PlanType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItemSnapshot[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  /** Server-scheduled delivery date, or null when none is set. */
  deliveryDate: string | null;
  /**
   * Window snapshotted onto the order when it was created. Null when the plan
   * had no configured window — show that, do not substitute today's config.
   */
  deliveryStartTime: string | null;
  deliveryEndTime: string | null;
  addressSnapshot: OrderAddressSnapshot;
  actualPricePerLitrePaise: number;
  sellingPricePerLitrePaise: number;
  invoice?: OrderInvoice | null;
  planDelivery?: {
    id: string;
    status: "SCHEDULED" | "DELIVERED" | "SKIPPED";
    quantityLitres: number;
  } | null;
  /** Set only once an admin has completed the order. */
  completedAt?: string | null;
  /** Null for an order that does not belong to a plan. */
  billingModel?: BillingModel | null;
  /** When an admin confirmed the delivery. Not the scheduled date. */
  deliveredAt?: string | null;
  /** Null when the order is not billed per delivery (prepaid plans). */
  settlementStatus?: SettlementStatus | null;
  settledAt?: string | null;
  walletTransactionId?: string | null;
  /** What the delivery is expected to cost, in paise. */
  expectedAmountPaise?: number;
  /** What was actually debited; null until settled. */
  chargedAmountPaise?: number | null;
  customer: OrderCustomer;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersApiResponse {
  data: AdminOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
