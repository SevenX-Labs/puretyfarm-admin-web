"use client";

import React, { useState, useMemo } from "react";
import { Customer } from "@/types";
import { MOCK_CUSTOMERS, RAIPUR_AREAS } from "@/lib/mock-data";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, ChevronRight, AlertTriangle, Plus, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState<string>("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const query = search.toLowerCase();
      const matchesSearch =
        customer.name.toLowerCase().includes(query) ||
        customer.phone.includes(query) ||
        customer.address.toLowerCase().includes(query) ||
        customer.area.toLowerCase().includes(query);

      const matchesArea =
        selectedArea === "ALL" || customer.area === selectedArea;

      return matchesSearch && matchesArea;
    });
  }, [customers, search, selectedArea]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            Customers Directory
          </h1>
          <p className="text-xs font-medium text-stone-600">
            Profiles, addresses, subscription frequencies, and prepaid balances across Raipur.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            const newId = `CUST-${1000 + customers.length + 1}`;
            const newCustomer: Customer = {
              id: newId,
              name: "New Household",
              phone: "+91 98260 00000",
              area: "Shankar Nagar",
              address: "Sector 2, Shankar Nagar, Raipur",
              walletBalance: 500,
              planType: "Daily",
              planStatus: "Active",
              buyOnceLimitOverride: 1000,
              bottleDepositCount: 2,
              activeSince: "2026-10-04",
            };
            setCustomers([newCustomer, ...customers]);
            setSelectedCustomer(newCustomer);
            setIsDetailOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Add Customer
        </Button>
      </div>

      {/* Search & Area Filter Bar */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black stroke-[2.5]" />
            <Input
              placeholder="Search by customer name, phone, or Raipur colony..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="ALL">All Raipur Areas</option>
              {RAIPUR_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#4A1513] text-[#FFDF58] uppercase text-[10px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3 px-5 border-r-2 border-black">Customer Name</th>
                <th className="py-3 px-5 border-r-2 border-black">Phone Number</th>
                <th className="py-3 px-5 border-r-2 border-black">Raipur Locality</th>
                <th className="py-3 px-5 border-r-2 border-black">Current Plan</th>
                <th className="py-3 px-5 border-r-2 border-black">Wallet Balance</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-white">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center font-bold text-xs uppercase text-stone-500">
                    No customers match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isLow = customer.walletBalance < 100;
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="hover:bg-[#FFF9D2] transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-5 border-r-2 border-black">
                        <div className="font-extrabold text-black group-hover:underline">
                          {customer.name}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-stone-600">
                          {customer.id}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-5 border-r-2 border-black font-mono font-bold text-xs text-black">
                        {customer.phone}
                      </td>

                      {/* Area */}
                      <td className="py-3.5 px-5 border-r-2 border-black font-bold text-xs text-black">
                        {customer.area}
                      </td>

                      {/* Current Plan */}
                      <td className="py-3.5 px-5 border-r-2 border-black">
                        <Badge
                          variant={
                            customer.planType === "7-Day Trial"
                              ? "lavender"
                              : customer.planStatus === "Active"
                              ? "mint"
                              : "stone"
                          }
                          className="text-[10px]"
                        >
                          {customer.planType}
                        </Badge>
                      </td>

                      {/* Wallet Balance (red if < ₹100) */}
                      <td className="py-3.5 px-5 border-r-2 border-black">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono tabular-nums font-black text-sm ${
                              isLow
                                ? "bg-[#FF8E72] px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_#000000]"
                                : "text-black"
                            }`}
                          >
                            {formatCurrency(customer.walletBalance)}
                          </span>
                          {isLow && (
                            <span title="Low balance (< ₹100)">
                              <AlertTriangle className="h-4 w-4 stroke-[3] text-black" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          className="border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-tight text-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FFDF58] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all inline-flex items-center gap-1"
                        >
                          Manage
                          <ChevronRight className="h-3 w-3 stroke-[3]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#FBF8EE] border-t-2 border-black text-xs font-black text-black flex items-center justify-between px-5">
          <span>
            Total: <strong className="font-mono">{filteredCustomers.length}</strong> active profiles
          </span>
          <span className="font-mono text-stone-600">
            Balances &lt; ₹100 flagged in terracotta
          </span>
        </div>
      </div>

      {/* Detail Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdateCustomer={handleUpdateCustomer}
      />
    </div>
  );
}
