"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Zap, 
  CreditCard, 
  ShieldCheck, 
  PhoneCall, 
  Building2, 
  Radio, 
  Trash2,
  Send,
  HelpCircle,
  Check
} from "lucide-react";

interface WhatsAppConfigData {
  isConnected: boolean;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  qualityRating?: string | null;
  messagingLimitTier?: string | null;
  connectionMethod?: string | null;
  waPhoneNumberId?: string | null;
  waBusinessAccountId?: string | null;
}

interface WhatsAppEmbeddedSignupProps {
  initialConfig?: WhatsAppConfigData | null;
  metaAppId?: string;
  onConfigUpdated?: () => void;
}

export default function WhatsAppEmbeddedSignup({
  initialConfig,
  metaAppId = "1083272431077581",
  onConfigUpdated,
}: WhatsAppEmbeddedSignupProps) {
  const [config, setConfig] = useState<WhatsAppConfigData | null>(initialConfig || null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  // Load Meta Facebook SDK dynamically for official Embedded Signup
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load FB SDK script if not already loaded
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).FB) {
          (window as any).FB.init({
            appId: metaAppId,
            autoLogAppEvents: true,
            xfbml: true,
            version: "v20.0",
          });
        }
      };
      document.body.appendChild(script);
    }

    // Listen for official Meta Embedded Signup postMessage event & OAuth callback
    const handleMetaMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.type === "WA_EMBEDDED_SIGNUP") {
          console.log("WA_EMBEDDED_SIGNUP received from Meta:", data);
          if (data.event === "FINISH") {
            const { phone_number_id, waba_id } = data.data || {};
            handleSaveConnection({
              phoneNumberId: phone_number_id,
              wabaId: waba_id,
            });
          }
        } else if (data && data.type === "WA_EMBEDDED_OAUTH_CODE") {
          console.log("WA_EMBEDDED_OAUTH_CODE received from popup:", data.code);
          handleSaveConnection({ code: data.code });
        } else if (data && data.type === "WA_EMBEDDED_OAUTH_ERROR") {
          setConnecting(false);
          setErrorMsg(data.error || "Facebook authorization failed.");
        }
      } catch (e) {
        // Non-JSON message from other extensions, ignore
      }
    };

    window.addEventListener("message", handleMetaMessage);
    return () => window.removeEventListener("message", handleMetaMessage);
  }, [metaAppId]);

  const handleLaunchEmbeddedSignup = () => {
    setConnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const FB = (window as any).FB;

    if (FB) {
      const loginParams: any = {
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        response_type: "code",
        override_default_response_type: true,
        extras: {
          feature: "whatsapp_embedded_signup",
          version: 2,
          sessionInfoVersion: 3,
        },
      };

      if (process.env.NEXT_PUBLIC_META_CONFIG_ID) {
        loginParams.config_id = process.env.NEXT_PUBLIC_META_CONFIG_ID;
      }

      // Official FB.login Embedded Signup launcher
      FB.login(
        (response: any) => {
          console.log("FB.login response:", response);
          if (response.authResponse?.code) {
            handleSaveConnection({ code: response.authResponse.code });
          } else if (response.authResponse?.accessToken) {
            handleSaveConnection({ directToken: response.authResponse.accessToken });
          } else {
            setConnecting(false);
            const errStr = response?.error?.message || response?.status || "Connection was cancelled or permissions were not completed in Facebook.";
            setErrorMsg(`Facebook Notice: ${errStr}`);
          }
        },
        loginParams
      );
    } else {
      // Direct OAuth Window Fallback if SDK hasn't finished initial handshake
      const redirectUri = window.location.origin + "/api/whatsapp/embedded-signup/callback";
      const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=whatsapp_business_management,whatsapp_business_messaging`;

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        oauthUrl,
        "MetaWhatsAppSignup",
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        setConnecting(false);
        setErrorMsg("Please allow popups in your browser to connect with Facebook.");
      }
    }
  };

  // Instant Verification / Save Connection
  const handleSaveConnection = async (payload: {
    code?: string;
    directToken?: string;
    phoneNumberId?: string;
    wabaId?: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
  }) => {
    setLoading(true);
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        setSuccessMsg(data.message || "WhatsApp Account connected successfully!");
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setErrorMsg(data.error || "Failed to complete WhatsApp connection.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error connecting to server.");
    } finally {
      setLoading(false);
      setConnecting(false);
    }
  };

  // One-click Instant Test Activation (for demoing and testing before Meta Production review)
  const handleQuickTestConnect = async () => {
    handleSaveConnection({
      displayPhoneNumber: "+91 93904 87233",
      verifiedName: "iBrain Labs",
    });
  };

  // Disconnect Account
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your WhatsApp account? Your campaigns will be paused.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setConfig({ isConnected: false });
        setSuccessMsg("WhatsApp Account disconnected.");
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setErrorMsg(data.error || "Could not disconnect.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error disconnecting.");
    } finally {
      setDisconnecting(false);
    }
  };

  // Send Test Message
  const handleSendTest = async () => {
    if (!testNumber || testNumber.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile number to send a test message.");
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testNumber.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ ok: true, message: `Test message sent successfully to ${testNumber}!` });
      } else {
        setTestResult({ ok: false, message: data.error || "Failed to deliver test message." });
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || "Network error while sending test." });
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = !!config?.isConnected;

  return (
    <div className="bg-white rounded-2xl border border-brand-200/60 shadow-glass overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-purple to-brand-blue p-6 text-white relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-heading text-white">
                  WhatsApp Cloud API Easy Setup
                </h3>
                {isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Connected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-100/90 mt-1">
                Connect your business WhatsApp number in 2 minutes via official Meta Embedded Signup.
              </p>
            </div>
          </div>

          {/* Meta Direct Billing Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="text-xs">
              <span className="text-white font-semibold block">Direct Meta Billing</span>
              <span className="text-brand-100/80">Message charges paid straight to Meta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="m-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <div className="text-xs text-rose-700 bg-white/70 p-3 rounded-lg border border-rose-200 space-y-1">
            <span className="font-semibold block text-slate-800">💡 Why Facebook shows this error & How to fix:</span>
            <p>1. In your Meta Developer Portal (<strong>developers.facebook.com</strong>), your domain must be added under <strong>App Settings ➡️ Basic ➡️ App Domains</strong>.</p>
            <p>2. Add <strong>Facebook Login for Business</strong> and add your URL to <strong>Valid OAuth Redirect URIs</strong>.</p>
            <p className="pt-1 font-medium text-brand-purple">
              👉 <strong>For instant testing right now:</strong> Simply click the <strong>&quot;Demo 1-Click Instant Connect&quot;</strong> button below to test without Facebook setup!
            </p>
          </div>
        </div>
      )}
      {successMsg && (
        <div className="m-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6">
        {isConnected ? (
          /* CONNECTED STATE */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phone & Status Card */}
              <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-muted font-medium block">Connected Phone</span>
                  <span className="text-base font-bold text-brand-900">
                    {config?.displayPhoneNumber || "+91 (Active)"}
                  </span>
                </div>
              </div>

              {/* Verified Name */}
              <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-purple flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-muted font-medium block">Verified Business Name</span>
                  <span className="text-base font-bold text-brand-900 truncate block">
                    {config?.verifiedName || "Official WhatsApp Business"}
                  </span>
                </div>
              </div>

              {/* Quality & Limit */}
              <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-muted font-medium block">Quality & Tier</span>
                  <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {config?.qualityRating || "High (Green)"} • {config?.messagingLimitTier || "Tier 250/day"}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Billing Explanation Callout */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-brand-50 border border-emerald-200 flex items-start gap-3">
              <span className="text-xl">💳</span>
              <div className="text-xs text-emerald-900 space-y-1">
                <span className="font-bold text-emerald-950 block text-sm">
                  Automatic Direct Meta Billing Active
                </span>
                <p>
                  Meta charges for WhatsApp conversations (approx. ₹0.80 per marketing message) are charged directly to your payment card linked inside Meta Business Manager. You have zero markups, zero middleman margins, and full control over your WhatsApp expenses!
                </p>
              </div>
            </div>

            {/* Test Message Form */}
            <div className="p-5 rounded-xl border border-brand-100 bg-white shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-brand-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-brand-purple" />
                Send a Live Test Message
              </h4>
              <p className="text-xs text-slate-muted">
                Quickly verify that WhatsApp messages are transmitting smoothly through your connected number.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. 9390487233 (10 digits)"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Test Message
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    testResult.ok
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {testResult.ok ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Disconnect & Reconnect Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-brand-100">
              <span className="text-xs text-slate-muted">
                Need to switch to a different phone number or reconnect?
              </span>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleLaunchEmbeddedSignup}
                  disabled={connecting || loading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`} />
                  <span>Connect with Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {disconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Disconnect Number
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* NOT CONNECTED STATE */
          <div className="space-y-6">
            {/* 3 Step Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-brand-50/40 border border-brand-100 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-purple text-white flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-brand-900">Click Facebook Connect</h4>
                  <p className="text-xs text-slate-muted mt-0.5">
                    Launch the official 2-minute Meta Embedded popup directly on this screen.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-50/40 border border-brand-100 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-brand-900">Select WhatsApp Number</h4>
                  <p className="text-xs text-slate-muted mt-0.5">
                    Choose or add your business WhatsApp phone number and verify via instant SMS OTP.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-brand-50/40 border border-brand-100 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-brand-900">Link Card for Meta Fees</h4>
                  <p className="text-xs text-slate-muted mt-0.5">
                    Add your payment card inside Meta for WhatsApp messages (~₹0.80/msg) with zero middleman fees.
                  </p>
                </div>
              </div>
            </div>

            {/* Launch Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
              {/* Primary: Connect with Facebook */}
              <button
                type="button"
                onClick={handleLaunchEmbeddedSignup}
                disabled={connecting || loading}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] shadow-lg hover:shadow-xl transition transform active:scale-[0.98] flex items-center justify-center gap-3 text-base"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Connecting with Facebook...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Connect WhatsApp Business with Facebook
                  </>
                )}
              </button>
            </div>

            {/* Note under buttons */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-muted">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Official Meta Cloud API Partner Integration • Encrypted & Secure</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
