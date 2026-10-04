"use client";

import React, { useState, useMemo } from "react";
import { SubscriptionPlanItem } from "@/types";
import { MOCK_PLANS } from "@/lib/mock-data";
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
      `Deliveries paused for ${selectedPlanForPause.customerName} until ${resumeDate}.`
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
      setActionNotice(`Resumed deliveries for ${plan.customerName}.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            Plans & Subscriptions
          </h1>
          <p className="text-xs font-medium text-stone-600">
            Active recurring milk schedules, tasting trials, and pause/resume controls.
          </p>
        </div>
      </div>

      {actionNotice && (
        <div className="flex items-center gap-2 border-2 border-black bg-[#B8E8B8] p-3 text-xs font-black text-black shadow-[3px_3px_0px_0px_#000000]">
          <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Segmented plan type tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {planTypes.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPlanTypeFilter(tab.id)}
                className={`border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-tight transition-all ${
                  planTypeFilter === tab.id
                    ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white hover:bg-stone-100 hover:shadow-[1px_1px_0px_0px_#000000]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black stroke-[2.5]" />
            <Input
              placeholder="Search subscriber, phone, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#4A1513] text-[#FFDF58] uppercase text-[10px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3 px-5 border-r-2 border-black">Subscriber</th>
                <th className="py-3 px-5 border-r-2 border-black">Raipur Locality</th>
                <th className="py-3 px-5 border-r-2 border-black">Product & Volume</th>
                <th className="py-3 px-5 border-r-2 border-black">Cadence</th>
                <th className="py-3 px-5 border-r-2 border-black">Start Date</th>
                <th className="py-3 px-5 border-r-2 border-black text-center">Status</th>
                <th className="py-3 px-5 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-white">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-bold text-xs uppercase text-stone-500">
                    No active subscriptions match your filter.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-[#FFF9D2] transition-colors">
                    {/* Customer */}
                    <td className="py-3.5 px-5 border-r-2 border-black">
                      <div className="font-extrabold text-black">
                        {plan.customerName}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-stone-600">
                        {plan.phone}
                      </div>
                    </td>

                    {/* Area */}
                    <td className="py-3.5 px-5 border-r-2 border-black font-bold text-xs text-black">
                      {plan.area}
                    </td>

                    {/* Product & Qty */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-xs">
                      <div className="font-bold text-black">{plan.product}</div>
                      <div className="text-[11px] font-mono text-stone-600">{plan.quantity}</div>
                    </td>

                    {/* Cadence */}
                    <td className="py-3.5 px-5 border-r-2 border-black">
                      <span className="inline-block border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                        {plan.frequency}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td className="py-3.5 px-5 border-r-2 border-black font-mono font-bold text-xs text-black">
                      {plan.startDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-center">
                      <Badge
                        variant={plan.status === "Active" ? "mint" : "stone"}
                        className="text-[10px]"
                      >
                        {plan.status}
                      </Badge>
                    </td>

                    {/* Inline Action Controls */}
                    <td className="py-3.5 px-5 text-right">
                      {plan.status === "Active" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPauseModal(plan)}
                          className="border-2 border-black bg-white px-2.5 py-1 text-xs font-black uppercase tracking-tight text-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FF8E72] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1"
                        >
                          <Pause className="h-3 w-3 stroke-[3]" />
                          Pause
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResume(plan.id)}
                          className="border-2 border-black bg-[#B8E8B8] px-2.5 py-1 text-xs font-black uppercase tracking-tight text-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1"
                        >
                          <Play className="h-3 w-3 stroke-[3]" />
                          Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#FBF8EE] border-t-2 border-black text-xs font-black text-black flex items-center justify-between px-5">
          <span>
            Total: <strong className="font-mono">{filteredPlans.length}</strong> active profiles
          </span>
          <span className="font-mono text-stone-600">
            Pause requests take effect on next 10:00 PM batch
          </span>
        </div>
      </div>

      {/* Pause Subscription Modal */}
      <Dialog
        open={isPauseModalOpen}
        onOpenChange={(open) => !open && setIsPauseModalOpen(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-tight text-black">
              Pause Milk Subscription
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-stone-600">
              Temporarily suspend early morning deliveries for {selectedPlanForPause?.customerName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="border-2 border-black bg-[#FBF8EE] p-3 text-xs font-bold space-y-1 shadow-[2px_2px_0px_0px_#000000]">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-black text-black">{selectedPlanForPause?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Product:</span>
                <span className="font-black text-black">{selectedPlanForPause?.product}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 stroke-[2.5]" />
                Auto-Resume Deliveries On
              </label>
              <Input
                type="date"
                value={resumeDate}
                onChange={(e) => setResumeDate(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPauseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="terracotta"
              onClick={handleConfirmPause}
            >
              Confirm Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
