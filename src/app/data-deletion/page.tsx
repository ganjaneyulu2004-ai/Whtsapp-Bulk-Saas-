import React from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, ShieldCheck, Mail, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "User Data Deletion Instructions - OneAmple",
  description: "Official instructions for requesting data deletion and removing WhatsApp Cloud API credentials on OneAmple.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold inline-flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                User Data Deletion Instructions
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                OneAmple WhatsApp SaaS &bull; Meta Platform Developer Policy Compliance
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-8 text-slate-300 leading-relaxed text-sm sm:text-base">
          {/* Summary Alert */}
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-slate-300 text-sm">
              At <strong>OneAmple</strong>, we respect your privacy and data sovereignty. In accordance with Meta Platform Terms and global data protection regulations, you have the full right to delete your account, remove connected WhatsApp credentials, and purge all your stored data at any time.
            </p>
          </div>

          {/* Section 1: How to request deletion */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center">1</span>
              How to Request Data Deletion
            </h2>
            <p className="mb-4">You can request or trigger data deletion using any of the following methods:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Method A */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Option A: Directly from Dashboard (Instant)
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-slate-400">
                  <li>Log in to your OneAmple dashboard at <Link href="/login" className="text-emerald-400 hover:underline">oneample.com/login</Link>.</li>
                  <li>Navigate to <strong>Settings</strong> from the sidebar.</li>
                  <li>Scroll to the <strong>Danger Zone: Delete Account</strong> section.</li>
                  <li>Click <strong>Request Account Deletion</strong>.</li>
                  <li>Confirm your request. Your WhatsApp access tokens are immediately invalidated and full data purge is scheduled within 30 days.</li>
                </ol>
              </div>

              {/* Method B */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5">
                <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Option B: Via Meta / Facebook Settings
                </h3>
                <ol className="list-decimal pl-5 space-y-1.5 text-xs sm:text-sm text-slate-400">
                  <li>Log in to your Facebook profile associated with your WhatsApp Business Account.</li>
                  <li>Go to <strong>Settings & Privacy &gt; Settings &gt; Apps and Websites</strong>.</li>
                  <li>Locate <strong>OneAmple</strong> in your connected apps list.</li>
                  <li>Click <strong>Remove</strong> and select the option to send a deletion request.</li>
                  <li>Our system will receive the deletion callback and schedule your data for permanent purge.</li>
                </ol>
              </div>
            </div>

            {/* Method C */}
            <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-xl p-5">
              <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                Option C: Contact Support via Email or WhatsApp
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-2">
                If you cannot access your dashboard, simply send a deletion request from your registered email address or phone number:
              </p>
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <a href="mailto:support@oneample.com" className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> support@oneample.com
                </a>
                <a href="https://wa.me/919642683699" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> WhatsApp: +91 96426 83699
                </a>
              </div>
            </div>
          </section>

          {/* Section 2: What data is deleted */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center">2</span>
              What Data Is Permanently Purged
            </h2>
            <p className="mb-3">Upon processing your deletion request, the following data is permanently wiped from our production database and backup storage:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
              <li className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">&bull;</span> Meta WhatsApp Access Tokens (AES-256)
              </li>
              <li className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">&bull;</span> Phone Number IDs &amp; WABA Identifiers
              </li>
              <li className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">&bull;</span> Customer Contact Lists &amp; Phone Numbers
              </li>
              <li className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">&bull;</span> Campaign Message Logs &amp; Delivery Receipts
              </li>
              <li className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">&bull;</span> Custom Message Templates &amp; Media Handles
              </li>
              <li className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">&bull;</span> User Account Credentials &amp; Session Tokens
              </li>
            </ul>
          </section>

          {/* Section 3: Timeframe & Retention */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center">3</span>
              Purge Timeframe &amp; Retention Policy
            </h2>
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3 text-sm text-slate-300">
              <p>
                <strong>Immediate Revocation:</strong> As soon as you request deletion, your WhatsApp connection is disconnected, the access token is cleared/invalidated, and active sessions are terminated.
              </p>
              <p>
                <strong>Permanent Purge:</strong> All database records associated with your account are permanently erased within <strong>30 calendar days</strong>, satisfying Meta Platform Policy requirements.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notice: Deletion is irreversible. Once the 30-day period expires, your contacts and campaign histories cannot be restored.</span>
              </div>
            </div>
          </section>

          {/* Section 4: Contact Information */}
          <section className="pt-4 border-t border-slate-800">
            <h2 className="text-lg font-bold text-white mb-2">Questions Regarding Data Deletion?</h2>
            <p className="text-slate-400 text-sm">
              Our Data Protection Officer can be reached directly at <a href="mailto:support@oneample.com" className="text-emerald-400 hover:underline">support@oneample.com</a> or via our registered business address at iBrain Labs, Vijayawada, India.
            </p>
          </section>
        </div>

        {/* Footer links */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} OneAmple &bull; iBrain Labs. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/data-deletion" className="text-emerald-400 hover:underline font-semibold">Data Deletion</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

