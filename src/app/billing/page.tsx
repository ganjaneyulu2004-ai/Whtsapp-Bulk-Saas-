"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CreditCard, 
  RotateCw, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  History,
  Loader2
} from "lucide-react";

export default function BillingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    subscriptions: any[];
    currentSubscription: any | null;
    daysRemaining: number;
    isExpiringSoon: boolean;
    isAdmin: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/subscription/history")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        // If expired for non-admin, redirect to /complete-payment
        if (!resData.isAdmin && resData.currentSubscription?.status === "EXPIRED") {
          router.replace("/complete-payment");
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  const sub = data?.currentSubscription;
  const isExpiring = data?.isExpiringSoon;
  const daysLeft = data?.daysRemaining ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Expiry Warning Banner (3 days before expiry) */}
      {isExpiring && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm">
                Subscription Expiring Soon!
              </h4>
              <p className="text-xs text-amber-800">
                Your plan expires in {daysLeft} {daysLeft === 1 ? "day" : "days"}. Renew now to avoid interruption to your WhatsApp broadcasts.
              </p>
            </div>
          </div>

          <Link
            href="/complete-payment"
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-heading font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>Renew Plan Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-main flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-brand-purple" />
            <span>Subscription & Billing</span>
          </h1>
          <p className="text-slate-muted text-sm mt-1">
            Manage your iBrainLabs membership, view payment history and renew your plan.
          </p>
        </div>

        <Link
          href="/complete-payment"
          className="px-6 py-3 rounded-2xl bg-brand-gradient hover:opacity-95 text-white font-heading font-bold text-sm shadow-md shadow-brand-purple/20 flex items-center justify-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <span>Renew / Upgrade Plan</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Current Subscription Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card">
        <h2 className="text-base font-heading font-bold text-text-main uppercase tracking-wider mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-brand-purple" />
          <span>Current Active Plan</span>
        </h2>

        {data?.isAdmin ? (
          <div className="p-6 rounded-2xl bg-brand-light/70 border border-brand-soft flex items-center justify-between">
            <div>
              <span className="text-xs font-heading font-bold text-brand-purple uppercase tracking-wider block mb-1">
                Admin Account
              </span>
              <h3 className="text-2xl font-heading font-extrabold text-text-main">
                Enterprise Lifetime Unlimited
              </h3>
              <p className="text-xs text-slate-muted mt-1">
                Full administrative access with unlimited broadcast quotas.
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-heading font-bold text-xs">
              ACTIVE (Admin)
            </span>
          </div>
        ) : sub ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft">
              <span className="text-xs font-semibold text-slate-muted block mb-1">Plan Level</span>
              <h3 className="text-2xl font-heading font-extrabold text-brand-purple">
                {sub.plan} Plan
              </h3>
              <span className="text-xs text-text-main font-medium mt-1 block">
                ₹{sub.amount?.toLocaleString("en-IN")} / month
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft">
              <span className="text-xs font-semibold text-slate-muted block mb-1">Membership Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold ${
                    sub.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{sub.status}</span>
                </span>
              </div>
              <span className="text-xs text-slate-muted mt-2 block">
                {daysLeft} days remaining in current cycle
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft">
              <span className="text-xs font-semibold text-slate-muted block mb-1">Valid Until</span>
              <div className="text-lg font-heading font-bold text-text-main mt-1">
                {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "30 days from approval"}
              </div>
              <span className="text-xs text-slate-muted mt-1 block">
                Approved: {sub.approvedAt ? new Date(sub.approvedAt).toLocaleDateString() : "Pending"}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-brand-light rounded-2xl border border-brand-soft">
            <p className="text-sm text-slate-muted">You do not have an active plan yet.</p>
            <Link
              href="/complete-payment"
              className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-purple text-white text-xs font-heading font-bold"
            >
              Choose a Plan
            </Link>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card">
        <h2 className="text-base font-heading font-bold text-text-main uppercase tracking-wider mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-brand-purple" />
          <span>Payment & UTR History</span>
        </h2>

        {!data?.subscriptions || data.subscriptions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-muted">
            No previous payment records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-light/70 border-b border-brand-soft text-slate-muted uppercase font-heading font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">UTR Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Validity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-soft">
                {data.subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-light/30 transition-colors">
                    <td className="py-3.5 px-4 text-text-main">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-heading font-bold text-text-main">
                      {s.plan}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-purple">
                      ₹{s.amount?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-muted">
                      {s.utrNumber || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-heading font-bold ${
                          s.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : s.status === "PENDING_VERIFICATION"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-muted">
                      {s.startDate && s.endDate
                        ? `${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
