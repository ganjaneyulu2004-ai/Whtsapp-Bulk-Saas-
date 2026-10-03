"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  User, 
  Store, 
  Phone, 
  Lock, 
  AtSign, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    businessName: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError("Please enter your name");
    if (!form.businessName.trim()) return setError("Please enter your business name");
    if (!form.mobile.trim()) return setError("Please enter your mobile number");
    if (!form.username.trim()) return setError("Please choose a username");
    if (!form.password) return setError("Please enter a password");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match");

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Success -> Redirect to login
      router.push("/login?registered=1");
    } catch (err: any) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 circuit-svg-bg relative">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-card border border-brand-soft p-8 sm:p-10 relative z-10">
        
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-brand-light p-3 rounded-2xl border border-brand-soft mb-4">
            <Image
              src="/brand/ibrainlabs-logo.png"
              alt="iBrainLabs"
              width={180}
              height={50}
              className="h-10 w-auto object-contain mx-auto"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-main">
            Create iBrainLabs Account
          </h1>
          <p className="text-sm text-slate-muted mt-1">
            Start reaching customers with high-delivery WhatsApp campaigns.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name & Business Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                  <User className="w-4 h-4 text-brand-purple/70" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                Business Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                  <Store className="w-4 h-4 text-brand-purple/70" />
                </div>
                <input
                  type="text"
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Royal Silks Store"
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>
            </div>
          </div>

          {/* Mobile & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                  <Phone className="w-4 h-4 text-brand-purple/70" />
                </div>
                <input
                  type="tel"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                  <AtSign className="w-4 h-4 text-brand-purple/70" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g. rahul2026"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-muted hover:text-brand-purple"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-semibold text-text-main uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-muted">
                  <Lock className="w-4 h-4 text-brand-purple/70" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-text-main text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-brand-gradient hover:opacity-95 text-white font-heading font-semibold text-sm shadow-md shadow-brand-purple/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register & Continue to Subscription</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-brand-soft text-center">
          <p className="text-sm text-slate-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-heading font-semibold text-brand-purple hover:text-brand-blue transition-colors underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
