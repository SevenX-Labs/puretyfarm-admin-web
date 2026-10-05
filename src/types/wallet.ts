export type CreditRequestStatus = "PENDING" | "COMPLETED" | "REJECTED";
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
