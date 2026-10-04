"use client";

import React, { useState, useMemo } from "react";
import { OrderItem, RaipurZone } from "@/types";
import { MOCK_ORDERS, RAIPUR_AREAS } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
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
  ShoppingBag,
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-stone-900">
            Orders
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage daily recurring subscription drops and manual one-time orders across Raipur.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs h-9 gap-1.5 shadow-2xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Manual Order
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center rounded-xl bg-stone-100/80 p-1 border border-stone-200/50">
            {[
              { id: "All", label: "All Orders" },
              { id: "Pending", label: "Pending" },
              { id: "Delivered", label: "Delivered" },
              { id: "Skipped", label: "Skipped (Low Balance)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f.id
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search by customer, ID, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-stone-50/50 border-stone-200"
            />
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/70 text-stone-500 uppercase text-[10px] font-semibold tracking-wider border-b border-stone-100">
              <tr>
                <th className="py-3.5 px-6">Order ID</th>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">Delivery Address</th>
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Total</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-stone-400 text-xs">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    {/* Order ID */}
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-stone-900">
                      {order.id}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-6">
                      <div className="font-medium text-stone-900">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-stone-400 font-mono mt-0.5">
                        {order.phone}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="py-4 px-6 text-xs text-stone-700 max-w-[220px]">
                      <div className="font-medium text-stone-800">{order.area}</div>
                      <div className="text-stone-500 truncate mt-0.5">{order.address}</div>
                    </td>

                    {/* Product */}
                    <td className="py-4 px-6 text-xs">
                      <span className="font-medium text-stone-900 block">
                        {order.product}
                      </span>
                      <span className="text-stone-500 text-[11px] block mt-0.5 font-mono">
                        {order.quantity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      {order.status === "Delivered" ? (
                        <Badge variant="sage" className="text-[11px]">
                          Delivered
                        </Badge>
                      ) : order.status === "Skipped" ? (
                        <Badge variant="rose" className="text-[11px]">
                          Skipped (Low Balance)
                        </Badge>
                      ) : (
                        <Badge variant="amber" className="text-[11px]">
                          Pending
                        </Badge>
                      )}
                    </td>

                    {/* Total */}
                    <td className="py-4 px-6 text-right font-mono tabular-nums font-semibold text-stone-900 text-xs">
                      {formatCurrency(order.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {order.status === "Pending" && (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleMarkDelivered(order.id)}
                              className="h-7 text-xs bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            >
                              Mark Delivered
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleCancelOrder(order.id)}
                              className="h-7 text-xs text-stone-500 hover:text-rose-600 hover:bg-rose-50"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {order.status === "Delivered" && (
                          <span className="text-xs text-stone-400 font-medium flex items-center justify-end gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            Completed
                          </span>
                        )}
                        {order.status === "Skipped" && (
                          <span className="text-xs text-stone-400 font-medium">
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

        <div className="p-4 bg-stone-50/50 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between px-6">
          <span>
            Showing <strong className="text-stone-800">{filteredOrders.length}</strong> orders
          </span>
          <span className="text-stone-400">
            Cutoff engine generates morning orders at 10:00 PM daily
          </span>
        </div>
      </Card>

      {/* Manual Order Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-stone-900">
              Create Manual Order
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Place an immediate delivery order for customer phone or walk-in requests.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-700">
                Customer Name
              </label>
              <Input
                placeholder="e.g. Rahul Gupta"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                required
                className="text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Phone Number
                </label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="font-mono text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Raipur Area
                </label>
                <Select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value as RaipurZone)}
                  className="text-xs bg-white"
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
              <label className="text-xs font-semibold text-stone-700">
                Delivery Address
              </label>
              <Input
                placeholder="House, Street, Locality"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
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
                  className="text-xs bg-white"
                >
                  <option value="2L A2 Desi Gir Cow Milk">2L A2 Gir Cow Milk</option>
                  <option value="1L A2 Vedic Bilona Ghee">1L A2 Bilona Ghee</option>
                  <option value="500g Farm Fresh A2 Paneer">500g A2 Paneer</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700">
                  Order Total (₹)
                </label>
                <Input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="font-mono tabular-nums text-xs bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#133826] hover:bg-[#1B4332] text-white text-xs font-medium"
              >
                Confirm Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
