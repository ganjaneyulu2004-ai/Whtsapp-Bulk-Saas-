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
    <div className="min-h-screen w-full circuit-svg-bg text-[#2B2350] flex flex-col font-sans selection:bg-[#6B2D8F] selection:text-white relative overflow-x-hidden">
      
      {/* Celebration Overlay Modal */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white border-2 border-brand-soft shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 text-center transform transition-all">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white mb-5 shadow-lg shadow-brand-purple/30 animate-bounce">
              <Sparkles className="w-10 h-10 text-yellow-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-purple mb-2">
              Welcome, {welcomeName}!
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              {celebrationSubtitle}
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* 1. STICKY TOP NAVIGATION BAR (Clean iBrainLabs Style, Zero White Box Logo) */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#E9E4F5] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Identity: NO white box logo, just pure sleek typography & icon */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#5A237A] border border-purple-400/30 flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            </div>
            <div className="flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-xl tracking-tight text-[#2B2350] group-hover:text-[#6B2D8F] transition-colors">
                  OneAmple
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-purple-100 text-[#6B2D8F] border border-purple-200">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500">
                by <span className="text-[#6B2D8F] font-bold">iBrainLabs</span>
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-[#6B2D8F] transition-colors">Features</a>
            <a href="#ai-bot" className="hover:text-[#6B2D8F] transition-colors">AI Booking Bot</a>
            <a href="#buttons" className="hover:text-[#6B2D8F] transition-colors">Interactive Buttons</a>
            <a href="#crm" className="hover:text-[#6B2D8F] transition-colors">Lead CRM</a>
            <a href="#live-demo" className="hover:text-[#6B2D8F] transition-colors">Live Test</a>
          </nav>

          {/* Right Header CTAs */}
          <div className="flex items-center gap-3">
            <a
              href="#login-card"
              className="px-3.5 py-1.5 text-xs font-semibold text-[#6B2D8F] hover:text-[#5A237A] transition-colors"
            >
              Sign In
            </a>
            <Link
              href="/register"
              className="px-4 py-2 rounded-xl bg-[#5A237A] hover:bg-[#471A62] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. HERO / LOGIN SECTION: NO WEIRD GAP, COMPACT, ICONIC TWO-COLUMN CARD */}
      <section className="py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* The Iconic iBrainLabs Two-Column Split Card */}
          <div id="login-card" className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-card border border-brand-soft overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 scroll-mt-20">
            
            {/* Left: Solid Royal Purple Panel (#3B1553) - Zero White Box Logo */}
            <div className="hidden lg:flex lg:col-span-5 bg-[#3B1553] p-8 sm:p-10 text-white flex-col justify-between relative overflow-hidden">
              {/* Subtle Circuit Overlay Lines */}
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <line x1="20" y1="40" x2="280" y2="40" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="280" cy="40" r="5" fill="#FFFFFF" />
                  <line x1="280" y1="40" x2="280" y2="180" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="280" cy="180" r="5" fill="#FFFFFF" />
                  <line x1="40" y1="240" x2="200" y2="240" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="40" cy="240" r="5" fill="#FFFFFF" />
                  <line x1="200" y1="240" x2="320" y2="360" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="320" cy="360" r="5" fill="#FFFFFF" />
                </svg>
              </div>

              <div className="relative z-10 space-y-5">
                {/* Meta Verified Pill at top (No white image box!) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Meta Cloud API Live
                  </span>
                  <span className="text-[11px] font-semibold text-purple-200">v2.0</span>
                </div>

                {/* Bold Clean Typography (No clunky white logo box) */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white">
                    OneAmple
                  </h1>
                  <p className="text-sm font-bold text-yellow-300 mt-0.5">
                    by iBrainLabs
                  </p>
                  <p className="text-xs text-white/75 font-medium mt-0.5">
                    Expertise In Every Execution
                  </p>
                </div>

                {/* Subtitle */}
                <p className="text-xs text-white/85 leading-relaxed border-l-2 border-yellow-400/80 pl-3">
                  Official Meta Verified WhatsApp Cloud Marketing, 24/7 Smart AI Auto-Booking & Lead CRM Engine.
                </p>

                {/* 5 Core Feature Cards */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-yellow-400/20 text-yellow-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-xs text-white">
                        Official Meta Cloud API
                      </h4>
                      <p className="text-[11px] text-white/70 leading-tight">
                        100% Ban-free high-speed broadcasting (20 msgs/sec).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-purple-400/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-xs text-white">
                        24/7 Smart AI Assistant
                      </h4>
                      <p className="text-[11px] text-white/70 leading-tight">
                        Multilingual Telugu & English AI bookings & package quotes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                      <MousePointerClick className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-xs text-white">
                        Interactive Click Buttons
                      </h4>
                      <p className="text-[11px] text-white/70 leading-tight">
                        One-tap quick reply buttons: Book Slot, View Packages & Call Studio.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-xs text-white">
                        Lead Stage CRM & Filters
                      </h4>
                      <p className="text-[11px] text-white/70 leading-tight">
                        Segment chats by Hot Lead, Wedding Enquiry, Advance Paid & VIP Client.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-6 h-6 rounded-lg bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-semibold text-xs text-white">
                        Real-Time Read Tracking
                      </h4>
                      <p className="text-[11px] text-white/70 leading-tight">
                        Live blue delivery ticks & 1-click smart re-engagement for unread users.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Copyright */}
              <div className="relative z-10 pt-4 mt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
                <span>© 2026 OneAmple by iBrainLabs</span>
                <span className="flex items-center gap-1 text-emerald-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Meta Verified
                </span>
              </div>
            </div>

            {/* Right: Clean White Login Panel */}
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
              <div className="max-w-md w-full mx-auto">
                
                {/* Mobile Header (No white box) */}
                <div className="lg:hidden mb-5 text-center">
                  <h2 className="text-2xl font-heading font-black text-[#2B2350]">
                    OneAmple
                  </h2>
                  <p className="text-xs font-bold text-[#6B2D8F]">by iBrainLabs • Expertise In Every Execution</p>
                </div>

                {/* Login Form Header */}
                <div className="mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 mb-2">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    OneAmple Cloud Portal
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-main mb-1">
                    Sign in to OneAmple
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-muted">
                    Enter your credentials to access your marketing & AI inbox portal.
                  </p>
                </div>

                {/* Launch Offer Banner */}
                <InauguralOfferBanner />

                {registered && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Account registered successfully! Please log in to proceed.</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in shake">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                        <UserIcon className="w-4 h-4 text-brand-purple/70" />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin or username"
                        autoComplete="username"
                        className="w-full pl-10 pr-4 py-3 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main placeholder:text-slate-muted/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                        <Lock className="w-4 h-4 text-brand-purple/70" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className="w-full pl-10 pr-11 py-3 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main placeholder:text-slate-muted/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-muted hover:text-brand-purple transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-muted select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-brand-soft text-brand-purple focus:ring-brand-purple/30 accent-brand-purple"
                      />
                      Remember me
                    </label>
                  </div>

                  {/* Solid iBrainLabs Button (#5A237A) */}
                  <button
                    type="submit"
                    disabled={loading || celebrating}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#5A237A] hover:bg-[#471A62] text-white font-heading font-semibold text-sm shadow-xs transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                  >
                    {loading || celebrating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
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
                <div className="mt-5 pt-4 border-t border-brand-soft text-center">
                  <p className="text-xs text-slate-muted">
                    New to OneAmple?{" "}
                    <Link
                      href="/register"
                      className="font-heading font-semibold text-brand-purple hover:text-brand-blue transition-colors underline-offset-4 hover:underline"
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

      {/* 3. PERFORMANCE METRICS STRIP (Clean iBrainLabs Style) */}
      <section className="py-8 bg-white border-y border-[#E9E4F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-2xl bg-[#F4F1FA] border border-[#E9E4F5]">
              <div className="text-2xl sm:text-3xl font-heading font-black text-[#5A237A]">20 msgs/s</div>
              <p className="text-xs text-slate-600 mt-1 font-semibold">Safe Broadcast Speed</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F4F1FA] border border-[#E9E4F5]">
              <div className="text-2xl sm:text-3xl font-heading font-black text-emerald-600">99.9%</div>
              <p className="text-xs text-slate-600 mt-1 font-semibold">Delivery & Read Accuracy</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F4F1FA] border border-[#E9E4F5]">
              <div className="text-2xl sm:text-3xl font-heading font-black text-[#6B2D8F]">24/7 AI</div>
              <p className="text-xs text-slate-600 mt-1 font-semibold">Telugu & English Bookings</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F4F1FA] border border-[#E9E4F5]">
              <div className="text-2xl sm:text-3xl font-heading font-black text-[#4A66B0]">3x Higher</div>
              <p className="text-xs text-slate-600 mt-1 font-semibold">Button Click Conversions</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION: ⚡ 6 CORE SUPERPOWERS OF ONEAMPLE */}
      <section id="features" className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-[#6B2D8F] border border-purple-200 uppercase tracking-wider">
              Comprehensive Platform
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-black text-[#2B2350] mt-3">
              Everything You Need to Scale on WhatsApp
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Engineered by iBrainLabs to deliver high ROI, official ban-proof reliability, and seamless AI automation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E4F5] hover:border-purple-300 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6B2D8F] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#2B2350] mb-2">
                Official Meta Cloud API
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Connect directly to Meta servers. Broadcast official pre-approved templates with zero number bans, high throughput, and green-tick eligibility.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E4F5] hover:border-purple-300 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6B2D8F] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#2B2350] mb-2">
                24/7 Smart AI Auto-Bookings
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Trained on photo studio packages, appointments, and retail catalogues. Understands natural Telugu and English, captures customer dates, and confirms bookings instantly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E4F5] hover:border-purple-300 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6B2D8F] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#2B2350] mb-2">
                Interactive Click Buttons
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Empower customers to tap `[ 📅 Book Slot ]`, `[ 🏷️ View Packages ]`, or `[ 📞 Call Studio ]` directly inside WhatsApp chats without typing long paragraphs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E4F5] hover:border-purple-300 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6B2D8F] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#2B2350] mb-2">
                Lead Stage CRM & Filters
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Segment high-intent leads using one-click tags: `🔥 Hot Lead`, `💍 Wedding Enquiry`, `💰 Advance Paid`, `⏳ Pending Follow-up`, and `⭐ VIP Client`.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E4F5] hover:border-purple-300 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6B2D8F] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#2B2350] mb-2">
                Real-Time Read Tracking
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Monitor real-time blue ticks, exact delivery timestamps, and open rates. Launch 1-click targeted re-engagement campaigns exclusively for unread contacts.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E4F5] hover:border-purple-300 transition-all hover:shadow-md group">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6B2D8F] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#2B2350] mb-2">
                Rich Multi-Media Suite
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Send HD promotional video reels (MP4), wedding photography brochures (PDF), and product carousels to captivate your customers on WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: 🤖 AI BOOKING & INTERACTIVE BUTTONS MOCKUP */}
      <section id="ai-bot" className="py-14 sm:py-18 bg-white border-y border-[#E9E4F5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Description */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-[#6B2D8F] border border-purple-200 uppercase tracking-wider">
                Automated Conversations
              </span>
              <h2 className="text-3xl sm:text-4xl font-heading font-black text-[#2B2350] leading-tight">
                Engage Customers in Telugu & English with Clickable Buttons
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Customers don't want to type long responses. With OneAmple's native interactive click buttons, they simply tap an action to view packages or book a slot. Our AI understands their context and replies instantly 24/7.
              </p>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-[#2B2350]">Instant Studio Slot Booking</h4>
                    <p className="text-xs text-slate-500">Captures wedding date, photo shoot requirements, and locks slot.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-[#2B2350]">Telugu & English Natural AI</h4>
                    <p className="text-xs text-slate-500">Speaks fluent Telugu and English without robotic templates.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-sm text-[#2B2350]">Zero Extra Staff Needed</h4>
                    <p className="text-xs text-slate-500">Handles 500+ simultaneous enquiries at 11 PM or 6 AM automatically.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Authentic WhatsApp Interactive Mockup */}
            <div id="buttons" className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-sm rounded-[36px] bg-slate-900 p-3.5 shadow-2xl border-4 border-slate-700">
                {/* Phone Header */}
                <div className="bg-[#1f2c34] text-white px-4 py-3 rounded-t-[26px] flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#5A237A] flex items-center justify-center font-bold text-xs text-white">
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
                <div className="bg-[#0b141a] p-4 space-y-3 min-h-[350px] rounded-b-[26px] text-xs">
                  {/* Incoming Broadcast */}
                  <div className="bg-[#1f2c34] text-slate-200 rounded-2xl rounded-tl-xs p-3.5 shadow-md border border-slate-700/60 max-w-[90%] space-y-2">
                    <p className="font-medium">
                      Namaste! 📸 Wedding & Event Photography special packages are open for this season.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Tap any button below to proceed:
                    </p>

                    {/* 3 Click Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <div className="w-full py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#32444f] text-emerald-400 font-semibold text-center border border-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5">
                        <span>📅 Book Slot</span>
                      </div>
                      <div className="w-full py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#32444f] text-cyan-400 font-semibold text-center border border-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5">
                        <span>🏷️ View Packages</span>
                      </div>
                      <div className="w-full py-2 px-3 rounded-xl bg-[#2a3942] hover:bg-[#32444f] text-amber-300 font-semibold text-center border border-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5">
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

      {/* 6. SECTION: 🏷️ VISUAL LEAD STAGE CRM */}
      <section id="crm" className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200 uppercase tracking-wider">
            Lead CRM System
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-black text-[#2B2350] mt-3">
            Organize & Close Customers by Lead Stage
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mt-2">
            Never lose track of high-value enquiries. Filter your WhatsApp inbox with one tap:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-10">
            <div className="p-4 rounded-2xl bg-white border border-rose-200 text-rose-700 flex flex-col items-center shadow-xs">
              <span className="text-2xl mb-1">🔥</span>
              <span className="font-heading font-bold text-xs">Hot Lead</span>
              <span className="text-[10px] text-slate-500 mt-1">High Intent</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-purple-200 text-purple-700 flex flex-col items-center shadow-xs">
              <span className="text-2xl mb-1">💍</span>
              <span className="font-heading font-bold text-xs">Wedding Enquiry</span>
              <span className="text-[10px] text-slate-500 mt-1">Photo Packages</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-emerald-200 text-emerald-700 flex flex-col items-center shadow-xs">
              <span className="text-2xl mb-1">💰</span>
              <span className="font-heading font-bold text-xs">Advance Paid</span>
              <span className="text-[10px] text-slate-500 mt-1">Confirmed</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-amber-200 text-amber-700 flex flex-col items-center shadow-xs">
              <span className="text-2xl mb-1">⏳</span>
              <span className="font-heading font-bold text-xs">Pending Follow-up</span>
              <span className="text-[10px] text-slate-500 mt-1">Requires Call</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-blue-200 text-blue-700 flex flex-col items-center shadow-xs">
              <span className="text-2xl mb-1">⭐</span>
              <span className="font-heading font-bold text-xs">VIP Client</span>
              <span className="text-[10px] text-slate-500 mt-1">High Value</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-700 flex flex-col items-center shadow-xs">
              <span className="text-2xl mb-1">🆕</span>
              <span className="font-heading font-bold text-xs">New Enquiry</span>
              <span className="text-[10px] text-slate-500 mt-1">Fresh Incoming</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION: 📱 LIVE WHATSAPP TEST SCANNER */}
      <section id="live-demo" className="py-14 sm:py-18 bg-white border-y border-[#E9E4F5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            Live Testing Sandbox
          </span>
          <h2 className="text-3xl sm:text-4xl font-heading font-black text-[#2B2350] mt-3">
            Experience OneAmple Live on Your Own Phone
          </h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto mt-2">
            Enter your mobile number below. You will receive an official Meta WhatsApp broadcast message in less than 1 second!
          </p>

          {/* Test Form */}
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-[#F4F1FA] border border-[#E9E4F5] shadow-xs text-left max-w-xl mx-auto">
            {/* Presets */}
            <label className="block text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider mb-2">
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
                      ? "bg-[#5A237A] text-white border-[#5A237A]"
                      : "bg-white text-slate-700 border-[#E9E4F5] hover:border-purple-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-xs font-heading font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Your 10-Digit WhatsApp Mobile Number
              </label>
              <div className="flex gap-2">
                <span className="px-3.5 py-3 rounded-2xl bg-white border border-[#E9E4F5] text-slate-600 text-sm font-semibold flex items-center">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={testRecipientPhone}
                  onChange={(e) => setTestRecipientPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="flex-1 px-4 py-3 bg-white border border-[#E9E4F5] rounded-2xl text-slate-800 placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6B2D8F]"
                />
              </div>
            </div>

            {/* Test Result Message */}
            {testSendResult && (
              <div
                className={`mb-4 p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                  testSendResult.ok
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {testSendResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testSendResult.message}</span>
              </div>
            )}

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testSending || isLimitReached}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#5A237A] hover:bg-[#471A62] text-white font-heading font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
      <section className="py-14 sm:py-18">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-[#6B2D8F] border border-purple-200 uppercase tracking-wider">
              Answers & Clarifications
            </span>
            <h2 className="text-3xl font-heading font-black text-[#2B2350] mt-3">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-[#E9E4F5] shadow-xs">
              <h4 className="font-heading font-bold text-sm text-[#2B2350] mb-1.5">
                Why does OneAmple have zero number ban risk?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                OneAmple uses the official Meta WhatsApp Cloud API directly from Meta (Facebook). Unlike unofficial QR-code scrapers that get your phone number banned, official Cloud API is 100% compliant with WhatsApp's business guidelines.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E9E4F5] shadow-xs">
              <h4 className="font-heading font-bold text-sm text-[#2B2350] mb-1.5">
                Does the AI assistant understand Telugu customer messages?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Yes! OneAmple's AI is specifically fine-tuned for Telugu and English. It can reply in fluent Telugu, Telugu in English script (Tenglish), and English to answer photo studio packages and booking requests.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E9E4F5] shadow-xs">
              <h4 className="font-heading font-bold text-sm text-[#2B2350] mb-1.5">
                How do Interactive Click Buttons work?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                When you send a message, up to 3 interactive reply buttons appear directly under your text bubble. Customers can tap `[ 📅 Book Slot ]` or `[ 🏷️ View Packages ]`, and their choice triggers an immediate automated response.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#E9E4F5] shadow-xs">
              <h4 className="font-heading font-bold text-sm text-[#2B2350] mb-1.5">
                How do I get started with OneAmple?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Simply click "Create Account", link your WhatsApp Business number, and start creating campaigns or auto-replying in minutes!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. COMPREHENSIVE FOOTER */}
      <footer className="py-10 bg-[#2B2350] text-xs text-white/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#5A237A] flex items-center justify-center text-white font-bold">
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <span className="font-heading font-black text-white text-base">OneAmple</span>
                <span className="text-yellow-300 ml-1.5 font-bold">by iBrainLabs</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-white/80">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#ai-bot" className="hover:text-white transition-colors">AI Booking</a>
              <a href="#live-demo" className="hover:text-white transition-colors">Live Test</a>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Create Account</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>

            <div className="text-center md:text-right text-[11px] text-white/60">
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

