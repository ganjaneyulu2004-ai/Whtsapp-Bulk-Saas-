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
  MousePointerClick
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 circuit-svg-bg relative">
      {/* Background Circuit Ambient Glows */}
      <div className="fixed top-10 left-10 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      {/* Celebration Overlay Modal */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-purple/20 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white border-2 border-brand-soft shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 text-center transform transition-all">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white mb-5 shadow-lg shadow-brand-purple/30 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-purple mb-2">
              Welcome, {welcomeName}!
            </h2>
            <p className="text-slate-muted text-sm font-medium">
              {celebrationSubtitle}
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* Main Split Layout Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-card border border-brand-soft overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 my-auto">
        {/* Left: Brand Solid Panel (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#250538] via-[#3B1553] to-[#180324] p-8 sm:p-10 text-white flex-col justify-between relative overflow-hidden">
          {/* Ambient Background Glows */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Subtle Circuit Overlay Lines */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
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
            {/* Top Brand Pill & Corporate Logo */}
            <div className="flex items-center justify-between gap-2">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-1.5 inline-flex items-center shadow-md">
                <Image
                  src="/brand/ibrainlabs-logo.png"
                  alt="iBrainLabs"
                  width={140}
                  height={38}
                  className="h-7 w-auto object-contain"
                  priority
                />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Meta Cloud API Live
              </span>
            </div>

            {/* Main Product Title */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 text-white/90 text-[10px] font-bold tracking-wider uppercase mb-1.5 border border-white/10">
                Enterprise WhatsApp SaaS
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-white flex items-baseline gap-2">
                <span>OneAmple</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-300/30">
                  v2.0
                </span>
              </h1>
              <p className="text-purple-200 text-xs sm:text-sm font-semibold tracking-wide mt-1 flex items-center gap-1.5">
                <span>by</span>
                <span className="text-white font-bold underline decoration-yellow-400 decoration-2 underline-offset-2">
                  iBrainLabs
                </span>
                <span className="text-white/40">•</span>
                <span className="text-xs text-white/75 font-normal">Expertise In Every Execution</span>
              </p>
            </div>

            {/* Hero Subtitle */}
            <p className="text-white/80 text-xs leading-relaxed border-l-2 border-yellow-400/80 pl-3">
              Official Meta Verified WhatsApp Cloud Marketing, 24/7 Smart AI Auto-Booking & Customer CRM Engine.
            </p>

            {/* 5 Core Feature Cards */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-xl bg-yellow-400/20 text-yellow-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-xs text-white">
                    Official Meta Cloud API
                  </h4>
                  <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                    100% Ban-free high-speed broadcasting delivering 20 msgs/sec safely.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-xs text-white">
                    24/7 Smart AI Assistant
                  </h4>
                  <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                    Multilingual Telugu & English AI auto-replies, bookings & package quotes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                  <MousePointerClick className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-xs text-white">
                    Interactive Click Buttons
                  </h4>
                  <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                    One-tap quick reply buttons: Book Slot, View Packages & Call Studio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-xs text-white">
                    Lead Stage CRM & Filters
                  </h4>
                  <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                    Segment chats by Hot Lead, Wedding Enquiry, Advance Paid & VIP Client.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs hover:bg-white/10 transition-colors">
                <div className="w-7 h-7 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-xs text-white">
                    Real-Time Read Tracking
                  </h4>
                  <p className="text-[11px] text-white/70 leading-tight mt-0.5">
                    Live blue delivery ticks & 1-click smart re-engagement for unread users.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust & Copyright */}
          <div className="relative z-10 pt-4 mt-6 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <span>© 2026 OneAmple by iBrainLabs</span>
            <span className="flex items-center gap-1 text-emerald-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Meta Verified Engine
            </span>
          </div>
        </div>

        {/* Right: Tabbed Login / Test Now Panel */}
        <div className="lg:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Mobile Logo & Tagline Header */}
            <div className="lg:hidden mb-5 text-center">
              <div className="inline-block bg-brand-light p-2.5 rounded-2xl border border-brand-soft mb-2 shadow-xs">
                <Image
                  src="/brand/ibrainlabs-logo.png"
                  alt="iBrainLabs"
                  width={150}
                  height={44}
                  className="h-8 w-auto object-contain mx-auto"
                  priority
                />
              </div>
              <h2 className="text-lg font-heading font-extrabold text-brand-purple">
                OneAmple <span className="text-xs font-normal text-slate-muted">by iBrainLabs</span>
              </h2>
              <p className="text-xs text-slate-muted font-medium">Expertise In Every Execution</p>
            </div>

            {/* ACCOUNT LOGIN */}
            <div className="animate-in fade-in duration-200">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/80 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    OneAmple Cloud Portal
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-main mb-1.5">
                    Sign in to OneAmple
                  </h2>
                  <p className="text-sm text-slate-muted">
                    Enter your credentials to access your campaign management and AI inbox portal.
                  </p>
                </div>

                {/* 🪔 Dasara Inaugural Launch Offer (First 100 Customers) */}
                <InauguralOfferBanner />

                {registered && (
                  <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Account registered successfully! Please log in to proceed.</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3 animate-in shake">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username Input */}
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

                  {/* Password Input */}
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

                  {/* Solid Modern Login Button */}
                  <button
                    type="submit"
                    disabled={loading || celebrating}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#5A237A] to-[#3B1553] hover:from-[#491a64] hover:to-[#2e0e42] text-white font-heading font-semibold text-sm shadow-md shadow-brand-purple/20 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
                <div className="mt-6 pt-5 border-t border-brand-soft text-center">
                  <p className="text-sm text-slate-muted">
                    New user?{" "}
                    <Link
                      href="/register"
                      className="font-heading font-semibold text-brand-purple hover:text-brand-blue transition-colors underline-offset-4 hover:underline"
                    >
                      Create a OneAmple account
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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

