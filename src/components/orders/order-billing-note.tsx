import React from "react";
import { AdminOrder } from "@/types/order";
import { formatDate, formatPaise } from "@/lib/utils";

/**
 * One-line wallet billing summary for a per-delivery order: what it is expected
 * to cost, whether it has been charged, when it was delivered, and the
 * customer's wallet balance. Renders nothing for prepaid plans and standalone
 * orders, which are not billed per delivery.
 */
export function OrderBillingNote({
  order,
  className = "",
}: {
  order: AdminOrder;
  className?: string;
}) {
  if (order.billingModel !== "PER_DELIVERY") return null;

  const expectedPaise = order.expectedAmountPaise ?? order.totalPaise;
  const walletPaise = order.customer?.walletBalancePaise;
  const isSettled = order.settlementStatus === "SETTLED";
  const isOutstanding = order.settlementStatus === "OUTSTANDING";
  const isOpen = !isSettled && !isOutstanding;
  const isLive = !["CANCELLED", "FAILED"].includes(order.status);
  const shortBy =
    walletPaise != null ? Math.max(0, expectedPaise - walletPaise) : 0;

  return (
    <div className={`space-y-0.5 text-[10px] font-bold leading-tight ${className}`}>
      {isSettled && (
        <div className="text-[#2A7E3B]">
          Charged {formatPaise(order.chargedAmountPaise ?? expectedPaise)}
        </div>
      )}
      {isOutstanding && (
        <div className="text-[#D9381E]">
          Unpaid {formatPaise(expectedPaise)}
          {walletPaise != null && ` · short by ${formatPaise(shortBy)}`}
        </div>
      )}
      {isOpen && isLive && (
        <div className="text-[#5C5647]">
          Charges {formatPaise(expectedPaise)} on delivery
        </div>
      )}
      {order.deliveredAt && (
        <div className="font-mono text-[#5C5647]">
          Delivered {formatDate(order.deliveredAt)}
        </div>
      )}
      {walletPaise != null && !isSettled && isLive && (
        <div
          className={`font-mono ${
            walletPaise < expectedPaise ? "text-[#D9381E]" : "text-[#5C5647]"
          }`}
        >
          Wallet {formatPaise(walletPaise)}
        </div>
      )}
    </div>
  );
}
