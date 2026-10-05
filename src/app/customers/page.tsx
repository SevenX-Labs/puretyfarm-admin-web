"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CustomerListItem, CustomerPaginationMeta, CustomerProfile, CustomersApiResponse } from "@/types/customer";
import { fetchCustomers } from "@/services/customer-service";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { getCachedData } from "@/lib/cache";
import {
  Search,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Mail,
  Phone,
  CheckCircle2,
  Users,
  MapPin,
  Calendar,
  Filter,
} from "lucide-react";

function CustomerAvatarItem({
  profile,
  mobile,
}: {
  profile: CustomerProfile | null;
  mobile: string;
}) {
  const [imgError, setImgError] = useState(false);

  const initials = profile
    ? `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase() || "PF"
    : mobile.slice(-2);

  if (profile?.profileImageUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.profileImageUrl}
        alt={profile.firstName || "Customer"}
        onError={() => setImgError(true)}
        className="w-9 h-9 border-2 border-black object-cover shadow-[2px_2px_0px_0px_#000000] shrink-0"
      />
    );
  }

  return (
    <div className="w-9 h-9 border-2 border-black bg-[#FFDF58] text-black font-black text-xs flex items-center justify-center shadow-[2px_2px_0px_0px_#000000] shrink-0 font-mono">
      {initials}
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [pagination, setPagination] = useState<CustomerPaginationMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Client-side filter matching
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (filterStatus === "COMPLETE") return Boolean(customer.profile);
      if (filterStatus === "INCOMPLETE") return !customer.profile;
      if (filterStatus === "HAS_PLANS") return (customer.counts?.planSelections ?? 0) > 0;
      if (filterStatus === "HAS_ADDRESS") return (customer.counts?.addresses ?? 0) > 0;
      if (filterStatus === "VERIFIED") return customer.emailVerified;
      return true;
    });
  }, [customers, filterStatus]);

  // Debounce search input by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  const loadCustomers = useCallback(
    async (forceRefresh = false) => {
      setError(null);

      const query = new URLSearchParams();
      if (page) query.set("page", page.toString());
      if (limit) query.set("limit", limit.toString());
      if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
      const cacheKey = `customers:${query.toString()}`;

      // 1. Immediately hydrate from cache if available (0ms instant render)
      const cached = forceRefresh ? null : getCachedData<CustomersApiResponse>(cacheKey);
      if (cached && cached.data) {
        setCustomers(cached.data);
        setPagination(
          cached.pagination || {
            page,
            limit,
            total: cached.data.length,
            totalPages: Math.max(1, Math.ceil(cached.data.length / limit)),
          }
        );
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      // 2. Fetch fresh data in the background and update UI silently
      try {
        const response = await fetchCustomers(
          {
            page,
            limit,
            search: debouncedSearch,
          },
          {
            forceRefresh,
            onFreshData: (fresh) => {
              setCustomers(fresh.data || []);
              setPagination(
                fresh.pagination || {
                  page,
                  limit,
                  total: fresh.data?.length || 0,
                  totalPages: Math.max(1, Math.ceil((fresh.data?.length || 0) / limit)),
                }
              );
              setIsLoading(false);
            },
          }
        );

        setCustomers(response.data || []);
        setPagination(
          response.pagination || {
            page,
            limit,
            total: response.data?.length || 0,
            totalPages: Math.max(1, Math.ceil((response.data?.length || 0) / limit)),
          }
        );
      } catch (err: unknown) {
        if (!cached) {
          const msg =
            err instanceof Error ? err.message : "Failed to load customers from API.";
          setError(msg);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page, limit, debouncedSearch]
  );

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleOpenDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsDetailOpen(true);
  };

  const handleClearSearch = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Consolidated Sleek Header & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000]">
        {/* Title and stats pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-black">
              Customer Directory
            </h1>
            <span className="bg-[#B8E8B8] border-2 border-black font-mono text-[11px] font-black uppercase px-2.5 py-0.5 shadow-[1.5px_1.5px_0px_0px_#000000] whitespace-nowrap inline-flex items-center shrink-0">
              {pagination.total} Registered
            </span>
          </div>
        </div>

        {/* Integrated Search, Limit, & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-7 border-2 border-black bg-[#FFFDF7] font-mono text-xs text-black placeholder:text-stone-400 shadow-[2px_2px_0px_0px_#000000] focus:shadow-[3px_3px_0px_0px_#000000] outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-2 text-stone-500 hover:text-black font-bold text-xs"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdown (instead of page size) */}
          <div className="flex items-center gap-1.5 border-2 border-black bg-[#FFFDF7] px-2.5 h-9 shadow-[2px_2px_0px_0px_#000000]">
            <Filter className="h-3.5 w-3.5 text-black stroke-[2.5] shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent font-mono font-bold text-xs text-black outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Profiles</option>
              <option value="COMPLETE">Complete Profile</option>
              <option value="INCOMPLETE">Incomplete Profile</option>
              <option value="HAS_PLANS">With Active Plans</option>
              <option value="HAS_ADDRESS">With Saved Addresses</option>
              <option value="VERIFIED">Verified Email</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadCustomers(true)}
            disabled={isLoading}
            className="h-9 px-3.5 bg-[#FFDF58] hover:bg-[#FFD13B] text-black font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 stroke-[2.5] ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tag Alert (if active search or status filter) */}
      {(debouncedSearch || filterStatus !== "ALL") && (
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-black px-1 flex-wrap">
          <span>Active:</span>
          {debouncedSearch && (
            <span className="bg-[#FFDF58] border-2 border-black px-2 py-0.5 inline-flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000000]">
              &quot;{debouncedSearch}&quot;
              <button
                type="button"
                onClick={handleClearSearch}
                className="hover:font-black text-black ml-1 text-xs"
              >
                ✕
              </button>
            </span>
          )}
          {filterStatus !== "ALL" && (
            <span className="bg-[#B8E8B8] border-2 border-black px-2 py-0.5 inline-flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000000]">
              Filter: {filterStatus.replace("_", " ")}
              <button
                type="button"
                onClick={() => setFilterStatus("ALL")}
                className="hover:font-black text-black ml-1 text-xs"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-[#FF8E72] border-2 border-black p-3.5 font-mono text-xs font-bold text-black shadow-[3px_3px_0px_0px_#000000] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 stroke-[2.5] shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadCustomers()}
            className="text-xs font-black bg-white px-2.5 py-1 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Streamlined Customer Data Table */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#FFDF58] text-black uppercase text-[11px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Profile</th>
                <th className="py-3 px-4">Addresses</th>
                <th className="py-3 px-4">Active Plans</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/15 bg-white">
              {isLoading ? (
                // Vibrant Neo-Brutalist Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse bg-[#FFFDF7]/60">
                    {/* Avatar & Name Skeleton */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 border-2 border-black bg-[#FFDF58]/40 shadow-[2px_2px_0px_0px_#000000] shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div
                            className="h-3.5 bg-stone-300 border border-black/60"
                            style={{ width: `${65 + (idx % 3) * 15}%`, maxWidth: "150px" }}
                          />
                          <div className="h-2 w-20 bg-stone-200 border border-black/20" />
                        </div>
                      </div>
                    </td>

                    {/* Contact Skeleton */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="h-3 w-28 bg-stone-300 border border-black/50" />
                        <div className="h-2.5 w-36 bg-stone-200 border border-black/20" />
                      </div>
                    </td>

                    {/* Profile Status Skeleton */}
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-16 bg-[#B8E8B8]/40 border border-black shadow-[1px_1px_0px_0px_#000000]" />
                    </td>

                    {/* Addresses Skeleton */}
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-16 bg-stone-200 border border-black/50" />
                    </td>

                    {/* Active Plans Skeleton */}
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-16 bg-[#D8CEF6]/40 border border-black shadow-[1px_1px_0px_0px_#000000]" />
                    </td>

                    {/* Registered Date Skeleton */}
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-20 bg-stone-300 border border-black/40" />
                    </td>

                    {/* Action Button Skeleton */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-8 w-28 bg-[#FFDF58]/40 border-2 border-black shadow-[2px_2px_0px_0px_#000000] ml-auto" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="max-w-sm mx-auto p-5 bg-[#FFFDF7] border-2 border-black shadow-[3px_3px_0px_0px_#000000] space-y-2.5">
                      <Users className="h-7 w-7 mx-auto text-black stroke-[2.5]" />
                      <h3 className="text-sm font-black uppercase text-black">
                        {debouncedSearch
                          ? `No matches for "${debouncedSearch}"`
                          : "No Customers Found"}
                      </h3>
                      <p className="text-xs font-medium text-stone-600">
                        {debouncedSearch
                          ? "Check spelling or search by phone number instead."
                          : "Customer accounts will display here when registered."}
                      </p>
                      {debouncedSearch && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="mt-2 bg-[#FFDF58] text-black font-extrabold uppercase text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const hasProfile = Boolean(customer.profile);
                  const fullName = hasProfile
                    ? `${customer.profile!.firstName} ${customer.profile!.lastName}`.trim()
                    : null;

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-[#FFFDF0] transition-colors"
                    >
                      {/* Customer: Avatar + Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CustomerAvatarItem
                            profile={customer.profile}
                            mobile={customer.mobile}
                          />
                          <div className="min-w-0">
                            {fullName ? (
                              <div className="font-extrabold text-black text-sm uppercase tracking-tight truncate">
                                {fullName}
                              </div>
                            ) : (
                              <span className="bg-[#FF8E72] text-black text-[10px] font-mono font-bold px-1.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]">
                                Incomplete
                              </span>
                            )}
                            <div className="text-[10px] font-mono font-bold text-stone-500 truncate mt-0.5">
                              ID: {customer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact: Phone & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black tabular-nums text-xs text-black flex items-center gap-1.5">
                          <Phone className="h-3 w-3 stroke-[2.5]" />
                          {customer.mobile}
                        </div>
                        {customer.email ? (
                          <div className="text-xs font-mono font-medium text-stone-700 flex items-center gap-1.5 mt-0.5">
                            <Mail className="h-3 w-3 stroke-[2] text-stone-500 shrink-0" />
                            <span className="truncate max-w-[160px]">{customer.email}</span>
                            {customer.emailVerified && (
                              <span title="Verified" className="text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] font-mono text-stone-400">
                            No email
                          </span>
                        )}
                      </td>

                      {/* Profile Status */}
                      <td className="py-3.5 px-4">
                        {hasProfile ? (
                          <span className="bg-[#B8E8B8] text-black font-mono text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000] inline-block">
                            {customer.profile?.gender || "Active"}
                          </span>
                        ) : (
                          <span className="bg-[#FF8E72] text-black font-mono text-[10px] font-black uppercase px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000] inline-block">
                            Incomplete
                          </span>
                        )}
                      </td>

                      {/* Saved Addresses Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-black">
                          <MapPin className="h-3 w-3 text-stone-500 stroke-[2.5]" />
                          <span>{customer.counts?.addresses ?? 0}</span>
                          <span className="text-[11px] text-stone-500 font-normal">saved</span>
                        </div>
                      </td>

                      {/* Active Plans Count */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {(customer.counts?.planSelections ?? 0) > 0 ? (
                            <span className="bg-[#D8CEF6] border border-black px-2 py-0.5 font-mono text-[11px] font-black text-black shadow-[1px_1px_0px_0px_#000000]">
                              {customer.counts.planSelections} Active
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-stone-500">
                              0 plans
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-stone-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-stone-500" />
                          <span>{customer.createdAt ? customer.createdAt.split("T")[0] : "—"}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(customer.id)}
                          className="bg-[#FFDF58] hover:bg-[#FFD13B] text-black font-black text-xs px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1 cursor-pointer select-none"
                        >
                          VIEW PROFILE
                          <ArrowRight className="h-3 w-3 stroke-[3]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Compact Footer / Pagination Bar */}
        <div className="px-4 py-2.5 bg-[#FBF8EE] border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-black/80">
              Page <span className="font-black">{pagination.page}</span> of{" "}
              <span className="font-black">{pagination.totalPages}</span> •{" "}
              <span className="font-black">{pagination.total}</span> Customers
            </span>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold text-black/60 pl-3 border-l border-black/20">
              <span>Show:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-6 border border-black bg-white px-1.5 font-mono font-bold text-xs outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="h-8 px-3 font-mono font-black text-xs border-2 border-black bg-white shadow-[1.5px_1.5px_0px_0px_#000000] hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer select-none transition-all"
            >
              PREV
            </button>
            <span className="font-mono font-black text-xs px-2 text-black">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              className="h-8 px-3 font-mono font-black text-xs border-2 border-black bg-white shadow-[1.5px_1.5px_0px_0px_#000000] hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white cursor-pointer select-none transition-all"
            >
              NEXT
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Drawer / Sheet */}
      <CustomerDetailSheet
        customerId={selectedCustomerId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
