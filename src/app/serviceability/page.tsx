"use client";

import React, { useState } from "react";
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            Raipur Serviceability
          </h1>
          <p className="text-xs font-medium text-stone-600">
            Active early morning doorstep delivery coverage across Raipur, Chhattisgarh.
          </p>
        </div>

        <span className="bg-[#B8E8B8] border-2 border-black text-black px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000000]">
          {activeCount} of {zones.length} Zones Active
        </span>
      </div>

      {toastMessage && (
        <div className="flex items-center gap-2 border-2 border-black bg-[#B8E8B8] p-3 text-xs font-black text-black shadow-[3px_3px_0px_0px_#000000]">
          <CheckCircle2 className="h-4 w-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid of clean Neo-Brutalist cards for Raipur localities */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`border-2 border-black p-5 shadow-[4px_4px_0px_0px_#000000] transition-all ${
              zone.enabled ? "bg-white" : "bg-[#FBF8EE] opacity-80"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 stroke-[2.5]" />
                  <h2 className="text-base font-black uppercase tracking-tight text-black">
                    {zone.name}
                  </h2>
                </div>
                <div className="text-xs font-mono font-bold text-stone-600 mt-1">
                  PIN {zone.pincode} • Raipur
                </div>
              </div>

              {/* Neo-Brutalist Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={zone.enabled}
                onClick={() => handleToggleZone(zone.id)}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer border-2 border-black transition-colors duration-150 ease-in-out focus:outline-none shadow-[2px_2px_0px_0px_#000000] ${
                  zone.enabled ? "bg-[#FFDF58]" : "bg-stone-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform border-2 border-black bg-white transition duration-150 ease-in-out ${
                    zone.enabled ? "translate-x-6 bg-[#4A1513]" : "translate-x-0 bg-white"
                  }`}
                />
              </button>
            </div>

            <div className="mt-5 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-bold text-black">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 stroke-[2.5]" />
                <strong className="font-mono tabular-nums">
                  {zone.activeCustomers}
                </strong>{" "}
                subscribers
              </span>

              <span
                className={`border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000] ${
                  zone.enabled ? "bg-[#B8E8B8]" : "bg-[#FF8E72]"
                }`}
              >
                {zone.enabled ? "Active Drop" : "Suspended"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
