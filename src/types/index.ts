export type PlanType = 'Daily' | 'Alternate' | '7-Day Trial' | 'Buy Once';
export type PlanStatus = 'Active' | 'Paused' | 'Cancelled';
export type OrderStatus = 'Pending' | 'Delivered' | 'Skipped' | 'Issue';
export type RiderStatus = 'Active' | 'On Route' | 'Off Duty';
export type InventoryStatus = 'Optimal' | 'Low Stock' | 'Critical';
export type TransactionType = 'Credit' | 'Auto-Debit' | 'Refund';
export type PaymentMethod = 'Razorpay' | 'Manual Support' | 'System Daily Debit';
export type RaipurZone = 
  | 'Shankar Nagar'
  | 'Telibandha'
  | 'Samta Colony'
  | 'Pandri'
  | 'Civil Lines'
  | 'Devendra Nagar'
  | 'Tatibandh'
  | 'Pachpedi Naka'
  | 'VIP Road';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  area: RaipurZone;
  address: string;
  walletBalance: number;
  planType: PlanType;
  planStatus: PlanStatus;
  buyOnceLimitOverride: number; // Max amount allowed for buy-once without advance float
  bottleDepositCount?: number;
  activeSince?: string;
  trialExpiresAt?: string;
}

export interface OrderItem {
  id: string;
  customerName: string;
  phone: string;
  area: RaipurZone;
  address: string;
  product: string;
  quantity: string;
  type: PlanType;
  status: OrderStatus;
  riderId: string | null;
  riderName: string | null;
  deliveryNotes?: string;
  amount: number;
  timeSlot?: string;
  batchTimestamp?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  assignedArea: RaipurZone | 'Unassigned';
  vehicleNumber: string;
  status: RiderStatus;
  stopsCount: number;
  capacityCrates?: number;
  rating?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  tomorrowRequired: number;
  threshold: number;
  status: InventoryStatus;
  batchCode?: string;
  shelfLifeDays?: number;
  category?: 'Fresh Milk' | 'Cultured Dairy' | 'Clarified Butter' | 'Artisanal Cheese';
}

export interface WalletTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: TransactionType;
  amount: number;
  date: string;
  reason: string;
  method: PaymentMethod;
  referenceId?: string;
}

export interface DeliveryRoute {
  id: string;
  zone: RaipurZone;
  pincode: string;
  assignedRiderId: string | null;
  assignedRiderName: string | null;
  vehicleNumber: string | null;
  stopsCount: number;
  litersRequired: number;
  cratesCount: number;
  status: 'Assigned' | 'Unassigned' | 'On Route' | 'Completed';
  targetDeparture: string;
}

export interface SubscriptionPlanItem {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  area: RaipurZone;
  product: string;
  quantity: string;
  frequency: 'Daily' | 'Alternate Days' | '7-Day Trial';
  status: 'Active' | 'Paused' | 'Expired';
  startDate: string;
  trialDaysRemaining?: number;
  dailyValue: number;
}

export interface ServiceAreaInfo {
  id: string;
  name: RaipurZone;
  pincode: string;
  status: 'Active' | 'Paused';
  activeSubscribers: number;
  dailyDemandLiters: number;
  morningWindow: string;
  assignedRider: string;
}

export interface RazorpayReconciliation {
  id: string;
  payoutId: string;
  settlementDate: string;
  grossCollected: number;
  platformFees: number;
  gstOnFees: number;
  netSettled: number;
  walletFloatCredited: number;
  status: 'Matched' | 'Under Review' | 'Discrepancy';
  transactionCount: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  category: 'Nightly Cutoff' | 'Rider Assignment' | 'Inventory Update' | 'Wallet Adjustment' | 'Pricing';
  action: string;
  details: string;
}
