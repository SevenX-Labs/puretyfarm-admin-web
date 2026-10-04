"use client";

import React, { useState, useMemo } from "react";
import { Customer, RaipurZone } from "@/types";
import { MOCK_CUSTOMERS, RAIPUR_AREAS } from "@/lib/mock-data";
import { CustomerDetailSheet } from "@/components/customers/customer-detail-sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search, ChevronRight, AlertCircle, Plus } from "lucide-react";
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Customers
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Customer profiles, delivery addresses, subscription plans, and prepaid wallet balances.
          </p>
        </div>

        <Button
          size="sm"
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
          className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs h-9 gap-1.5 shadow-2xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Customer
        </Button>
      </div>

      {/* Search & Area Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search by customer name, phone, or Raipur colony..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-stone-50/50 border-stone-200"
            />
          </div>

          <div className="w-full sm:w-52">
            <Select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="text-xs h-9 bg-stone-50/50 border-stone-200"
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
      </Card>

      {/* Customers Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/70 text-stone-500 uppercase text-[10px] font-semibold tracking-wider border-b border-stone-100">
              <tr>
                <th className="py-3.5 px-6">Customer Name</th>
                <th className="py-3.5 px-6">Phone</th>
                <th className="py-3.5 px-6">Area</th>
                <th className="py-3.5 px-6">Current Plan</th>
                <th className="py-3.5 px-6">Wallet Balance</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-400 text-xs">
                    No customers match your search query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const isLow = customer.walletBalance < 100;
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="hover:bg-stone-50/60 transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="py-4 px-6">
                        <div className="font-medium text-stone-900 group-hover:text-[#133826]">
                          {customer.name}
                        </div>
                        <div className="text-xs text-stone-400 font-mono mt-0.5">
                          {customer.id}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-6 font-mono text-xs text-stone-600">
                        {customer.phone}
                      </td>

                      {/* Area */}
                      <td className="py-4 px-6 text-stone-700 text-xs">
                        {customer.area}
                      </td>

                      {/* Current Plan */}
                      <td className="py-4 px-6">
                        <Badge
                          variant={customer.planStatus === "Active" ? "sage" : "stone"}
                          className="text-[11px]"
                        >
                          {customer.planType} ({customer.planStatus})
                        </Badge>
                      </td>

                      {/* Wallet Balance (highlighted in red if < ₹100) */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono tabular-nums font-semibold text-sm ${
                              isLow ? "text-rose-600" : "text-stone-900"
                            }`}
                          >
                            {formatCurrency(customer.walletBalance)}
                          </span>
                          {isLow && (
                            <span
                              title="Low balance alert (< ₹100)"
                              className="text-rose-600"
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-stone-600 group-hover:text-[#133826] text-xs font-medium"
                        >
                          Manage
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between px-6">
          <span>
            Total: <strong className="text-stone-800">{filteredCustomers.length}</strong> customers
          </span>
          <span className="text-stone-400">
            Balances below ₹100 flagged in red for automated SMS reminder
          </span>
        </div>
      </Card>

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
