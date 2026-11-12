import React from "react";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Page Not Found - OneAmple — WhatsApp Marketing & CRM by iBrainLabs",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
        <div className="flex justify-center">
          <Image
            src="/brand/oneample-icon.png"
            alt="OneAmple"
            width={56}
            height={56}
            className="rounded-2xl border border-white/10"
          />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">404 Error</p>
          <h1 className="text-2xl font-extrabold text-white mt-1">Page Not Found</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            The OneAmple page you requested does not exist or has been moved.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/contact"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Contact Support
          </Link>
        </div>

        <div className="pt-5 border-t border-slate-800 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/refund-policy" className="hover:text-white">Refund Policy</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/data-deletion" className="hover:text-white">Data Deletion</Link>
        </div>
      </div>
    </div>
  );
}

