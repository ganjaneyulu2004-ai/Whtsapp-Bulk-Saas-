import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - OneAmple",
  description: "Privacy Policy and Data Protection guidelines for OneAmple WhatsApp SaaS.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl">
        <div className="mb-8">
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold inline-flex items-center gap-2 mb-4">
            ← Back to Home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-slate-400 text-sm mt-2">Last updated: October 2026</p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
            <p>
              When you use OneAmple (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), we collect information necessary to provide WhatsApp Bulk Messaging, campaign analytics, and customer communication services. This includes your business name, email address, mobile number, and WhatsApp Business Account (WABA) details when connecting via Meta Cloud API.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
            <p>We use the data collected exclusively to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-slate-300">
              <li>Facilitate WhatsApp message transmission through official Meta Cloud API.</li>
              <li>Provide real-time message delivery and read receipts via Webhooks.</li>
              <li>Authenticate and secure your business dashboard.</li>
              <li>Comply with applicable Meta Platform Terms and Developer Policies.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Data Sharing & Meta Platform Integration</h2>
            <p>
              We integrate directly with Meta WhatsApp Business Platform APIs. We do not sell, rent, or trade your personal or customer contact data to third parties. Customer contact lists uploaded for bulk messaging are processed strictly on your behalf and remain your confidential business property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Data Security & Storage</h2>
            <p>
              We implement industry-standard encryption, SSL/TLS transmission, and restricted database access controls to safeguard your credentials, access tokens, and contact databases.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data Retention and Deletion</h2>
            <p>
              You may request deletion of your account, contact lists, and stored access tokens at any time by contacting our support team or disconnecting your WhatsApp account in Dashboard Settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2 text-emerald-400 font-medium">
              Email: support@oneample.com | WhatsApp: +91 96426 83699
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
