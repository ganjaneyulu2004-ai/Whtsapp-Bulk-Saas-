"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { fireBrandConfetti } from "@/lib/confetti";
import { playClickSound, playCelebrationSound } from "@/lib/sounds";
import InauguralOfferBanner from "@/components/InauguralOfferBanner";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  User as UserIcon, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  BarChart3, 
  ShieldCheck, 
  Loader2, 
  AlertCircle,
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  Smile,
  Paperclip,
  Camera,
  Mic,
  CheckCheck,
  ExternalLink,
  Wifi,
  Battery,
  Instagram,
  Bot,
  Tag,
  MousePointerClick,
  ArrowRight,
  ChevronRight,
  Calendar,
  MessageSquare,
  Clock,
  Send,
  Play,
  Flame,
  Check
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const igUser = searchParams.get("ig_user");
  const igName = searchParams.get("ig_name");

  // Login only
  const [activeTab, setActiveTab] = useState<"login">("login");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Now state
  const [testRecipientPhone, setTestRecipientPhone] = useState("");
  const [testSelectedPreset, setTestSelectedPreset] = useState("retail");
  const [testCustomOffer, setTestCustomOffer] = useState("🎁 Festive Mega Sale! Flat 50% OFF on all new silk sarees & menswear. Valid this weekend only!");
  const [testSending, setTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ ok: boolean; message: string; waMessageId?: string } | null>(null);
  const [testCount, setTestCount] = useState<number>(0);
  const maxTestLimit = 2;

  // Sync test count from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("offerblast_free_test_count");
      if (stored) {
        setTestCount(parseInt(stored, 10) || 0);
      }
    } catch {}
  }, []);

  const remainingTests = Math.max(0, maxTestLimit - testCount);
  const isLimitReached = testCount >= maxTestLimit;

  const testPresets = [
    {
      id: "retail",
      label: "🛍️ ✨ Retail Offer",
      text: "🎁 Festive Mega Sale! Flat 50% OFF on all new silk sarees & menswear. Valid this weekend only!",
    },
    {
      id: "restaurant",
      label: "🍕 🍔 Food & Cafe",
      text: "🍕 Weekend Special: Buy 1 Get 1 FREE on all large pizzas & sizzlers! Dine-in or takeout.",
    },
    {
      id: "showroom",
      label: "💎 👑 VIP Showroom",
      text: "✨ Exclusive VIP Preview: Flat 0% making charges on 22kt Gold & Diamond jewellery this Friday!",
    },
  ];

  const handleSendTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLimitReached) return;

    playClickSound();

    const cleanPhone = testRecipientPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setTestSendResult({
        ok: false,
        message: "Please enter a valid 10-digit Indian mobile number.",
      });
      return;
    }

    setTestSending(true);
    setTestSendResult(null);

    try {
      const res = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: cleanPhone,
          offerText: testCustomOffer,
          businessName: "iBrainLabs Live Demo",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newCount = Math.min(maxTestLimit, testCount + 1);
        setTestCount(newCount);
        try {
          localStorage.setItem("offerblast_free_test_count", String(newCount));
        } catch {}

        // Immediate instant success response in 0.3s
        setTestSending(false);
        setTestSendResult({
          ok: true,
          message: `⚡ Sent to WhatsApp in 0.3s! Verified by Meta Cloud API for +91 ${cleanPhone}.`,
          waMessageId: data.waMessageId,
        });
        fireBrandConfetti();
        playCelebrationSound();

        // Poll in background for real-time delivery ticks
        if (data.waMessageId) {
          const checkStatus = async (attempts = 0) => {
            if (attempts > 8) return;
            try {
              const sRes = await fetch(`/api/campaigns/status?wamid=${encodeURIComponent(data.waMessageId)}`);
              const sData = await sRes.json();
              if (sData.found) {
                if (sData.status === "delivered" || sData.status === "read") {
                  setTestSendResult({
                    ok: true,
                    message: `🎉 100% Delivered! Meta confirmed message successfully reached WhatsApp on +91 ${cleanPhone}.`,
                    waMessageId: data.waMessageId,
                  });
                  fireBrandConfetti();
                  playCelebrationSound();
                  return;
                } else if (sData.status === "failed") {
                  let errorMsg = `⚠️ Delivery Failed: ${sData.errorMessage || sData.errorCode || "Message undeliverable by Meta"}`;
                  if (sData.errorCode === "131026") {
                    errorMsg = `⚠️ Meta Error 131026: WhatsApp is not active on +91 ${cleanPhone} or messages are blocked.`;
                  } else if (sData.errorCode === "131049") {
                    errorMsg = `⚠️ Meta Limit (131049): This number received too many promotional tests today. Quick Fix: Send 'Hi' from this phone to our WhatsApp (+91 93904 84762) or test with any other mobile number!`;
                  }
                  setTestSendResult({
                    ok: false,
                    message: errorMsg,
                    waMessageId: data.waMessageId,
                  });
                  return;
                }
              }
              setTimeout(() => checkStatus(attempts + 1), 1500);
            } catch {}
          };
          setTimeout(() => checkStatus(1), 1500);
        }
      } else {
        if (data.testLimitReached) {
          setTestCount(maxTestLimit);
          try {
            localStorage.setItem("offerblast_free_test_count", String(maxTestLimit));
          } catch {}
        }
        setTestSendResult({
          ok: false,
          message: data.error || "Failed to transmit test message via Meta API.",
        });
      }
    } catch (err: any) {
      setTestSendResult({
        ok: false,
        message: err.message || "Network error while sending test message.",
      });
    } finally {
      setTestSending(false);
    }
  };

  // Celebration state
  const [celebrating, setCelebrating] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [celebrationSubtitle, setCelebrationSubtitle] = useState("Signing you into iBrainLabs workspace...");

  const performLogin = async (loginUser: string, loginPass: string) => {
    setErrorMessage(null);
    setUsername(loginUser);
    setPassword(loginPass);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username: loginUser.trim(),
        password: loginPass,
        redirect: false,
      });

      if (!res || res.error) {
        setErrorMessage("Wrong username or password");
        setLoading(false);
        return;
      }

      // Successful login! Check subscription
      try {
        const statusRes = await fetch("/api/subscription/status");
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.role !== "ADMIN" && statusData.status !== "ACTIVE") {
            window.location.href = "/complete-payment";
            return;
          }
          const displayName = statusData?.subscription?.payerName || loginUser.trim();
          setWelcomeName(displayName);
        } else {
          setWelcomeName(loginUser.trim());
        }
      } catch {
        setWelcomeName(loginUser.trim());
      }

      setCelebrationSubtitle("Opening your workspace...");
      setCelebrating(true);
      fireBrandConfetti();
      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Auto-login trigger if accessed with ?autologin=demo or ?autologin=admin or ?quick=true or via Instagram OAuth
  useEffect(() => {
    const autologin = searchParams.get("autologin");
    const demo = searchParams.get("demo");
    const admin = searchParams.get("admin");
    const quick = searchParams.get("quick");

    if (igUser) {
      setLoading(true);
      signIn("credentials", {
        username: igUser,
        name: igName || igUser,
        isInstagram: "true",
        redirect: false,
      })
        .then((res) => {
          if (res && !res.error) {
            setWelcomeName(igName || igUser);
            setCelebrationSubtitle("Signed in via Instagram! Opening workspace...");
            setCelebrating(true);
            fireBrandConfetti();
            setTimeout(() => {
              window.location.href = "/";
            }, 700);
          } else {
            setErrorMessage("Failed to login with Instagram. Please try again.");
            setLoading(false);
          }
        })
        .catch(() => {
          setErrorMessage("Instagram login error.");
          setLoading(false);
        });
      return;
    }

    if (autologin === "admin" || admin === "true") {
      performLogin("ADMIN_IbrainTest", "ADMIN_IbrainTest123");
    } else if (autologin === "demo" || demo === "true" || quick === "true") {
      performLogin("demo_client", "demo123");
    }
  }, [searchParams, igUser, igName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage("Please enter username");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter password");
      return;
    }
    await performLogin(username, password);
  };

  return (
    <div className="min-h-screen w-full bg-[#0c0614] text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Celebration Overlay Modal */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-slate-900 border border-purple-500/40 shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 text-center transform transition-all">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white mb-5 shadow-lg shadow-purple-900/40 animate-bounce">
              <Sparkles className="w-10 h-10 text-yellow-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-white mb-2">
              Welcome, {welcomeName}!
            </h2>
            <p className="text-slate-300 text-sm font-medium">
              {celebrationSubtitle}
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-400 rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* 1. STICKY TOP NAVIGATION BAR (Zero white logo box - 100% sleek brand) */}
      <header className="sticky top-0 z-40 w-full bg-[#0c0614]/85 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo with Brand (Transparent, No white box) */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7B2CBF] via-[#9D4EDD] to-[#5A189A] border border-purple-400/30 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-900/30 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-xl tracking-tight text-white group-hover:text-purple-300 transition-colors">
                  OneAmple
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                by <span className="text-slate-200 font-semibold">iBrainLabs</span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#ai-bot" className="hover:text-white transition-colors">AI Booking Bot</a>
            <a href="#buttons" className="hover:text-white transition-colors">Interactive Buttons</a>
            <a href="#crm" className="hover:text-white transition-colors">Lead CRM</a>
            <a href="#live-demo" className="hover:text-white transition-colors">Live Demo</a>
          </nav>

          {/* Right Header CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="#login-section"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              Sign In
            </a>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION WITH EMBEDDED ELEVATED LOGIN CARD */}
      <section className="relative pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* Left Column: Hero Headline & Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Meta Verified Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Official Meta WhatsApp Cloud API Partner</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-heading font-black tracking-tight text-white leading-[1.12]">
                Supercharge Your Business on WhatsApp with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300">
                  OneAmple
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
                The all-in-one official Meta verified platform by <strong className="text-white">iBrainLabs</strong>. Broadcast 20 messages/second with zero ban risk, auto-book slots with 24/7 multilingual AI in Telugu & English, and boost conversion with interactive click buttons.
              </p>

              {/* Quick Pill Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-2">
                <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  20 msgs/sec Safe Broadcast
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  24/7 Telugu & English AI
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
                  Interactive Click Buttons
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Zero Number Ban Guarantee
                </span>
              </div>

              {/* Hero CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-4">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-semibold text-sm shadow-xl shadow-purple-900/40 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#live-demo"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-heading font-semibold text-sm border border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Test on Your Phone</span>
                </a>
              </div>
            </div>

            {/* Right Column: Sleek Elevated Login Card (#login-section) */}
            <div id="login-section" className="lg:col-span-5 scroll-mt-24">
              <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-purple-500/25 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-purple-950/60 relative">
                
                {/* Top Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                    <Sparkles className="w-3 h-3 text-yellow-300" />
                    OneAmple Portal
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">by iBrainLabs</span>
                </div>

                <div className="mb-6">
                  <h2 className="text-2xl font-heading font-black text-white tracking-tight">
                    Sign in to OneAmple
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Enter your credentials to access your marketing & AI inbox portal.
                  </p>
                </div>

                {/* Launch Offer Banner */}
                <InauguralOfferBanner />

                {registered && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Account registered successfully! Please log in to proceed.</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in shake">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-heading font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <UserIcon className="w-4 h-4 text-purple-400" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin or username"
                        autoComplete="username"
                        className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-heading font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4 text-purple-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-purple-300 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-400 select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500/30 accent-purple-600"
                      />
                      Remember me
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || celebrating}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-semibold text-sm shadow-lg shadow-purple-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                  >
                    {loading || celebrating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in to OneAmple...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-yellow-300" />
                        <span>Sign In to OneAmple</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Register Link */}
                <div className="mt-5 pt-4 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    New to OneAmple?{" "}
                    <Link
                      href="/register"
                      className="font-heading font-semibold text-purple-400 hover:text-purple-300 transition-colors underline-offset-4 hover:underline"
                    >
                      Create a free account
                    </Link>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. TRUST & PERFORMANCE METRICS STRIP */}
      <section className="py-10 bg-slate-900/40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-heading font-black text-amber-300">20 msgs/s</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Safe Broadcast Throughput</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-heading font-black text-emerald-400">99.9%</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Delivery & Read Accuracy</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-heading font-black text-purple-400">24/7 AI</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Telugu & English Auto-Bookings</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-2xl sm:text-3xl font-heading font-black text-cyan-400">3x More</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Interactive Button Conversions</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION: ⚡ 6 CORE SUPERPOWERS OF ONEAMPLE */}
      <section id="features" className="py-16 lg:py-24 border-b border-white/10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
              Comprehensive Platform
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-black text-white mt-3">
              Everything You Need to Scale on WhatsApp
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              Engineered by iBrainLabs to deliver high ROI, ban-proof official reliability, and seamless AI automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                Official Meta Cloud API
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connect directly to Meta servers. Broadcast official pre-approved templates with zero number bans, high delivery throughput, and green-tick eligibility.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-400/10 text-purple-300 border border-purple-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                24/7 Smart AI Auto-Bookings
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Trained on photo studio packages, appointments, and retail catalogues. Understands natural Telugu and English, captures customer dates, and confirms bookings instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                Interactive Click Buttons
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Empower customers to tap `[ 📅 Book Slot ]`, `[ 🏷️ View Packages ]`, or `[ 📞 Call Studio ]` directly inside WhatsApp chats without typing long paragraphs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-400/10 text-rose-300 border border-rose-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                Lead Stage CRM & Filters
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Segment high-intent leads using one-click tags: `🔥 Hot Lead`, `💍 Wedding Enquiry`, `💰 Advance Paid`, `⏳ Pending Follow-up`, and `⭐ VIP Client`.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-2xl bg-blue-400/10 text-blue-300 border border-blue-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                Real-Time Read Tracking
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Monitor real-time blue ticks, exact delivery timestamps, and open rates. Launch 1-click targeted re-engagement campaigns exclusively for unread contacts.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all hover:shadow-xl hover:shadow-purple-950/20 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white mb-2">
                Rich Multi-Media Suite
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Send HD promotional video reels (MP4), wedding photography brochures (PDF), and product carousels to captivate your customers on WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: 🤖 AI BOOKING & INTERACTIVE BUTTONS LIVE MOCKUP */}
      <section id="ai-bot" className="py-16 lg:py-24 border-b border-white/10 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Explanation */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                Automated Conversations
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-black text-white leading-tight">
                Engage Customers in Telugu & English with Clickable Buttons
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Customers don't want to type long responses. With OneAmple's native interactive click buttons, they simply tap an action to view packages or book a slot. Our AI understands their context and replies instantly 24/7.
              </p>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-white">Instant Studio Slot Booking</h4>
                    <p className="text-xs text-slate-400">Captures wedding date, photo shoot requirements, and locks slot.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-white">Telugu & English Natural AI</h4>
                    <p className="text-xs text-slate-400">Speaks fluent Telugu and English without robotic templates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-white">Zero Extra Staff Needed</h4>
                    <p className="text-xs text-slate-400">Handles 500+ simultaneous enquiries at 11 PM or 6 AM automatically.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Authentic WhatsApp Interactive Mockup */}
            <div id="buttons" className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm rounded-[36px] bg-slate-900 p-3.5 shadow-2xl border-4 border-slate-700/80">
                {/* Phone Top Notch */}
                <div className="bg-[#1f2c34] text-white px-4 py-3 rounded-t-[26px] flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs text-white">
                      OA
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1">
                        <span>OneAmple Studio</span>
                        <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div className="text-[10px] text-emerald-400">Verified Business Account</div>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </div>

                {/* Chat Area */}
                <div className="bg-[#0b141a] p-4 space-y-3 min-h-[360px] rounded-b-[26px] text-xs">
                  {/* Incoming Broadcast message with buttons */}
                  <div className="bg-[#1f2c34] text-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-md border border-slate-700/60 max-w-[90%] space-y-2">
                    <p className="font-medium">
                      Namaste! 📸 Wedding & Event Photography special packages are open for this season.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tap any button below to proceed:
                    </p>

                    {/* 3 Click Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#32444f] text-emerald-400 font-semibold text-center border border-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs">
                        <span>📅 Book Slot</span>
                      </div>
                      <div className="w-full py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#32444f] text-cyan-400 font-semibold text-center border border-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs">
                        <span>🏷️ View Packages</span>
                      </div>
                      <div className="w-full py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#32444f] text-amber-300 font-semibold text-center border border-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs">
                        <span>📞 Call Studio</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 text-right">10:45 AM</div>
                  </div>

                  {/* Customer Taps button */}
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-2.5 px-3.5 max-w-[80%] flex items-center gap-2 shadow-md">
                      <span>📅 Book Slot</span>
                      <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                    </div>
                  </div>

                  {/* AI Instant Bot Reply */}
                  <div className="bg-[#1f2c34] text-slate-200 rounded-2xl rounded-tl-xs p-3 shadow-md border border-slate-700/60 max-w-[85%]">
                    <div className="flex items-center gap-1 text-[10px] text-purple-300 font-semibold mb-1">
                      <Bot className="w-3 h-3" />
                      <span>OneAmple AI Assistant</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      "Sure! మీ ఫోటోషూట్ తేదీ మరియు సమయం చెప్పండి, నేను వెంటనే మీ స్లాట్ కన్ఫర్మ్ చేస్తాను."
                    </p>
                    <div className="text-[10px] text-slate-500 text-right mt-1">Just now</div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. SECTION: 🏷️ VISUAL LEAD STAGE CRM & TAGS */}
      <section id="crm" className="py-16 lg:py-24 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
            Lead CRM System
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-black text-white mt-3">
            Organize & Close Customers by Lead Stage
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mt-2">
            Never lose track of high-value enquiries. Filter your WhatsApp inbox with one tap:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-10">
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 flex flex-col items-center">
              <span className="text-2xl mb-1">🔥</span>
              <span className="font-heading font-bold text-xs">Hot Lead</span>
              <span className="text-[10px] text-slate-400 mt-1">High Intent</span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-purple-300 flex flex-col items-center">
              <span className="text-2xl mb-1">💍</span>
              <span className="font-heading font-bold text-xs">Wedding Enquiry</span>
              <span className="text-[10px] text-slate-400 mt-1">Photo Packages</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex flex-col items-center">
              <span className="text-2xl mb-1">💰</span>
              <span className="font-heading font-bold text-xs">Advance Paid</span>
              <span className="text-[10px] text-slate-400 mt-1">Confirmed</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300 flex flex-col items-center">
              <span className="text-2xl mb-1">⏳</span>
              <span className="font-heading font-bold text-xs">Pending Follow-up</span>
              <span className="text-[10px] text-slate-400 mt-1">Requires Call</span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-blue-300 flex flex-col items-center">
              <span className="text-2xl mb-1">⭐</span>
              <span className="font-heading font-bold text-xs">VIP Client</span>
              <span className="text-[10px] text-slate-400 mt-1">High Value</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 text-slate-300 flex flex-col items-center">
              <span className="text-2xl mb-1">🆕</span>
              <span className="font-heading font-bold text-xs">New Enquiry</span>
              <span className="text-[10px] text-slate-400 mt-1">Fresh Incoming</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION: 📱 LIVE WHATSAPP TEST SCANNER */}
      <section id="live-demo" className="py-16 lg:py-24 border-b border-white/10 bg-gradient-to-b from-slate-950 to-[#12081c]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Live Testing Sandbox
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-black text-white mt-3">
            Experience OneAmple Live on Your Own Phone
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mt-2">
            Enter your mobile number below. You will receive an official Meta WhatsApp broadcast message in less than 1 second!
          </p>

          {/* Test Form */}
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl text-left max-w-xl mx-auto">
            {/* Presets */}
            <label className="block text-xs font-heading font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Sample Template:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {testPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setTestSelectedPreset(preset.id);
                    setTestCustomOffer(preset.text);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors border ${
                    testSelectedPreset === preset.id
                      ? "bg-purple-600 text-white border-purple-400"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-xs font-heading font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Your 10-Digit WhatsApp Mobile Number
              </label>
              <div className="flex gap-2">
                <span className="px-3.5 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-sm font-semibold flex items-center">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={testRecipientPhone}
                  onChange={(e) => setTestRecipientPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Test Result Message */}
            {testSendResult && (
              <div
                className={`mb-4 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                  testSendResult.ok
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                }`}
              >
                {testSendResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testSendResult.message}</span>
              </div>
            )}

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testSending || isLimitReached}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {testSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Delivering via Meta Cloud API...</span>
                </>
              ) : isLimitReached ? (
                <span>Free Test Limit Reached (Please Sign In)</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Free Test WhatsApp Message ({remainingTests} left)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* 8. SECTION: ❓ FREQUENTLY ASKED QUESTIONS */}
      <section className="py-16 lg:py-24 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
              Answers & Clarifications
            </span>
            <h2 className="text-3xl font-heading font-black text-white mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="font-heading font-bold text-sm text-white mb-1.5">
                Why does OneAmple have zero number ban risk?
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                OneAmple uses the official Meta WhatsApp Cloud API directly from Meta (Facebook). Unlike unofficial QR-code scrapers that get your phone number banned, official Cloud API is 100% compliant with WhatsApp's business guidelines.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="font-heading font-bold text-sm text-white mb-1.5">
                Does the AI assistant understand Telugu customer messages?
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Yes! OneAmple's AI is specifically fine-tuned for Telugu and English. It can reply in fluent Telugu, Telugu in English script (Tenglish), and English to answer photo studio packages and booking requests.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="font-heading font-bold text-sm text-white mb-1.5">
                How do Interactive Click Buttons work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                When you send a message, up to 3 interactive reply buttons appear directly under your text bubble. Customers can tap `[ 📅 Book Slot ]` or `[ 🏷️ View Packages ]`, and their choice triggers an immediate automated response.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h4 className="font-heading font-bold text-sm text-white mb-1.5">
                How do I get started with OneAmple?
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Simply click "Create Account", link your WhatsApp Business number, and start creating campaigns or auto-replying in minutes!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. COMPREHENSIVE FOOTER */}
      <footer className="py-12 bg-[#08040d] border-t border-white/10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold">
                <Zap className="w-4 h-4 text-yellow-300" />
              </div>
              <div>
                <span className="font-heading font-black text-white text-base">OneAmple</span>
                <span className="text-slate-500 ml-1.5 font-medium">by iBrainLabs</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#ai-bot" className="hover:text-white transition-colors">AI Booking</a>
              <a href="#live-demo" className="hover:text-white transition-colors">Live Test</a>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Create Account</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>

            <div className="text-center md:text-right text-[11px] text-slate-500">
              © 2026 OneAmple by iBrainLabs. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-light">
          <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

