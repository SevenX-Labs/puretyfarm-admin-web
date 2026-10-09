"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CustomerListItem, CustomerPaginationMeta, CustomerProfile, CustomersApiResponse } from "@/types/customer";
import { fetchCustomers } from "@/services/customer-service";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { getCachedData, invalidateCache } from "@/lib/cache";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
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

  useEffect(() => {
    setImgError(false);
  }, [profile?.profileImageUrl]);

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
        referrerPolicy="no-referrer"
        className="w-9 h-9 border-2 border-[#1A1A1A] rounded-[8px] object-cover shadow-[2px_2px_0px_0px_#1A1A1A] shrink-0"
      />
    );
  }

  return (
    <div className="w-9 h-9 border-2 border-[#1A1A1A] bg-[#FFD84D] text-[#1A1A1A] font-black text-xs flex items-center justify-center rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] shrink-0 font-mono">
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

      if (forceRefresh) {
        invalidateCache("customers");
        invalidateCache("customer:");
      }

      // Instant 0ms cache read
      const query = new URLSearchParams();
      if (page) query.set("page", page.toString());
      if (limit) query.set("limit", limit.toString());
      if (debouncedSearch?.trim()) query.set("search", debouncedSearch.trim());

      const cacheKey = `customers:${query.toString()}`;
      const cached = getCachedData<CustomersApiResponse>(cacheKey);

      if (cached && !forceRefresh) {
        setCustomers(cached.data || []);
        setPagination(
          cached.pagination || {
            page,
            limit,
            total: cached.data?.length || 0,
            totalPages: Math.max(1, Math.ceil((cached.data?.length || 0) / limit)),
          }
        );
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      // Fetch fresh data in the background and update UI silently
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

        if (response && response.data) {
          setCustomers(response.data);
          setPagination(
            response.pagination || {
              page,
              limit,
              total: response.data.length,
              totalPages: Math.max(1, Math.ceil(response.data.length / limit)),
            }
          );
        }
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

  const hasActiveFilter = Boolean(debouncedSearch || filterStatus !== "ALL");

  return (
    <div className="space-y-6">
      {/* Consolidated Header & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border-2 border-[#1A1A1A] rounded-[14px] p-5 shadow-[5px_5px_0px_0px_#1A1A1A]">
        {/* Title and stats pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1A1A1A]">
              Customer Directory
            </h1>
            <span className="bg-[#B9E8B4] border-2 border-[#1A1A1A] font-mono text-[11px] font-black uppercase px-2.5 py-0.5 rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#1A1A1A] whitespace-nowrap inline-flex items-center shrink-0">
              {isLoading ? "..." : `${pagination.total} Registered`}
            </span>
          </div>
        </div>

        {/* Integrated Search, Filter, & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-8 border-2 border-[#1A1A1A] bg-white font-mono text-xs text-[#1A1A1A] placeholder:text-[#5C5647]/60 rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FFD84D] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear customer search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5647] hover:text-[#1A1A1A] font-bold text-xs cursor-pointer"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-1.5 border-2 border-[#1A1A1A] bg-white px-3 h-11 rounded-[10px] shadow-[2px_2px_0px_0px_#1A1A1A]">
            <Filter className="h-4 w-4 text-[#1A1A1A] stroke-[2.5] shrink-0" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter customer profiles"
              className="bg-transparent font-mono font-bold text-xs text-[#1A1A1A] outline-none cursor-pointer pr-1"
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
            aria-label="Refresh customer list"
            className="h-11 px-4 bg-[#FFD84D] hover:bg-[#E6C23D] text-[#1A1A1A] font-black uppercase text-xs border-2 border-[#1A1A1A] rounded-[10px] shadow-[3px_3px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#1A1A1A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RotateCcw className={`h-4 w-4 stroke-[2.5] ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Filter Tags */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1A1A1A] px-1 flex-wrap">
          <span>Active:</span>
          {debouncedSearch && (
            <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[6px] px-2 py-0.5 inline-flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              &quot;{debouncedSearch}&quot;
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear active search tag"
                className="hover:font-black text-[#1A1A1A] ml-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </span>
          )}
          {filterStatus !== "ALL" && (
            <span className="bg-[#B9E8B4] border-2 border-[#1A1A1A] rounded-[6px] px-2 py-0.5 inline-flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              Filter: {filterStatus.replace("_", " ")}
              <button
                type="button"
                onClick={() => setFilterStatus("ALL")}
                aria-label="Clear active filter tag"
                className="hover:font-black text-[#1A1A1A] ml-1 text-xs cursor-pointer"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* Error / Session Expired Alert */}
      {error && (
        <ErrorState
          error={error}
          onRetry={() => loadCustomers(true)}
        />
      )}

      {/* Streamlined Customer Data Table */}
      <div className="border-2 border-[#1A1A1A] bg-white rounded-[14px] shadow-[5px_5px_0px_0px_#1A1A1A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse" aria-busy={isLoading}>
            <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase font-mono text-[11px] font-black tracking-wider border-b-2 border-[#1A1A1A]">
              <tr>
                <th className="py-3.5 px-4 border-r-2 border-[#1A1A1A]">Customer</th>
                <th className="py-3.5 px-4 border-r-2 border-[#1A1A1A]">Contact</th>
                <th className="py-3.5 px-4 border-r-2 border-[#1A1A1A]">Profile</th>
                <th className="py-3.5 px-4 border-r-2 border-[#1A1A1A]">Addresses</th>
                <th className="py-3.5 px-4 border-r-2 border-[#1A1A1A]">Active Plans</th>
                <th className="py-3.5 px-4 border-r-2 border-[#1A1A1A]">Registered</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#1A1A1A] bg-white">
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} />
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={<Users className="h-6 w-6 stroke-[2.5]" />}
                      title="No customers found"
                      description={
                        hasActiveFilter
                          ? "No customer accounts match your active search or filter criteria."
                          : "No registered customers found in Raipur database."
                      }
                      isFiltered={hasActiveFilter}
                      onClearFilters={() => {
                        setSearch("");
                        setDebouncedSearch("");
                        setFilterStatus("ALL");
                        setPage(1);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const fullName = customer.profile
                    ? `${customer.profile.firstName || ""} ${customer.profile.lastName || ""}`.trim()
                    : "No Profile Set";

                  const registeredDate = customer.createdAt
                    ? new Date(customer.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => handleOpenDetail(customer.id)}
                      className="hover:bg-[#FAF7EC]/80 transition-colors cursor-pointer group"
                    >
                      {/* Customer Identity */}
                      <td className="py-3 px-4 border-r-2 border-[#1A1A1A]">
                        <div className="flex items-center gap-3">
                          <CustomerAvatarItem
                            profile={customer.profile}
                            mobile={customer.mobile}
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-[#1A1A1A] text-xs uppercase truncate group-hover:text-black">
                              {fullName}
                            </div>
                            <div className="font-mono text-[10px] text-[#5C5647] truncate">
                              ID: {customer.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 border-r-2 border-[#1A1A1A]">
                        <div className="space-y-0.5 font-mono text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-[#1A1A1A]">
                            <Phone className="h-3 w-3 text-[#5C5647] shrink-0" />
                            <span>{customer.mobile}</span>
                          </div>
                          {customer.email ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#5C5647] truncate max-w-[200px]">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-stone-400 italic">No email linked</div>
                          )}
                        </div>
                      </td>

                      {/* Profile Completeness */}
                      <td className="py-3 px-4 border-r-2 border-[#1A1A1A]">
                        {customer.profile ? (
                          <span className="inline-flex items-center gap-1 bg-[#B9E8B4] border-2 border-[#1A1A1A] text-[#1A1A1A] font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A]">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-[#E4DFD0] border-2 border-[#1A1A1A] text-[#1A1A1A] font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-[6px]">
                            Incomplete
                          </span>
                        )}
                      </td>

                      {/* Addresses Count */}
                      <td className="py-3 px-4 border-r-2 border-[#1A1A1A]">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#1A1A1A]">
                          <MapPin className="h-3.5 w-3.5 text-[#5C5647] shrink-0" />
                          <span>{customer.counts?.addresses || 0} saved</span>
                        </div>
                      </td>

                      {/* Active Subscriptions Count */}
                      <td className="py-3 px-4 border-r-2 border-[#1A1A1A]">
                        {(customer.counts?.planSelections ?? 0) > 0 ? (
                          <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] text-[#1A1A1A] font-mono text-xs font-black px-2 py-0.5 rounded-[6px] shadow-[1px_1px_0px_0px_#1A1A1A] inline-block">
                            {customer.counts?.planSelections} Active
                          </span>
                        ) : (
                          <span className="text-stone-400 font-mono text-xs">0 active</span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-4 border-r-2 border-[#1A1A1A] font-mono text-xs text-[#5C5647] whitespace-nowrap">
                        {registeredDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(customer.id);
                          }}
                          aria-label={`View full record for ${fullName}`}
                          className="h-8 px-3 bg-[#FAF7EC] group-hover:bg-[#FFD84D] text-[#1A1A1A] font-black uppercase text-[11px] border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <span>View Record</span>
                          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#FAF7EC] border-t-2 border-[#1A1A1A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="font-mono text-xs font-bold text-[#1A1A1A]">
            Showing Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages || 1}</strong> (<strong>{pagination.total}</strong> total customers)
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              aria-label="Previous page"
              className="h-8 px-3 bg-white text-[#1A1A1A] font-black uppercase text-xs border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FFD84D] disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages || isLoading}
              onClick={() => setPage((prev) => prev + 1)}
              aria-label="Next page"
              className="h-8 px-3 bg-white text-[#1A1A1A] font-black uppercase text-xs border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-[#FFD84D] disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Sheet Drawer */}
      <CustomerDetailSheet
        customerId={selectedCustomerId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedCustomerId(null);
        }}
      />
    </div>
  );
}
