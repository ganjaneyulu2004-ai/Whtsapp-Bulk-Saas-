"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Sparkles, Loader2, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { fireBrandConfetti } from "@/lib/confetti";

function DemoLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "user";
  const [status, setStatus] = useState<"logging_in" | "success" | "error">("logging_in");
  const [errorMessage, setErrorMessage] = useState("");

  const doAutoLogin = async () => {
    setStatus("logging_in");
    try {
      const username = role === "admin" ? "ADMIN_IbrainTest" : "demo_client";
      const password = role === "admin" ? "ADMIN_IbrainTest123" : "demo123";

      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (!res || res.error) {
        setStatus("error");
        setErrorMessage("Auto login failed. Please sign in via the login page.");
        return;
      }

      setStatus("success");
      try {
        fireBrandConfetti();
      } catch {}

      setTimeout(() => {
        router.replace("/");
      }, 700);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "An unexpected error occurred.");
    }
  };

  useEffect(() => {
    doAutoLogin();
  }, [role]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 circuit-svg-bg relative">
      <div className="fixed top-10 left-10 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-10 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-brand-soft shadow-card text-center relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-brand-light/60 p-3 rounded-2xl inline-block border border-brand-soft mb-6">
          <Image
            src="/brand/ibrainlabs-logo.png"
            alt="iBrainLabs"
            width={160}
            height={46}
            className="h-9 w-auto object-contain mx-auto"
            priority
          />
        </div>

        {status === "logging_in" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-light text-brand-purple flex items-center justify-center shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-text-main">
              1-Click Auto Login Active
            </h2>
            <p className="text-xs text-slate-muted">
              Authenticating as <span className="font-bold text-brand-purple">{role === "admin" ? "Admin Command Center" : "Demo Client"}</span> without password prompt...
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
              <div className="bg-brand-gradient h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-8 h-8 text-emerald-600 animate-bounce" />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-emerald-700">
              Logged in successfully!
            </h2>
            <p className="text-xs text-slate-muted">
              Opening your iBrainLabs dashboard right now...
            </p>
            <div className="pt-2">
              <button
                onClick={() => router.replace("/")}
                className="w-full py-3 rounded-xl bg-brand-gradient text-white font-heading font-bold text-xs shadow-md shadow-brand-purple/20 flex items-center justify-center gap-1.5 hover:opacity-95 transition"
              >
                <span>Click here if not redirected</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
              <Zap className="w-8 h-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-rose-700">
              Auto Login Notice
            </h2>
            <p className="text-xs text-slate-muted">
              {errorMessage}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={doAutoLogin}
                className="w-full py-2.5 rounded-xl bg-brand-gradient text-white font-heading font-bold text-xs shadow-md shadow-brand-purple/20"
              >
                Retry 1-Click Login
              </button>
              <button
                onClick={() => router.replace("/login")}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-semibold text-xs"
              >
                Go to standard Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
      </div>
    }>
      <DemoLoginContent />
    </Suspense>
  );
}
