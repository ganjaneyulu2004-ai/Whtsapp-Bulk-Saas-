"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fireBrandConfetti } from "@/lib/confetti";
import { 
  Clock, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function PaymentPendingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [activated, setActivated] = useState(false);

  const checkStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/subscription/status");
      const data = await res.json();
      setStatusData(data);

      if (data?.status === "ACTIVE") {
        setActivated(true);
        fireBrandConfetti();
        setTimeout(() => {
          router.replace("/");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Auto-check every 30 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const sub = statusData?.subscription;
  const isRejected = statusData?.status === "REJECTED";

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6 circuit-svg-bg">
      {/* Activated Celebration Overlay */}
      {activated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-purple/20 backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="bg-white border-2 border-brand-soft shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-brand-purple to-emerald-500 flex items-center justify-center text-white mb-5 shadow-lg shadow-emerald-500/20 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-heading font-extrabold text-brand-purple mb-2">
              Your account is active 🎉
            </h2>
            <p className="text-slate-muted text-sm font-medium">
              Payment approved! Launching your iBrainLabs dashboard...
            </p>
          </div>
        </div>
      )}

      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 border border-brand-soft shadow-card relative">
        {/* Brand Logo */}
        <div className="text-center mb-6">
          <div className="inline-block bg-brand-light p-3.5 rounded-2xl border border-brand-soft mb-4">
            <Image
              src="/brand/ibrainlabs-logo.png"
              alt="iBrainLabs"
              width={180}
              height={50}
              className="h-10 w-auto object-contain mx-auto"
              priority
            />
          </div>

          {isRejected ? (
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-main">
            {isRejected ? "Payment Verification Failed" : "Verifying Your Payment"}
          </h1>

          <p className="text-sm text-slate-muted mt-2">
            {isRejected
              ? "We could not verify your payment with the provided details."
              : "Thank you! We are verifying your payment. Your account will be activated within a few hours."}
          </p>
        </div>

        {/* If Rejected: Show Admin Note & Pay Again Button */}
        {isRejected ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-heading font-bold text-rose-800 uppercase tracking-wider block mb-1">
                Admin Note / Reason:
              </span>
              <p className="text-sm text-rose-700">
                {sub?.adminNote || "Payment details could not be matched. Please recheck your UTR and screenshot."}
              </p>
            </div>

            <Link
              href="/complete-payment"
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-gradient hover:opacity-95 text-white font-heading font-semibold text-sm shadow-md shadow-brand-purple/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Pay Again / Resubmit Details</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Verification Details Card */
          <div className="space-y-6">
            {sub && (
              <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-muted font-medium">Selected Plan</span>
                  <span className="font-heading font-bold text-brand-purple text-sm">
                    {sub.plan} Plan
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-muted font-medium">Amount Paid</span>
                  <span className="font-heading font-bold text-text-main text-sm">
                    ₹{sub.amount?.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-muted font-medium">Submitted UTR</span>
                  <span className="font-mono font-bold text-text-main">
                    {sub.utrNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-muted font-medium">Submitted At</span>
                  <span className="text-text-main font-medium">
                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : "Just now"}
                  </span>
                </div>
              </div>
            )}

            {/* Refresh Button */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => checkStatus(true)}
                disabled={refreshing}
                className="w-full py-3 px-6 rounded-2xl border-2 border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-white font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Checking status..." : "Refresh Status"}</span>
              </button>
            </div>

            <div className="text-center">
              <span className="text-[11px] text-slate-muted flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-purple" />
                Auto-checking every 30 seconds. Feel free to keep this tab open.
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
