"use client";

import React, { useState, useEffect } from "react";
import { PlanConfig, PlanType } from "@/types/plan-delivery";
import { updatePlanConfig } from "@/services/plan-delivery-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TimePicker12h } from "@/components/ui/time-picker-12h";
import { formatDeliveryWindow, parseTimeToMinutes } from "@/lib/utils";
import {
  Settings,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

/**
 * Initial selection the time picker opens on when the plan has no window.
 *
 * This is an input seed, not a display fallback: nothing is sent to the server
 * until the admin enables the window, and an unconfigured plan keeps reading
 * as unconfigured everywhere else.
 */
const PICKER_SEED_START = "06:00";
const PICKER_SEED_END = "11:00";

interface EditPlanModalProps {
  plan: PlanConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: PlanConfig) => void;
}

export function EditPlanModal({
  plan,
  isOpen,
  onClose,
  onSuccess,
}: EditPlanModalProps) {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [actualPriceRupees, setActualPriceRupees] = useState<number>(95);
  const [sellingPriceRupees, setSellingPriceRupees] = useState<number>(85);
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState<number>(0);
  const [quantityMin, setQuantityMin] = useState<number>(1);
  const [quantityMax, setQuantityMax] = useState<number>(5);
  // Seeds for the picker, which needs *some* value to render a selection. They
  // are only ever submitted once `windowEnabled` is true — i.e. once the admin
  // has deliberately chosen to set a window — so an unconfigured plan is never
  // silently given one.
  const [deliveryStartTime, setDeliveryStartTime] = useState<string>(PICKER_SEED_START);
  const [deliveryEndTime, setDeliveryEndTime] = useState<string>(PICKER_SEED_END);
  /** False when the plan has no configured window and the admin hasn't set one. */
  const [windowEnabled, setWindowEnabled] = useState<boolean>(false);
  const [maxUsages, setMaxUsages] = useState<number>(3);

  // Monthly frequencies & modes
  const [dailyEnabled, setDailyEnabled] = useState<boolean>(true);
  const [alternateDaysEnabled, setAlternateDaysEnabled] = useState<boolean>(true);
  const [fixedQuantityEnabled, setFixedQuantityEnabled] = useState<boolean>(true);
  const [alternatingQuantityEnabled, setAlternatingQuantityEnabled] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (plan && isOpen) {
      setIsActive(plan.isActive ?? true);
      setActualPriceRupees((plan.actualPricePerLitre || 9500) / 100);
      setSellingPriceRupees((plan.sellingPricePerLitre || 8500) / 100);
      setDeliveryFeeRupees((plan.deliveryFeePaise || 0) / 100);
      setQuantityMin(plan.quantityMin || 1);
      setQuantityMax(plan.quantityMax || 5);
      const hasWindow = Boolean(plan.deliveryStartTime && plan.deliveryEndTime);
      setWindowEnabled(hasWindow);
      setDeliveryStartTime(plan.deliveryStartTime || PICKER_SEED_START);
      setDeliveryEndTime(plan.deliveryEndTime || PICKER_SEED_END);
      setMaxUsages(plan.maxUsages || 3);
      setDailyEnabled(plan.dailyEnabled ?? true);
      setAlternateDaysEnabled(plan.alternateDaysEnabled ?? true);
      setFixedQuantityEnabled(plan.fixedQuantityEnabled ?? true);
      setAlternatingQuantityEnabled(plan.alternatingQuantityEnabled ?? true);
      setError(null);
    }
  }, [plan, isOpen]);

  if (!plan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Cross-field validations
    if (sellingPriceRupees > actualPriceRupees) {
      setError("Selling price (₹) cannot be higher than base/actual price (₹).");
      return;
    }

    if (quantityMin > quantityMax) {
      setError("Minimum quantity cannot exceed maximum quantity.");
      return;
    }

    if (quantityMin < 1 || quantityMax < 1) {
      setError("Quantities must be at least 1 litre.");
      return;
    }

    // Mirrors the server rule: a window must be a real interval. Only checked
    // when a window is actually being saved.
    if (windowEnabled) {
      const startMinutes = parseTimeToMinutes(deliveryStartTime);
      const endMinutes = parseTimeToMinutes(deliveryEndTime);
      if (startMinutes === null || endMinutes === null) {
        setError("Delivery window times are invalid.");
        return;
      }
      if (startMinutes >= endMinutes) {
        setError("Delivery window start must be earlier than the window end.");
        return;
      }
    }

    if (plan.type === "MONTHLY") {
      if (!dailyEnabled && !alternateDaysEnabled) {
        setError("Monthly plan must have at least one delivery schedule active (Daily or Alternate Days).");
        return;
      }
      if (!fixedQuantityEnabled && !alternatingQuantityEnabled) {
        setError("Monthly plan must have at least one quantity mode active (Fixed or Alternating).");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: Partial<PlanConfig> = {
        isActive,
        actualPricePerLitre: Math.round(actualPriceRupees * 100),
        sellingPricePerLitre: Math.round(sellingPriceRupees * 100),
        deliveryFeePaise: Math.round(deliveryFeeRupees * 100),
        quantityMin,
        quantityMax,
        // Omitted entirely when no window is set, so a PATCH never writes an
        // invented schedule onto an unconfigured plan.
        ...(windowEnabled ? { deliveryStartTime, deliveryEndTime } : {}),
      };

      if (plan.type === "BUY_ONCE") {
        payload.maxUsages = Number(maxUsages) || 1;
      } else if (plan.type === "MONTHLY") {
        payload.dailyEnabled = dailyEnabled;
        payload.alternateDaysEnabled = alternateDaysEnabled;
        payload.fixedQuantityEnabled = fixedQuantityEnabled;
        payload.alternatingQuantityEnabled = alternatingQuantityEnabled;
      }

      const res = await updatePlanConfig(plan.type, payload);
      onSuccess(res);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to update plan configuration:", err);
      const msg = err instanceof Error ? err.message : "Failed to update plan configuration.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlanBadgeTitle = (type: PlanType) => {
    switch (type) {
      case "BUY_ONCE":
        return "BUY ONCE TRIAL";
      case "SEVEN_DAY_TRIAL":
        return "7-DAY INTRO TRIAL";
      case "MONTHLY":
        return "MONTHLY RECURRING";
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
      <DialogContent className="border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_#000000] sm:max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 pr-12">
            <div className="flex min-w-0 items-center gap-2">
              <div className="rounded-[8px] bg-[#FFDF58] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000000]">
                <Settings className="h-5 w-5 text-[#1A1A1A] stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                  Edit {getPlanBadgeTitle(plan.type)}
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-[#5C5647]">
                  Configure prices, volume limits, and delivery windows
                </DialogDescription>
              </div>
            </div>

            {/* Active Toggle Switch */}
            <label className="flex shrink-0 items-center gap-2 cursor-pointer bg-[#FAF7EC] px-3 py-1.5 rounded-[8px] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-black uppercase text-[#1A1A1A]">
                {isActive ? "Active" : "Disabled"}
              </span>
            </label>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
              <AlertTriangle className="h-4 w-4 shrink-0 stroke-[2.5]" />
              <span>{error}</span>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-3 shadow-[2px_2px_0px_0px_#000000]">
            <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
              Pricing Configuration (In ₹ Rupees)
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                  Base Price (₹/Litre)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={actualPriceRupees}
                  onChange={(e) => setActualPriceRupees(parseFloat(e.target.value) || 0)}
                  required
                  className="h-9 text-xs font-mono font-black border-2 border-black rounded-[8px] bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                  Selling Price (₹/Litre)
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={sellingPriceRupees}
                  onChange={(e) => setSellingPriceRupees(parseFloat(e.target.value) || 0)}
                  required
                  className="h-9 text-xs font-mono font-black border-2 border-black rounded-[8px] bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                Per-Order Delivery Fee (₹)
              </label>
              <Input
                type="number"
                step="1"
                min="0"
                value={deliveryFeeRupees}
                onChange={(e) => setDeliveryFeeRupees(parseFloat(e.target.value) || 0)}
                className="h-9 text-xs font-mono font-black border-2 border-black rounded-[8px] bg-white"
              />
              <span className="text-[10px] text-[#5C5647] font-bold mt-0.5 block">
                Snapshotted on order creation; enter 0 for Free Delivery.
              </span>
            </div>
          </div>

          {/* Limits & Windows */}
          <div className="rounded-[10px] border-2 border-black bg-[#FAF7EC] p-3.5 space-y-3 shadow-[2px_2px_0px_0px_#000000]">
            <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
              Quantity Limits & Delivery Window
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                  Min Quantity (Litres)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={quantityMin}
                  onChange={(e) => setQuantityMin(parseInt(e.target.value, 10) || 1)}
                  required
                  className="h-9 text-xs font-mono font-black border-2 border-black rounded-[8px] bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-[#5C5647] block mb-1">
                  Max Quantity (Litres)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={quantityMax}
                  onChange={(e) => setQuantityMax(parseInt(e.target.value, 10) || 1)}
                  required
                  className="h-9 text-xs font-mono font-black border-2 border-black rounded-[8px] bg-white"
                />
              </div>
            </div>

            {!windowEnabled ? (
              <div className="space-y-2 rounded-[10px] border-2 border-black bg-[#FFD9D0] p-3 text-[11px] font-bold leading-snug text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
                <p>
                  No delivery window is configured for this plan. Customers are
                  shown &ldquo;not available&rdquo; until one is set.
                </p>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setWindowEnabled(true)}
                  className="cursor-pointer rounded-[8px] border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FAF7EC] disabled:opacity-60"
                >
                  Set Delivery Window
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 pt-1 min-[460px]:grid-cols-2">
                  <TimePicker12h
                    label="Window Start"
                    idPrefix="delivery-window-start"
                    value={deliveryStartTime}
                    fallback={PICKER_SEED_START}
                    onChange={setDeliveryStartTime}
                    disabled={isSubmitting}
                  />
                  <TimePicker12h
                    label="Window End"
                    idPrefix="delivery-window-end"
                    value={deliveryEndTime}
                    fallback={PICKER_SEED_END}
                    onChange={setDeliveryEndTime}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="rounded-[10px] border-2 border-black bg-[#FFE58F] p-2.5 text-[11px] font-bold leading-snug text-[#1A1A1A]">
                  Customers see{" "}
                  <span className="font-mono font-black">
                    {formatDeliveryWindow(deliveryStartTime, deliveryEndTime) ??
                      "—"}
                  </span>
                  . This is when the van arrives. It is separate from the daily
                  order cut-off, which is a business-wide policy shown on the
                  Plans screen.
                </div>
              </>
            )}
          </div>

          {/* BUY_ONCE specific: Max Usages */}
          {plan.type === "BUY_ONCE" && (
            <div className="rounded-[10px] border-2 border-black bg-white p-3.5 space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
              <label className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
                Max Lifetime Trial Usages Per Customer
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={maxUsages}
                onChange={(e) => setMaxUsages(parseInt(e.target.value, 10) || 1)}
                className="h-9 text-xs font-mono font-black border-2 border-black rounded-[8px]"
              />
              <span className="text-[10px] text-[#5C5647] font-bold block">
                Controls how many times a user can purchase this introductory single-order bottle.
              </span>
            </div>
          )}

          {/* MONTHLY specific: Schedules & Modes */}
          {plan.type === "MONTHLY" && (
            <div className="rounded-[10px] border-2 border-black bg-white p-3.5 space-y-3 shadow-[2px_2px_0px_0px_#000000]">
              <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A] block">
                Allowed Subscription Schedules & Quantity Modes
              </span>

              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase text-[#5C5647] block">
                  Delivery Frequency:
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-[#1A1A1A]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dailyEnabled}
                      onChange={(e) => setDailyEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] cursor-pointer"
                    />
                    <span>Daily Morning</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alternateDaysEnabled}
                      onChange={(e) => setAlternateDaysEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] cursor-pointer"
                    />
                    <span>Alternate Days</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-black/10">
                <span className="text-[11px] font-black uppercase text-[#5C5647] block">
                  Quantity Mode:
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-[#1A1A1A]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fixedQuantityEnabled}
                      onChange={(e) => setFixedQuantityEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] cursor-pointer"
                    />
                    <span>Fixed Quantity (Every Day)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={alternatingQuantityEnabled}
                      onChange={(e) => setAlternatingQuantityEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-2 border-black text-[#1A1A1A] cursor-pointer"
                    />
                    <span>Alternating (Qty A / Qty B)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[8px] border-2 border-black bg-[#FFDF58] hover:bg-[#fcd033] py-2.5 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>Save Plan Configuration</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="w-full rounded-[8px] border-2 border-black bg-white py-2 text-xs font-black uppercase text-[#1A1A1A] hover:bg-[#FAF7EC] shadow-[2px_2px_0px_0px_#000000] cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
