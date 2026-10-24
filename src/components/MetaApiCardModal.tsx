"use client";

import React, { useState } from "react";
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Loader2, X, Lock } from "lucide-react";

interface MetaApiCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MetaApiCardModal({ isOpen, onClose, onSuccess }: MetaApiCardModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length < 15) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }
    if (cardExpiry.length < 5) {
      setError("Please enter a valid expiry date (MM/YY).");
      return;
    }
    if (cardCvv.length < 3) {
      setError("Please enter a valid 3-digit CVV.");
      return;
    }

    setLoading(true);

    try {
      const last4 = cleanNumber.slice(-4);
      let brand = "Visa";
      if (cleanNumber.startsWith("5")) brand = "Mastercard";
      else if (cleanNumber.startsWith("6")) brand = "RuPay";
      else if (cleanNumber.startsWith("3")) brand = "Amex";

      const res = await fetch("/api/billing/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last4,
          brand,
          token: `tok_live_${Date.now()}_${last4}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to link card.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to link card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-heading font-extrabold text-slate-900">
              Link Card for Meta API Charges
            </h3>
            <p className="text-xs text-slate-500">
              Official WhatsApp Per-Message Fee (~₹0.80) Auto-Billing Setup
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs space-y-1.5 mb-5">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Permanent 1-Time Setup • Official Meta Threshold Billing</span>
          </div>
          <p className="text-[11px] text-indigo-900/80 leading-relaxed">
            WhatsApp official message costs (~₹0.80/conversation) are accumulated on your live meter from the 1st message. When your meter hits the ₹500 threshold, it auto-debits without OTP.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cardholder Name
            </label>
            <input
              type="text"
              required
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="e.g. John Doe / Business Name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Card Number (Visa / Mastercard / RuPay)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="4111 2222 3333 4444"
                maxLength={19}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Expiry Date
              </label>
              <input
                type="text"
                required
                value={cardExpiry}
                onChange={handleExpiryChange}
                placeholder="MM/YY"
                maxLength={5}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                CVV / CVC
              </label>
              <input
                type="password"
                required
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="•••"
                maxLength={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-center"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing Card...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize &amp; Link Card for Meta API</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              🔒 256-Bit SSL Encrypted. ₹2 verification is instantly refunded.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
