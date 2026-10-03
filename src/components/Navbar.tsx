"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "./LanguageContext";
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  Settings as SettingsIcon,
  Globe, 
  Store, 
  Inbox,
  CreditCard,
  ShieldAlert,
  Users,
  LogOut,
  ChevronDown,
  UserCheck
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { data: session } = useSession();

  const [businessName, setBusinessName] = useState("iBrainLabs");
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // If on login or register, don't show the dashboard navigation bar
  const isAuthPage = pathname === "/login" || pathname === "/register";

  const loadProfile = () => {
    fetch("/api/business/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data?.name && data.name.trim()) {
          setBusinessName(data.name.trim());
        }
      })
      .catch(() => {});
  };

  const loadPendingCount = () => {
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
  };

  useEffect(() => {
    if (!isAuthPage) {
      loadProfile();
      loadPendingCount();
    }
  }, [isAuthPage, session]);

  if (isAuthPage) {
    return null;
  }

  const isAdmin = session?.user?.role === "ADMIN";

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/create-campaign", label: t("nav.createCampaign"), icon: PlusCircle },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/campaigns", label: t("nav.campaigns"), icon: BarChart3 },
    { href: "/billing", label: "Billing", icon: CreditCard },
    { href: "/settings", label: t("nav.settings"), icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-brand-soft shadow-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand Header */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 flex items-center justify-center p-1.5 rounded-2xl bg-white border border-brand-soft shadow-xs group-hover:scale-105 transition-transform">
              <Image
                src="/brand/ibrainlabs-logo.png"
                alt="iBrainLabs"
                width={130}
                height={38}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="font-heading font-extrabold text-xl text-brand-purple tracking-tight block leading-tight">
                iBrainLabs
              </span>
              <span className="block text-[10px] font-semibold text-slate-muted tracking-wider uppercase">
                Expertise In Every Execution
              </span>
            </div>
          </Link>

          {/* Center Navigation Menu */}
          <nav className="hidden lg:flex items-center gap-1 bg-brand-light p-1.5 rounded-2xl border border-brand-soft">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-heading text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-brand-purple shadow-sm border border-brand-soft"
                      : "text-slate-muted hover:text-text-main hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-brand-purple" : "text-slate-muted"}`} />
                  {item.label}
                </Link>
              );
            })}

            {/* Admin Links with Badge */}
            {isAdmin && (
              <>
                <div className="h-4 w-px bg-brand-soft mx-1" />
                <Link
                  href="/admin/payments"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all duration-200 ${
                    pathname === "/admin/payments"
                      ? "bg-brand-purple text-white shadow-sm"
                      : "text-brand-purple hover:bg-white/60"
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Payments</span>
                  {pendingPaymentsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse">
                      {pendingPaymentsCount}
                    </span>
                  )}
                </Link>

                <Link
                  href="/admin/users"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-heading text-xs font-semibold transition-all duration-200 ${
                    pathname === "/admin/users"
                      ? "bg-brand-purple text-white shadow-sm"
                      : "text-brand-purple hover:bg-white/60"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Users</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right Controls: Business pill, Language & Profile/Logout */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-brand-light border border-brand-soft rounded-full text-text-main font-heading text-xs font-semibold">
              <Store className="w-3.5 h-3.5 text-brand-purple" />
              <span className="max-w-[130px] truncate">{session?.user?.name || businessName}</span>
              {isAdmin && (
                <span className="text-[9px] bg-brand-purple text-white px-1.5 py-0.5 rounded-full uppercase font-bold">
                  Admin
                </span>
              )}
            </div>

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "te" : "en")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand-soft rounded-full text-xs font-heading font-semibold text-text-main hover:bg-brand-light transition-all cursor-pointer"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-brand-purple" />
              <span className="hidden sm:inline">{lang === "en" ? "EN" : "TE"}</span>
            </button>

            {/* Profile & Logout Dropdown */}
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-soft rounded-full text-xs font-heading font-semibold text-text-main hover:bg-brand-light transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-brand-gradient text-white flex items-center justify-center text-[11px] font-bold">
                    {(session.user?.name || "U")[0].toUpperCase()}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-muted" />
                </button>

                {showProfileMenu && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white border border-brand-soft rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95"
                    onMouseLeave={() => setShowProfileMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-brand-soft">
                      <p className="font-heading font-bold text-xs text-text-main truncate">
                        {session.user?.name}
                      </p>
                      <p className="text-[11px] text-slate-muted truncate">
                        @{session.user?.username} ({session.user?.role})
                      </p>
                    </div>

                    <Link
                      href="/billing"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-text-main hover:bg-brand-light font-medium"
                    >
                      <CreditCard className="w-4 h-4 text-brand-purple" />
                      <span>Subscription & Plan</span>
                    </Link>

                    {isAdmin && (
                      <>
                        <Link
                          href="/admin/payments"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-main hover:bg-brand-light font-medium"
                        >
                          <ShieldAlert className="w-4 h-4 text-brand-purple" />
                          <span>Admin Approvals ({pendingPaymentsCount})</span>
                        </Link>
                        <Link
                          href="/admin/users"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs text-text-main hover:bg-brand-light font-medium"
                        >
                          <Users className="w-4 h-4 text-brand-purple" />
                          <span>Admin Users</span>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-brand-soft mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-full bg-brand-purple text-white text-xs font-heading font-semibold hover:opacity-95"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-brand-soft overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 text-[10px] font-heading font-semibold px-2 py-1 ${
                  isActive ? "text-brand-purple" : "text-slate-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin/payments"
              className={`flex flex-col items-center gap-1 text-[10px] font-heading font-semibold px-2 py-1 ${
                pathname === "/admin/payments" ? "text-brand-purple" : "text-slate-muted"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Payments</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
