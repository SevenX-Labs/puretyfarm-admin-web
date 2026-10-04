"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, IndianRupee, Users, CheckCircle2, Save } from "lucide-react";

export default function SettingsPage() {
  // 1. Product Pricing
  const [milk1L, setMilk1L] = useState(90);
  const [milk500ml, setMilk500ml] = useState(50);
  const [ghee1L, setGhee1L] = useState(1850);
  const [paneerKg, setPaneerKg] = useState(480);

  // 2. Cutoff Time
  const [cutoffTime, setCutoffTime] = useState("22:00");

  // 3. Staff Access
  const [staff, setStaff] = useState([
    { name: "Amit Sharma", email: "amit@puretyfarm.com", role: "Owner" },
    { name: "Pooja Verma", email: "pooja@puretyfarm.com", role: "Staff" },
    { name: "Vikram Dewangan", email: "vikram@puretyfarm.com", role: "Staff" },
  ]);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice("Operational settings successfully updated.");
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Settings
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Default retail pricing, 10:00 PM cutoff time, and team access permissions.
          </p>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 border border-emerald-200/60 shadow-2xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Product Pricing */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-base mb-1">
            <IndianRupee className="h-4 w-4 text-[#133826]" />
            <h2>Product Pricing</h2>
          </div>
          <p className="text-xs text-stone-500 mb-5">
            Set standard retail pricing for daily subscriptions and one-time orders in Raipur.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-stone-200/70 p-4 bg-stone-50/40 space-y-1.5">
              <label className="text-xs font-medium text-stone-700 block">
                A2 Cow Milk (1L Glass Bottle)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-stone-500">₹</span>
                <Input
                  type="number"
                  value={milk1L}
                  onChange={(e) => setMilk1L(Number(e.target.value))}
                  className="font-mono tabular-nums text-xs h-9 bg-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-stone-200/70 p-4 bg-stone-50/40 space-y-1.5">
              <label className="text-xs font-medium text-stone-700 block">
                A2 Cow Milk (500ml Bottle)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-stone-500">₹</span>
                <Input
                  type="number"
                  value={milk500ml}
                  onChange={(e) => setMilk500ml(Number(e.target.value))}
                  className="font-mono tabular-nums text-xs h-9 bg-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-stone-200/70 p-4 bg-stone-50/40 space-y-1.5">
              <label className="text-xs font-medium text-stone-700 block">
                A2 Vedic Bilona Ghee (1L Jar)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-stone-500">₹</span>
                <Input
                  type="number"
                  value={ghee1L}
                  onChange={(e) => setGhee1L(Number(e.target.value))}
                  className="font-mono tabular-nums text-xs h-9 bg-white"
                />
              </div>
            </div>

            <div className="rounded-xl border border-stone-200/70 p-4 bg-stone-50/40 space-y-1.5">
              <label className="text-xs font-medium text-stone-700 block">
                Farm Fresh A2 Paneer (per kg)
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-stone-500">₹</span>
                <Input
                  type="number"
                  value={paneerKg}
                  onChange={(e) => setPaneerKg(Number(e.target.value))}
                  className="font-mono tabular-nums text-xs h-9 bg-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Nightly Cutoff Time */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-base mb-1">
            <Clock className="h-4 w-4 text-[#133826]" />
            <h2>Nightly Cutoff Time</h2>
          </div>
          <p className="text-xs text-stone-500 mb-5">
            The deadline when active subscriptions are locked and auto-debited for next morning&apos;s deliveries.
          </p>

          <div className="max-w-xs space-y-1.5">
            <label className="text-xs font-medium text-stone-700 block">
              Cutoff Time (Default 10:00 PM)
            </label>
            <Input
              type="time"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              className="font-mono text-sm bg-white h-9"
            />
            <span className="text-[11px] text-stone-400 block mt-1">
              Deliveries before 09:00 AM are prepared following this cutoff.
            </span>
          </div>
        </Card>

        {/* Section 3: Staff Access */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-base mb-1">
              <Users className="h-4 w-4 text-[#133826]" />
              <h2>Staff Access</h2>
            </div>
            <p className="text-xs text-stone-500">
              Team members with administrative access to the Raipur farm dashboard.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50/70 text-stone-500 uppercase text-[10px] font-semibold tracking-wider border-b border-stone-100">
                <tr>
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6 text-right">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {staff.map((member) => (
                  <tr key={member.email}>
                    <td className="py-3.5 px-6 font-medium text-stone-900 text-xs">
                      {member.name}
                    </td>
                    <td className="py-3.5 px-6 font-mono text-xs text-stone-600">
                      {member.email}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Badge
                        variant={member.role === "Owner" ? "default" : "stone"}
                        className="text-[11px]"
                      >
                        {member.role}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs font-medium h-9 px-5 gap-1.5 shadow-2xs"
          >
            <Save className="h-3.5 w-3.5" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
