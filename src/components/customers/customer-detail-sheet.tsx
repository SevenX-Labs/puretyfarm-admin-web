"use client";

import React, { useState, useEffect } from "react";
import { CustomerDetail } from "@/types/customer";
import { fetchCustomerById } from "@/services/customer-service";
import { getCachedData } from "@/lib/cache";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Mail,
  Calendar,
  Milk,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react";

interface CustomerDetailSheetProps {
  customerId?: string | null;
  customer?: { id: string } | null;
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateCustomer?: (updated: any) => void;
}

export function CustomerDetailSheet({
  customerId,
  customer: customerProp,
  isOpen,
  onClose,
}: CustomerDetailSheetProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const activeId = customerId || customerProp?.id || null;

  useEffect(() => {
    if (isOpen && activeId) {
      let isMounted = true;
      setError(null);
      setImgError(false);

      // Check cache first for 0ms instant drawer open
      const cached = getCachedData<CustomerDetail>(`customer:${activeId}`);
      if (cached) {
        setCustomer(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      fetchCustomerById(activeId, {
        onFreshData: (fresh) => {
          if (isMounted) {
            setCustomer(fresh);
            setIsLoading(false);
          }
        },
      })
        .then((data) => {
          if (isMounted) {
            setCustomer(data);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (isMounted && !cached) {
            const msg =
              err instanceof Error
                ? err.message
                : "Failed to load customer details.";
            setError(msg);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    } else if (!isOpen) {
      setCustomer(null);
      setError(null);
    }
  }, [isOpen, activeId]);

  const initials = customer?.profile
    ? `${customer.profile.firstName?.[0] || ""}${customer.profile.lastName?.[0] || ""}`.toUpperCase() || "PF"
    : "PF";

  const fullName = customer?.profile
    ? `${customer.profile.firstName} ${customer.profile.lastName}`.trim()
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-xl bg-[#FAF7EC] border-l-2 border-[#1A1A1A] p-6 overflow-y-auto"
      >
        <SheetHeader className="border-b-2 border-[#1A1A1A] pb-4 mb-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-black uppercase text-[#1A1A1A] bg-[#FFD84D] px-2.5 py-0.5 rounded-[6px] border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
              {customer?.id || customerId || "CUSTOMER"}
            </span>
            {customer?.counts && (
              <div className="flex items-center gap-1.5">
                <span className="bg-white border-2 border-[#1A1A1A] rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-[#1A1A1A] shadow-[1px_1px_0px_0px_#1A1A1A]">
                  {customer.counts.addresses} ADDR
                </span>
                <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-[#1A1A1A] shadow-[1px_1px_0px_0px_#1A1A1A]">
                  {customer.counts.planSelections} PLANS
                </span>
              </div>
            )}
          </div>

          <SheetTitle className="text-xl font-black uppercase tracking-tight text-[#1A1A1A] mt-2">
            {isLoading ? "Loading Profile..." : fullName || "Profile Incomplete"}
          </SheetTitle>
          <SheetDescription className="text-xs font-mono font-bold text-[#5C5647] flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 stroke-[2.5] text-[#1A1A1A]" />
            <span>{customer?.mobile || "—"}</span>
            {customer?.createdAt && (
              <span className="ml-2 font-mono text-[11px] text-[#5C5647]">
                • Registered: {customer.createdAt.split("T")[0]}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center p-8 bg-white border-2 border-[#1A1A1A] rounded-[14px] shadow-[4px_4px_0px_0px_#1A1A1A]">
              <Loader2 className="h-8 w-8 animate-spin stroke-[3] text-[#1A1A1A] mb-3" />
              <p className="font-mono font-black text-xs uppercase tracking-wider text-[#1A1A1A]">
                Retrieving Customer Data...
              </p>
            </div>
            <div className="h-24 bg-[#E4DFD0] rounded-[12px] border-2 border-[#1A1A1A] animate-pulse shadow-[2px_2px_0px_0px_#1A1A1A]" />
            <div className="h-32 bg-[#E4DFD0] rounded-[12px] border-2 border-[#1A1A1A] animate-pulse shadow-[2px_2px_0px_0px_#1A1A1A]" />
          </div>
        ) : error ? (
          <div className="bg-[#FFD9D0] border-2 border-[#1A1A1A] rounded-[12px] p-4 font-mono text-xs font-bold text-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 stroke-[3]" />
              <span className="font-black uppercase">Failed to Load Customer</span>
            </div>
            <p className="text-[11px] leading-relaxed">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (customerId) {
                  setIsLoading(true);
                  setError(null);
                  fetchCustomerById(customerId)
                    .then(setCustomer)
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : "Error"))
                    .finally(() => setIsLoading(false));
                }
              }}
              className="mt-2 text-xs font-black bg-white"
            >
              Retry Fetch
            </Button>
          </div>
        ) : customer ? (
          <div className="space-y-5 py-2">
            {/* Header Avatar & Identity Banner */}
            <div className="flex items-center gap-4 bg-white border-2 border-[#1A1A1A] rounded-[14px] p-4 shadow-[4px_4px_0px_0px_#1A1A1A]">
              {customer.profile?.profileImageUrl && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={customer.profile.profileImageUrl}
                  alt={fullName || "Customer Avatar"}
                  onError={() => setImgError(true)}
                  className="w-14 h-14 rounded-[10px] border-2 border-[#1A1A1A] object-cover shadow-[2px_2px_0px_0px_#1A1A1A] shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-[10px] border-2 border-[#1A1A1A] bg-[#FFD84D] text-[#1A1A1A] font-black text-xl flex items-center justify-center shadow-[2px_2px_0px_0px_#1A1A1A] shrink-0 font-mono">
                  {initials}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black uppercase text-[#1A1A1A] truncate">
                    {fullName || "Profile Incomplete"}
                  </h3>
                  {!customer.profile && (
                    <span className="bg-[#FFD9D0] text-[#1A1A1A] text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-[6px] border-2 border-[#1A1A1A]">
                      Incomplete
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3 w-3 stroke-[2.5]" />
                  <span>{customer.mobile}</span>
                </div>
                {customer.email && (
                  <div className="text-xs font-mono font-medium text-[#5C5647] flex items-center gap-1.5 mt-0.5 truncate">
                    <Mail className="h-3 w-3 stroke-[2.5]" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Summary Card */}
            <div className="bg-white border-2 border-[#1A1A1A] rounded-[14px] p-4 shadow-[4px_4px_0px_0px_#1A1A1A] space-y-3">
              <div className="flex items-center gap-2 border-b-2 border-[#1A1A1A] pb-2">
                <User className="h-4 w-4 stroke-[2.5] text-[#1A1A1A]" />
                <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                  Profile Details
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                    Gender
                  </span>
                  <span className="font-mono font-black text-[#1A1A1A]">
                    {customer.profile?.gender || "Not Specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                    Date of Birth
                  </span>
                  <span className="font-mono font-black text-[#1A1A1A]">
                    {customer.profile?.dateOfBirth
                      ? customer.profile.dateOfBirth.split("T")[0]
                      : "Not Specified"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                    Email Status
                  </span>
                  {customer.emailVerified ? (
                    <span className="bg-[#B9E8B4] text-[#1A1A1A] font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-[6px] border-2 border-[#1A1A1A] inline-flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3 stroke-[3]" /> Verified
                    </span>
                  ) : (
                    <span className="bg-[#FFD9D0] text-[#1A1A1A] font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-[6px] border-2 border-[#1A1A1A] inline-flex items-center gap-1 mt-0.5">
                      <XCircle className="h-3 w-3 stroke-[3]" /> Unverified
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                    Account Created
                  </span>
                  <span className="font-mono font-black text-[#1A1A1A]">
                    {customer.createdAt.split("T")[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Saved Addresses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 stroke-[2.5] text-[#1A1A1A]" />
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Saved Addresses ({customer.addresses?.length || 0})
                  </h4>
                </div>
              </div>

              {!customer.addresses || customer.addresses.length === 0 ? (
                <div className="bg-white border-2 border-[#1A1A1A] rounded-[12px] p-4 text-center shadow-[3px_3px_0px_0px_#1A1A1A]">
                  <p className="text-xs font-bold text-[#5C5647] uppercase font-mono">
                    No delivery addresses registered yet.
                  </p>
                </div>
              ) : (
                customer.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white border-2 border-[#1A1A1A] rounded-[12px] p-4 shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-[#1A1A1A] text-xs uppercase">
                          {address.fullName || "Delivery Recipient"}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-[#5C5647]">
                          {address.mobile}
                        </div>
                      </div>
                      <span className="bg-[#B9E8B4] border-2 border-[#1A1A1A] rounded-[6px] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-[#1A1A1A] shadow-[1px_1px_0px_0px_#1A1A1A]">
                        {address.area} • {address.pincode}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#1A1A1A] leading-relaxed">
                      {[
                        address.houseNumber,
                        address.buildingName,
                        address.streetName,
                        address.landmark ? `Near ${address.landmark}` : null,
                        `${address.city}, ${address.state}`,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>

                    {(address.latitude !== null && address.latitude !== undefined) && (
                      <div className="pt-1.5 border-t border-[#1A1A1A]/20 font-mono text-[10px] text-[#5C5647]">
                        GPS: {address.latitude?.toFixed(4)}, {address.longitude?.toFixed(4)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Plans & Subscriptions Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Milk className="h-4 w-4 stroke-[2.5] text-[#1A1A1A]" />
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A]">
                    Plans & Subscriptions ({customer.plans?.length || 0})
                  </h4>
                </div>
              </div>

              {!customer.plans || customer.plans.length === 0 ? (
                <div className="bg-white border-2 border-[#1A1A1A] rounded-[12px] p-4 text-center shadow-[3px_3px_0px_0px_#1A1A1A]">
                  <p className="text-xs font-bold text-[#5C5647] uppercase font-mono">
                    No active or historical dairy subscription plans found.
                  </p>
                </div>
              ) : (
                customer.plans.map((plan) => {
                  const isActive =
                    plan.status === "CONFIRMED" || plan.status === "ACTIVE";
                  const isPaused = plan.status === "PAUSED";
                  return (
                    <div
                      key={plan.id}
                      className="bg-white border-2 border-[#1A1A1A] rounded-[12px] p-4 shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[6px] font-mono font-black text-[10px] uppercase px-2 py-0.5 shadow-[1px_1px_0px_0px_#1A1A1A]">
                          {plan.planType}
                        </span>
                        <Badge
                          variant={isActive ? "mint" : isPaused ? "butter" : "terracotta"}
                          className="text-[10px]"
                        >
                          {plan.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                            Frequency
                          </span>
                          <span className="font-mono font-black text-[#1A1A1A]">
                            {plan.frequency}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-[#5C5647] uppercase block">
                            Daily Volume
                          </span>
                          <span className="font-mono font-black text-[#1A1A1A]">
                            {plan.quantity} Liters ({plan.quantityMode})
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#1A1A1A]/20 flex items-center justify-between text-[11px] font-mono text-[#5C5647]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 stroke-[2]" />
                          <span>
                            {plan.startDate ? plan.startDate.split("T")[0] : "—"} to{" "}
                            {plan.endDate ? plan.endDate.split("T")[0] : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        <SheetFooter className="pt-4 border-t-2 border-[#1A1A1A] mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full text-xs font-black uppercase h-11"
          >
            Close Profile Drawer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
