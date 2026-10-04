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

    const newBal =
      type === "ADD" ? walletBalance + amt : Math.max(0, walletBalance - amt);
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

    setNotice(
      `Plan ${nextStatus === "Active" ? "resumed" : "paused"} for ${
        customer.name
      }.`
    );
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
    setNotice("Buy-once credit override updated!");
    setTimeout(() => setNotice(null), 2500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#FFFDF7]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-black uppercase text-black bg-[#FFDF58] px-2 py-0.5 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000]">
              {customer.id}
            </span>
            <Badge
              variant={planStatus === "Active" ? "mint" : "stone"}
              className="text-[10px]"
            >
              {planStatus === "Active" ? "Plan Active" : "Plan Paused"}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-black uppercase tracking-tight text-black mt-2">
            {customer.name}
          </SheetTitle>
          <SheetDescription className="text-xs font-mono font-bold text-stone-700 flex items-center gap-1">
            <Phone className="h-3 w-3 stroke-[2.5]" /> {customer.phone}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-2">
          {notice && (
            <div className="flex items-center gap-2 border-2 border-black bg-[#B8E8B8] p-3 text-xs font-black text-black shadow-[3px_3px_0px_0px_#000000]">
              <CheckCircle2 className="h-4 w-4 stroke-[3]" />
              <span>{notice}</span>
            </div>
          )}

          {/* Wallet Balance Card */}
          <div
            className={`p-4 border-2 border-black shadow-[3px_3px_0px_0px_#000000] ${
              isLowBalance ? "bg-[#FF8E72]" : "bg-[#FFDF58]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Wallet className="h-4 w-4 stroke-[2.5]" />
                Wallet Float
              </span>
              {isLowBalance && (
                <span className="border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black">
                  Low Balance (&lt; ₹100)
                </span>
              )}
            </div>

            <div className="mt-2 text-3xl font-black font-mono tabular-nums text-black">
              {formatCurrency(walletBalance)}
            </div>

            {/* Quick Balance Adjustment */}
            <div className="mt-4 pt-3 border-t-2 border-black space-y-2 bg-white/70 p-2 border border-black">
              <label className="text-[11px] font-black uppercase text-black block">
                Quick Balance Adjustment (₹)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  className="font-mono text-xs h-8 bg-white"
                  placeholder="500"
                />
                <Button
                  size="sm"
                  variant="mint"
                  onClick={() => handleAdjustBalance("ADD")}
                  className="h-8 text-xs gap-1 font-black shrink-0"
                >
                  <Plus className="h-3 w-3 stroke-[3]" /> Add
                </Button>
                <Button
                  size="sm"
                  variant="terracotta"
                  onClick={() => handleAdjustBalance("DEDUCT")}
                  className="h-8 text-xs gap-1 font-black shrink-0"
                >
                  <Minus className="h-3 w-3 stroke-[3]" /> Deduct
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery Location */}
          <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000000] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <MapPin className="h-4 w-4 stroke-[2.5]" />
                Raipur Locality
              </span>
              <span className="border-2 border-black bg-[#D8CEF6] px-2 py-0.5 text-[10px] font-black uppercase text-black">
                {customer.area}
              </span>
            </div>
            <p className="text-xs font-bold text-black leading-relaxed">
              {customer.address}
            </p>
          </div>

          {/* Subscription Status & Controls */}
          <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000000] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Milk className="h-4 w-4 stroke-[2.5]" />
                <span className="text-xs font-black uppercase text-black">
                  Subscription Plan
                </span>
              </div>
              <span className="font-mono text-xs font-black text-black">
                {customer.planType}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t-2 border-black">
              <span className="text-xs font-medium text-stone-700">
                {planStatus === "Active"
                  ? "Deliveries active daily"
                  : "Deliveries paused"}
              </span>
              <Button
                size="sm"
                variant={planStatus === "Active" ? "outline" : "mint"}
                onClick={handleTogglePlan}
                className="h-8 text-xs font-black gap-1"
              >
                {planStatus === "Active" ? (
                  <>
                    <Pause className="h-3 w-3 stroke-[3]" /> Pause Plan
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 stroke-[3]" /> Resume Plan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Override Buy Once Limit */}
          <div className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000000] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase text-black block">
                  Override Buy-Once Limit
                </span>
                <span className="text-[11px] font-medium text-stone-600">
                  Allow Ghee/Paneer delivery on credit
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowOverride}
                onChange={(e) => setAllowOverride(e.target.checked)}
                className="h-5 w-5 border-2 border-black accent-black"
              />
            </div>

            {allowOverride && (
              <div className="flex items-center gap-2 pt-2 border-t-2 border-black">
                <span className="font-mono font-black text-xs">₹</span>
                <Input
                  type="number"
                  value={overrideLimit}
                  onChange={(e) => setOverrideLimit(Number(e.target.value))}
                  className="font-mono font-bold text-xs h-8 bg-white"
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSaveOverride}
                  className="h-8 text-xs font-black"
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full text-xs font-black"
          >
            Close Sheet
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
