"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "./LanguageContext";
import { AccountDropdown } from "./AccountDropdown";
import {
  Home,
  Bell,
  Compass,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
  ShieldAlert,
  Users,
  LogOut,
  Globe,
  Menu,
  X,
  HelpCircle,
  PlusCircle,
  Sparkles,
  PhoneCall
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { lang, setLang } = useLanguage();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Load pending payments count for admin
  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/admin/payments")
        .then((res) => res.json())
        .then((data) => {
          if (data?.counts?.pending !== undefined) {
            setPendingPaymentsCount(data.counts.pending);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isAuthPage) return null;

  const isAdmin = session?.user?.role === "ADMIN";

  const clientNavItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/create-campaign", label: "Create Campaign", icon: PlusCircle },
    { href: "/templates", label: "Templates", icon: Sparkles },
    { href: "/inbox", label: "Inbox", icon: MessageSquare },
    { href: "/campaigns", label: "Campaigns & Reports", icon: BarChart3 },
    { href: "/billing", label: "Billing & Plans", icon: CreditCard },
  ];

  const adminNavItems = [
    { href: "/", label: "Admin Dashboard", icon: Home },
    { href: "/admin/numbers", label: "WhatsApp Numbers", icon: PhoneCall },
    { href: "/admin/users", label: "Client Users", icon: Users },
    { 
      href: "/admin/payments", 
      label: "Payment Approvals", 
      icon: ShieldAlert, 
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : null 
    },
  ];

  const activeNavItems = isAdmin ? adminNavItems : clientNavItems;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* 1. Top Logo Branding (iBrainLabs) */}
      <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
        <Link href="/" className="flex-1 group">
          <div className="w-full h-13 sm:h-14 flex items-center justify-center px-3 py-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs group-hover:border-slate-300 group-hover:shadow-xs transition-all">
            <Image
              src="/brand/ibrainlabs-logo.png"
              alt="iBrainLabs"
              width={200}
              height={45}
              className="h-9 sm:h-10 w-full object-contain group-hover:scale-102 transition-transform"
              priority
            />
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Account Dropdown (1 SIDE - directly below logo) */}
      <div className="p-2.5 border-b border-slate-100">
        <AccountDropdown align="left" className="w-full" />
      </div>

      {/* 3. Navigation Links (Middle Scrollable) */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 custom-scrollbar">
        {isAdmin && (
          <div className="px-3 py-1 mb-1 flex items-center justify-between text-[10px] font-bold text-brand-purple uppercase tracking-wider">
            <span>Admin Suite</span>
            <span className="px-1.5 py-0.2 rounded-full bg-brand-purple/10 text-brand-purple font-extrabold text-[9px]">
              Super Admin
            </span>
          </div>
        )}

        {activeNavItems.map((item: any) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? isAdmin
                    ? "bg-brand-purple text-white shadow-xs"
                    : "bg-slate-900 text-white shadow-xs"
                  : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/80"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : isAdmin ? "text-brand-purple" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* 4. Bottom Pinned Section: Settings, Language, Logout */}
      <div className="mt-auto p-2.5 border-t border-slate-100 space-y-0.5 bg-slate-50/50">
        <Link
          href="/settings"
          className={`flex items-center justify-between px-3 py-1.5 rounded-xl font-heading text-xs font-semibold transition-all duration-150 ${
            pathname === "/settings"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-900 hover:bg-slate-100/80"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Settings className={`w-4 h-4 ${pathname === "/settings" ? "text-white" : "text-slate-500"}`} />
            <span>Settings</span>
          </div>
        </Link>

        {/* Language switch button */}
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "te" : "en")}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-heading font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-slate-400" />
            <span>Language</span>
          </div>
          <span className="text-[10px] font-bold uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700">
            {lang === "en" ? "English" : "Telugu"}
          </span>
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-heading font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar (1 SIDE) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 border-r border-slate-200/90 z-40 flex-col shadow-xs bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile Top Navigation Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-2xs">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/ibrainlabs-logo.png"
            alt="iBrainLabs"
            width={160}
            height={38}
            className="h-8 sm:h-9 w-auto object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Slide-out Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
