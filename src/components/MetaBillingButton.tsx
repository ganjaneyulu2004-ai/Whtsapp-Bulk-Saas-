"use client";

import React from "react";
import { CreditCard, ExternalLink, AlertCircle } from "lucide-react";
import { buildMetaBillingUrl, getMetaBillingNotes } from "@/lib/meta-billing";

export interface MetaBillingButtonProps {
  wabaId?: string | null;
  ownerBusinessId?: string | null;
  ownerBusinessName?: string | null;
  wabaName?: string | null;
  verifiedName?: string | null;
  businessName?: string | null;
  className?: string;
  buttonClassName?: string;
  showNotesBelow?: boolean;
  compact?: boolean;
}

export function MetaBillingButton({
  wabaId,
  ownerBusinessId,
  ownerBusinessName,
  wabaName,
  verifiedName,
  businessName,
  className = "",
  buttonClassName = "",
  showNotesBelow = true,
  compact = false,
}: MetaBillingButtonProps) {
  const billingUrl = buildMetaBillingUrl({ ownerBusinessId, wabaId });
  const { wabaName: resolvedWabaName, primaryNote, selectorNote } = getMetaBillingNotes({
    ownerBusinessId,
    ownerBusinessName,
    wabaName,
    verifiedName,
    businessName,
  });

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <a
        href={billingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={
          buttonClassName ||
          "px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-heading font-bold text-xs shadow-xs transition-all shrink-0 inline-flex items-center justify-center gap-2 cursor-pointer"
        }
      >
        <CreditCard className="w-3.5 h-3.5 shrink-0" />
        <span>Add card to this WhatsApp account</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>

      {showNotesBelow && (
        <div className="space-y-0.5 text-[11px] leading-tight">
          <p className="text-slate-600 font-medium">
            Add the card under <strong className="text-slate-900 font-semibold">Messaging accounts → {resolvedWabaName}</strong>, <span className="text-rose-600 font-semibold">NOT under Ad accounts</span>.
          </p>
          {selectorNote && (
            <p className="text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-md px-2 py-1 text-[10px] flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 text-amber-700 shrink-0" />
              <span>{selectorNote}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

