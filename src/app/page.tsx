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
  Loader2
} from "lucide-react";
import FreeTrialScannerSection from "@/components/FreeTrialScannerSection";

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
      if (session.user?.role !== "ADMIN") {
        fetch("/api/subscription/status")
          .then((res) => res.json())
          .then((data) => {
            if (data?.status === "PENDING_VERIFICATION") {
              router.replace("/payment-pending");
            } else if (data?.status !== "ACTIVE") {
              router.replace("/complete-payment");
            }
          })
          .catch(() => {});
      }

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

  // PUBLIC HOME PAGE (When Not Logged In)
  if (!session) {
    return (
      <div className="space-y-10 pb-16">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-light border border-brand-soft text-brand-purple text-xs font-heading font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-brand-blue" />
            Official Meta Cloud API • 100% Anti-Ban Guarantee
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-text-main tracking-tight leading-tight">
            Send Real WhatsApp Offers to Customers at{" "}
            <span className="text-brand-purple">20 Msgs/Sec</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-muted max-w-2xl mx-auto leading-relaxed">
            The official WhatsApp marketing engine built for retail stores, restaurants, showrooms, and local businesses. 98% open rates with zero third-party ban risk.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="px-6 py-3 rounded-2xl bg-brand-gradient text-white font-heading font-bold text-sm shadow-md shadow-brand-purple/20 hover:opacity-95 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded-2xl bg-white border border-brand-soft text-brand-purple font-heading font-bold text-sm shadow-xs hover:bg-brand-light transition flex items-center gap-2"
            >
              Account Login
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* EXACT Free Trial Live WhatsApp Scanner Section (with Brand Colors & Direct Create Account/Login) */}
        <div id="live-demo" className="max-w-5xl mx-auto">
          <FreeTrialScannerSection maxTestLimit={2} showLoginRedirect={true} />
        </div>

        {/* 3 Pillar Features */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-6 bg-white rounded-3xl border border-brand-soft shadow-card space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-purple flex items-center justify-center">
              <Zap className="w-6 h-6 text-brand-purple" />
            </div>
            <h3 className="font-heading font-bold text-base text-text-main">
              Lightning-Fast Bulk Blasts
            </h3>
            <p className="text-xs text-slate-muted leading-relaxed">
              Broadcast festive sales, flash discounts, and VIP offers to thousands of customers simultaneously at 20 msgs/second.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-brand-soft shadow-card space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-blue flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-brand-blue" />
            </div>
            <h3 className="font-heading font-bold text-base text-text-main">
              100% Anti-Ban Guarantee
            </h3>
            <p className="text-xs text-slate-muted leading-relaxed">
              Verified directly through official Meta Cloud API. No risky third-party QR scanners, no phone disconnection, zero ban risk.
            </p>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-brand-soft shadow-card space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-light text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-heading font-bold text-base text-text-main">
              Live Delivery & Read Tracking
            </h3>
            <p className="text-xs text-slate-muted leading-relaxed">
              Watch messages deliver with real-time double ticks. Track who opened your offers and trigger 1-click follow-up blasts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED DASHBOARD (After Login - Test Button is completely removed)
  return (
    <div className="space-y-8 pb-12">

      {/* WhatsApp Easy Setup Callout Banner if not connected */}
      {!isWhatsAppConnected && !loading && (
        <div className="bg-gradient-to-r from-brand-900 via-brand-purple to-brand-blue rounded-3xl p-6 text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 text-2xl">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-heading text-white">
                  Connect Your Business WhatsApp in 2 Minutes
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-brand-900">
                  Easy Setup
                </span>
              </div>
              <p className="text-xs text-brand-100/90 mt-1">
                Link your phone number via official Meta Embedded Signup. Meta charges (~₹0.80/msg) are billed directly to your card with zero markups.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white text-brand-purple hover:bg-brand-50 transition shadow-sm flex items-center gap-2 shrink-0"
          >
            Connect WhatsApp Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* WhatsApp Connection Action Callout for Active Clients */}
      {!isWhatsAppConnected && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-brand-50 border-2 border-emerald-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-heading font-bold uppercase tracking-wider">
                  Next Step
                </span>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-slate-heading">
                  Subscription Active! Connect Your Business WhatsApp Number
                </h3>
              </div>
              <p className="text-xs text-slate-muted mt-1 max-w-xl">
                Link your official WhatsApp Business phone number via Meta Embedded Signup in Settings to start sending marketing offers and broadcasts.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-md transition-all shrink-0 flex items-center justify-center gap-2"
          >
            <span>Connect WhatsApp in Settings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Hero Welcome & Filter Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-brand-light text-brand-purple text-xs font-heading font-bold uppercase tracking-wider">
              WhatsApp Broadcast Hub
            </span>
            {isWhatsAppConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-heading font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                WhatsApp: {waConfig?.displayPhoneNumber || "Active"} • Direct Meta Billing
              </span>
            ) : (
              <span className="text-xs text-slate-muted">• Live Delivery Engine</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-main">
            Campaign Performance Dashboard
          </h1>
          <p className="text-sm text-slate-muted mt-1">
            Real-time delivery verification, read tracking, and customer conversion analytics.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
          <div className="flex items-center bg-brand-light p-1 rounded-2xl border border-brand-soft">
            <button
              onClick={() => setFilterRange("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer ${
                filterRange === "today"
                  ? "bg-white text-brand-purple shadow-xs"
                  : "text-slate-muted hover:text-text-main"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilterRange("7days")}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer ${
                filterRange === "7days"
                  ? "bg-white text-brand-purple shadow-xs"
                  : "text-slate-muted hover:text-text-main"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setFilterRange("30days")}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer ${
                filterRange === "30days"
                  ? "bg-white text-brand-purple shadow-xs"
                  : "text-slate-muted hover:text-text-main"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setFilterRange("custom")}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer ${
                filterRange === "custom"
                  ? "bg-white text-brand-purple shadow-xs"
                  : "text-slate-muted hover:text-text-main"
              }`}
            >
              Custom
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-brand-soft bg-white text-text-main hover:bg-brand-light shadow-xs flex items-center justify-center cursor-pointer transition-colors"
            title="Auto-refreshes every 30s. Click to refresh immediately."
          >
            <RotateCw className={`w-4 h-4 text-brand-purple ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker (conditionally shown) */}
      {filterRange === "custom" && (
        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-xs flex flex-wrap items-center gap-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-heading font-semibold text-text-main">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="p-2 rounded-xl bg-brand-light border border-brand-soft text-xs text-text-main"
            />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-heading font-semibold text-text-main">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="p-2 rounded-xl bg-brand-light border border-brand-soft text-xs text-text-main"
            />
          </div>
          <button
            onClick={() => fetchStats(true)}
            className="px-4 py-2 bg-brand-purple text-white text-xs font-heading font-bold rounded-xl"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-brand-light border border-brand-soft flex items-start gap-3 text-xs text-text-main">
        <Info className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
        <p>
          <strong className="text-brand-purple">WhatsApp Read Receipts Notice: </strong>
          Read status depends on customer's WhatsApp privacy settings – if read receipts are off, the message shows as Delivered.
        </p>
      </div>

      {/* TOP METRIC CARDS (2 per row on mobile, 6 across on desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {/* 1. Total Sent */}
        <div className="bg-white p-5 rounded-3xl border border-brand-soft shadow-card hover:border-brand-purple/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold text-slate-muted uppercase tracking-wider">
              Total Sent
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-light text-brand-purple flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-text-main">
              {stats.totalSent.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-muted block mt-0.5">
              Messages dispatched
            </span>
          </div>
        </div>

        {/* 2. Delivered ✓✓ */}
        <div className="bg-white p-5 rounded-3xl border border-brand-soft shadow-card hover:border-brand-purple/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold text-slate-muted uppercase tracking-wider flex items-center gap-1">
              Delivered <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-light text-brand-purple flex items-center justify-center">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-purple">
              {stats.totalDelivered.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-muted block mt-0.5">
              Reached handset
            </span>
          </div>
        </div>

        {/* 3. Read (Blue ✓✓) */}
        <div className="bg-white p-5 rounded-3xl border border-brand-soft shadow-card hover:border-brand-blue/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold text-brand-blue uppercase tracking-wider flex items-center gap-1">
              Read <CheckCheck className="w-3.5 h-3.5 text-brand-blue" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-blue">
              {stats.totalRead.toLocaleString()}
            </span>
            <span className="text-[11px] text-brand-blue/80 block mt-0.5">
              Opened by customer
            </span>
          </div>
        </div>

        {/* 4. Not Read (= delivered - read) */}
        <div className="bg-white p-5 rounded-3xl border border-brand-soft shadow-card hover:border-brand-purple/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold text-slate-muted uppercase tracking-wider">
              Not Read
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-light text-slate-muted flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-text-main">
              {stats.totalNotRead.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-muted block mt-0.5">
              Delivered, not read yet
            </span>
          </div>
        </div>

        {/* 5. Failed (Clickable) */}
        <div
          onClick={() => setShowFailureModal(true)}
          className="bg-white p-5 rounded-3xl border border-brand-soft shadow-card hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              Failed <HelpCircle className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-rose-600">
              {stats.totalFailed.toLocaleString()}
            </span>
            <span className="text-[11px] text-rose-700/80 block mt-0.5 underline decoration-rose-300 underline-offset-2">
              Click to view reasons
            </span>
          </div>
        </div>

        {/* 6. Read Rate % */}
        <div className="bg-white p-5 rounded-3xl border border-brand-soft shadow-card hover:border-brand-purple/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-heading font-bold text-slate-muted uppercase tracking-wider">
              Read Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-light text-brand-purple flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-purple">
              {stats.readRate}%
            </span>
            <div className="w-full bg-brand-soft rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-brand-gradient h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.readRate)}%` }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS & CAMPAIGN SHORTCUTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Launch Bulk Campaign Card */}
        <div className="bg-brand-gradient rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white mb-4 shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-heading font-bold mb-2">
              Launch Bulk Campaign
            </h3>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-md">
              Reach thousands of verified shoppers instantly using pre-approved WhatsApp templates and AI offer generator.
            </p>
          </div>

          <div className="relative z-10 pt-6">
            <Link
              href="/create-campaign"
              className="w-full sm:w-auto inline-flex items-center justify-center py-3.5 px-6 rounded-2xl bg-white text-brand-purple hover:bg-brand-light font-heading font-bold text-xs sm:text-sm gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Campaign</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Outreach Shortcuts Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="font-heading font-bold text-base text-text-main flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-brand-purple" />
              <span>Outreach Shortcuts</span>
            </h4>
            <p className="text-xs text-slate-muted mb-4">
              Quick access to your contact lists, customer live chats, and billing.
            </p>
            <div className="space-y-2.5">
              <Link
                href="/create-campaign"
                className="p-3.5 rounded-2xl bg-brand-light hover:bg-brand-soft/70 transition-colors flex items-center justify-between text-xs font-semibold text-text-main group"
              >
                <span className="group-hover:text-brand-purple transition-colors">📁 Upload CSV Contact List</span>
                <ChevronRight className="w-4 h-4 text-brand-purple" />
              </Link>
              <Link
                href="/inbox"
                className="p-3.5 rounded-2xl bg-brand-light hover:bg-brand-soft/70 transition-colors flex items-center justify-between text-xs font-semibold text-text-main group"
              >
                <span className="group-hover:text-brand-purple transition-colors">💬 Customer Chat Inbox</span>
                <ChevronRight className="w-4 h-4 text-brand-purple" />
              </Link>
              <Link
                href="/billing"
                className="p-3.5 rounded-2xl bg-brand-light hover:bg-brand-soft/70 transition-colors flex items-center justify-between text-xs font-semibold text-text-main group"
              >
                <span className="group-hover:text-brand-purple transition-colors">💳 Billing & Subscription</span>
                <ChevronRight className="w-4 h-4 text-brand-purple" />
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* CAMPAIGN TABLE: Campaign name, date, Sent, Delivered, Read, Not Read, Failed, Read Rate % */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-soft shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-heading font-bold text-text-main">
              Recent Campaigns & Delivery Stats
            </h2>
            <p className="text-xs text-slate-muted">
              Click any campaign row to inspect per-contact logs or trigger a resend to unread recipients.
            </p>
          </div>

          <Link
            href="/campaigns"
            className="text-xs font-heading font-bold text-brand-purple hover:text-brand-blue flex items-center gap-1"
          >
            <span>View All Campaigns</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-muted">
            No campaigns launched in this timeframe. Click "Create Campaign" to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-light/70 border-b border-brand-soft text-slate-muted uppercase font-heading font-semibold text-[11px]">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Sent</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4">Read</th>
                  <th className="py-3 px-4">Not Read</th>
                  <th className="py-3 px-4">Failed</th>
                  <th className="py-3 px-4">Read Rate %</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-soft text-text-main">
                {recentCampaigns.map((c: any) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/campaigns/${c.id}`)}
                    className="hover:bg-brand-light/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4">
                      <div className="font-heading font-bold text-text-main group-hover:text-brand-purple transition-colors text-sm">
                        {c.name}
                      </div>
                      <span className="text-[10px] text-slate-muted uppercase font-medium">
                        {c.type} • {c.status}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-muted">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-4 font-semibold text-text-main">
                      {c.sentCount}
                    </td>

                    <td className="py-4 px-4 font-semibold text-brand-purple">
                      {c.deliveredCount}
                    </td>

                    <td className="py-4 px-4 font-semibold text-brand-blue">
                      {c.readCount}
                    </td>

                    <td className="py-4 px-4 font-semibold text-text-main">
                      {c.notReadCount}
                    </td>

                    <td className="py-4 px-4 font-semibold text-rose-600">
                      {c.failedCount}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-brand-purple">
                          {c.readRate}%
                        </span>
                        <div className="w-16 bg-brand-soft rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-brand-purple h-full rounded-full"
                            style={{ width: `${Math.min(100, c.readRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-heading font-semibold text-brand-purple group-hover:translate-x-1 transition-transform">
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
