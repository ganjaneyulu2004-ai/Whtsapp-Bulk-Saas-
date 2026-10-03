"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { fireBrandConfetti } from "@/lib/confetti";
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
  AlertCircle
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Celebration state
  const [celebrating, setCelebrating] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

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

      // Successful login celebration!
      // Fetch user and subscription status
      const statusRes = await fetch("/api/subscription/status");
      const statusData = await statusRes.json();

      const displayName = statusData?.subscription?.payerName || username.trim();
      setWelcomeName(displayName);
      setCelebrating(true);
      fireBrandConfetti();

      // Hold for 1.5 seconds celebration animation, then navigate
      setTimeout(() => {
        if (statusData?.role === "ADMIN") {
          router.replace("/");
        } else if (statusData?.status === "ACTIVE") {
          router.replace("/");
        } else if (statusData?.status === "PENDING_VERIFICATION") {
          router.replace("/payment-pending");
        } else {
          router.replace("/complete-payment");
        }
      }, 1500);
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 circuit-svg-bg relative overflow-hidden">
      {/* Background Circuit Ambient Glows */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      {/* Celebration Overlay Modal */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-purple/20 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-white border-2 border-brand-soft shadow-2xl rounded-3xl p-8 max-w-md w-full mx-4 text-center transform transition-all">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white mb-5 shadow-lg shadow-brand-purple/30 animate-bounce">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-brand-purple mb-2">
              Welcome back, {welcomeName}! 🎉
            </h2>
            <p className="text-slate-muted text-sm font-medium">
              Signing you into iBrainLabs workspace...
            </p>
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
            </div>
          </div>
        </div>
      )}

      {/* Main Split Layout Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-card border border-brand-soft overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* Left: Brand Gradient Panel (Desktop) */}
        <div className="lg:col-span-5 bg-brand-gradient p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
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

        {/* Right: Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Mobile Logo display */}
            <div className="lg:hidden mb-6 flex items-center justify-center">
              <div className="bg-brand-light p-3 rounded-2xl border border-brand-soft">
                <Image
                  src="/brand/ibrainlabs-logo.png"
                  alt="iBrainLabs"
                  width={160}
                  height={48}
                  className="h-9 w-auto object-contain"
                  priority
                />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-text-main mb-2">
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
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
                <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-2">
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
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-muted hover:text-brand-purple transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
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

            {/* Register Link */}
            <div className="mt-8 pt-6 border-t border-brand-soft text-center">
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

