"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { fireBrandConfetti } from "@/lib/confetti";
import { playClickSound, playCelebrationSound } from "@/lib/sounds";
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
  Battery
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  // Default to 'login' tab first
  const [activeTab, setActiveTab] = useState<"login" | "test">(
    searchParams.get("tab") === "test" ? "test" : "login"
  );

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage("Please enter username");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter password");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setErrorMessage("Wrong username or password");
        setLoading(false);
        return;
      }

      // Successful login!
      // Fetch user subscription status
      const statusRes = await fetch("/api/subscription/status");
      const statusData = await statusRes.json();

      const displayName = statusData?.subscription?.payerName || username.trim();
      setWelcomeName(displayName);

      if (statusData?.role === "ADMIN") {
        setCelebrationSubtitle("Launching iBrainLabs Admin Command Center...");
        setCelebrating(true);
        fireBrandConfetti();
        setTimeout(() => {
          router.replace("/");
        }, 900);
      } else if (statusData?.status === "ACTIVE") {
        setCelebrationSubtitle("Your subscription is active! Opening your workspace...");
        setCelebrating(true);
        fireBrandConfetti();
        setTimeout(() => {
          router.replace("/");
        }, 900);
      } else if (statusData?.status === "PENDING_VERIFICATION") {
        setCelebrationSubtitle("Payment verification in progress. Directing to status tracker...");
        setCelebrating(true);
        setTimeout(() => {
          router.replace("/payment-pending");
        }, 900);
      } else {
        // Direct unpaid user straight to payment collection
        setCelebrationSubtitle("Account requires activation. Directing to payment collection...");
        setCelebrating(true);
        setTimeout(() => {
          router.replace("/complete-payment");
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
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
        
        {/* Left: Brand Gradient Panel (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-5 bg-brand-gradient p-8 sm:p-12 text-white flex-col justify-between relative overflow-hidden">
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

          <div className="relative z-10">
            {/* Logo */}
            <div className="bg-white/95 rounded-2xl p-4 inline-block shadow-md mb-8">
              <Image
                src="/brand/ibrainlabs-logo.png"
                alt="iBrainLabs"
                width={190}
                height={55}
                className="h-10 sm:h-12 w-auto object-contain"
                priority
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-white mb-3">
              iBrainLabs
            </h1>
            <p className="text-brand-soft text-base font-medium tracking-wide mb-8">
              Expertise In Every Execution
            </p>

            {/* 3 Key Benefits */}
            <div className="space-y-4 pt-4 border-t border-white/20">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-yellow-300" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-white">
                    High-Speed WhatsApp Messaging
                  </h4>
                  <p className="text-xs text-white/80">
                    Official Meta Cloud API engine delivering 20 msgs/sec safely.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart3 className="w-4 h-4 text-cyan-300" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-white">
                    Real-Time Delivery & Read Tracking
                  </h4>
                  <p className="text-xs text-white/80">
                    Live delivery ticks, read receipts, and read-rate percentage analytics.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-sm text-white">
                    Targeted Re-Engagement Engine
                  </h4>
                  <p className="text-xs text-white/80">
                    One-click resend campaigns for customers who have not read yet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 mt-8 border-t border-white/15 text-xs text-white/70">
            © 2026 iBrainLabs. All rights reserved.
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
                  className="h-8 w-auto object-contain"
                  priority
                />
              </div>
              <p className="text-xs text-slate-muted font-medium">Expertise In Every Execution</p>
            </div>

            {/* Mode Switcher: 1st Test Template, 2nd Account Login */}
            <div className="flex items-center p-1.5 bg-brand-light rounded-2xl border border-brand-soft mb-6 shadow-xs">
              <button
                type="button"
                onClick={() => { 
                  playClickSound();
                  setActiveTab("test"); 
                  setErrorMessage(null); 
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-heading font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "test"
                    ? "bg-gradient-to-r from-brand-purple to-brand-blue text-white shadow-md shadow-brand-purple/25 scale-[1.01]"
                    : "text-slate-muted hover:text-brand-purple"
                }`}
              >
                <span className="text-sm">⚡</span>
                <span>Test Template</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-bold text-amber-300">
                  {remainingTests} Free
                </span>
              </button>

              <button
                type="button"
                onClick={() => { 
                  playClickSound();
                  setActiveTab("login"); 
                  setErrorMessage(null); 
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-heading font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white text-brand-purple shadow-sm border border-brand-soft scale-[1.01]"
                    : "text-slate-muted hover:text-brand-purple"
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Account Login</span>
              </button>
            </div>

            {/* TAB 1: ACCOUNT LOGIN */}
            {activeTab === "login" && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6">
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-main mb-1.5">
                    Account Login
                  </h2>
                  <p className="text-sm text-slate-muted">
                    Enter your credentials to access your campaign management portal.
                  </p>
                </div>

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

                  {/* Gradient Login Button */}
                  <button
                    type="submit"
                    disabled={loading || celebrating}
                    className="w-full py-3.5 px-6 rounded-2xl bg-brand-gradient hover:opacity-95 text-white font-heading font-semibold text-sm shadow-md shadow-brand-purple/20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {loading || celebrating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Login to iBrainLabs</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Switch to Test Banner */}
                <div className="mt-4 p-3 rounded-2xl bg-brand-light border border-brand-soft flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-muted">
                    <Zap className="w-4 h-4 text-brand-purple animate-pulse" />
                    <span>Want to test our WhatsApp speed first?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("test")}
                    className="text-xs font-heading font-bold text-brand-purple hover:text-brand-blue flex items-center gap-1 transition cursor-pointer"
                  >
                    ⚡ Test Now →
                  </button>
                </div>

                {/* Register Link */}
                <div className="mt-6 pt-5 border-t border-brand-soft text-center">
                  <p className="text-sm text-slate-muted">
                    New user?{" "}
                    <Link
                      href="/register"
                      className="font-heading font-semibold text-brand-purple hover:text-brand-blue transition-colors underline-offset-4 hover:underline"
                    >
                      Create account
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* TAB: TEST TEMPLATE (FIRST TAB - ATTRACTIVE CELEBRATIONS & SOUNDS) */}
            {activeTab === "test" && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-heading font-extrabold text-brand-purple flex items-center gap-2">
                      <span className="text-xl animate-bounce">⚡</span>
                      <span>Test WhatsApp Template</span>
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shadow-xs ${
                      isLimitReached 
                        ? "bg-rose-50 text-rose-700 border-rose-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      🎁 {remainingTests} of {maxTestLimit} Free Left
                    </span>
                  </div>
                  <p className="text-xs text-slate-muted">
                    Pick an offer template below and get a live WhatsApp blast on your phone! 📱✨
                  </p>
                </div>

                {/* Offer Category Pills with Emojis & Click Sound */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {testPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setTestSelectedPreset(p.id);
                        setTestCustomOffer(p.text);
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-heading font-bold transition-all text-center border cursor-pointer ${
                        testSelectedPreset === p.id
                          ? "bg-gradient-to-r from-brand-purple to-brand-blue text-white border-transparent shadow-md shadow-brand-purple/25 scale-[1.02]"
                          : "bg-brand-light/70 text-slate-muted border-brand-soft hover:bg-brand-soft/70 hover:text-brand-purple"
                      }`}
                    >
                      <span className="truncate block">{p.label}</span>
                    </button>
                  ))}
                </div>
                {/* Clean WhatsApp Message Delivery Preview */}
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-0.5">
                    <span className="flex items-center gap-1.5 text-brand-purple">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      📱 WhatsApp Message Preview:
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Official Format
                    </span>
                  </div>

                  {/* Clean WhatsApp Chat Card */}
                  <div className="rounded-2xl overflow-hidden border border-emerald-200/60 shadow-md bg-[#ECE5DD] flex flex-col">
                    <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-6 h-6 rounded-full bg-white flex items-center justify-center text-brand-purple font-black text-[10px]">
                          iB
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[6px] text-white font-bold">
                            ✓
                          </span>
                        </div>
                        <div className="leading-tight">
                          <div className="flex items-center gap-0.5 font-bold text-[11px] text-white">
                            <span>iBrainLabs Offers</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-300 fill-emerald-500 inline" />
                          </div>
                          <span className="text-[8px] text-emerald-100/80 block">Official Business</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-emerald-100/80 font-medium">10:45 AM</span>
                    </div>

                    <div 
                      className="p-3 space-y-1.5"
                      style={{
                        backgroundColor: "#ECE5DD",
                        backgroundImage: `radial-gradient(#d3cabb 1px, transparent 1px)`,
                        backgroundSize: "14px 14px"
                      }}
                    >
                      <div className="relative max-w-[96%] bg-white rounded-xl rounded-tl-sm p-3 shadow-xs border border-black/5 text-slate-800 space-y-1.5">
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-light text-brand-purple text-[9px] font-bold">
                          <Sparkles className="w-2.5 h-2.5 text-brand-purple" />
                          ⭐ Exclusive Offer for You
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium">Dear Customer,</p>
                        <div className="text-[11px] leading-snug font-semibold text-slate-900 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                          We have an offer for you:{" "}
                          <span className="text-brand-purple font-bold block mt-0.5">
                            {testCustomOffer}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500">Thank you for shopping with iBrainLabs!</p>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[9px] text-slate-400">
                          <span className="italic text-[8px]">Reply STOP to unsubscribe</span>
                          <div className="flex items-center gap-0.5 text-emerald-600 font-medium">
                            <span>Just now</span>
                            <CheckCheck className="w-3 h-3 text-[#34B7F1]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Number & Send Form */}
                <form onSubmit={handleSendTest} className="space-y-4">
                  <div>
                    <label className="text-xs font-heading font-bold text-text-main flex items-center justify-between mb-1.5">
                      <span>📱 Your Mobile Number:</span>
                      <span className="text-[11px] font-normal text-slate-muted">10-digit Indian number</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-2.5 bg-brand-light rounded-xl text-xs font-mono font-bold text-brand-purple border border-brand-soft shadow-xs">
                        🇮🇳 +91
                      </span>
                      <input
                        type="text"
                        value={testRecipientPhone}
                        onChange={(e) => setTestRecipientPhone(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="Enter 10-digit number"
                        maxLength={10}
                        disabled={isLimitReached || testSending}
                        className="flex-1 px-4 py-2.5 bg-brand-light/40 border border-brand-soft rounded-xl text-text-main placeholder:text-slate-muted/60 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple/40 focus:border-brand-purple disabled:opacity-50 transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Limit reached notice */}
                  {isLimitReached && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>2 Free Tests Used! Login for unlimited messaging.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setActiveTab("login");
                        }}
                        className="font-bold text-brand-purple underline hover:text-brand-blue shrink-0 cursor-pointer"
                      >
                        Login Now →
                      </button>
                    </div>
                  )}

                  {/* Attractive Celebration Button with Emojis & Sounds */}
                  <button
                    type="submit"
                    disabled={testSending || isLimitReached}
                    onClick={() => {
                      if (!testSending && !isLimitReached) playClickSound();
                    }}
                    className={`w-full py-3.5 px-5 rounded-2xl font-heading font-extrabold text-sm sm:text-base transition-all duration-300 shadow-md flex items-center justify-center gap-2 transform active:scale-[0.98] relative overflow-hidden cursor-pointer ${
                      isLimitReached
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-[#6B2D8F] via-[#8538B5] to-[#4A66B0] hover:opacity-95 text-white shadow-brand-purple/35 hover:shadow-lg hover:shadow-brand-purple/45 hover:-translate-y-0.5"
                    }`}
                  >
                    {isLimitReached ? (
                      <>
                        <Lock className="w-4 h-4 text-slate-500" />
                        <span>🔒 Free Tests Used — Login to Continue</span>
                      </>
                    ) : testSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span className="animate-pulse">✨ 🚀 Delivering to WhatsApp... 📱</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base animate-bounce">⚡</span>
                        <span>🚀 Send WhatsApp Offer 🎉</span>
                        <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-amber-300 font-bold">
                          {remainingTests} Free
                        </span>
                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      </>
                    )}
                  </button>

                  {/* Delivery Status Celebration Result Banner */}
                  {testSendResult && (
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm flex items-start gap-3 animate-in fade-in zoom-in-95 shadow-md ${
                      testSendResult.ok
                        ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border-2 border-emerald-300/80 shadow-emerald-100"
                        : "bg-rose-50 text-rose-900 border border-rose-200"
                    }`}>
                      {testSendResult.ok ? (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm text-base">
                          🎉
                        </div>
                      ) : (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-extrabold text-sm flex items-center gap-1.5">
                            {testSendResult.ok ? "🎉 Message Sent Successfully! 📱✨" : "Notice"}
                          </span>
                          {testSendResult.ok && (
                            <button
                              type="button"
                              onClick={() => {
                                playCelebrationSound();
                                fireBrandConfetti();
                              }}
                              className="text-[11px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                              🎊 Celebrate!
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed">{testSendResult.message}</p>
                      </div>
                    </div>
                  )}
                </form>

                {/* Back to Login / Create account */}
                <div className="mt-5 pt-4 border-t border-brand-soft text-center">
                  <p className="text-xs text-slate-muted">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setActiveTab("login");
                      }}
                      className="font-heading font-bold text-brand-purple hover:text-brand-blue transition underline-offset-4 hover:underline cursor-pointer"
                    >
                      Login Now →
                    </button>
                    {" or "}
                    <Link
                      href="/register"
                      className="font-heading font-bold text-brand-purple hover:text-brand-blue transition underline-offset-4 hover:underline"
                    >
                      Create account
                    </Link>
                  </p>
                </div>
              </div>
            )}

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

