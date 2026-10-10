"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CreditRequestItem,
  CreditRequestsApiResponse,
  RejectResponse,
} from "@/types/wallet";
import {
  CashCollectionItem,
  CashCollectionsApiResponse,
} from "@/types/payment";
import {
  CustomersApiResponse,
  CustomerListItem,
} from "@/types/customer";
import {
  fetchCreditRequests,
  approveCreditRequest,
} from "@/services/wallet-service";
import {
  fetchCashCollections,
} from "@/services/payment-service";
import {
  fetchCustomers,
} from "@/services/customer-service";
import { RejectRequestModal } from "@/components/wallet/reject-request-modal";
import { CreditRequestDetailModal } from "@/components/wallet/credit-request-detail-modal";
import { CustomerWalletSheet } from "@/components/wallet/customer-wallet-sheet";
import { ConfirmCashModal } from "@/components/payments/confirm-cash-modal";
import { CancelCashModal } from "@/components/payments/cancel-cash-modal";
import { CashCollectionDetailSheet } from "@/components/payments/cash-collection-detail-sheet";
import {
  Wallet,
  Search,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Clock,
  Eye,
  Banknote,
  Globe,
  User,
  Phone,
  Mail,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ButtonLoader } from "@/components/ui/button-loader";

type PrimaryTab = "PENDING_APPROVALS" | "CUSTOMER_LEDGER";
type PaymentMethodFilter = "ALL" | "ONLINE" | "CASH";

interface UnifiedPendingItem {
  id: string;
  source: "ONLINE_CREDIT" | "CASH_COLLECTION";
  amountPaise: number;
  paymentMethod: "ONLINE" | "CASH";
  purpose: string;
  createdAt: string;
  status: "PENDING";
  customer: {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
  };
  rawCredit?: CreditRequestItem;
  rawCash?: CashCollectionItem;
}

export default function WalletPage() {
  // ─────────────────────────────────────────────────────────────
  // 1. PRIMARY TAB STATE (Exactly Two Tabs)
  // ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PrimaryTab>("PENDING_APPROVALS");

  // Global Notice Toast
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotice = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotice({ type, message });
    setTimeout(() => {
      setNotice(null);
    }, 4500);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  };

  // ─────────────────────────────────────────────────────────────
  // 2. TAB 1: PENDING APPROVALS STATE
  // ─────────────────────────────────────────────────────────────
  const [onlineRequests, setOnlineRequests] = useState<CreditRequestItem[]>([]);
  const [cashRequests, setCashRequests] = useState<CashCollectionItem[]>([]);
  const [isApprovalsLoading, setIsApprovalsLoading] = useState<boolean>(true);
  const [isApprovalsRefreshing, setIsApprovalsRefreshing] = useState<boolean>(false);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);

  // Filters for Pending Approvals
  const [methodFilter, setMethodFilter] = useState<PaymentMethodFilter>("ALL");
  const [approvalsSearch, setApprovalsSearch] = useState<string>("");
  const [debouncedApprovalsSearch, setDebouncedApprovalsSearch] = useState<string>("");
  const [approvalsPage, setApprovalsPage] = useState<number>(1);
  const approvalsPageSize = 15;

  // In-flight approving action
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Modals for Online Requests
  const [selectedForReject, setSelectedForReject] = useState<CreditRequestItem | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedForOnlineDetail, setSelectedForOnlineDetail] = useState<string | null>(null);
  const [isOnlineDetailOpen, setIsOnlineDetailOpen] = useState(false);

  // Modals for Cash Collections
  const [selectedForConfirmCash, setSelectedForConfirmCash] = useState<CashCollectionItem | null>(null);
  const [isConfirmCashOpen, setIsConfirmCashOpen] = useState(false);
  const [selectedForCancelCash, setSelectedForCancelCash] = useState<CashCollectionItem | null>(null);
  const [isCancelCashOpen, setIsCancelCashOpen] = useState(false);
  const [selectedForCashDetail, setSelectedForCashDetail] = useState<string | null>(null);
  const [isCashDetailOpen, setIsCashDetailOpen] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 3. TAB 2: CUSTOMER WALLET LEDGER STATE
  // ─────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState<boolean>(false);
  const [isCustomersRefreshing, setIsCustomersRefreshing] = useState<boolean>(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState<string>("");
  const [customerPage, setCustomerPage] = useState<number>(1);
  const [customerTotalPages, setCustomerTotalPages] = useState<number>(1);
  const [customerTotalCount, setCustomerTotalCount] = useState<number>(0);
  const customerPageSize = 12;

  // Drawer for Customer Wallet Ledger
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [isWalletSheetOpen, setIsWalletSheetOpen] = useState(false);

  // Debounce search inputs
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedApprovalsSearch(approvalsSearch.trim());
      setApprovalsPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [approvalsSearch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch.trim());
      setCustomerPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [customerSearch]);

  // ─────────────────────────────────────────────────────────────
  // 4. DATA FETCHING: PENDING APPROVALS
  // ─────────────────────────────────────────────────────────────
  const loadPendingApprovals = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) setIsApprovalsRefreshing(true);
      setApprovalsError(null);

      try {
        const [onlineRes, cashRes] = await Promise.all([
          fetchCreditRequests(
            { status: "PENDING", limit: 50 },
            { forceRefresh }
          ),
          fetchCashCollections(
            { status: "PENDING", limit: 50 },
            { forceRefresh }
          ),
        ]);

        if (onlineRes && Array.isArray(onlineRes.data)) {
          setOnlineRequests(onlineRes.data.filter((item) => item.status === "PENDING"));
        }
        if (cashRes && Array.isArray(cashRes.data)) {
          setCashRequests(cashRes.data.filter((item) => item.status === "PENDING"));
        }
      } catch (err: unknown) {
        console.error("Failed to load pending approvals:", err);
        setApprovalsError("Failed to fetch pending approval records from server.");
      } finally {
        setIsApprovalsLoading(false);
        setIsApprovalsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPendingApprovals(false);
  }, [loadPendingApprovals]);

  // Combine and deduplicate pending items
  const unifiedPendingList: UnifiedPendingItem[] = useMemo(() => {
    const list: UnifiedPendingItem[] = [];
    const seenIds = new Set<string>();

    // 1. Add Online Credit Requests
    for (const req of onlineRequests) {
      if (req.status === "PENDING" && !seenIds.has(`online-${req.id}`)) {
        seenIds.add(`online-${req.id}`);
        list.push({
          id: req.id,
          source: "ONLINE_CREDIT",
          amountPaise: req.amountPaise,
          paymentMethod: "ONLINE",
          purpose: "WALLET_TOPUP",
          createdAt: req.createdAt,
          status: "PENDING",
          customer: {
            id: req.customer?.id || "",
            name: req.customer?.name || "Customer",
            mobile: req.customer?.mobile || "",
            email: req.customer?.email || null,
          },
          rawCredit: req,
        });
      }
    }

    // 2. Add Cash Collections
    for (const cash of cashRequests) {
      if (cash.status === "PENDING" && !seenIds.has(`cash-${cash.id}`)) {
        seenIds.add(`cash-${cash.id}`);
        list.push({
          id: cash.id,
          source: "CASH_COLLECTION",
          amountPaise: cash.amountPaise,
          paymentMethod: "CASH",
          purpose: cash.purpose || "WALLET_TOPUP",
          createdAt: cash.createdAt,
          status: "PENDING",
          customer: {
            id: cash.customer?.id || "",
            name: cash.customer?.name || "Customer",
            mobile: cash.customer?.mobile || "",
            email: cash.customer?.email || null,
          },
          rawCash: cash,
        });
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [onlineRequests, cashRequests]);

  // Filter unified pending items
  const filteredPendingList = useMemo(() => {
    return unifiedPendingList.filter((item) => {
      // Payment Method Filter
      if (methodFilter !== "ALL" && item.paymentMethod !== methodFilter) {
        return false;
      }

      // Search Query
      if (debouncedApprovalsSearch) {
        const q = debouncedApprovalsSearch.toLowerCase();
        const matchesName = item.customer.name.toLowerCase().includes(q);
        const matchesPhone = item.customer.mobile.toLowerCase().includes(q);
        const matchesId = item.id.toLowerCase().includes(q);
        const matchesEmail = item.customer.email?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesPhone && !matchesId && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedPendingList, methodFilter, debouncedApprovalsSearch]);

  // Paginate pending items
  const totalPendingPages = Math.max(1, Math.ceil(filteredPendingList.length / approvalsPageSize));
  const paginatedPendingList = useMemo(() => {
    const start = (approvalsPage - 1) * approvalsPageSize;
    return filteredPendingList.slice(start, start + approvalsPageSize);
  }, [filteredPendingList, approvalsPage, approvalsPageSize]);

  // Statistics calculations
  const pendingStats = useMemo(() => {
    let onlineTotalPaise = 0;
    let cashTotalPaise = 0;
    let onlineCount = 0;
    let cashCount = 0;

    for (const item of unifiedPendingList) {
      if (item.paymentMethod === "ONLINE") {
        onlineTotalPaise += item.amountPaise;
        onlineCount++;
      } else {
        cashTotalPaise += item.amountPaise;
        cashCount++;
      }
    }

    return {
      totalCount: unifiedPendingList.length,
      onlineCount,
      cashCount,
      onlineTotalPaise,
      cashTotalPaise,
      combinedTotalPaise: onlineTotalPaise + cashTotalPaise,
    };
  }, [unifiedPendingList]);

  // ─────────────────────────────────────────────────────────────
  // 5. DATA FETCHING: CUSTOMER LIST (TAB 2)
  // ─────────────────────────────────────────────────────────────
  const loadCustomers = useCallback(
    async (pageToLoad = 1, forceRefresh = false) => {
      if (forceRefresh) setIsCustomersRefreshing(true);
      else setIsCustomersLoading(true);
      setCustomersError(null);

      try {
        const res: CustomersApiResponse = await fetchCustomers(
          {
            page: pageToLoad,
            limit: customerPageSize,
            search: debouncedCustomerSearch || undefined,
          },
          { forceRefresh }
        );

        if (res && Array.isArray(res.data)) {
          setCustomers(res.data);
          setCustomerTotalPages(res.pagination?.totalPages || 1);
          setCustomerTotalCount(res.pagination?.total || res.data.length);
        }
      } catch (err: unknown) {
        console.error("Failed to load customers:", err);
        setCustomersError("Failed to fetch customer directory from server.");
      } finally {
        setIsCustomersLoading(false);
        setIsCustomersRefreshing(false);
      }
    },
    [debouncedCustomerSearch, customerPageSize]
  );

  useEffect(() => {
    if (activeTab === "CUSTOMER_LEDGER") {
      loadCustomers(customerPage, false);
    }
  }, [activeTab, customerPage, loadCustomers]);

  // ─────────────────────────────────────────────────────────────
  // 6. ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────

  // Approve Online Credit Request
  const handleApproveOnline = async (req: CreditRequestItem) => {
    setApprovingId(req.id);
    try {
      await approveCreditRequest(req.id);
      showNotice(`Approved ₹${(req.amountPaise / 100).toLocaleString("en-IN")} wallet credit for ${req.customer?.name || "Customer"}.`);
      loadPendingApprovals(true);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) {
        showNotice("Conflict: This request was already processed by an administrator.", "error");
      } else {
        const msg = err instanceof Error ? err.message : "Failed to approve request.";
        showNotice(msg, "error");
      }
      loadPendingApprovals(true);
    } finally {
      setApprovingId(null);
    }
  };

  // Online Request Rejected Callback
  const handleOnlineRejected = (updated: CreditRequestItem, refund?: RejectResponse["refund"]) => {
    setIsRejectOpen(false);
    setSelectedForReject(null);
    if (refund?.refundInitiated) {
      showNotice(`Request rejected. PayU refund initiated for ₹${(updated.amountPaise / 100).toLocaleString("en-IN")}.`, "info");
    } else {
      showNotice(`Request rejected for ${updated.customer?.name || "Customer"}.`, "info");
    }
    loadPendingApprovals(true);
  };

  // Cash Collection Confirmed Callback
  const handleCashConfirmed = () => {
    setIsConfirmCashOpen(false);
    setSelectedForConfirmCash(null);
    showNotice("Physical cash collection confirmed and customer wallet float credited.", "success");
    loadPendingApprovals(true);
  };

  // Cash Collection Cancelled Callback
  const handleCashCancelled = () => {
    setIsCancelCashOpen(false);
    setSelectedForCancelCash(null);
    showNotice("Cash collection request cancelled successfully.", "info");
    loadPendingApprovals(true);
  };

  // Open Ledger Sheet for a Customer
  const handleOpenCustomerLedger = (userId: string) => {
    setInspectUserId(userId);
    setIsWalletSheetOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 duration-200">
      {/* Toast Notice */}
      {notice && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 p-4 rounded-[12px] border-2 border-black font-mono text-xs font-black shadow-[4px_4px_0px_0px_#000000] animate-in slide-in-from-top-4 duration-200 ${
            notice.type === "success"
              ? "bg-[#B8E8B8] text-[#1A1A1A]"
              : notice.type === "error"
              ? "bg-[#FFD9D0] text-[#1A1A1A]"
              : "bg-[#FFD84D] text-[#1A1A1A]"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-800" />
          ) : notice.type === "error" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#8C2E1D]" />
          ) : (
            <Clock className="h-4 w-4 shrink-0 text-amber-900" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* HEADER & PRIMARY TABS                                     */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-black pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-[10px] bg-[#FFD84D] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000000]">
              <Wallet className="h-5 w-5 stroke-[2.5] text-[#1A1A1A]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1A1A1A] leading-none">
                PREPAID WALLET & APPROVALS
              </h1>
              <p className="text-xs font-bold text-[#5C5647] mt-1">
                Raipur customer wallet balances, pending top-up verification, and transaction ledger.
              </p>
            </div>
          </div>
        </div>

        {/* EXACTLY TWO PRIMARY TABS */}
        <div className="inline-flex rounded-[12px] border-2 border-black bg-white p-1 shadow-[3px_3px_0px_0px_#000000] self-start md:self-auto">
          {/* TAB 1: PENDING APPROVALS */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("PENDING_APPROVALS");
              loadPendingApprovals(false);
            }}
            className={`px-4 py-2 rounded-[8px] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "PENDING_APPROVALS"
                ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]"
                : "text-[#5C5647] hover:text-[#1A1A1A] border-2 border-transparent"
            }`}
          >
            <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Pending Approvals</span>
            {pendingStats.totalCount > 0 && (
              <span className="ml-1 rounded-full bg-[#8C2E1D] text-white px-2 py-0.2 text-[10px] font-mono font-black">
                {pendingStats.totalCount}
              </span>
            )}
          </button>

          {/* TAB 2: CUSTOMER WALLET LEDGER */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("CUSTOMER_LEDGER");
            }}
            className={`px-4 py-2 rounded-[8px] text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "CUSTOMER_LEDGER"
                ? "bg-[#FFD84D] text-[#1A1A1A] border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]"
                : "text-[#5C5647] hover:text-[#1A1A1A] border-2 border-transparent"
            }`}
          >
            <Users className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Customer Wallet Ledger</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1 CONTENT: PENDING APPROVALS                          */}
      {/* ========================================================= */}
      {activeTab === "PENDING_APPROVALS" && (
        <div className="space-y-6">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Total Pending */}
            <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#5C5647] tracking-wider block">
                  Total Pending Requests
                </span>
                <span className="font-mono text-2xl font-black text-[#1A1A1A] mt-0.5 block">
                  {pendingStats.totalCount}
                </span>
              </div>
              <div className="h-10 w-10 rounded-[10px] bg-[#FAF7EC] border-2 border-black flex items-center justify-center">
                <Clock className="h-5 w-5 stroke-[2.5] text-[#1A1A1A]" />
              </div>
            </div>

            {/* Pending Online Amount */}
            <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#5C5647] tracking-wider block">
                  Online Gateway Top-ups ({pendingStats.onlineCount})
                </span>
                <span className="font-mono text-2xl font-black text-emerald-800 mt-0.5 block">
                  {formatCurrency(pendingStats.onlineTotalPaise / 100)}
                </span>
              </div>
              <div className="h-10 w-10 rounded-[10px] bg-[#B8E8B8] border-2 border-black flex items-center justify-center">
                <Globe className="h-5 w-5 stroke-[2.5] text-[#1A1A1A]" />
              </div>
            </div>

            {/* Pending Cash Collections */}
            <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-[#5C5647] tracking-wider block">
                  Doorstep Cash Approvals ({pendingStats.cashCount})
                </span>
                <span className="font-mono text-2xl font-black text-amber-800 mt-0.5 block">
                  {formatCurrency(pendingStats.cashTotalPaise / 100)}
                </span>
              </div>
              <div className="h-10 w-10 rounded-[10px] bg-[#FFDF58] border-2 border-black flex items-center justify-center">
                <Banknote className="h-5 w-5 stroke-[2.5] text-[#1A1A1A]" />
              </div>
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="bg-white border-2 border-black rounded-[14px] p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C5647] stroke-[2.5]" />
                <input
                  type="text"
                  value={approvalsSearch}
                  onChange={(e) => setApprovalsSearch(e.target.value)}
                  placeholder="Search customer, mobile, or request ID..."
                  className="w-full h-10 pl-9 pr-3 rounded-[8px] border-2 border-black bg-[#FAF7EC] font-mono text-xs font-bold text-[#1A1A1A] placeholder:text-[#5C5647] focus:outline-none focus:bg-white transition-colors"
                />
              </div>

              {/* Payment Method Secondary Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-[#5C5647] hidden sm:inline-block">
                  Method:
                </span>
                <div className="inline-flex rounded-[8px] border-2 border-black bg-[#FAF7EC] p-0.5">
                  {(["ALL", "ONLINE", "CASH"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMethodFilter(m);
                        setApprovalsPage(1);
                      }}
                      className={`px-3 py-1 rounded-[6px] text-[10px] font-mono font-black uppercase transition-all cursor-pointer ${
                        methodFilter === m
                          ? "bg-[#FFD84D] text-[#1A1A1A] border border-black shadow-[1px_1px_0px_0px_#000000]"
                          : "text-[#5C5647] hover:text-[#1A1A1A]"
                      }`}
                    >
                      {m === "ALL" ? "All Methods" : m === "ONLINE" ? "Online Top-up" : "Doorstep Cash"}
                    </button>
                  ))}
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={() => loadPendingApprovals(true)}
                  disabled={isApprovalsRefreshing}
                  className="h-10 px-3.5 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh Pending List"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isApprovalsRefreshing ? "animate-spin text-amber-800" : "text-[#1A1A1A]"}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pending Approvals Table / Grid */}
          <div className="bg-white border-2 border-black rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            {approvalsError && !isApprovalsLoading ? (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-[#8C2E1D] mx-auto" />
                <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                  Error Loading Pending Approvals
                </h3>
                <p className="text-xs font-bold text-[#5C5647] max-w-md mx-auto">
                  {approvalsError}
                </p>
                <button
                  type="button"
                  onClick={() => loadPendingApprovals(true)}
                  className="px-4 py-2 bg-[#FFD84D] border-2 border-black rounded-[8px] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFD13B] cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : !isApprovalsLoading && paginatedPendingList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="h-12 w-12 rounded-[12px] bg-[#B8E8B8] border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_#000000]">
                  <Check className="h-6 w-6 stroke-[3] text-emerald-900" />
                </div>
                <h3 className="text-base font-black uppercase text-[#1A1A1A]">
                  No Pending Approvals
                </h3>
                <p className="text-xs font-bold text-[#5C5647] max-w-sm mx-auto">
                  {debouncedApprovalsSearch || methodFilter !== "ALL"
                    ? "No pending requests matched your active filter or search."
                    : "All customer top-up requests and doorstep cash collections are fully verified."}
                </p>
                {(debouncedApprovalsSearch || methodFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setApprovalsSearch("");
                      setMethodFilter("ALL");
                    }}
                    className="px-4 py-2 bg-[#FAF7EC] border-2 border-black rounded-[8px] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000] hover:bg-white cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Data Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FAF7EC] text-[10px] font-black uppercase text-[#1A1A1A] tracking-wider font-mono">
                        <th className="py-3 px-4">Type / Channel</th>
                        <th className="py-3 px-4">Request ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Requested At</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 text-xs font-bold text-[#1A1A1A]">
                      {isApprovalsLoading ? (
                        <TableSkeleton columns={7} rows={6} />
                      ) : (
                        paginatedPendingList.map((item) => {
                          const isOnline = item.paymentMethod === "ONLINE";

                          return (
                            <tr key={`${item.source}-${item.id}`} className="hover:bg-[#FAF7EC]/50 transition-colors">
                              {/* Type / Channel */}
                              <td className="py-3 px-4">
                                {isOnline ? (
                                  <span className="inline-flex items-center gap-1 rounded-[6px] border border-black bg-[#B8E8B8] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                                    <Globe className="h-3 w-3 stroke-[2.5]" />
                                    ONLINE GATEWAY
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-[6px] border border-black bg-[#FFDF58] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                                    <Banknote className="h-3 w-3 stroke-[2.5]" />
                                    DOORSTEP CASH
                                  </span>
                                )}
                              </td>

                              {/* Request ID */}
                              <td className="py-3 px-4 font-mono text-[11px]">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyId(e, item.id)}
                                  className="hover:underline flex items-center gap-1 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                                  title="Click to copy ID"
                                >
                                  <span>{item.id.slice(0, 8)}...</span>
                                  <Copy className="h-3 w-3 opacity-60" />
                                </button>
                              </td>

                              {/* Customer */}
                              <td className="py-3 px-4">
                                <div className="font-black text-[#1A1A1A]">
                                  {item.customer.name}
                                </div>
                                <div className="font-mono text-[10px] text-[#5C5647]">
                                  {item.customer.mobile || "No phone"}
                                </div>
                              </td>

                              {/* Amount */}
                              <td className="py-3 px-4 font-mono text-sm font-black tabular-nums text-[#1A1A1A]">
                                {formatCurrency(item.amountPaise / 100)}
                              </td>

                              {/* Date */}
                              <td className="py-3 px-4 font-mono text-[11px] text-[#5C5647]">
                                <div>{formatDate(item.createdAt)}</div>
                                <div className="text-[10px]">
                                  {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 rounded-full border border-black bg-[#FFD84D] px-2.5 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                                  <Clock className="h-3 w-3 stroke-[2.5]" />
                                  PENDING APPROVAL
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isOnline ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => item.rawCredit && handleApproveOnline(item.rawCredit)}
                                        disabled={approvingId === item.id}
                                        className="px-3 py-1.5 rounded-[6px] border-2 border-black bg-[#8FD694] hover:bg-[#7bc880] font-black text-xs uppercase shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        title="Approve Online Top-up"
                                      >
                                        <ButtonLoader loading={approvingId === item.id}>
                                          <Check className="h-3 w-3 stroke-[3]" />
                                          <span>Approve</span>
                                        </ButtonLoader>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (item.rawCredit) {
                                            setSelectedForReject(item.rawCredit);
                                            setIsRejectOpen(true);
                                          }
                                        }}
                                        disabled={approvingId === item.id}
                                        className="px-2.5 py-1.5 rounded-[6px] border-2 border-black bg-[#FFD9D0] hover:bg-[#ffc8be] font-black text-xs uppercase shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        title="Reject Online Request"
                                      >
                                        <X className="h-3 w-3 stroke-[3]" />
                                        <span>Reject</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedForOnlineDetail(item.id);
                                          setIsOnlineDetailOpen(true);
                                        }}
                                        className="p-1.5 rounded-[6px] border-2 border-black bg-white hover:bg-[#FAF7EC] text-xs shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                                        title="View Details"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-[#1A1A1A]" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (item.rawCash) {
                                            setSelectedForConfirmCash(item.rawCash);
                                            setIsConfirmCashOpen(true);
                                          }
                                        }}
                                        className="px-3 py-1.5 rounded-[6px] border-2 border-black bg-[#8FD694] hover:bg-[#7bc880] font-black text-xs uppercase shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                                        title="Confirm Physical Cash Receipt"
                                      >
                                        <Check className="h-3 w-3 stroke-[3]" />
                                        <span>Confirm Cash</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (item.rawCash) {
                                            setSelectedForCancelCash(item.rawCash);
                                            setIsCancelCashOpen(true);
                                          }
                                        }}
                                        className="px-2.5 py-1.5 rounded-[6px] border-2 border-black bg-[#FFD9D0] hover:bg-[#ffc8be] font-black text-xs uppercase shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                                        title="Cancel Cash Collection"
                                      >
                                        <X className="h-3 w-3 stroke-[3]" />
                                        <span>Cancel</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedForCashDetail(item.id);
                                          setIsCashDetailOpen(true);
                                        }}
                                        className="p-1.5 rounded-[6px] border-2 border-black bg-white hover:bg-[#FAF7EC] text-xs shadow-[1.5px_1.5px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                                        title="View Cash Details"
                                      >
                                        <Eye className="h-3.5 w-3.5 text-[#1A1A1A]" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Cards */}
                <div className="lg:hidden divide-y-2 divide-black/10 p-4 space-y-3">
                  {isApprovalsLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="bg-[#FAF7EC] border-2 border-black rounded-[12px] p-4 space-y-3 animate-pulse">
                        <div className="h-5 bg-stone-200 rounded w-28" />
                        <div className="h-4 bg-stone-200 rounded w-44" />
                        <div className="h-9 bg-stone-200 rounded w-full" />
                      </div>
                    ))
                  ) : (
                    paginatedPendingList.map((item) => {
                      const isOnline = item.paymentMethod === "ONLINE";

                      return (
                        <div key={`${item.source}-${item.id}`} className="bg-[#FAF7EC] border-2 border-black rounded-[12px] p-4 space-y-3 shadow-[2px_2px_0px_0px_#000000]">
                          <div className="flex items-start justify-between gap-2 border-b border-black/10 pb-2">
                            <div>
                              {isOnline ? (
                                <span className="inline-flex items-center gap-1 rounded-[6px] border border-black bg-[#B8E8B8] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                                  <Globe className="h-3 w-3" />
                                  ONLINE GATEWAY
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-[6px] border border-black bg-[#FFDF58] px-2 py-0.5 text-[9px] font-mono font-black uppercase text-[#1A1A1A]">
                                  <Banknote className="h-3 w-3" />
                                  DOORSTEP CASH
                                </span>
                              )}
                              <div className="font-mono text-[10px] text-[#5C5647] mt-1">
                                ID: {item.id.slice(0, 10)}...
                              </div>
                            </div>
                            <span className="font-mono text-lg font-black text-[#1A1A1A]">
                              {formatCurrency(item.amountPaise / 100)}
                            </span>
                          </div>

                          <div className="text-xs font-bold space-y-0.5">
                            <div className="text-[#1A1A1A] font-black">{item.customer.name}</div>
                            <div className="text-[#5C5647] font-mono text-[11px]">{item.customer.mobile}</div>
                            <div className="text-[10px] font-mono text-[#5C5647]">
                              Requested: {formatDate(item.createdAt)}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-1 flex flex-wrap gap-2">
                            {isOnline ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => item.rawCredit && handleApproveOnline(item.rawCredit)}
                                  disabled={approvingId === item.id}
                                  className="flex-1 min-h-[40px] rounded-[8px] border-2 border-black bg-[#8FD694] font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.rawCredit) {
                                      setSelectedForReject(item.rawCredit);
                                      setIsRejectOpen(true);
                                    }
                                  }}
                                  disabled={approvingId === item.id}
                                  className="px-3 min-h-[40px] rounded-[8px] border-2 border-black bg-[#FFD9D0] font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[3]" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.rawCash) {
                                      setSelectedForConfirmCash(item.rawCash);
                                      setIsConfirmCashOpen(true);
                                    }
                                  }}
                                  className="flex-1 min-h-[40px] rounded-[8px] border-2 border-black bg-[#8FD694] font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  <span>Confirm Cash</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.rawCash) {
                                      setSelectedForCancelCash(item.rawCash);
                                      setIsCancelCashOpen(true);
                                    }
                                  }}
                                  className="px-3 min-h-[40px] rounded-[8px] border-2 border-black bg-[#FFD9D0] font-black text-xs uppercase flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5 stroke-[3]" />
                                  <span>Cancel</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {!isApprovalsLoading && paginatedPendingList.length > 0 && (
                  <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span>
                      Showing <strong className="font-mono">{paginatedPendingList.length}</strong> of{" "}
                      <strong className="font-mono">{filteredPendingList.length}</strong> pending items
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={approvalsPage <= 1}
                        onClick={() => setApprovalsPage((p) => p - 1)}
                        className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="h-3 w-3 stroke-[3]" />
                        Prev
                      </button>
                      <span className="font-mono text-xs font-black px-2">
                        Page {approvalsPage} of {totalPendingPages}
                      </span>
                      <button
                        type="button"
                        disabled={approvalsPage >= totalPendingPages}
                        onClick={() => setApprovalsPage((p) => p + 1)}
                        className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-3 w-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2 CONTENT: CUSTOMER WALLET LEDGER                     */}
      {/* ========================================================= */}
      {activeTab === "CUSTOMER_LEDGER" && (
        <div className="space-y-6">
          {/* Top Control Strip */}
          <div className="bg-white border-2 border-black rounded-[14px] p-4 shadow-[4px_4px_0px_0px_#000000] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Customer Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C5647] stroke-[2.5]" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer by name, mobile, email or ID..."
                  className="w-full h-10 pl-9 pr-3 rounded-[8px] border-2 border-black bg-[#FAF7EC] font-mono text-xs font-bold text-[#1A1A1A] placeholder:text-[#5C5647] focus:outline-none focus:bg-white transition-colors"
                />
              </div>

              {/* Refresh Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadCustomers(customerPage, true)}
                  disabled={isCustomersRefreshing}
                  className="h-10 px-4 rounded-[8px] border-2 border-black bg-white hover:bg-[#FAF7EC] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isCustomersRefreshing ? "animate-spin text-amber-800" : "text-[#1A1A1A]"}`} />
                  <span>Refresh Customers</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer Directory Table */}
          <div className="bg-white border-2 border-black rounded-[14px] shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
            {customersError && !isCustomersLoading ? (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="h-8 w-8 text-[#8C2E1D] mx-auto" />
                <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                  Failed to Load Customer Directory
                </h3>
                <p className="text-xs font-bold text-[#5C5647]">{customersError}</p>
                <button
                  type="button"
                  onClick={() => loadCustomers(customerPage, true)}
                  className="px-4 py-2 bg-[#FFD84D] border-2 border-black rounded-[8px] text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFD13B] cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : !isCustomersLoading && customers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Users className="h-10 w-10 text-[#5C5647] mx-auto" />
                <h3 className="text-sm font-black uppercase text-[#1A1A1A]">
                  No Customers Found
                </h3>
                <p className="text-xs font-bold text-[#5C5647]">
                  {debouncedCustomerSearch
                    ? "No customer records matched your query."
                    : "No customers registered in Raipur operations database."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Customer Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black bg-[#FAF7EC] text-[10px] font-black uppercase text-[#1A1A1A] tracking-wider font-mono">
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Customer ID</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4">Plans / Addresses</th>
                        <th className="py-3 px-4 text-right">Wallet Ledger</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-black/10 text-xs font-bold text-[#1A1A1A]">
                      {isCustomersLoading ? (
                        <TableSkeleton columns={6} rows={8} />
                      ) : (
                        customers.map((c) => {
                          const profileName = c.profile
                            ? `${c.profile.firstName || ""} ${c.profile.lastName || ""}`.trim()
                            : "";
                          const displayName =
                            profileName ||
                            (c.email ? c.email.split("@")[0] : `Customer (${c.mobile.slice(-4)})`);
                          const initial = (profileName || c.email || c.mobile || "C").charAt(0).toUpperCase();

                          return (
                            <tr key={c.id} className="hover:bg-[#FAF7EC]/50 transition-colors">
                              {/* Customer Profile */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-9 w-9 rounded-full bg-[#FFD84D] border-2 border-black flex items-center justify-center font-mono font-black text-xs text-[#1A1A1A] shrink-0 shadow-[1px_1px_0px_0px_#000000]">
                                    {initial}
                                  </div>
                                  <div>
                                    <div className="font-black text-[#1A1A1A]">{displayName}</div>
                                    <div className="text-[10px] font-mono text-[#5C5647]">
                                      Role: CUSTOMER
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="py-3 px-4">
                                <div className="font-mono text-[#1A1A1A]">{c.mobile}</div>
                                {c.email && (
                                  <div className="text-[10px] text-[#5C5647]">{c.email}</div>
                                )}
                              </td>

                              {/* Customer ID */}
                              <td className="py-3 px-4 font-mono text-[11px]">
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyId(e, c.id)}
                                  className="hover:underline flex items-center gap-1 text-[#5C5647] hover:text-[#1A1A1A] cursor-pointer"
                                  title="Copy ID"
                                >
                                  <span>{c.id.slice(0, 8)}...</span>
                                  <Copy className="h-3 w-3 opacity-60" />
                                </button>
                              </td>

                              {/* Registered Date */}
                              <td className="py-3 px-4 font-mono text-[11px] text-[#5C5647]">
                                {formatDate(c.createdAt)}
                              </td>

                              {/* Plans & Addresses count */}
                              <td className="py-3 px-4 font-mono text-[11px] text-[#5C5647]">
                                <span>{c.counts?.planSelections || 0} plan(s)</span> •{" "}
                                <span>{c.counts?.addresses || 0} address(es)</span>
                              </td>

                              {/* Action Button: View Ledger */}
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomerLedger(c.id)}
                                  className="px-3.5 py-1.5 rounded-[8px] border-2 border-black bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                                >
                                  <Wallet className="h-3.5 w-3.5 stroke-[2.5]" />
                                  <span>View Ledger & Float</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Customer Cards */}
                <div className="lg:hidden divide-y-2 divide-black/10 p-4 space-y-3">
                  {isCustomersLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="bg-[#FAF7EC] border-2 border-black rounded-[12px] p-4 space-y-3 animate-pulse">
                        <div className="h-5 bg-stone-200 rounded w-28" />
                        <div className="h-4 bg-stone-200 rounded w-44" />
                        <div className="h-9 bg-stone-200 rounded w-full" />
                      </div>
                    ))
                  ) : (
                    customers.map((c) => {
                      const fullName = c.profile
                        ? `${c.profile.firstName || ""} ${c.profile.lastName || ""}`.trim() || "Customer"
                        : "Customer";

                      return (
                        <div key={c.id} className="bg-[#FAF7EC] border-2 border-black rounded-[12px] p-4 space-y-3 shadow-[2px_2px_0px_0px_#000000]">
                          <div className="flex items-center justify-between border-b border-black/10 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-[#FFD84D] border-2 border-black flex items-center justify-center font-mono font-black text-xs text-[#1A1A1A]">
                                {fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-black text-xs text-[#1A1A1A]">{fullName}</div>
                                <div className="font-mono text-[10px] text-[#5C5647]">{c.mobile}</div>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] text-[#5C5647]">
                              ID: {c.id.slice(0, 6)}...
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenCustomerLedger(c.id)}
                            className="w-full min-h-[40px] rounded-[8px] border-2 border-black bg-[#FFD84D] hover:bg-[#FFD13B] text-[#1A1A1A] font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Wallet className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>View Ledger & Float</span>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Customer Pagination */}
                {!isCustomersLoading && customers.length > 0 && (
                  <div className="p-3.5 bg-[#FAF7EC] border-t-2 border-black text-xs font-bold text-[#1A1A1A] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span>
                      Showing <strong className="font-mono">{customers.length}</strong> of{" "}
                      <strong className="font-mono">{customerTotalCount}</strong> customer records
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={customerPage <= 1 || isCustomersLoading}
                        onClick={() => {
                          const prev = customerPage - 1;
                          setCustomerPage(prev);
                          loadCustomers(prev, false);
                        }}
                        className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="h-3 w-3 stroke-[3]" />
                        Prev
                      </button>
                      <span className="font-mono text-xs font-black px-2">
                        Page {customerPage} of {customerTotalPages || 1}
                      </span>
                      <button
                        type="button"
                        disabled={customerPage >= customerTotalPages || isCustomersLoading}
                        onClick={() => {
                          const next = customerPage + 1;
                          setCustomerPage(next);
                          loadCustomers(next, false);
                        }}
                        className="rounded-[8px] border-2 border-black bg-white px-3 py-1 text-xs font-black disabled:opacity-40 shadow-[1.5px_1.5px_0px_0px_#000000] cursor-pointer flex items-center gap-1"
                      >
                        Next
                        <ChevronRight className="h-3 w-3 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODALS & DRAWERS                                       */}
      {/* ========================================================= */}

      {/* Reject Online Request Modal */}
      <RejectRequestModal
        request={selectedForReject}
        isOpen={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setSelectedForReject(null);
        }}
        onRejected={handleOnlineRejected}
      />

      {/* Credit Request Detail Modal */}
      <CreditRequestDetailModal
        requestId={selectedForOnlineDetail}
        isOpen={isOnlineDetailOpen}
        onClose={() => {
          setIsOnlineDetailOpen(false);
          setSelectedForOnlineDetail(null);
        }}
        onRequestInspectWallet={(userId) => {
          setIsOnlineDetailOpen(false);
          handleOpenCustomerLedger(userId);
        }}
      />

      {/* Confirm Physical Cash Modal */}
      <ConfirmCashModal
        item={selectedForConfirmCash}
        isOpen={isConfirmCashOpen}
        onClose={() => {
          setIsConfirmCashOpen(false);
          setSelectedForConfirmCash(null);
        }}
        onSuccess={handleCashConfirmed}
      />

      {/* Cancel Physical Cash Modal */}
      <CancelCashModal
        item={selectedForCancelCash}
        isOpen={isCancelCashOpen}
        onClose={() => {
          setIsCancelCashOpen(false);
          setSelectedForCancelCash(null);
        }}
        onSuccess={handleCashCancelled}
      />

      {/* Cash Collection Inspection Sheet */}
      <CashCollectionDetailSheet
        collectionId={selectedForCashDetail}
        isOpen={isCashDetailOpen}
        onClose={() => {
          setIsCashDetailOpen(false);
          setSelectedForCashDetail(null);
        }}
      />

      {/* Customer Wallet History Drawer */}
      <CustomerWalletSheet
        userId={inspectUserId}
        isOpen={isWalletSheetOpen}
        onClose={() => {
          setIsWalletSheetOpen(false);
          setInspectUserId(null);
        }}
      />
    </div>
  );
}
