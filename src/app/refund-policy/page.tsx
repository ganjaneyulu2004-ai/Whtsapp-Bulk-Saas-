import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCcw, ShieldCheck, AlertCircle, Clock, CreditCard } from "lucide-react";

export const metadata = {
  title: "Refund & Cancellation Policy - OneAmple | by iBrainLabs",
  description:
    "Refund and Cancellation Policy for OneAmple monthly SaaS subscriptions operated by iBrainLabs.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold inline-flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Refund &amp; Cancellation Policy
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                OneAmple WhatsApp Marketing Platform &bull; by iBrainLabs
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-3">Last updated: November 2026</p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400 shrink-0" />
              1. Monthly SaaS Subscription &amp; Cancellation
            </h2>
            <p>
              OneAmple provides a monthly software-as-a-service (SaaS) platform subscription operated by <strong>iBrainLabs</strong>, processed securely via Razorpay.
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2 text-slate-300">
              <li>
                <strong>Cancel Anytime:</strong> You may cancel your OneAmple subscription at any time before your next billing cycle. Once cancelled, no further monthly platform subscription charges will be billed.
              </li>
              <li>
                <strong>No Partial-Month Refunds After Activation:</strong> Once a monthly subscription period is activated and access to the OneAmple platform has been provisioned, fees paid for that current billing month are non-refundable. Your access remains active until the end of the paid billing cycle.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              2. 7-Day Service Non-Activation Refund Exception
            </h2>
            <p>
              A full refund of the monthly OneAmple platform fee will be granted if requested within <strong>7 calendar days</strong> of payment <strong>only</strong> in cases where the OneAmple service could not be activated on your account due to a verified technical fault on our part that our support team is unable to resolve.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
              3. Refund Processing Timeline
            </h2>
            <p>
              Any approved refund is processed back to your <strong>original payment method</strong> (card, UPI, or bank account via Razorpay) within <strong>5–7 working days</strong> from the date of refund approval. Bank posting timelines may vary depending on your financial institution.
            </p>
          </section>

          <section className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              4. WhatsApp / Meta Conversation Charges
            </h2>
            <p className="text-slate-300 text-sm">
              WhatsApp Business Platform conversation and template messaging charges are billed directly to your business by Meta through your <strong>Meta Billing Hub</strong> payment method. OneAmple and iBrainLabs do not collect, hold, or invoice Meta messaging charges, and therefore cannot issue refunds for charges billed directly by Meta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. How to Request Cancellation or a Refund</h2>
            <p>
              To request a cancellation or an eligible 7-day non-activation refund, please contact our support team with your registered username/business name and Razorpay Payment ID:
            </p>
            <div className="mt-3 text-emerald-400 text-sm font-medium space-y-1">
              <p>Email: <a href="mailto:info@ibrainlabs.com" className="underline">info@ibrainlabs.com</a></p>
              <p>Phone / WhatsApp: <a href="https://wa.me/919642683699" className="underline">+91 96426 83699</a></p>
              <p>Support Hours: Monday–Saturday, 10:00 AM – 7:00 PM IST</p>
            </div>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} OneAmple &bull; iBrainLabs. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/refund-policy" className="text-emerald-400 hover:underline font-semibold">Refund Policy</Link>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">Contact</Link>
            <Link href="/data-deletion" className="hover:text-slate-300 transition-colors">Data Deletion</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

