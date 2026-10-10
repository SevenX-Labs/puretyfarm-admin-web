"use client";

import React, { useState } from "react";
import {
  ChangeRequestItem,
  RequestType,
  ApproveRequestResult,
} from "@/types/plan-delivery";
import { approveChangeRequest } from "@/services/plan-delivery-service";
import { ApiError } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldAlert,
  User,
} from "lucide-react";

/**
 * What approving each request type does and does NOT do.
 *
 * Shown before confirmation so an admin is never led to believe a dependent
 * change (repricing, re-quoting, a new end date) was applied when it was not.
 */
const EFFECT_COPY: Record<RequestType, string> = {
  PAUSE:
    "Suspends the plan and skips its future scheduled deliveries. Their dispatch orders are cancelled, not deleted — invoices and payment records are kept.",
  RESUME:
    "Reactivates the plan, restores the deliveries this pause suspended, and rebuilds the cadence up to the existing end date. The end date is not extended.",
  CHANGE_QUANTITY:
    "Updates the plan quantity and every future scheduled delivery after today. Already-paid dispatch orders keep their original amount and invoice.",
  CHANGE_FREQUENCY:
    "Rebuilds the cadence from tomorrow to the existing end date. Delivered and skipped days are preserved; dropped days have their orders cancelled, not deleted.",
  CHANGE_PLAN:
    "Changes the plan type only. Pricing, billing duration, the end date and existing order and invoice snapshots are NOT recalculated.",
};

function ValueBlock({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta?: string;
  tone: "current" | "requested";
}) {
  return (
    <div
      className={`min-w-0 flex-1 rounded-[10px] border-2 border-black p-2.5 ${
        tone === "current" ? "bg-white" : "bg-[#FFDF58]"
      }`}
    >
      <span className="block text-[10px] font-black uppercase tracking-wider text-[#5C5647]">
        {label}
      </span>
      <span className="mt-0.5 block break-words font-mono text-xs font-black text-[#1A1A1A]">
        {value}
      </span>
      {meta && (
        <span className="mt-0.5 block break-words text-[10px] font-bold text-[#5C5647]">
          {meta}
        </span>
      )}
    </div>
  );
}

interface ApproveRequestModalProps {
  request: ChangeRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
  /** Pre-formatted current/requested summaries from the list's own formatter. */
  current: { main: string; meta?: string };
  requested: { main: string; meta?: string };
  onSuccess: (result: ApproveRequestResult, request: ChangeRequestItem) => void;
}

export function ApproveRequestModal({
  request,
  isOpen,
  onClose,
  current,
  requested,
  onSuccess,
}: ApproveRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // The endpoint is idempotent (409 on a second attempt), but a duplicate
    // in-flight request buys nothing and muddles the feedback.
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await approveChangeRequest(request.id);
      onSuccess(res, request);
      onClose();
    } catch (err: unknown) {
      console.error("Failed to approve change request", {
        requestId: request.id,
        requestType: request.requestType,
        statusCode: err instanceof ApiError ? err.statusCode : undefined,
        at: new Date().toISOString(),
      });
      setError(
        err instanceof Error ? err.message : "Failed to approve this request."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const effect = EFFECT_COPY[request.requestType];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000000] sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-[8px] border-2 border-black bg-[#B8E8B8] p-2 shadow-[2px_2px_0px_0px_#000000]">
              <CheckCircle2 className="h-5 w-5 stroke-[2.5] text-[#1A1A1A]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-[#1A1A1A]">
                Approve {request.requestType.replace(/_/g, " ")}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[#5C5647]">
                Review the change before it is applied
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-[8px] border-2 border-black bg-[#FFD9D0] p-3 text-xs font-black text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 stroke-[2.5]" />
              <span className="block leading-snug">{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-[10px] border-2 border-black bg-[#FAF7EC] p-2.5 shadow-[2px_2px_0px_0px_#000000]">
            <User className="h-3.5 w-3.5 shrink-0 stroke-[2.5] text-[#5C5647]" />
            <div className="min-w-0">
              <span className="block text-xs font-black text-[#1A1A1A]">
                {request.customer?.name || "Customer"}
              </span>
              <span className="block font-mono text-[10px] text-[#5C5647]">
                {request.customer?.mobile || "—"}
              </span>
            </div>
          </div>

          {/* Current vs requested */}
          <div className="flex items-stretch gap-2">
            <ValueBlock
              label="Current"
              value={current.main}
              meta={current.meta}
              tone="current"
            />
            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 stroke-[3] text-[#1A1A1A]" />
            </div>
            <ValueBlock
              label="Requested"
              value={requested.main}
              meta={requested.meta}
              tone="requested"
            />
          </div>

          {effect && (
            <div className="flex items-start gap-2 rounded-[10px] border-2 border-black bg-[#FFE58F] p-3 text-[11px] font-bold leading-snug text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#1A1A1A]" />
              <p>{effect}</p>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border-2 border-black bg-white px-3.5 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[2px_2px_0px_0px_#000000] hover:bg-[#FAF7EC] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-2 border-black bg-[#B8E8B8] px-4 py-2 text-xs font-black uppercase text-[#1A1A1A] shadow-[3px_3px_0px_0px_#000000] transition-all hover:bg-[#9fe09f] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin stroke-[2.5]" />
                  <span>Applying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                  <span>Confirm &amp; Apply</span>
                </>
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
