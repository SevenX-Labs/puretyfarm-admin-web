"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, IndianRupee, Users, CheckCircle2, Save, ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ChangePasswordModal } from "@/components/settings/change-password-modal";

export default function SettingsPage() {
  const { admin } = useAuth();

  // 1. Product Pricing
  const [milk1L, setMilk1L] = useState(90);
  const [milk500ml, setMilk500ml] = useState(50);
  const [ghee1L, setGhee1L] = useState(1850);
  const [paneerKg, setPaneerKg] = useState(480);

  // 2. Cutoff Time
  const [cutoffTime, setCutoffTime] = useState("22:00");

  // 3. Staff Access
  const [staff] = useState([
    { name: "Amit Sharma", email: "amit@puretyfarm.com", role: "Owner" },
    { name: "Pooja Verma", email: "pooja@puretyfarm.com", role: "Staff" },
    { name: "Vikram Dewangan", email: "vikram@puretyfarm.com", role: "Staff" },
  ]);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice("OPERATIONAL SETTINGS SAVED & LOCKED FOR RAIPUR DISPATCH.");
    setTimeout(() => setSavedNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-2 border-black bg-white p-5 shadow-[4px_4px_0px_0px_#000000]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold uppercase tracking-tight text-black">
              System Settings & Config
            </h1>
            <span className="bg-[#FFDF58] border-2 border-black font-mono text-[10px] font-black uppercase px-2 py-0.5 shadow-[2px_2px_0px_0px_#000000]">
              ADMIN CONTROL
            </span>
          </div>
          <p className="text-xs font-bold text-black/70 mt-1">
            Default retail pricing, 10:00 PM nightly cutoff schedule, and staff permissions.
          </p>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 bg-[#B8E8B8] border-2 border-black px-4 py-2 text-xs font-black text-black shadow-[3px_3px_0px_0px_#000000] animate-bounce">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-black stroke-[2.5]" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Product Pricing */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FFDF58] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                <IndianRupee className="h-4 w-4 text-black stroke-[2.5]" />
              </div>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-black">
                Product Retail Pricing
              </h2>
            </div>
            <Badge variant="mint" className="text-[10px]">
              Active Rates
            </Badge>
          </div>
          <p className="text-xs font-bold text-black/70 mb-5">
            Set standard retail pricing for daily automated subscriptions and manual on-demand orders in Raipur.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-2 border-black p-4 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-2">
              <label className="text-xs font-black uppercase tracking-tight text-black block">
                A2 Desi Cow Milk (1L)
              </label>
              <div className="text-[11px] font-bold text-black/60">Glass Bottle • Cold Chain</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-black">₹</span>
                <Input
                  type="number"
                  value={milk1L}
                  onChange={(e) => setMilk1L(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm h-10 bg-white"
                />
              </div>
            </div>

            <div className="border-2 border-black p-4 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-2">
              <label className="text-xs font-black uppercase tracking-tight text-black block">
                A2 Desi Cow Milk (500ml)
              </label>
              <div className="text-[11px] font-bold text-black/60">Glass Bottle • Half Liter</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-black">₹</span>
                <Input
                  type="number"
                  value={milk500ml}
                  onChange={(e) => setMilk500ml(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm h-10 bg-white"
                />
              </div>
            </div>

            <div className="border-2 border-black p-4 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-2">
              <label className="text-xs font-black uppercase tracking-tight text-black block">
                A2 Vedic Bilona Ghee (1L)
              </label>
              <div className="text-[11px] font-bold text-black/60">Curd Churned • Glass Jar</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-black">₹</span>
                <Input
                  type="number"
                  value={ghee1L}
                  onChange={(e) => setGhee1L(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm h-10 bg-white"
                />
              </div>
            </div>

            <div className="border-2 border-black p-4 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-2">
              <label className="text-xs font-black uppercase tracking-tight text-black block">
                Fresh A2 Malai Paneer (1kg)
              </label>
              <div className="text-[11px] font-bold text-black/60">Made to Order • Per Kg</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-black">₹</span>
                <Input
                  type="number"
                  value={paneerKg}
                  onChange={(e) => setPaneerKg(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm h-10 bg-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Nightly Cutoff Time */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FF8E72] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                <Clock className="h-4 w-4 text-black stroke-[2.5]" />
              </div>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-black">
                Nightly Batch Cutoff Schedule
              </h2>
            </div>
            <Badge variant="terracotta" className="text-[10px]">
              Critical SLA
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="border-2 border-black p-5 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-3">
              <label className="text-xs font-black uppercase tracking-tight text-black block">
                Raipur Evening Cutoff Time
              </label>
              <Input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="font-mono font-black text-base bg-white h-11"
              />
              <p className="text-xs font-bold text-black/70 leading-relaxed">
                At this precise time, customer pause/unpause modifications lock, wallet balances are debited, and route dispatch sheets are locked for morning delivery.
              </p>
            </div>

            <div className="border-2 border-black p-5 bg-[#FFDF58] shadow-[3px_3px_0px_0px_#000000] space-y-3">
              <div className="flex items-center gap-2 font-black uppercase text-xs tracking-tight text-black">
                <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                Next Morning SLA Rules
              </div>
              <ul className="text-xs font-bold text-black space-y-2 list-disc list-inside">
                <li>Raipur Morning Delivery window: <strong>06:00 AM – 09:00 AM</strong></li>
                <li>Riders dispatched by <strong>05:30 AM</strong> from puretyfarm sorting hub</li>
                <li>Low-balance wallets (&lt; ₹100) are flagged and excluded from the run</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Section 3: Staff Access */}
        <Card className="overflow-hidden p-0">
          <div className="p-5 border-b-2 border-black bg-[#FFFDF7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#D8CEF6] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                <Users className="h-4 w-4 text-black stroke-[2.5]" />
              </div>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-black">
                Staff & Operator Permissions
              </h2>
            </div>
            <div className="text-xs font-mono font-bold text-black">
              3 ACTIVE USERS
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FFDF58] text-black uppercase font-black text-xs border-b-2 border-black">
                <tr>
                  <th className="py-3 px-6">Name</th>
                  <th className="py-3 px-6">Email Address</th>
                  <th className="py-3 px-6 text-right">System Role</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black bg-white">
                {staff.map((member) => (
                  <tr key={member.email} className="hover:bg-[#FFF9D2] transition-colors">
                    <td className="py-4 px-6 font-extrabold text-black text-xs uppercase">
                      {member.name}
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-xs text-black">
                      {member.email}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Badge
                        variant={member.role === "Owner" ? "mint" : "lavender"}
                        className="text-xs"
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

        {/* Section 4: Admin Security & Credentials */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FFDF58] border-2 border-black shadow-[2px_2px_0px_0px_#000000]">
                <KeyRound className="h-4 w-4 text-black stroke-[2.5]" />
              </div>
              <h2 className="text-base font-extrabold uppercase tracking-tight text-black">
                Admin Security & Credentials
              </h2>
            </div>
            <Badge variant="mint" className="text-[10px]">
              Edge Protected
            </Badge>
          </div>

          <p className="text-xs font-bold text-black/70 mb-5">
            Manage master administrator credentials, session authentication, and access keys for Raipur operations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* Authenticated Account Info */}
            <div className="border-2 border-black p-4 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-2">
              <span className="text-[10px] font-black uppercase text-stone-500 block">
                Authenticated Account
              </span>
              <div className="font-mono font-bold text-sm text-black break-all">
                {admin?.email || "admin@puretyfarm.com"}
              </div>
              <div className="inline-block bg-[#FFDF58] border-2 border-black px-2 py-0.5 font-mono text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                ROLE: {admin?.role || "ADMIN"}
              </div>
            </div>

            {/* Session Security Details */}
            <div className="border-2 border-black p-4 bg-[#FFFDF7] shadow-[3px_3px_0px_0px_#000000] space-y-2">
              <span className="text-[10px] font-black uppercase text-stone-500 block">
                Session Encryption
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#133826] inline-block animate-pulse" />
                <span className="font-mono text-xs font-bold text-black uppercase">
                  JWT Bearer Token Active
                </span>
              </div>
              <p className="text-[11px] font-bold text-black/60">
                Guarded via Next.js Edge Middleware route verification.
              </p>
            </div>

            {/* Change Password CTA */}
            <div className="border-2 border-black p-4 bg-[#FBF8EE] shadow-[3px_3px_0px_0px_#000000] flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase text-stone-500 block mb-1">
                  Master Password
                </span>
                <p className="text-[11px] font-bold text-black/70">
                  Update your console master login credentials securely.
                </p>
              </div>

              <ChangePasswordModal
                trigger={
                  <Button
                    type="button"
                    variant="default"
                    className="w-full bg-[#FFDF58] hover:bg-[#FFD13B] text-black font-extrabold uppercase text-xs h-10 gap-2 border-2 border-black shadow-[3px_3px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
                  >
                    <KeyRound className="h-4 w-4 stroke-[2.5]" />
                    Change Admin Password
                  </Button>
                }
              />
            </div>
          </div>
        </Card>


        {/* Save CTA */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            className="bg-[#FFDF58] hover:bg-[#FFD13B] text-black font-extrabold uppercase text-xs h-11 px-7 gap-2 border-2 border-black shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all cursor-pointer"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            Save Operations Config
          </Button>
        </div>
      </form>
    </div>
  );
}
