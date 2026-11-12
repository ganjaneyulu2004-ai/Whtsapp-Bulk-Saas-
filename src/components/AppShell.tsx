"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/refund-policy" ||
    pathname === "/contact" ||
    pathname === "/data-deletion";

  const isInboxPage = pathname === "/inbox";

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Full-height WhatsApp Web layout for Inbox (zero bottom gap, full height)
  if (isInboxPage) {
    return (
      <div className="h-screen flex flex-col lg:flex-row bg-background overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 h-full overflow-hidden">
          <main className="flex-1 w-full p-2 sm:p-3 flex flex-col h-full min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* 1 Side: Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area on the right side */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 lg:pb-8">
          {children}
        </main>
        <footer className="mt-auto border-t border-slate-200/80 bg-white/60 backdrop-blur-md py-4 text-center text-xs text-slate-500 font-medium">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <p>OneAmple WhatsApp Marketing Platform © {new Date().getFullYear()} iBrainLabs</p>
              <span className="hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-500">
                🔒 Built on the official WhatsApp Business Platform (Cloud API)
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-slate-500 text-[11px]">
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
              <span>•</span>
              <Link href="/refund-policy" className="hover:text-slate-900 transition-colors">Refund Policy</Link>
              <span>•</span>
              <Link href="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
              <span>•</span>
              <Link href="/data-deletion" className="hover:text-slate-900 transition-colors">Data Deletion</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
