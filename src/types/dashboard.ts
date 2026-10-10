export interface DashboardPeriod {
  from: string;
  to: string;
}

export interface DashboardCustomers {
  total: number;
  new: number;
  active: number;
  withActivePlan: number;
}

export interface DashboardOrders {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  outForDelivery: number;
  delivered: number;
  completed: number;
  cancelled: number;
  failed: number;
}

export interface DashboardSales {
  totalPaise: number;
  buyOncePaise: number;
  trialPaise: number;
  monthlyPaise: number;
}

export interface DashboardRevenue {
  collectedPaise: number;
  walletPaise: number;
  cashPaise: number;
  buyOncePaise: number;
  trialPaise: number;
  monthlyPaise: number;
  walletTopUpsPaise: number;
  pendingCashPaise: number;
  refundsPaise: number;
}

export interface DashboardPlans {
  activeMonthly: number;
  activeTrial: number;
  buyOnceCustomers: number;
  newSelections: number;
}

export interface DashboardDeliveries {
  scheduled: number;
  delivered: number;
  skipped: number;
  cancelled: number;
  failed: number;
  completionPercent: number;
}

export interface DashboardWallet {
  totalCustomerBalancePaise: number;
  walletTopUpsPaise: number;
}

export interface DashboardProfit {
  salesPaise: number;
  productCostPaise: number;
  deliveryCostPaise: number;
  grossProfitPaise: number;
  grossMarginPercent: number;
  costDataAvailable: boolean;
}

export interface DashboardAlerts {
  pendingCashCollections: number;
  pendingWalletApprovals: number;
  pendingDeliveryChangeRequests: number;
  failedOrders: number;
}

export interface DashboardComparison {
  previousPeriod: { from: string; to: string };
  customersNewChangePercent: number;
  ordersChangePercent: number;
  salesChangePercent: number;
  revenueChangePercent: number;
  grossProfitChangePercent: number;
}

export interface DashboardTrendDay {
  date: string;
  salesPaise: number;
  revenueCollectedPaise: number;
  grossProfitPaise: number;
  orders: number;
  deliveries: number;
}

export interface DashboardOverviewResponse {
  period: DashboardPeriod;
  customers: DashboardCustomers;
  orders: DashboardOrders;
  sales: DashboardSales;
  revenue: DashboardRevenue;
  plans: DashboardPlans;
  deliveries: DashboardDeliveries;
  wallet: DashboardWallet;
  profit: DashboardProfit;
  alerts: DashboardAlerts;
  comparison: DashboardComparison;
  trend: {
    daily: DashboardTrendDay[];
  };
}
