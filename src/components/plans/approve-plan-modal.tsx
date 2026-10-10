"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CustomerSubscriptionItem } from "@/types/plan-delivery";
import { approveSubscription } from "@/services/plan-delivery-service";
import { ApiError } from "@/lib/api-client";
import { formatDeliveryWindow } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Milk,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  User,
  CreditCard,
} from "lucide-react";

interface ApprovePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: CustomerSubscriptionItem | null;
  onSuccess: (updated: { subscriptionId: string; startDate: string; endDate: string }) => void;
}

function getTodayIstString(): string {
  // Return YYYY-MM-DD in Asia/Kolkata timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function getTomorrowIstString(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const tomorrow = new Date(now.getTime() + istOffset + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().slice(0, 10);
}

export function ApprovePlanModal({
  isOpen,
  onClose,
  subscription,
  onSuccess,
}: ApprovePlanModalProps) {
  const [firstDeliveryDate, setFirstDeliveryDate] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const todayIst = getTodayIstString();

  useEffect(() => {
    if (isOpen && subscription) {
      setError(null);
      setNote("");
      // Default to existing startDate if valid & future, otherwise tomorrow
      if (subscription.startDate && subscription.startDate.slice(0, 10) >= todayIst) {
        setFirstDeliveryDate(subscription.startDate.slice(0, 10));
      } else {
        setFirstDeliveryDate(getTomorrowIstString());
      }
    }
  }, [isOpen, subscription, todayIst]);

  if (!subscription) return null;

  // Authoritative delivery window from the server's Plan Configuration.
  // Previously this modal printed a literal "6:00 AM - 8:00 AM", a value the
  // API never sent and which matched no configured plan.
  const planConfig = subscription.planConfig ?? null;
  const deliveryWindow = formatDeliveryWindow(
    planConfig?.deliveryStartTime,
    planConfig?.deliveryEndTime
  );
  // Approval is blocked without a usable configuration: materialising a
  // schedule would snapshot a null window onto every dispatch order.
  const configBlocker = !planConfig
    ? `No saved Plan Configuration for ${subscription.planType}. Configure the plan before scheduling deliveries.`
    : !planConfig.isActive
    ? `The ${subscription.planType} plan configuration is inactive. Reactivate it before scheduling deliveries.`
    : !deliveryWindow
    ? `No delivery window is configured for ${subscription.planType}. Set the window in Plan Configuration before scheduling deliveries.`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (configBlocker) {
      setError(configBlocker);
      return;
    }

    if (!firstDeliveryDate || !firstDeliveryDate.trim()) {
      setError("First delivery date is required.");
      return;
    }

    if (firstDeliveryDate < todayIst) {
      setError("First delivery date cannot be in the past.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await approveSubscription(subscription.id, {
        firstDeliveryDate,
        note,
      });
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to approve subscription plan.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] bg-[#FFDF58] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000]">
              <Milk className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Approve Plan & Schedule
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Set the authoritative first delivery start date for this plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {configBlocker && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border-2 border-black bg-[#FFE58F] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 stroke-[2.5]" />
              <span className="block leading-snug">{configBlocker}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5] mt-0.5" />
              <span className="block leading-snug">{error}</span>
            </div>
          )}

          {/* Subscription & Customer Summary Card */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-2 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647] flex items-center gap-1">
                <User className="h-3 w-3" /> Customer:
              </span>
              <div className="text-right">
                <span className="text-xs font-black text-[#1A1A1A] block">
                  {subscription.customer?.name || "Raipur Customer"}
                </span>
                <span className="text-[10px] font-mono text-[#5C5647]">
                  {subscription.customer?.mobile || "—"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647]">Plan Details:</span>
              <div className="text-right">
                <span className="rounded-[4px] border border-black bg-[#FFDF58] px-2 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                  {subscription.planType}
                </span>
                <span className="text-[11px] font-mono text-[#5C5647] block mt-0.5 font-bold">
                  {subscription.quantity ?? 1}L • {subscription.frequency || "DAILY"}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <span className="text-xs font-bold text-[#5C5647] flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payment Status:
              </span>
              <span className="rounded-[4px] border border-black bg-white px-2 py-0.5 text-[10px] font-mono font-black text-[#1A1A1A]">
                {subscription.paymentMethod || "PAID"} ({subscription.status})
              </span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-[#5C5647] flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 stroke-[2.5]" /> Delivery Window:
              </span>
              <span className="font-mono text-xs font-black text-[#1A1A1A]">
                {deliveryWindow ?? "Not configured"}
              </span>
            </div>
          </div>

          {/* First Delivery Date Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] flex items-center justify-between">
              <span>First Delivery Date <span className="text-red-500">*</span></span>
              <span className="text-[10px] font-mono text-[#5C5647]">IST Authority</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#5C5647] stroke-[2.5]" />
              <Input
                type="date"
                required
                min={todayIst}
                value={firstDeliveryDate}
                onChange={(e) => setFirstDeliveryDate(e.target.value)}
                className="pl-9 h-10 text-xs font-bold border-2 border-black rounded-[8px] bg-white text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
              />
            </div>
            <p className="text-[10.5px] text-[#5C5647] font-semibold leading-tight">
              Deliveries will begin on this selected date and schedule forward according to plan duration.
            </p>
          </div>

          {/* Optional Admin Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
              Approval Note <span className="text-[10px] text-[#5C5647] font-normal">(Optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Customer requested first delivery starting from Tuesday."
              maxLength={1000}
              rows={2}
              className="w-full rounded-[8px] border-2 border-black bg-white p-2.5 text-xs font-bold text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] focus:outline-none placeholder:text-[#5C5647]/60"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-[8px] border-2 border-black bg-white px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Boolean(configBlocker)}
              className="rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#fcd033] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5 justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Saving Schedule...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>Confirm Approval</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
