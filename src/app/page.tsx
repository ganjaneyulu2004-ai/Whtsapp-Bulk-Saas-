"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageContext";
import { 
  PlusCircle, 
  Send, 
  CheckCheck, 
  Eye, 
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
  RotateCw,
  Info,
  X,
  FileSpreadsheet,
  Zap,
  BarChart3,
  XCircle,
  HelpCircle,
  Loader2,
  PhoneCall,
  Users,
  CreditCard,
  Trash2
} from "lucide-react";
import FreeTrialScannerSection from "@/components/FreeTrialScannerSection";
import WhatsAppEmbeddedSignup from "@/components/WhatsAppEmbeddedSignup";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { data: session, status } = useSession();

  const [filterRange, setFilterRange] = useState<"today" | "7days" | "30days" | "custom">("30days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Failure reasons modal
  const [showFailureModal, setShowFailureModal] = useState(false);

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      let url = `/api/dashboard/stats?range=${filterRange}`;
      if (filterRange === "custom" && customStart) {
        url += `&startDate=${encodeURIComponent(customStart)}`;
        if (customEnd) url += `&endDate=${encodeURIComponent(customEnd)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setStatsData(data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchStats();
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchStats();
      }, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [session, filterRange, customStart, customEnd, router]);

  const isAdmin = session?.user?.role === "ADMIN";
  const [resetting, setResetting] = useState(false);

  // If client is logged in and subscription is not active, redirect to /complete-payment
  useEffect(() => {
    if (session?.user && session.user.role !== "ADMIN") {
      if (session.user.subscriptionStatus !== "ACTIVE") {
        window.location.href = "/complete-payment";
      }
    }
  }, [session]);

  const handleResetSystem = async () => {
    const confirmed = window.confirm(
      "⚠️ ARE YOU SURE?\n\nThis will permanently delete all old test campaigns, contact lists, and test client accounts (like Royal Bikes) and reset the system clean from starting.\n\nOnly Master Admin (ADMIN_IbrainTest) will remain."
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-system", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message);
        window.location.reload();
      } else {
        alert("❌ " + (data.error || "Failed to reset system."));
      }
    } catch (err: any) {
      alert("❌ Error: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  const [adminStats, setAdminStats] = useState<{
    totalClients: number;
    activeNumbers: number;
    pendingNumbers: number;
    pendingPayments: number;
    quotaTotal: number;
  }>({
    totalClients: 0,
    activeNumbers: 0,
    pendingNumbers: 0,
    pendingPayments: 0,
    quotaTotal: 20,
  });

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        fetch("/api/admin/numbers").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/payments").then((r) => r.json()).catch(() => null),
        fetch("/api/admin/users").then((r) => r.json()).catch(() => null),
      ]).then(([numbersData, paymentsData, usersData]) => {
        const clientCount = Array.isArray(usersData?.users) ? usersData.users.length : 0;
        setAdminStats({
          totalClients: clientCount,
          activeNumbers: numbersData?.stats?.active ?? numbersData?.activeCount ?? 0,
          pendingNumbers: numbersData?.stats?.pending ?? numbersData?.pendingCount ?? 0,
          pendingPayments: paymentsData?.counts?.pending || 0,
          quotaTotal: 20,
        });
      });
    }
  }, [isAdmin]);

  const stats = statsData?.stats || {
    totalSent: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalNotRead: 0,
    totalFailed: 0,
    readRate: 0,
  };

  const chartData = statsData?.chartData || [];
  const recentCampaigns = statsData?.recentCampaigns || [];
  const failureReasons = statsData?.failureReasons || [];
  const waConfig = statsData?.whatsappConfig;
  const isWhatsAppConnected = !!waConfig?.isConnected;

  if (status === "loading") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  // When Not Logged In -> Redirect immediately to /login
  if (!session) {
    if (typeof window !== "undefined") {
      router.replace("/login");
    }
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  // ==========================================
  // 1. SIMPLE ADMIN HOME PAGE (For Super Admin)
  // ==========================================
  if (isAdmin) {
    return (
      <div className="space-y-6 pb-12 max-w-6xl mx-auto">
        {/* Simple Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-purple/10 text-brand-purple text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-brand-purple" />
              Super Admin Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
              OfferBlast Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Platform controls, client WhatsApp number activations, and payment approvals.
            </p>
          </div>

          {/* Actions: Master WABA Status & Clean Reset Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResetSystem}
              disabled={resetting}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Clear all old test data & restart fresh from starting"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>{resetting ? "Resetting..." : "🧹 Wipe Old Test Data"}</span>
            </button>

            {/* Master WABA Status Card */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Meta Master WABA</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-800">+91 96426 83699</div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Admin Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Card 1: WhatsApp Numbers */}
          <Link
            href="/admin/numbers"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-card hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  WhatsApp Numbers
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PhoneCall className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight font-heading">
                  {adminStats.activeNumbers} <span className="text-sm font-medium text-slate-400">/ {adminStats.quotaTotal}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {adminStats.activeNumbers} Active
                  </span>
                  {adminStats.pendingNumbers > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                      {adminStats.pendingNumbers} Pending OTP
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
              <span>Manage Numbers</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: Client Users */}
          <Link
            href="/admin/users"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 shadow-card hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Client Accounts
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight font-heading">
                  {adminStats.totalClients}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Registered shop owners & businesses
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
              <span>View All Clients</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: Payments */}
          <Link
            href="/admin/payments"
            className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-amber-500 shadow-card hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Payment Approvals
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 tracking-tight font-heading">
                  {adminStats.pendingPayments}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {adminStats.pendingPayments > 0 ? "⚠️ Subscriptions awaiting your approval" : "All payments up to date"}
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:translate-x-0.5 transition-transform">
              <span>Review Payments</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Simple 3-Step Client Activation Workflow Guide */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-brand-purple" />
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Quick Client WhatsApp Onboarding (How It Works)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-6 h-6 rounded-full bg-brand-purple text-white text-xs font-bold flex items-center justify-center mb-2">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-800">Client Submits Number</h3>
              <p className="text-xs text-slate-500 mt-1">
                Client enters their 10-digit mobile number in their OfferBlast dashboard.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-6 h-6 rounded-full bg-brand-purple text-white text-xs font-bold flex items-center justify-center mb-2">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-800">Meta OTP Verification</h3>
              <p className="text-xs text-slate-500 mt-1">
                In Meta Business Suite, add the number, choose SMS OTP, and enter the 6-digit code.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-6 h-6 rounded-full bg-brand-purple text-white text-xs font-bold flex items-center justify-center mb-2">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-800">Instant 1-Click Activation</h3>
              <p className="text-xs text-slate-500 mt-1">
                Open WhatsApp Numbers Manager, paste Meta&apos;s Phone Number ID, and click Activate!
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Have a client waiting for activation?
            </span>
            <Link
              href="/admin/numbers"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold shadow-2xs transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Go to WhatsApp Numbers Manager</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. CLIENT DASHBOARD (For Regular Users)
  // ==========================================
  return (
    <div className="space-y-6 pb-12">

      {/* 1. Official Meta WhatsApp Embedded Signup for Client */}
      <WhatsAppEmbeddedSignup
        initialConfig={waConfig}
        metaAppId={process.env.NEXT_PUBLIC_META_APP_ID || "2068663130431385"}
        onConfigUpdated={() => fetchStats(true)}
      />

      {/* 2. Top Header & Action Bar (Clean & Seamless) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Dashboard Overview
            </h1>
            {isWhatsAppConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {waConfig?.displayPhoneNumber || "Active"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time delivery verification and campaign statistics
          </p>
        </div>

        {/* Date Filter & New Campaign Action */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Range Pills */}
          <div className="inline-flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            {(["today", "7days", "30days"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilterRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  filterRange === r
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {r === "today" ? "Today" : r === "7days" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition shadow-2xs cursor-pointer"
            title="Refresh statistics"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin text-slate-900" : ""}`} />
          </button>

          {/* Primary Create Campaign Button */}
          <Link
            href="/create-campaign"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition shadow-2xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Campaign</span>
          </Link>
        </div>
      </div>

      {/* 3. Core KPI Metric Cards (Matching Billing Cards Design) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Sent */}
        <div className="bg-white p-5 rounded-2xl border border-brand-soft shadow-card hover:shadow-md hover:border-brand-purple/40 hover:-translate-y-1 transition-all duration-300 ease-out group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted uppercase tracking-wider block">
              Total Sent
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-purple group-hover:text-white transition-all duration-300">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-brand-purple tracking-tight">
              {stats.totalSent.toLocaleString()}
            </div>
            <p className="text-xs text-slate-muted mt-1 font-medium">
              Messages dispatched
            </p>
          </div>
        </div>

        {/* Card 2: Delivered */}
        <div className="bg-white p-5 rounded-2xl border border-brand-soft shadow-card hover:shadow-md hover:border-brand-purple/40 hover:-translate-y-1 transition-all duration-300 ease-out group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted uppercase tracking-wider block">
              Delivered
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {stats.totalDelivered.toLocaleString()}
            </div>
            <p className="text-xs text-slate-muted mt-1 font-medium">
              Reached handsets
            </p>
          </div>
        </div>

        {/* Card 3: Read */}
        <div className="bg-white p-5 rounded-2xl border border-brand-soft shadow-card hover:shadow-md hover:border-brand-purple/40 hover:-translate-y-1 transition-all duration-300 ease-out group cursor-default">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted uppercase tracking-wider block">
              Read
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-blue group-hover:text-white transition-all duration-300">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-brand-blue tracking-tight">
                {stats.totalRead.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-brand-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                {stats.readRate}%
              </span>
            </div>
            <p className="text-xs text-slate-muted mt-1 font-medium">
              Opened by customer
            </p>
          </div>
        </div>

        {/* Card 4: Failed */}
        <div
          onClick={() => setShowFailureModal(true)}
          className="bg-white p-5 rounded-2xl border border-brand-soft shadow-card hover:shadow-md hover:border-rose-300 hover:-translate-y-1 transition-all duration-300 ease-out group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-muted uppercase tracking-wider block group-hover:text-rose-600 transition-colors">
              Failed
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
              {stats.totalFailed.toLocaleString()}
            </div>
            <p className="text-xs text-rose-500 group-hover:text-rose-600 transition-colors mt-1 flex items-center gap-1 font-medium">
              <span>Click to view reasons</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </p>
          </div>
        </div>
      </div>

      {/* CAMPAIGN TABLE: Campaign name, date, Sent, Delivered, Read, Not Read, Failed, Read Rate % */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-soft pb-5">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-brand-purple" />
            <div>
              <h2 className="text-base font-bold text-text-main uppercase tracking-wider">
                Recent Campaigns & Delivery Stats
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Click any campaign row to inspect per-contact logs or trigger a resend to unread recipients.
              </p>
            </div>
          </div>

          <Link
            href="/campaigns"
            className="text-xs font-semibold text-brand-purple hover:text-brand-blue flex items-center gap-1 transition-colors group"
          >
            <span>View All Campaigns</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="space-y-6 py-2">
            <div className="p-5 rounded-2xl bg-brand-light/60 border border-brand-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-brand-purple flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-main">
                    Ready to Launch Your First WhatsApp Broadcast?
                  </h4>
                  <p className="text-xs text-slate-muted mt-0.5">
                    Follow these 3 easy steps to reach your customer audience with high open rates.
                  </p>
                </div>
              </div>

              <Link
                href="/create-campaign"
                className="px-5 py-2.5 rounded-xl bg-[#5A237A] hover:bg-[#471A62] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all self-start sm:self-auto cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Launch First Campaign</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft hover:border-brand-purple/40 hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider block mb-1">
                  Step 1
                </span>
                <h4 className="text-base font-bold text-text-main">
                  Upload Audience List
                </h4>
                <p className="text-xs text-slate-muted mt-1 leading-relaxed">
                  Import an Excel or CSV file containing customer phone numbers and names.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft hover:border-brand-purple/40 hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider block mb-1">
                  Step 2
                </span>
                <h4 className="text-base font-bold text-text-main">
                  Select Meta Template
                </h4>
                <p className="text-xs text-slate-muted mt-1 leading-relaxed">
                  Choose pre-approved marketing offers or personalized greeting templates.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-brand-light/70 border border-brand-soft hover:border-brand-purple/40 hover:-translate-y-0.5 transition-all duration-200">
                <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider block mb-1">
                  Step 3
                </span>
                <h4 className="text-base font-bold text-text-main">
                  Send & Track Live
                </h4>
                <p className="text-xs text-slate-muted mt-1 leading-relaxed">
                  Watch real-time delivery double ticks and track customer read receipts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-medium text-xs">
                  <th className="py-3 px-4 font-medium">Campaign Name</th>
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Sent</th>
                  <th className="py-3 px-4 font-medium">Delivered</th>
                  <th className="py-3 px-4 font-medium">Read</th>
                  <th className="py-3 px-4 font-medium">Not Read</th>
                  <th className="py-3 px-4 font-medium">Failed</th>
                  <th className="py-3 px-4 font-medium">Read Rate</th>
                  <th className="py-3 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {recentCampaigns.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/campaigns/${c.id}`)}
                    className="hover:bg-slate-50/70 transition-colors duration-150 cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 group-hover:text-purple-600 transition-colors text-xs">
                        {c.name}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {c.type} • {c.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {c.sentCount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-emerald-600">
                      {c.deliveredCount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-blue-600">
                      {c.readCount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-500">
                      {c.notReadCount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-rose-600">
                      {c.failedCount?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 text-xs">
                          {c.readRate}%
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-purple-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, c.readRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Failure Reasons Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-brand-soft shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-brand-soft mb-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-6 h-6 text-rose-600" />
                <h3 className="font-heading font-bold text-text-main text-base">
                  Message Delivery Failure Reasons
                </h3>
              </div>
              <button
                onClick={() => setShowFailureModal(false)}
                className="p-1.5 rounded-xl hover:bg-brand-light text-slate-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-muted mb-4">
              These are the error responses received from Meta WhatsApp Cloud API during message transmission:
            </p>

            {failureReasons.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-muted bg-brand-light rounded-2xl">
                No failed messages recorded in this timeframe!
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {failureReasons.map((fr: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      {fr.code && (
                        <span className="font-mono font-bold text-rose-800 text-[10px] uppercase block mb-0.5">
                          Error Code: {fr.code}
                        </span>
                      )}
                      <span className="text-rose-900 font-medium">{fr.message}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 font-heading font-bold text-[10px] shrink-0">
                      {fr.count} msgs
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFailureModal(false)}
                className="px-5 py-2.5 rounded-xl bg-brand-light hover:bg-brand-soft text-text-main text-xs font-heading font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
