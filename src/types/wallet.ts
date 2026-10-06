export type CreditRequestStatus = "PENDING" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type RefundStatus =
  | "NOT_REQUIRED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "REFUND_FAILED";
export type TransactionType = "CREDIT" | "DEBIT";

export interface WalletCustomer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
}

export interface WalletTransactionSnapshot {
  id: string;
  type: TransactionType;
  amountPaise: number;
  balanceAfterPaise: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface CreditRequestItem {
  id: string;
  amountPaise: number;
  status: CreditRequestStatus;
  refundStatus: RefundStatus;
  autoApproved: boolean;
  adminNote?: string | null;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  customer: WalletCustomer;
  walletBalancePaise?: number;
  transaction?: WalletTransactionSnapshot | null;
}

export interface RejectResponse {
  success: boolean;
  message: string;
  request: {
    id: string;
    status: "REJECTED";
    refundStatus: RefundStatus;
    adminNote: string;
  };
  refund: {
    refundInitiated: boolean;
    reason?:
      | "NO_REFUNDABLE_PAYMENT"
      | "REFUND_ALREADY_IN_PROGRESS"
      | "CREDIT_REQUEST_NOT_REJECTED"
      | string;
  };
}

export interface CreditRequestsApiResponse {
  data: CreditRequestItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerWalletDetail {
  customer: WalletCustomer;
  balancePaise: number;
  autoCreditEnabled?: boolean;
  summary: {
    totalCreditsPaise: number;
    totalCreditsCount: number;
    totalDebitsPaise: number;
    totalDebitsCount: number;
  };
  recentTransactions: WalletTransactionSnapshot[];
  createdAt: string;
  updatedAt: string;
}
