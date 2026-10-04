"use client";

import React, { useState, useMemo } from "react";
import { OrderItem, RaipurZone } from "@/types";
import { MOCK_ORDERS, RAIPUR_AREAS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>(MOCK_ORDERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New order form fields
  const [newCustomer, setNewCustomer] = useState("");
  const [newPhone, setNewPhone] = useState("+91 ");
  const [newArea, setNewArea] = useState<RaipurZone>("Shankar Nagar");
  const [newAddress, setNewAddress] = useState("");
  const [newProduct, setNewProduct] = useState("2L A2 Desi Gir Cow Milk");
  const [newAmount, setNewAmount] = useState(180);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = search.toLowerCase();
      const matchesSearch =
        order.customerName.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.phone.includes(q) ||
        order.address.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter === "Pending") matchesStatus = order.status === "Pending";
      else if (statusFilter === "Delivered") matchesStatus = order.status === "Delivered";
      else if (statusFilter === "Skipped") matchesStatus = order.status === "Skipped";

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const handleMarkDelivered = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Delivered" } : o))
    );
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "Skipped", deliveryNotes: "Cancelled by admin" } : o))
    );
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.trim()) return;

    const newOrder: OrderItem = {
      id: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newCustomer.trim(),
      phone: newPhone.trim(),
      area: newArea,
      address: newAddress.trim() || `${newArea}, Raipur`,
      product: newProduct,
      quantity: newProduct.includes("2L") ? "2 Liters (Glass Bottles)" : "1 Unit",
      type: "Buy Once",
      status: "Pending",
      riderId: null,
      riderName: null,
      deliveryNotes: "Manual phone order placed by admin",
      amount: Number(newAmount),
    };

    setOrders([newOrder, ...orders]);
    setIsModalOpen(false);

    // Reset
    setNewCustomer("");
    setNewPhone("+91 ");
    setNewAddress("");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-black">
            Orders & Dispatches
          </h1>
          <p className="text-xs font-medium text-stone-600">
            Subscription auto-orders vs one-time artisanal ghee & dairy orders in Raipur.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Create Manual Order
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "All", label: "All Orders" },
              { id: "Pending", label: "Pending" },
              { id: "Delivered", label: "Delivered" },
              { id: "Skipped", label: "Skipped (Low Balance)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-tight transition-all ${
                  statusFilter === f.id
                    ? "bg-[#FFDF58] shadow-[2px_2px_0px_0px_#000000] translate-x-[-1px] translate-y-[-1px]"
                    : "bg-white hover:bg-stone-100 hover:shadow-[1px_1px_0px_0px_#000000]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-black stroke-[2.5]" />
            <Input
              placeholder="Search customer, ID, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#4A1513] text-[#FFDF58] uppercase text-[10px] font-black tracking-wider border-b-2 border-black">
              <tr>
                <th className="py-3 px-5 border-r-2 border-black">Order ID</th>
                <th className="py-3 px-5 border-r-2 border-black">Customer</th>
                <th className="py-3 px-5 border-r-2 border-black">Address & Area</th>
                <th className="py-3 px-5 border-r-2 border-black">Product & Qty</th>
                <th className="py-3 px-5 border-r-2 border-black text-center">Status</th>
                <th className="py-3 px-5 border-r-2 border-black text-right">Total</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center font-bold text-xs uppercase text-stone-500">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#FFF9D2] transition-colors">
                    {/* Order ID */}
                    <td className="py-3.5 px-5 border-r-2 border-black font-mono text-xs font-black text-black">
                      {order.id}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-5 border-r-2 border-black">
                      <div className="font-extrabold text-black">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-stone-600">
                        {order.phone}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-xs">
                      <div className="font-black text-black">{order.area}</div>
                      <div className="text-stone-600 truncate max-w-[200px]">{order.address}</div>
                    </td>

                    {/* Product */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-xs">
                      <span className="font-bold text-black block">
                        {order.product}
                      </span>
                      <span className="text-stone-600 text-[11px] font-mono block">
                        {order.quantity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-center">
                      {order.status === "Delivered" ? (
                        <span className="inline-block border-2 border-black bg-[#B8E8B8] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                          Delivered
                        </span>
                      ) : order.status === "Skipped" ? (
                        <span className="inline-block border-2 border-black bg-[#FF8E72] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                          Skipped (Low Balance)
                        </span>
                      ) : (
                        <span className="inline-block border-2 border-black bg-[#FFDF58] px-2 py-0.5 text-[10px] font-black uppercase text-black shadow-[1.5px_1.5px_0px_0px_#000000]">
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-5 border-r-2 border-black text-right font-mono tabular-nums font-black text-black text-sm">
                      {formatCurrency(order.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMarkDelivered(order.id)}
                              className="border-2 border-black bg-[#B8E8B8] px-2 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            >
                              Deliver
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order.id)}
                              className="border-2 border-black bg-[#FF8E72] px-2 py-1 text-[11px] font-black uppercase text-black shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {order.status === "Delivered" && (
                          <span className="font-mono text-xs font-black text-emerald-800 flex items-center justify-end gap-1">
                            <CheckCircle className="h-4 w-4 stroke-[3]" /> Done
                          </span>
                        )}
                        {order.status === "Skipped" && (
                          <span className="font-mono text-xs font-black text-[#FF8E72]">
                            Skipped
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#FBF8EE] border-t-2 border-black text-xs font-black text-black flex items-center justify-between px-5">
          <span>
            Total: <strong className="font-mono">{filteredOrders.length}</strong> orders
          </span>
          <span className="font-mono text-stone-600">
            Morning dispatch before 09:00 AM
          </span>
        </div>
      </div>

      {/* Manual Order Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-tight text-black">
              Create Manual Order
            </DialogTitle>
            <DialogDescription className="text-xs font-bold text-stone-600">
              Emergency phone or walk-in request.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black">
                Customer Name
              </label>
              <Input
                placeholder="e.g. Rahul Gupta"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black">
                  Phone Number
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black">
                  Raipur Area
                </label>
                <Select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value as RaipurZone)}
                >
                  {RAIPUR_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-black">
                Delivery Address
              </label>
              <Input
                placeholder="House, Street, Locality"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black">
                  Product
                </label>
                <Select
                  value={newProduct}
                  onChange={(e) => {
                    setNewProduct(e.target.value);
                    if (e.target.value.includes("2L")) setNewAmount(180);
                    else if (e.target.value.includes("Ghee")) setNewAmount(1850);
                    else if (e.target.value.includes("Paneer")) setNewAmount(240);
                  }}
                >
                  <option value="2L A2 Desi Gir Cow Milk">2L A2 Gir Cow Milk</option>
                  <option value="1L A2 Vedic Bilona Ghee">1L A2 Bilona Ghee</option>
                  <option value="500g Farm Fresh A2 Paneer">500g A2 Paneer</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase text-black">
                  Total (₹)
                </label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
