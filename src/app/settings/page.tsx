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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-2 border-[#1A1A1A] bg-white rounded-[14px] p-6 shadow-[5px_5px_0px_0px_#1A1A1A]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[30px] font-black uppercase tracking-tight text-[#1A1A1A] leading-tight">
              System Settings & Config
            </h1>
            <span className="bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[6px] font-mono text-[10px] font-black uppercase px-2.5 py-0.5 shadow-[2px_2px_0px_0px_#1A1A1A]">
              ADMIN CONTROL
            </span>
          </div>
          <p className="text-xs font-bold text-[#5C5647] mt-1">
            Default retail pricing, 10:00 PM nightly cutoff schedule, and staff permissions.
          </p>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 bg-[#B9E8B4] border-2 border-[#1A1A1A] rounded-[10px] px-4 py-2.5 text-xs font-black text-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1A1A1A] stroke-[2.5]" />
            <span>{savedNotice}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Product Pricing */}
        <Card className="p-6 rounded-[14px] border-2 border-[#1A1A1A] shadow-[5px_5px_0px_0px_#1A1A1A] bg-white">
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A]">
                <IndianRupee className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
              </div>
              <h2 className="text-[18px] font-black uppercase tracking-tight text-[#1A1A1A]">
                Product Retail Pricing
              </h2>
            </div>
            <Badge variant="mint" className="text-[10px]">
              Active Rates
            </Badge>
          </div>
          <p className="text-xs font-bold text-[#5C5647] mb-5">
            Set standard retail pricing for daily automated subscriptions and manual on-demand orders in Raipur.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                A2 Desi Cow Milk (1L)
              </label>
              <div className="text-[11px] font-bold text-[#5C5647]">Glass Bottle • Cold Chain</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-[#1A1A1A]">₹</span>
                <Input
                  type="number"
                  value={milk1L}
                  onChange={(e) => setMilk1L(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm bg-white"
                />
              </div>
            </div>

            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                A2 Desi Cow Milk (500ml)
              </label>
              <div className="text-[11px] font-bold text-[#5C5647]">Glass Bottle • Half Liter</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-[#1A1A1A]">₹</span>
                <Input
                  type="number"
                  value={milk500ml}
                  onChange={(e) => setMilk500ml(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm bg-white"
                />
              </div>
            </div>

            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                A2 Vedic Bilona Ghee (1L)
              </label>
              <div className="text-[11px] font-bold text-[#5C5647]">Curd Churned • Glass Jar</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-[#1A1A1A]">₹</span>
                <Input
                  type="number"
                  value={ghee1L}
                  onChange={(e) => setGhee1L(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm bg-white"
                />
              </div>
            </div>

            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                Fresh A2 Malai Paneer (1kg)
              </label>
              <div className="text-[11px] font-bold text-[#5C5647]">Made to Order • Per Kg</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-mono font-black text-base text-[#1A1A1A]">₹</span>
                <Input
                  type="number"
                  value={paneerKg}
                  onChange={(e) => setPaneerKg(Number(e.target.value))}
                  className="font-mono font-black tabular-nums text-sm bg-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Nightly Cutoff Time */}
        <Card className="p-6 rounded-[14px] border-2 border-[#1A1A1A] shadow-[5px_5px_0px_0px_#1A1A1A] bg-white">
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FFD9D0] border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A]">
                <Clock className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
              </div>
              <h2 className="text-[18px] font-black uppercase tracking-tight text-[#1A1A1A]">
                Nightly Batch Cutoff Schedule
              </h2>
            </div>
            <Badge variant="terracotta" className="text-[10px]">
              Critical SLA
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-5 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-3">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#1A1A1A] block">
                Raipur Evening Cutoff Time
              </label>
              <Input
                type="time"
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="font-mono font-black text-base bg-white"
              />
              <p className="text-xs font-bold text-[#5C5647] leading-relaxed">
                At this precise time, customer pause/unpause modifications lock, wallet balances are debited, and route dispatch sheets are locked for morning delivery.
              </p>
            </div>

            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-5 bg-[#FFD84D] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-3">
              <div className="flex items-center gap-2 font-black uppercase text-xs tracking-wider text-[#1A1A1A]">
                <ShieldCheck className="h-4 w-4 stroke-[2.5]" />
                Next Morning SLA Rules
              </div>
              <ul className="text-xs font-bold text-[#1A1A1A] space-y-2 list-disc list-inside">
                <li>Raipur Morning Delivery window: <strong>06:00 AM – 09:00 AM</strong></li>
                <li>Riders dispatched by <strong>05:30 AM</strong> from puretyfarm sorting hub</li>
                <li>Low-balance wallets (&lt; ₹100) are flagged and excluded from the run</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Section 3: Staff Access */}
        <Card className="overflow-hidden p-0 rounded-[14px] border-2 border-[#1A1A1A] shadow-[5px_5px_0px_0px_#1A1A1A] bg-white">
          <div className="p-5 border-b-2 border-[#1A1A1A] bg-[#FAF7EC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A]">
                <Users className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
              </div>
              <h2 className="text-[18px] font-black uppercase tracking-tight text-[#1A1A1A]">
                Staff & Operator Permissions
              </h2>
            </div>
            <div className="text-xs font-mono font-bold text-[#1A1A1A]">
              3 ACTIVE USERS
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-[#FAF7EC] text-[#1A1A1A] uppercase font-black text-[11px] tracking-wider border-b-2 border-[#1A1A1A]">
                <tr>
                  <th className="py-3.5 px-6 border-r-2 border-[#1A1A1A]">Name</th>
                  <th className="py-3.5 px-6 border-r-2 border-[#1A1A1A]">Email Address</th>
                  <th className="py-3.5 px-6 text-right">System Role</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#1A1A1A] bg-white">
                {staff.map((member) => (
                  <tr key={member.email} className="hover:bg-[#FAF7EC]/80 transition-colors">
                    <td className="py-3.5 px-6 border-r-2 border-[#1A1A1A] font-extrabold text-[#1A1A1A] text-xs uppercase">
                      {member.name}
                    </td>
                    <td className="py-3.5 px-6 border-r-2 border-[#1A1A1A] font-mono font-bold text-xs text-[#1A1A1A]">
                      {member.email}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Badge
                        variant={member.role === "Owner" ? "mint" : "stone"}
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
        <Card className="p-6 rounded-[14px] border-2 border-[#1A1A1A] shadow-[5px_5px_0px_0px_#1A1A1A] bg-white">
          <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[8px] shadow-[2px_2px_0px_0px_#1A1A1A]">
                <KeyRound className="h-4 w-4 text-[#1A1A1A] stroke-[2.5]" />
              </div>
              <h2 className="text-[18px] font-black uppercase tracking-tight text-[#1A1A1A]">
                Admin Security & Credentials
              </h2>
            </div>
            <Badge variant="mint" className="text-[10px]">
              Edge Protected
            </Badge>
          </div>

          <p className="text-xs font-bold text-[#5C5647] mb-5">
            Manage master administrator credentials, session authentication, and access keys for Raipur operations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* Authenticated Account Info */}
            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2">
              <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                Authenticated Account
              </span>
              <div className="font-mono font-bold text-sm text-[#1A1A1A] break-all">
                {admin?.email || "admin@puretyfarm.com"}
              </div>
              <div className="inline-block bg-[#FFD84D] border-2 border-[#1A1A1A] rounded-[6px] px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#1A1A1A]">
                ROLE: {admin?.role || "ADMIN"}
              </div>
            </div>

            {/* Session Security Details */}
            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] space-y-2">
              <span className="text-[10px] font-black uppercase text-[#5C5647] block">
                Session Encryption
              </span>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8FD694] border border-[#1A1A1A] inline-block animate-pulse" />
                <span className="font-mono text-xs font-bold text-[#1A1A1A] uppercase">
                  JWT Bearer Token Active
                </span>
              </div>
              <p className="text-[11px] font-bold text-[#5C5647]">
                Guarded via Next.js Edge Middleware route verification.
              </p>
            </div>

            {/* Change Password CTA */}
            <div className="rounded-[12px] border-2 border-[#1A1A1A] p-4 bg-[#FAF7EC] shadow-[3px_3px_0px_0px_#1A1A1A] flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#5C5647] block mb-1">
                  Master Password
                </span>
                <p className="text-[11px] font-bold text-[#5C5647]">
                  Update your console master login credentials securely.
                </p>
              </div>

              <ChangePasswordModal
                trigger={
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full gap-2"
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
            variant="primary"
            size="lg"
            className="gap-2"
          >
            <Save className="h-4 w-4 stroke-[2.5]" />
            Save Operations Config
          </Button>
        </div>
      </form>
    </div>
  );
}
