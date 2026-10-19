"use client";

import { useState, useEffect } from "react";
import { Sparkles, Gift, CheckCircle2, Copy, Check, ArrowRight, X, Phone, Tag } from "lucide-react";
import { fireBrandConfetti } from "@/lib/confetti";
import { playCelebrationSound, playClickSound } from "@/lib/sounds";

interface InauguralOfferProps {
  onSuccess?: (coupon: string) => void;
}

export default function InauguralOfferBanner({ onSuccess }: InauguralOfferProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claimedCoupon, setClaimedCoupon] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ claimedCount: 74, remainingCount: 26 });

  // Fetch live claimed count
  useEffect(() => {
    fetch("/api/inaugural-offer")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.claimedCount) {
          setStats({
            claimedCount: data.claimedCount,
            remainingCount: data.remainingCount || 100 - data.claimedCount,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = mobile.replace(/[^0-9]/g, "");
    if (cleanMobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }

    playClickSound();
    setSubmitting(true);

    try {
      const res = await fetch("/api/inaugural-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: cleanMobile,
          name: businessName,
        }),
      });
      const data = await res.json();
      const code = data?.couponCode || `DASARA50-${cleanMobile.slice(-4)}`;
      setClaimedCoupon(code);
      fireBrandConfetti();
      playCelebrationSound();
      if (onSuccess) onSuccess(code);
    } catch {
      const code = `DASARA50-${cleanMobile.slice(-4)}`;
      setClaimedCoupon(code);
      fireBrandConfetti();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!claimedCoupon) return;
    navigator.clipboard.writeText(claimedCoupon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      {/* 1. Festive Header Ribbon / Banner */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-600/15 border border-amber-300/80 p-3 sm:p-4 shadow-sm relative overflow-hidden transition-all hover:border-amber-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shrink-0 shadow-xs shadow-amber-500/30">
              <Gift className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-950 font-heading flex items-center gap-1">
                  🪔 Dasara Inaugural Launch Offer
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-2xs animate-pulse">
                  FLAT 50% OFF
                </span>
              </div>
              <p className="text-[11px] text-slate-700 mt-0.5">
                First 100 Customers receive exclusive discount coupon codes!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300/60">
              🔥 Only {stats.remainingCount} Left!
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white text-xs font-bold font-heading shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Claim Coupon</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Modal for Coupon Claim */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 max-w-md w-full p-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setClaimedCoupon(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content inside modal */}
            {!claimedCoupon ? (
              <div>
                <div className="flex items-center gap-2 mb-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Inaugural Special Offer</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading mb-1.5">
                  Claim 50% Discount Coupon 🪔
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Reserved exclusively for the <strong>first 100 businesses</strong>. Enter your WhatsApp number to unlock your instant coupon code.
                </p>

                {/* Progress bar */}
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex justify-between text-[11px] font-semibold text-amber-900 mb-1.5">
                    <span>Coupons Claimed: {stats.claimedCount}/100</span>
                    <span className="text-rose-600 font-bold">{stats.remainingCount} Coupons Left!</span>
                  </div>
                  <div className="w-full bg-amber-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.claimedCount}%` }}
                    />
                  </div>
                </div>

                {/* Submission Form */}
                <form onSubmit={handleClaim} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      WhatsApp / Mobile Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4 text-brand-purple" />
                      </div>
                      <input
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="10-digit mobile number"
                        required
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Business or Shop Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sri Balaji Silks & Sarees"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <span>Generating Coupon...</span>
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        <span>Unlock My 50% Discount Coupon</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="text-[11px] text-center text-slate-400 mt-3">
                  🔒 No spam guaranteed. Coupon valid for all SaaS plans.
                </p>
              </div>
            ) : (
              /* Success Coupon Reveal */
              <div className="text-center py-2 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <h3 className="text-2xl font-extrabold text-slate-900 font-heading mb-1">
                  Coupon Claimed! 🎉
                </h3>
                <p className="text-xs text-slate-600 mb-4">
                  Congratulations! You are among the <strong>First 100 Inaugural Customers</strong>.
                </p>

                {/* Coupon Code Display Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-dashed border-amber-300 mb-4 text-center">
                  <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase block mb-1">
                    Your Exclusive Inaugural Code
                  </span>
                  <div className="text-2xl font-mono font-extrabold text-brand-purple tracking-wider flex items-center justify-center gap-2">
                    <Tag className="w-5 h-5 text-amber-600" />
                    <span>{claimedCoupon}</span>
                  </div>
                  <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                    FLAT 50% OFF ON ANY PLAN
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Coupon Code</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://wa.me/919390487233?text=${encodeURIComponent(
                      `Hello iBrainLabs, I claimed the Inaugural Dasara Coupon *${claimedCoupon}* for Flat 50% discount on OfferBlast SaaS. Please help me activate my subscription!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition block text-center"
                  >
                    <span>💬 Redeem via WhatsApp Sales</span>
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setClaimedCoupon(null);
                  }}
                  className="mt-4 text-xs font-medium text-slate-500 hover:text-slate-800 transition underline underline-offset-4 cursor-pointer"
                >
                  Continue to Login
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
