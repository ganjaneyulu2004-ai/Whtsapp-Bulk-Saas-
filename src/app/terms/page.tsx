import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service - OneAmple",
  description: "Terms of Service and Conditions for OneAmple WhatsApp Bulk Messaging SaaS.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <div className="mb-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold inline-flex items-center gap-2 mb-4">
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
          <p className="text-slate-400 text-sm mt-2">Last updated: October 2026</p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By signing up for or using the OneAmple software platform, you agree to comply with these Terms of Service, all applicable laws, and Meta’s WhatsApp Business Policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Permitted Use & Spam Policy</h2>
            <p>
              Users are strictly prohibited from transmitting unsolicited spam, abusive, fraudulent, or prohibited content. All WhatsApp campaign recipients must have given prior consent (opt-in) to receive communications in accordance with WhatsApp Business messaging guidelines.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Meta Platform Rules</h2>
            <p>
              Usage of the WhatsApp Cloud API is governed directly by Meta Platforms, Inc. Account suspensions, message delivery rates, or quality score downgrades resulting from policy violations are subject to Meta’s enforcement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Limitation of Liability</h2>
            <p>
              OneAmple provides software tools on an &quot;as-is&quot; basis. We are not responsible for delivery delays or downtime originating from telecommunication networks or Meta Cloud API outages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Contact Information</h2>
            <p className="mt-2 text-emerald-400 font-medium">
              Email: support@oneample.com | IBrainLabs
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
