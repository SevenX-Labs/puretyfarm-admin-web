"use client";

import React, { useState, useMemo } from "react";
import { SubscriptionPlanItem } from "@/types";
import { MOCK_PLANS } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Pause,
  Play,
  Search,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>(MOCK_PLANS);
  const [search, setSearch] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState<string>("All");

  // Pause modal state
  const [selectedPlanForPause, setSelectedPlanForPause] =
    useState<SubscriptionPlanItem | null>(null);
  const [resumeDate, setResumeDate] = useState("2026-10-10");
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const planTypes = [
    { id: "All", label: "All Plans" },
    { id: "Daily", label: "Daily Milk" },
    { id: "Alternate Days", label: "Alternate Days" },
    { id: "7-Day Trial", label: "7-Day Trial" },
  ];

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const q = search.toLowerCase();
      const matchesSearch =
        plan.customerName.toLowerCase().includes(q) ||
        plan.phone.includes(q) ||
        plan.area.toLowerCase().includes(q) ||
        plan.product.toLowerCase().includes(q);

      const matchesType =
        planTypeFilter === "All" || plan.frequency === planTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [plans, search, planTypeFilter]);

  const handleOpenPauseModal = (plan: SubscriptionPlanItem) => {
    setSelectedPlanForPause(plan);
    setIsPauseModalOpen(true);
  };

  const handleConfirmPause = () => {
    if (!selectedPlanForPause) return;

    setPlans((prev) =>
      prev.map((p) =>
        p.id === selectedPlanForPause.id ? { ...p, status: "Paused" } : p
      )
    );

    setActionNotice(
      `Paused deliveries for ${selectedPlanForPause.customerName} until ${resumeDate}.`
    );
    setIsPauseModalOpen(false);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleResume = (planId: string) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, status: "Active" } : p))
    );
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setActionNotice(`Resumed daily deliveries for ${plan.customerName}.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Plans & Subscriptions
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Active recurring milk schedules, tasting trials, and pause/resume requests.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200/60 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented plan type tabs */}
          <div className="flex items-center rounded-xl bg-stone-100/80 p-1 border border-stone-200/50">
            {planTypes.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPlanTypeFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  planTypeFilter === tab.id
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search subscriber, phone, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-stone-50/50 border-stone-200"
            />
          </div>
        </div>
      </Card>

      {/* Plans Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/70 text-stone-500 uppercase text-[10px] font-semibold tracking-wider border-b border-stone-100">
              <tr>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Area</th>
                <th className="py-3.5 px-6">Product & Volume</th>
                <th className="py-3.5 px-6">Cadence</th>
                <th className="py-3.5 px-6">Start Date</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-stone-400 text-xs">
                    No active subscriptions match your filter.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Customer */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-stone-900">
                        {plan.customerName}
                      </div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        {plan.phone}
                      </div>
                    </td>

                    {/* Area */}
                    <td className="py-4 px-6 text-stone-700 text-xs">
                      {plan.area}
                    </td>

                    {/* Product & Qty */}
                    <td className="py-4 px-6 text-xs">
                      <span className="font-medium text-stone-900 block">
                        {plan.product}
                      </span>
                      <span className="text-stone-500 text-[11px] block mt-0.5 font-mono">
                        {plan.quantity}
                      </span>
                    </td>

                    {/* Frequency */}
                    <td className="py-4 px-6">
                      <Badge variant="stone" className="text-[11px]">
                        {plan.frequency}
                      </Badge>
                    </td>

                    {/* Start Date */}
                    <td className="py-4 px-6 font-mono text-xs text-stone-600">
                      {plan.startDate}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <Badge
                        variant={plan.status === "Active" ? "sage" : "stone"}
                        className="text-[11px]"
                      >
                        {plan.status}
                      </Badge>
                    </td>

                    {/* Inline Action Controls */}
                    <td className="py-4 px-6 text-right">
                      {plan.status === "Active" ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenPauseModal(plan)}
                          className="h-7 text-xs text-stone-600 hover:text-stone-900 gap-1"
                        >
                          <Pause className="h-3 w-3" />
                          Pause
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleResume(plan.id)}
                          className="h-7 text-xs bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 gap-1 font-medium"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between px-6">
          <span>
            Total: <strong className="text-stone-800">{filteredPlans.length}</strong> active subscription profiles
          </span>
          <span className="text-stone-400">
            Pause updates take effect immediately on next morning&apos;s 10:00 PM batch
          </span>
        </div>
      </Card>

      {/* Pause Subscription Modal with Date Picker */}
      <Dialog
        open={isPauseModalOpen}
        onOpenChange={(open) => !open && setIsPauseModalOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-stone-900">
              Pause Milk Subscription
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Temporarily suspend early morning deliveries for {selectedPlanForPause?.customerName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-stone-500">Customer:</span>
                <span className="font-semibold text-stone-900">
                  {selectedPlanForPause?.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Product:</span>
                <span className="font-medium text-stone-800">
                  {selectedPlanForPause?.product}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#133826]" />
                Auto-Resume Deliveries On
              </label>
              <Input
                type="date"
                value={resumeDate}
                onChange={(e) => setResumeDate(e.target.value)}
                className="font-mono text-xs bg-white"
              />
              <p className="text-[11px] text-stone-400">
                Deliveries will automatically resume for morning dispatch on this date.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPauseModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmPause}
              className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs font-medium"
            >
              Confirm Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
