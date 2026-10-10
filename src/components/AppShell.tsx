"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
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
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Meta Business Suite Marketing Engine © 2026</p>
            <div className="flex items-center gap-3 text-slate-500 text-[11px]">
              <span>⚡ High-Speed Engine</span>
              <span>•</span>
              <span>🔒 Official Meta Cloud API</span>
              <span>•</span>
              <span>📊 Real-Time Analytics</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
