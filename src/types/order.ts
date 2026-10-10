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
  deliveryDate: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  addressSnapshot: OrderAddressSnapshot;
  actualPricePerLitrePaise: number;
  sellingPricePerLitrePaise: number;
  invoice?: OrderInvoice | null;
  /** Set only once an admin has completed the order. */
  completedAt?: string | null;
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
