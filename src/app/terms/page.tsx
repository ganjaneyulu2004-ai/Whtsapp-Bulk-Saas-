import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service - OneAmple | by iBrainLabs",
  description:
    "Terms of Service covering subscriptions, Razorpay payments, acceptable use, suspension, liability, and governing law for OneAmple by iBrainLabs.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold inline-flex items-center gap-2 mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms of Service
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            OneAmple WhatsApp Marketing Platform &bull; Operated by iBrainLabs &bull; Last updated: November 2026
          </p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or accessing <strong>OneAmple</strong> (operated by <strong>iBrainLabs</strong>), you agree to be bound by these Terms of Service, our{" "}
              <Link href="/privacy" className="text-emerald-400 underline">Privacy Policy</Link>, our{" "}
              <Link href="/refund-policy" className="text-emerald-400 underline">Refund &amp; Cancellation Policy</Link>, all applicable laws of India, and the official WhatsApp Business Messaging &amp; Commerce Policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Subscription, Pricing &amp; Auto-Renewal</h2>
            <p>
              Access to the OneAmple software platform is offered on a monthly subscription basis. Subscriptions cover access to the OneAmple campaign dashboard, CRM inbox, AI assistant configuration, and analytics.
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-slate-300">
              <li>
                Plans renew on a 30-day monthly billing cycle unless cancelled prior to the renewal date.
              </li>
              <li>
                WhatsApp Business Platform conversation and template charges are billed separately by Meta Platforms directly via your payment method in <strong>Meta Billing Hub</strong> and are not part of the OneAmple SaaS subscription.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Payments &amp; Cancellation</h2>
            <p>
              All platform subscription payments are processed securely through <strong>Razorpay</strong> in Indian Rupees (INR). You may cancel your subscription at any time to stop future billing cycles. Please review our{" "}
              <Link href="/refund-policy" className="text-emerald-400 underline font-semibold">
                Refund &amp; Cancellation Policy
              </Link>{" "}
              for complete terms on cancellations and the 7-day non-activation refund exception.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Acceptable Use Policy (No Spam &amp; Opt-In Required)</h2>
            <p>
              You are strictly responsible for the content and recipients of all messages sent through your connected WhatsApp Business Account:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-1.5 text-slate-300">
              <li>
                <strong>No Unsolicited Spam:</strong> Sending unsolicited bulk promotional messages, phishing, malware, misleading claims, or prohibited goods/services is strictly forbidden.
              </li>
              <li>
                <strong>Explicit Customer Opt-In:</strong> You must collect verifiable prior consent (opt-in) from every recipient before messaging them via WhatsApp and honor all opt-out requests (such as <code>STOP</code>) immediately.
              </li>
              <li>
                <strong>WhatsApp Business Policy Compliance:</strong> You must follow all applicable WhatsApp Business Terms of Service and template approval guidelines.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Account Suspension &amp; Termination</h2>
            <p>
              iBrainLabs reserves the right to suspend or permanently terminate access to OneAmple, without refund, if an account engages in spam abuse, illegal activity, credential sharing, payment chargebacks, or violations of WhatsApp Business policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Cloud API &amp; Third-Party Services</h2>
            <p>
              OneAmple is built on the official WhatsApp Business Platform (Cloud API). Message delivery rates, template approval decisions, phone quality ratings, and messaging tier limits are determined solely by Meta and mobile carriers, not iBrainLabs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              OneAmple is provided on an &quot;as-is&quot; and &quot;as-available&quot; basis. To the maximum extent permitted by law, iBrainLabs shall not be liable for indirect, incidental, consequential damages, loss of business revenue, WhatsApp number restrictions, or downtime arising from Meta Cloud API outages, telecom failures, or third-party payment gateways.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Governing Law &amp; Jurisdiction</h2>
            <p>
              These Terms of Service are governed by and construed in accordance with the laws of <strong>India</strong>. Any disputes arising out of or relating to OneAmple or these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>Hyderabad, Telangana, India</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Contact Information</h2>
            <p className="text-slate-300">
              iBrainLabs &bull; Product: OneAmple
            </p>
            <p className="mt-1.5 text-emerald-400 font-medium">
              Email: info@ibrainlabs.com | Phone / WhatsApp: +91 96426 83699 | Web: https://www.ibrainlabs.com
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} OneAmple &bull; iBrainLabs. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-emerald-400 hover:underline font-semibold">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:text-slate-300 transition-colors">Refund Policy</Link>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">Contact</Link>
            <Link href="/data-deletion" className="hover:text-slate-300 transition-colors">Data Deletion</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
