export type PaymentTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type CashCollectionStatus = "PENDING" | "COLLECTED" | "CONFIRMED" | "CANCELLED";
export type PaymentPurpose = "ORDER" | "WALLET_TOPUP";
export type PaymentMethod = "ONLINE" | "CASH";

export interface PaymentCustomer {
  id: string;
  mobile: string;
  email: string | null;
  name: string;
}

export interface PaymentItem {
  id: string;
  transactionId: string;
  providerPaymentId?: string | null;
  provider: "PAYU" | "CASH" | string;
  purpose: PaymentPurpose;
  paymentMethod: PaymentMethod;
  amountPaise: number;
  currency: string;
  status: PaymentTransactionStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  walletCreditRequestId?: string | null;
  orderId?: string | null;
  expiresAt?: string | null;
  completedAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: PaymentCustomer;
  providerResponse?: {
    mode?: string;
    bankcode?: string;
    status?: string;
    unmappedstatus?: string;
    [key: string]: any;
  } | null;
  walletCredit?: {
    id: string;
    status: string;
    amountPaise: number;
    autoApproved: boolean;
    refundStatus: string;
    adminNote?: string | null;
    completedAt?: string | null;
    transactionId?: string | null;
  } | null;
}

export interface CashCollectionItem {
  id: string;
  amountPaise: number;
  status: CashCollectionStatus;
  purpose: PaymentPurpose;
  walletCreditRequestId?: string | null;
  planSelectionId?: string | null;
  collectedAt?: string | null;
  confirmedAt?: string | null;
  confirmedByAdminId?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer: PaymentCustomer;
  walletCredit?: {
    id: string;
    status: string;
    amountPaise: number;
    completedAt?: string | null;
    transactionId?: string | null;
  } | null;
}

export interface PaymentsApiResponse {
  data: PaymentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CashCollectionsApiResponse {
  data: CashCollectionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
