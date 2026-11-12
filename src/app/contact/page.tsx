import React from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Mail, Phone, Globe, MapPin, Clock, Sparkles } from "lucide-react";

export const metadata = {
  title: "Contact Us - OneAmple | by iBrainLabs",
  description: "Official contact details and customer support hours for OneAmple by iBrainLabs.",
};

export default function ContactPage() {
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
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Contact Us
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            OneAmple WhatsApp Marketing Platform &bull; Customer Support &amp; Business Inquiries
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>Business Name</span>
            </div>
            <p className="text-white font-bold text-base">iBrainLabs</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Product</span>
            </div>
            <p className="text-white font-bold text-base">OneAmple</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5 sm:col-span-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4" />
              <span>Registered Business Address</span>
            </div>
            <p className="text-slate-200 font-medium">
              PNR One, 1st Floor, Dwarkanagar Colony, Rai Durg, Hyderabad, Telangana 500104
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Phone className="w-4 h-4" />
              <span>Phone / WhatsApp</span>
            </div>
            <a
              href="https://wa.me/919642683699"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-bold text-base hover:text-emerald-400 transition-colors block"
            >
              +91 96426 83699
            </a>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Mail className="w-4 h-4" />
              <span>Email</span>
            </div>
            <a
              href="mailto:info@ibrainlabs.com"
              className="text-white font-bold text-base hover:text-emerald-400 transition-colors block"
            >
              info@ibrainlabs.com
            </a>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Globe className="w-4 h-4" />
              <span>Website</span>
            </div>
            <a
              href="https://www.ibrainlabs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 font-semibold hover:underline block"
            >
              https://www.ibrainlabs.com
            </a>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Support Hours</span>
            </div>
            <p className="text-white font-semibold">Monday–Saturday, 10:00 AM – 7:00 PM IST</p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} OneAmple &bull; iBrainLabs. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link href="/refund-policy" className="hover:text-slate-300 transition-colors">Refund Policy</Link>
            <Link href="/contact" className="text-emerald-400 hover:underline font-semibold">Contact</Link>
            <Link href="/data-deletion" className="hover:text-slate-300 transition-colors">Data Deletion</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

