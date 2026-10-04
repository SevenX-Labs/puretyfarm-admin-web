"use client";

import React, { useState } from "react";
import { Customer } from "@/types";
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
import { Input } from "@/components/ui/input";
import {
  Wallet,
  MapPin,
  Phone,
  Milk,
  Plus,
  Minus,
  CheckCircle2,
  Pause,
  Play,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CustomerDetailSheetProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCustomer?: (updated: Customer) => void;
}

export function CustomerDetailSheet({
  customer,
  isOpen,
  onClose,
  onUpdateCustomer,
}: CustomerDetailSheetProps) {
  const [overrideLimit, setOverrideLimit] = useState<number>(
    customer?.buyOnceLimitOverride ?? 1000
  );
  const [allowOverride, setAllowOverride] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(
    customer?.walletBalance ?? 0
  );
  const [planStatus, setPlanStatus] = useState<"Active" | "Paused">(
    customer?.planStatus === "Paused" ? "Paused" : "Active"
  );
  const [quickAmount, setQuickAmount] = useState<string>("500");
  const [notice, setNotice] = useState<string | null>(null);

  React.useEffect(() => {
    if (customer) {
      setOverrideLimit(customer.buyOnceLimitOverride ?? 1000);
      setWalletBalance(customer.walletBalance);
      setPlanStatus(customer.planStatus === "Paused" ? "Paused" : "Active");
      setAllowOverride((customer.buyOnceLimitOverride ?? 0) > 0);
      setNotice(null);
    }
  }, [customer]);

  if (!customer) return null;

  const isLowBalance = walletBalance < 100;

  const handleAdjustBalance = (type: "ADD" | "DEDUCT") => {
    const amt = parseFloat(quickAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newBal = type === "ADD" ? walletBalance + amt : Math.max(0, walletBalance - amt);
    setWalletBalance(newBal);

    if (onUpdateCustomer && customer) {
      onUpdateCustomer({
        ...customer,
        walletBalance: newBal,
      });
    }

    setNotice(
      type === "ADD"
        ? `Added ₹${amt} to ${customer.name}'s wallet.`
        : `Deducted ₹${amt} from ${customer.name}'s wallet.`
    );
    setTimeout(() => setNotice(null), 3000);
  };

  const handleTogglePlan = () => {
    const nextStatus = planStatus === "Active" ? "Paused" : "Active";
    setPlanStatus(nextStatus);

    if (onUpdateCustomer && customer) {
      onUpdateCustomer({
        ...customer,
        planStatus: nextStatus,
      });
    }

    setNotice(`Plan ${nextStatus === "Active" ? "resumed" : "paused"} for ${customer.name}.`);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleSaveOverride = () => {
    const newLimit = allowOverride ? Number(overrideLimit) : 0;
    if (onUpdateCustomer && customer) {
      onUpdateCustomer({
        ...customer,
        buyOnceLimitOverride: newLimit,
      });
    }
    setNotice("Buy-once override limit updated.");
    setTimeout(() => setNotice(null), 2500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-stone-400">
              {customer.id}
            </span>
            <Badge
              variant={planStatus === "Active" ? "sage" : "stone"}
              className="text-[11px]"
            >
              {planStatus === "Active" ? "Active Plan" : "Plan Paused"}
            </Badge>
          </div>
          <SheetTitle className="text-lg font-semibold text-stone-900 mt-1">
            {customer.name}
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-500 flex items-center gap-1 font-mono">
            <Phone className="h-3 w-3" /> {customer.phone}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-2">
          {notice && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Wallet Balance Card */}
          <div
            className={`rounded-2xl p-5 border ${
              isLowBalance
                ? "bg-rose-50/50 border-rose-200/70"
                : "bg-stone-50/70 border-stone-200/70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-600 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-[#133826]" />
                Wallet Balance
              </span>
              {isLowBalance && (
                <Badge variant="rose" className="text-[10px]">
                  Low Balance (&lt; ₹100)
                </Badge>
              )}
            </div>

            <div className="mt-2 text-2xl font-bold font-mono tabular-nums text-stone-900">
              {formatCurrency(walletBalance)}
            </div>

            {/* Quick Add/Deduct Balance Controls */}
            <div className="mt-4 pt-3 border-t border-stone-200/60 space-y-2">
              <label className="text-[11px] font-medium text-stone-600 block">
                Quick Balance Adjustment (₹)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="font-mono tabular-nums text-xs h-8 bg-white"
                  placeholder="500"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdjustBalance("ADD")}
                  className="h-8 text-xs bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50 gap-1 font-medium"
                >
                  <Plus className="h-3 w-3" /> Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdjustBalance("DEDUCT")}
                  className="h-8 text-xs bg-white text-rose-800 border-rose-200 hover:bg-rose-50 gap-1 font-medium"
                >
                  <Minus className="h-3 w-3" /> Deduct
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="rounded-2xl border border-stone-200/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#133826]" />
                Delivery Address
              </span>
              <Badge variant="stone" className="text-[10px]">
                {customer.area}
              </Badge>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              {customer.address}
            </p>
          </div>

          {/* Subscription Status & Controls */}
          <div className="rounded-2xl border border-stone-200/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Milk className="h-3.5 w-3.5 text-[#133826]" />
                <span className="text-xs font-semibold text-stone-800">
                  Subscription Plan
                </span>
              </div>
              <span className="text-xs font-medium text-stone-900">
                {customer.planType}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="text-xs text-stone-500">
                {planStatus === "Active" ? "Deliveries active daily" : "Deliveries currently paused"}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTogglePlan}
                className="h-8 text-xs font-medium gap-1"
              >
                {planStatus === "Active" ? (
                  <>
                    <Pause className="h-3 w-3" /> Pause Deliveries
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" /> Resume Deliveries
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Override Buy Once Limit */}
          <div className="rounded-2xl border border-stone-200/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-stone-800 block">
                  Override Buy-Once Limit
                </span>
                <span className="text-[11px] text-stone-500">
                  Allow ordering Ghee / Paneer on credit
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={(e) => {
                  setAllowOverride(e.target.checked);
                }}
                className="h-4 w-4 rounded accent-[#133826]"
              />
            </div>

            {allowOverride && (
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <span className="text-xs font-mono font-bold text-stone-500">₹</span>
                <Input
                  type="number"
                  value={overrideLimit}
                  onChange={(e) => setOverrideLimit(Number(e.target.value))}
                  className="font-mono tabular-nums text-xs h-8 bg-white"
                  placeholder="1000"
                />
                <Button
                  size="sm"
                  onClick={handleSaveOverride}
                  className="h-8 text-xs bg-[#133826] text-white hover:bg-[#1B4332]"
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="pt-2">
          <Button variant="outline" onClick={onClose} className="w-full text-xs">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
