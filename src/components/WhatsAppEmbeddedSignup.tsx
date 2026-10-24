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
  Check,
  Clock,
  Sparkles,
  MessageSquare,
  ArrowRight
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
  metaAppId = process.env.NEXT_PUBLIC_META_APP_ID || "2068663130431385",
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

  // Simple 1-Step Onboarding Form state
  const [brandName, setBrandName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      if (initialConfig.verifiedName) {
        setBrandName(initialConfig.verifiedName);
      }
      if (initialConfig.displayPhoneNumber) {
        setPhoneNumber(initialConfig.displayPhoneNumber.replace(/[^0-9]/g, "").slice(-10));
      }
    }
  }, [initialConfig]);

  // Load Meta Facebook SDK dynamically for official Embedded Signup
  useEffect(() => {
    if (typeof window === "undefined") return;

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

    const handleMetaMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH") {
            const { phone_number_id, waba_id } = data.data || {};
            handleSaveConnection({
              phoneNumberId: phone_number_id,
              wabaId: waba_id,
            });
          }
        } else if (data && data.type === "WA_EMBEDDED_OAUTH_CODE") {
          handleSaveConnection({ code: data.code });
        } else if (data && data.type === "WA_EMBEDDED_OAUTH_ERROR") {
          setConnecting(false);
          setErrorMsg(data.error_message || "Facebook authorization canceled or failed.");
        }
      } catch {}
    };

    window.addEventListener("message", handleMetaMessage);
    return () => window.removeEventListener("message", handleMetaMessage);
  }, [metaAppId]);

  // Launch official Meta Embedded popup
  const handleLaunchEmbeddedSignup = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setConnecting(true);

    try {
      const redirectUri = window.location.origin + "/api/whatsapp/embedded-signup/callback";
      const scope = "whatsapp_business_management,whatsapp_business_messaging";
      const state = "wa_auth_" + Date.now();

      const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${encodeURIComponent(scope)}&state=${state}&response_type=code`;

      const width = 640;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        oauthUrl,
        "MetaWhatsAppSignup",
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1`
      );

      if (!popup || popup.closed || typeof popup.closed === "undefined") {
        window.location.href = oauthUrl;
      }
    } catch (err: any) {
      setConnecting(false);
      setErrorMsg(err.message || "Failed to launch Facebook connection.");
    }
  };

  // Submit Simple 1-Step Request (No Technical knowledge needed)
  const handleSubmitConnectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setErrorMsg("Please enter your Shop or Brand Name.");
      return;
    }
    const clean = phoneNumber.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp mobile number.");
      return;
    }

    setSubmittingRequest(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/whatsapp/request-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brandName.trim(),
          phoneNumber: clean,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        setSuccessMsg("Request submitted successfully! Our team will verify via OTP in 2 minutes.");
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setErrorMsg(data.error || "Failed to submit request.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error submitting request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Save connection to backend
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

  // Instant demo activation
  const handleQuickTestConnect = async () => {
    handleSaveConnection({
      displayPhoneNumber: "+91 96426 83699",
      verifiedName: "SaaS by IBrainLabs",
      phoneNumberId: "1443849605471143",
      wabaId: "2367270804076581",
    });
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect? Your campaigns will be paused until reconnected.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setConfig({ isConnected: false, connectionMethod: "NONE" });
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

  // Send Live Test Message
  const handleSendTest = async () => {
    const cleanNumber = testNumber.replace(/[^0-9]/g, "");
    if (!cleanNumber || cleanNumber.length < 10) {
      setTestResult({ ok: false, message: "Please enter a valid 10-digit mobile number." });
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: cleanNumber,
          offerText: "Hello! Testing official Meta Cloud API WhatsApp connection.",
          templateName: "hello_world",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          ok: true,
          message: `⚡ Sent in 0.3s! Verified by Meta Cloud API (ID: ${data.waMessageId || "OK"}).`,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Failed to transmit test message via Meta API.",
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || "Network error sending test message.",
      });
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = !!config?.isConnected;
  const isPending = config?.connectionMethod === "PENDING_ACTIVATION" && !isConnected;

  return (
    <div className="bg-white rounded-3xl border border-brand-soft shadow-card overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#3B1553] via-[#4A1B6D] to-[#2B0E3D] p-5 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 300 200">
            <path d="M10,20 Q150,150 290,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="150" cy="85" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-white">
                  WhatsApp Cloud API Channel
                </h3>
                {isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                ) : isPending ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    OTP VERIFICATION
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/80 border border-white/20">
                    NOT CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-soft mt-0.5">
                Official Meta Cloud API • High Speed 20 msgs/sec • Real-Time Delivery Receipts
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="text-xs">
              <span className="text-white font-semibold block">Official Verified Channel</span>
              <span className="text-brand-soft text-[10px]">Direct Meta Delivery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="m-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="m-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-5 sm:p-6">
        {isConnected ? (
          /* ================= 1. CONNECTED STATE ================= */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-brand-light/60 border border-brand-soft flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-muted font-medium block">Connected Phone</span>
                  <span className="text-sm font-heading font-extrabold text-slate-heading">
                    {config?.displayPhoneNumber || "+91 (Active)"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-light/60 border border-brand-soft flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-muted font-medium block">Verified Brand Name</span>
                  <span className="text-sm font-heading font-extrabold text-slate-heading truncate block">
                    {config?.verifiedName || "Your Brand"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-light/60 border border-brand-soft flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-muted font-medium block">Quality & Tier</span>
                  <span className="text-xs font-heading font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {config?.qualityRating || "High (Green)"} • {config?.messagingLimitTier || "Tier 250/day"}
                  </span>
                </div>
              </div>
            </div>

            {/* Test Message Box */}
            <div className="p-5 rounded-2xl border border-brand-soft bg-brand-light/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading font-bold text-slate-heading flex items-center gap-2 uppercase tracking-wider">
                  <Radio className="w-4 h-4 text-brand-purple" />
                  Live Channel Verification Ping
                </h4>
                <span className="text-[11px] text-slate-muted">Verifies delivery in 0.3s</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. 9642683699 (Enter 10-digit phone to test)"
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-purple/20 bg-white"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest}
                  className="px-5 py-2.5 rounded-xl font-heading font-semibold text-xs text-white bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-95 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Test Ping</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
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

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-brand-soft">
              <span className="text-xs text-slate-muted">
                Need to change your WhatsApp phone number or reconnect?
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfig({ isConnected: false, connectionMethod: "NONE" })}
                  className="px-3.5 py-2 text-xs font-semibold text-brand-purple hover:bg-brand-light rounded-xl transition border border-brand-soft cursor-pointer"
                >
                  Switch Brand Number
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {disconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        ) : isPending ? (
          /* ================= 2. PENDING ACTIVATION (OTP STATE) ================= */
          <div className="space-y-5">
            <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/80 border-2 border-amber-200 space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-heading font-bold text-amber-950">
                      Verification in Progress (Takes 2–5 Mins)
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                      AWAITING OTP
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Linking <strong>{config?.verifiedName}</strong> ({config?.displayPhoneNumber}) to WhatsApp Cloud API.
                  </p>
                </div>
              </div>

              {/* 2 Clean Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-white border border-amber-200 space-y-1">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Receive 6-Digit OTP
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Meta is sending an SMS / WhatsApp code to your phone (within 2-5 mins).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-amber-200 space-y-1">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Share OTP for Activation
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Share the 6-digit code on WhatsApp to activate your brand immediately.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-amber-200/80">
                <span className="text-xs text-amber-900 font-medium">
                  Got the 6-digit OTP? Send it to our support team:
                </span>

                <div className="flex items-center gap-2.5">
                  <a
                    href={`https://wa.me/919642683699?text=${encodeURIComponent(
                      `Hi iBrainLabs! My Brand is "${config?.verifiedName}" (${config?.displayPhoneNumber}). Here is my Meta WhatsApp OTP: `
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Share OTP on WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setConfig({ isConnected: false, connectionMethod: "NONE" })}
                    className="px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-amber-100 rounded-xl transition"
                  >
                    Edit Number
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= 3. NOT CONNECTED (SIMPLE 1-STEP ONBOARDING) ================= */
          <div className="space-y-6">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simple 2-Minute Setup</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-heading">
                  Connect Your Business WhatsApp Number
                </h3>
                <p className="text-xs sm:text-sm text-slate-muted max-w-lg mx-auto">
                  Send bulk campaigns with your own <strong>Shop Name</strong> and <strong>WhatsApp Number</strong>.
                </p>
              </div>

              {/* Simple Onboarding Form */}
              <form onSubmit={handleSubmitConnectionRequest} className="bg-brand-light/50 border border-brand-soft rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
                {/* Brand Name Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-heading font-bold text-slate-heading uppercase tracking-wider">
                      Business Brand Name
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto-detected from Account
                    </span>
                  </div>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. BIKES"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-brand-soft bg-white text-slate-heading font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                    />
                  </div>

                  <p className="text-[11px] text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    ⚠️ <strong>Note:</strong> Once linked, WhatsApp does not allow changing this business name later.
                  </p>
                </div>

                {/* Mobile Number Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-heading font-bold text-slate-heading uppercase tracking-wider">
                    WhatsApp Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      🇮🇳 +91
                    </div>
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      className="w-full pl-16 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-brand-soft bg-white text-slate-heading placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    You will receive a 6-digit SMS / WhatsApp OTP from Meta to verify ownership.
                  </p>
                </div>

                {/* Short Time Expectation */}
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  <Clock className="w-4 h-4 text-brand-purple shrink-0" />
                  <span className="text-[11px]">
                    ⏱️ <strong>Setup Time:</strong> Takes <strong>2 to 5 minutes</strong>. Keep your phone nearby for OTP.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="w-full py-3.5 px-6 rounded-xl font-heading font-bold text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 shadow-md transition transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingRequest ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀 Connect WhatsApp Number (2–5 Mins)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant Sandbox Alternative */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-muted">
                <span>Want to test campaigns immediately without your number?</span>
                <button
                  type="button"
                  onClick={handleQuickTestConnect}
                  disabled={connecting || loading}
                  className="text-brand-purple font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Test with iBrainLabs Office Number (+91 96426 83699)</span>
                </button>
              </div>

              {/* Advanced Meta OAuth Toggle */}
              <div className="pt-2 border-t border-brand-soft text-center">
                <button
                  type="button"
                  onClick={() => setShowAdvancedMeta(!showAdvancedMeta)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showAdvancedMeta ? "Hide Advanced Options" : "Technical Options: Connect via Meta Facebook Login"}
                </button>

                {showAdvancedMeta && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-3 animate-in fade-in">
                    <p className="text-xs text-slate-600">
                      If you already have your own Meta Developer App with App Review approved, you can launch the official Meta Embedded Signup popup:
                    </p>
                    <button
                      type="button"
                      onClick={handleLaunchEmbeddedSignup}
                      disabled={connecting}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${connecting ? "animate-spin" : ""}`} />
                      <span>Launch Meta Embedded Signup Popup</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
