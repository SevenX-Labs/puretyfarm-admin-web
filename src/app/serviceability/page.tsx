"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, CheckCircle2 } from "lucide-react";

interface AreaZone {
  id: string;
  name: string;
  pincode: string;
  activeCustomers: number;
  enabled: boolean;
}

const INITIAL_ZONES: AreaZone[] = [
  { id: "1", name: "Shankar Nagar", pincode: "492007", activeCustomers: 42, enabled: true },
  { id: "2", name: "Telibandha", pincode: "492006", activeCustomers: 36, enabled: true },
  { id: "3", name: "Samta Colony", pincode: "492001", activeCustomers: 38, enabled: true },
  { id: "4", name: "Civil Lines", pincode: "492001", activeCustomers: 31, enabled: true },
  { id: "5", name: "Devendra Nagar", pincode: "492004", activeCustomers: 29, enabled: true },
  { id: "6", name: "Pandri", pincode: "492004", activeCustomers: 28, enabled: true },
  { id: "7", name: "VIP Road", pincode: "492015", activeCustomers: 22, enabled: true },
  { id: "8", name: "Tatibandh", pincode: "492099", activeCustomers: 19, enabled: true },
  { id: "9", name: "Pachpedi Naka", pincode: "492001", activeCustomers: 18, enabled: false },
];

export default function ServiceabilityPage() {
  const [zones, setZones] = useState<AreaZone[]>(INITIAL_ZONES);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeCount = zones.filter((z) => z.enabled).length;

  const handleToggleZone = (id: string) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id === id) {
          const nextState = !z.enabled;
          setToastMessage(
            `${z.name} delivery service is now ${nextState ? "Enabled" : "Suspended"}.`
          );
          setTimeout(() => setToastMessage(null), 3000);
          return { ...z, enabled: nextState };
        }
        return z;
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Serviceability
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Active early morning doorstep delivery coverage across Raipur, Chhattisgarh.
          </p>
        </div>

        <Badge variant="sage" className="text-xs self-start sm:self-auto py-1 px-3">
          {activeCount} of {zones.length} Zones Active
        </Badge>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs text-emerald-800 border border-emerald-200/60 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid of clean cards for Raipur localities */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <Card
            key={zone.id}
            className={`p-6 transition-all ${
              zone.enabled ? "" : "opacity-75 bg-stone-50/60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#133826]" />
                  <h2 className="text-base font-semibold text-stone-900">
                    {zone.name}
                  </h2>
                </div>
                <div className="text-xs text-stone-400 font-mono mt-1">
                  PIN {zone.pincode} • Raipur
                </div>
              </div>

              {/* Clean Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={zone.enabled}
                onClick={() => handleToggleZone(zone.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  zone.enabled ? "bg-[#133826]" : "bg-stone-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    zone.enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-stone-400" />
                <strong className="text-stone-800 font-mono tabular-nums">
                  {zone.activeCustomers}
                </strong>{" "}
                subscribers
              </span>

              <Badge
                variant={zone.enabled ? "sage" : "stone"}
                className="text-[10px]"
              >
                {zone.enabled ? "Deliveries Active" : "Suspended"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
