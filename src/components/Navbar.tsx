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
  Menu,
  X,
  Sparkles
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { data: session } = useSession();

  const [businessName, setBusinessName] = useState("iBrainLabs");
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  // Close menus on page route changes
  useEffect(() => {
    setShowMobileMenu(false);
    setShowProfileMenu(false);
  }, [pathname]);

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

  const bottomNavItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/campaigns", label: "Campaigns", icon: BarChart3 },
    { href: "/create-campaign", label: "Create", icon: PlusCircle, isPrimary: true },
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-soft shadow-glass">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Logo & Brand Header */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className="h-9 sm:h-11 flex items-center justify-center p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-white border border-brand-soft shadow-xs group-hover:scale-105 transition-transform">
                <Image
                  src="/brand/ibrainlabs-logo.png"
                  alt="iBrainLabs"
                  width={130}
                  height={38}
                  className="h-6 sm:h-7 w-auto object-contain"
                  priority
                />
              </div>
              <div>
                <span className="font-heading font-extrabold text-base sm:text-xl text-brand-purple tracking-tight block leading-tight">
                  iBrainLabs
                </span>
                <span className="hidden sm:block text-[9px] sm:text-[10px] font-semibold text-slate-muted tracking-wider uppercase">
                  Expertise In Every Execution
                </span>
              </div>
            </Link>

            {/* Desktop Center Navigation Menu */}
            {session ? (
              pathname === "/complete-payment" ? (
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-heading font-semibold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Subscription Activation Required • Complete Payment Below</span>
                </div>
              ) : pathname === "/payment-pending" ? (
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-heading font-semibold shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Payment Verification in Progress • Unlocks Upon Approval</span>
                </div>
              ) : (
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
              )
            ) : (
              <div className="hidden lg:flex items-center gap-2 text-xs font-heading font-medium text-slate-muted">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-light text-brand-purple border border-brand-soft">
                  ⚡ Official Meta WhatsApp Cloud API
                </span>
                <span>•</span>
                <span className="text-slate-muted">High-Speed Broadcast Platform</span>
              </div>
            )}

            {/* Right Controls: Business pill, Language, Profile & Mobile Hamburger */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Business Name Badge (Desktop) */}
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
                type="button"
                onClick={() => setLang(lang === "en" ? "te" : "en")}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white border border-brand-soft rounded-full text-xs font-heading font-semibold text-text-main hover:bg-brand-light transition-all cursor-pointer shadow-2xs"
                title="Toggle Language"
              >
                <Globe className="w-3.5 h-3.5 text-brand-purple" />
                <span className="text-[11px] sm:text-xs font-bold">{lang === "en" ? "EN" : "TE"}</span>
              </button>

              {/* Profile & Logout Dropdown (Desktop) */}
              {session ? (
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-brand-soft rounded-full text-xs font-heading font-semibold text-text-main hover:bg-brand-light transition-all cursor-pointer shadow-2xs"
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
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    href="/login"
                    className="px-3 sm:px-3.5 py-1.5 rounded-full bg-brand-light text-brand-purple text-xs font-heading font-semibold hover:bg-brand-soft border border-brand-soft transition"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 sm:px-4 py-1.5 rounded-full bg-brand-gradient text-white text-xs font-heading font-bold hover:opacity-95 shadow-xs transition"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Toggle Button */}
              {session && (
                <button
                  type="button"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  aria-label="Toggle navigation menu"
                  className="lg:hidden p-2 rounded-xl bg-brand-light text-brand-purple hover:bg-brand-soft border border-brand-soft transition"
                >
                  {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Full Dropdown Menu Drawer */}
        {session && showMobileMenu && (
          <div className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-brand-soft shadow-xl px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-3 duration-200">
            {/* User details header */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-light border border-brand-soft">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-gradient text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {(session.user?.name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-heading font-bold text-xs text-text-main truncate max-w-[170px]">
                    {session.user?.name || businessName}
                  </div>
                  <div className="text-[10px] text-slate-muted truncate">
                    @{session.user?.username} • <span className="font-semibold text-brand-purple">{session.user?.role}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation links grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-heading font-semibold transition-all ${
                      isActive
                        ? "bg-brand-gradient text-white shadow-sm"
                        : "bg-slate-50 text-text-main hover:bg-brand-light"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-brand-purple"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Admin links if Admin */}
              {isAdmin && (
                <>
                  <Link
                    href="/admin/payments"
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-heading font-semibold transition-all ${
                      pathname === "/admin/payments"
                        ? "bg-brand-purple text-white shadow-sm"
                        : "bg-amber-50 text-amber-900 border border-amber-200"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Approvals ({pendingPaymentsCount})</span>
                  </Link>
                  <Link
                    href="/admin/users"
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-heading font-semibold transition-all ${
                      pathname === "/admin/users"
                        ? "bg-brand-purple text-white shadow-sm"
                        : "bg-slate-50 text-text-main hover:bg-brand-light"
                    }`}
                  >
                    <Users className="w-4 h-4 text-brand-purple" />
                    <span>All Users</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Floating Modern Mobile Bottom Navigation Bar (When Logged in & not in payment flow) */}
      {session && pathname !== "/complete-payment" && pathname !== "/payment-pending" && (
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-brand-soft shadow-[0_-4px_25px_rgba(43,35,80,0.08)] py-1.5 px-3 flex items-center justify-around"
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            if (item.isPrimary) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-brand-gradient text-white flex items-center justify-center shadow-lg shadow-brand-purple/35 group-active:scale-95 transition-transform border-2 border-white">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-heading font-bold text-brand-purple mt-0.5">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? "text-brand-purple font-bold"
                    : "text-slate-muted hover:text-text-main"
                }`}
              >
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-brand-purple" : "text-slate-400"}`} />
                <span className="text-[10px] font-heading leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}
