"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";
import { 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck, 
  PhoneCall, 
  Building2, 
  Trash2,
  Send,
  Check,
  Clock,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Plus,
  HelpCircle
} from "lucide-react";

interface WhatsAppConfigData {
  isConnected: boolean;
  status?: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  qualityRating?: string | null;
  messagingLimitTier?: string | null;
  connectionMethod?: string | null;
  waPhoneNumberId?: string | null;
  waBusinessAccountId?: string | null;
  maskedToken?: string | null;
  embeddedSignupAt?: string | null;
}

interface WhatsAppEmbeddedSignupProps {
  initialConfig?: WhatsAppConfigData | null;
  metaAppId?: string;
  metaConfigId?: string;
  onConfigUpdated?: () => void;
}

export default function WhatsAppEmbeddedSignup({
  initialConfig,
  metaAppId = process.env.NEXT_PUBLIC_META_APP_ID || "2068663130431385",
  metaConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID || "1620839459718786",
  onConfigUpdated,
}: WhatsAppEmbeddedSignupProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<WhatsAppConfigData | null>(initialConfig || null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Captured Meta Embedded Signup Assets
  const capturedAssetsRef = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const capturedCodeRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);

  // --- Test & Verify Section States ---
  const [activeTab, setActiveTab] = useState<"send_test" | "templates">("send_test");
  const [testNumber, setTestNumber] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [customTestText, setCustomTestText] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; details?: any } | null>(null);

  // Template creation state
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("MARKETING");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [templateActionMsg, setTemplateActionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Sync initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  // Load client's templates when connected
  const fetchTemplates = async (syncFromMeta = false) => {
    if (syncFromMeta) {
      setSyncingTemplates(true);
    } else {
      setLoadingTemplates(true);
    }
    try {
      const url = syncFromMeta ? "/api/templates?sync=true" : "/api/templates";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTemplates(data);
        const approved = data.filter((t: any) => t.status === "APPROVED");
        setSelectedTemplate((prev) => {
          if (prev === "direct_text") return prev;
          if (approved.some((t: any) => t.name === prev)) return prev;
          return approved[0]?.name || "";
        });
      }
    } catch (e) {
      console.warn("Could not fetch templates:", e);
    } finally {
      setLoadingTemplates(false);
      setSyncingTemplates(false);
    }
  };

  useEffect(() => {
    if (config?.isConnected) {
      fetchTemplates(true);
    }
  }, [config?.isConnected]);

  // 1. Load Facebook JavaScript SDK with App ID 2068663130431385
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initFB = () => {
      if ((window as any).FB) {
        try {
          (window as any).FB.init({
            appId: metaAppId,
            autoLogAppEvents: true,
            xfbml: true,
            version: process.env.NEXT_PUBLIC_META_GRAPH_VERSION || "v26.0",
          });
          setSdkReady(true);
        } catch (e) {
          console.error("Error initializing FB SDK:", e);
        }
      }
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initFB();
      };
      document.body.appendChild(script);
    } else if ((window as any).FB) {
      initFB();
    }

    // 2. Window "message" event listener for Meta WA_EMBEDDED_SIGNUP v4 events
    const handleMetaMessage = (event: MessageEvent) => {
      // Security: Only accept messages originating strictly from facebook.com
      if (!event.origin || !event.origin.endsWith("facebook.com")) {
        return;
      }

      let data: any = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (data && data.type === "WA_EMBEDDED_SIGNUP") {
        console.log("📥 [Meta Embedded Signup Event]", data.event, data.data);

        // Case 1: Client completed signup successfully
        if (
          data.event === "FINISH" ||
          data.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
        ) {
          const wabaId = data.data?.waba_id || data.data?.messaging_account_ids?.[0];
          const phoneNumberId = data.data?.phone_number_id;

          capturedAssetsRef.current = {
            wabaId: wabaId ? String(wabaId) : undefined,
            phoneNumberId: phoneNumberId ? String(phoneNumberId) : undefined,
          };

          // If code was already delivered by FB.login callback, submit immediately
          if (capturedCodeRef.current && !isSubmittingRef.current) {
            submitConnectionToBackend(
              capturedCodeRef.current,
              wabaId ? String(wabaId) : undefined,
              phoneNumberId ? String(phoneNumberId) : undefined
            );
          }
        } 
        // Case 2: Client cancelled or exited flow
        else if (data.event === "CANCEL") {
          setConnecting(false);
          const step = data.data?.current_step || "";
          setErrorMsg(
            step
              ? `WhatsApp setup was cancelled at step: ${step.replace(/_/g, " ")}. Click "Connect WhatsApp" to try again.`
              : "WhatsApp setup was cancelled. Click 'Connect WhatsApp' whenever you're ready."
          );
        } 
        // Case 3: Error inside Meta Embedded Signup popup
        else if (data.event === "ERROR") {
          setConnecting(false);
          const detail =
            data.data?.error_message ||
            data.data?.message ||
            JSON.stringify(data.data || "Unknown error");
          setErrorMsg(`Meta connection error: ${detail}. Please try again.`);
        }
      } 
      // Fallback: If received from /api/whatsapp/embedded-signup/callback
      else if (data && data.type === "WA_EMBEDDED_OAUTH_CODE") {
        if (data.code && !isSubmittingRef.current) {
          submitConnectionToBackend(data.code);
        }
      } else if (data && data.type === "WA_EMBEDDED_OAUTH_ERROR") {
        setConnecting(false);
        setErrorMsg(data.error || "Facebook authorization cancelled or failed.");
      }
    };

    window.addEventListener("message", handleMetaMessage);
    return () => window.removeEventListener("message", handleMetaMessage);
  }, [metaAppId]);

  // 3. Launch official Meta Embedded Signup v4 popup on button click
  const handleConnectWhatsApp = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setConnecting(true);

    if (typeof window === "undefined" || !(window as any).FB) {
      setConnecting(false);
      setErrorMsg("Facebook SDK is still loading. Please wait 2 seconds and click Connect again.");
      return;
    }

    // Reset session refs
    capturedAssetsRef.current = {};
    capturedCodeRef.current = null;
    isSubmittingRef.current = false;

    console.log("🚀 Launching Meta Embedded Signup v4 (Config ID:", metaConfigId, ")...");

    try {
      (window as any).FB.login(
        (response: any) => {
          console.log("Meta FB.login response:", response);
          if (response?.authResponse?.code) {
            const authCode = response.authResponse.code;
            capturedCodeRef.current = authCode;

            const { wabaId, phoneNumberId } = capturedAssetsRef.current;
            if (!isSubmittingRef.current) {
              submitConnectionToBackend(authCode, wabaId, phoneNumberId);
            }
          } else {
            setConnecting(false);
            if (response?.status !== "connected") {
              console.log("FB.login closed or not completed");
            } else {
              setErrorMsg("Meta connection was closed. Click 'Connect WhatsApp' to try again.");
            }
          }
        },
        {
          config_id: metaConfigId, // 1620839459718786
          response_type: "code",
          override_default_response_type: true,
          extras: {
            setup: {},
            version: "v4", // Explicitly required for Meta Embedded Signup v4
            sessionInfoVersion: "3", // Session Info Version 3 as required
          },
        }
      );
    } catch (err: any) {
      setConnecting(false);
      setErrorMsg(err.message || "Failed to open Meta connection window.");
    }
  };

  // 4. Send code + wabaId + phoneNumberId to backend for server-to-server exchange
  const submitConnectionToBackend = async (
    code: string,
    wabaId?: string,
    phoneNumberId?: string
  ) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setConnecting(true);
    setErrorMsg(null);

    try {
      console.log("📡 Submitting auth code and assets to backend...", { wabaId, phoneNumberId });
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          wabaId,
          phoneNumberId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        setSuccessMsg(data.message || "WhatsApp Business Account connected successfully!");
        if (onConfigUpdated) onConfigUpdated();
        fetchTemplates(true);
      } else {
        setErrorMsg(data.error || "Failed to complete WhatsApp connection with Meta.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while transmitting connection to server.");
    } finally {
      setConnecting(false);
      isSubmittingRef.current = false;
    }
  };

  // 5. Disconnect WhatsApp
  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your WhatsApp Business account? Campaigns will pause until reconnected.")) {
      return;
    }

    setDisconnecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/whatsapp/embedded-signup", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig({
          isConnected: false,
          status: "DISCONNECTED",
          connectionMethod: "MANUAL",
        });
        setSuccessMsg("WhatsApp Business Account disconnected successfully.");
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setErrorMsg(data.error || "Failed to disconnect account.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error during disconnection.");
    } finally {
      setDisconnecting(false);
    }
  };

  // 6. Send Live Test Message
  const handleSendTestMessage = async () => {
    const cleanNumber = testNumber.replace(/[^0-9]/g, "");
    if (!cleanNumber || cleanNumber.length < 10) {
      setTestResult({
        ok: false,
        message: "Please enter a valid 10-digit mobile number (e.g. 9876543210).",
      });
      return;
    }

    const chosenTpl = templates.find(
      (t) => t.status === "APPROVED" && t.name === selectedTemplate
    );

    if (selectedTemplate !== "direct_text" && !chosenTpl) {
      setTestResult({
        ok: false,
        message:
          "No APPROVED template is selected from your connected WABA. Create & approve a template in tab (a & b), or select 'Custom Text (Direct within 24hr Window)'.",
      });
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
          templateName: selectedTemplate !== "direct_text" ? chosenTpl.name : undefined,
          languageCode: selectedTemplate !== "direct_text" ? chosenTpl.language : undefined,
          offerText: customTestText.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          ok: true,
          message: `✅ Test Message Delivered! Verified by Meta Cloud API (ID: ${data.waMessageId || "OK"}).`,
          details: data,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Failed to transmit test message via Meta Cloud API.",
          details: data.metaError,
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

  // 7. Create New Message Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateBody.trim()) {
      setTemplateActionMsg({ ok: false, text: "Template name and body text are required." });
      return;
    }

    setCreatingTemplate(true);
    setTemplateActionMsg(null);

    try {
      const cleanName = newTemplateName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          category: newTemplateCategory,
          language: "en_US",
          bodyText: newTemplateBody.trim(),
          headerType: "NONE",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTemplateActionMsg({
          ok: true,
          text: `Template "${cleanName}" submitted to Meta! Status: ${data.template?.status || "APPROVED"}`,
        });
        setNewTemplateName("");
        setNewTemplateBody("");
        fetchTemplates(true);
      } else {
        setTemplateActionMsg({
          ok: false,
          text: data.error || "Meta rejected template submission.",
        });
      }
    } catch (err: any) {
      setTemplateActionMsg({ ok: false, text: err.message || "Network error submitting template." });
    } finally {
      setCreatingTemplate(false);
    }
  };

  const isConnected = !!config?.isConnected;

  return (
    <div className="bg-white rounded-3xl border border-brand-soft shadow-card overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2B1B4D] via-[#3B1553] to-[#1E1033] p-5 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 300 200">
            <path d="M10,20 Q150,150 290,20" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="150" cy="85" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
              <PhoneCall className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-heading font-extrabold text-white">
                  {t("embeddedSignup.channelTitle")}
                </h3>
                {isConnected ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t("embeddedSignup.connectedBadge")}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/80 border border-white/20">
                    {t("embeddedSignup.notConnectedBadge")}
                  </span>
                )}
              </div>
              <p className="text-xs text-brand-soft mt-0.5">
                {t("embeddedSignup.channelSubtitle")}
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-2 rounded-xl flex items-center gap-2.5 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="text-xs">
              <span className="text-white font-semibold block">WhatsApp Business Platform</span>
              <span className="text-brand-soft text-[10px]">Built on the official WhatsApp Business Platform (Cloud API)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="m-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Connection Notice:</span>
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleConnectWhatsApp}
              disabled={connecting}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
            >
              {t("embeddedSignup.tryAgain")}
            </button>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="m-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="p-5 sm:p-6">
        {isConnected ? (
          /* ========================================================= */
          /* 1. CONNECTED STATE (Display Phone + Test Page / Flow)    */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Top Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-emerald-700 font-semibold block uppercase tracking-wider">
                    Connected WhatsApp Number
                  </span>
                  <span className="text-sm font-heading font-extrabold text-emerald-950">
                    {t("embeddedSignup.connectedPrefix")} {config?.displayPhoneNumber || "+91 (Active)"}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-brand-light/60 border border-brand-soft flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 text-brand-purple flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-muted font-medium block">Verified Business Name</span>
                  <span className="text-sm font-heading font-extrabold text-slate-heading truncate block">
                    {config?.verifiedName || "Your Business"}
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

            {/* Test Flow Tabs */}
            <div className="border border-brand-soft rounded-2xl p-4 sm:p-5 bg-brand-light/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-soft pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-purple" />
                  <h4 className="text-sm font-heading font-bold text-slate-heading">
                    Channel Testing & Template Management
                  </h4>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-brand-soft">
                  <button
                    type="button"
                    onClick={() => setActiveTab("send_test")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === "send_test"
                        ? "bg-brand-purple text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    (c) Send Test Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("templates")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      activeTab === "templates"
                        ? "bg-brand-purple text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    (a & b) Templates & Status ({templates.length})
                  </button>
                </div>
              </div>

              {/* TAB 1: (c) SEND TEST TEMPLATE MESSAGE */}
              {activeTab === "send_test" && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    Verify live transmission by sending a WhatsApp Cloud API test message directly to your phone.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Recipient Mobile Number (10 Digits)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          🇮🇳 +91
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. 9876543210"
                          value={testNumber}
                          onChange={(e) => setTestNumber(e.target.value)}
                          maxLength={10}
                          className="w-full pl-16 pr-4 py-2.5 text-xs rounded-xl border border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-purple/20 bg-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Select Message Type / Template
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-purple/20 bg-white"
                      >
                        {templates.filter((t) => t.status === "APPROVED").length === 0 && (
                          <option value="">-- No APPROVED templates in your WABA yet --</option>
                        )}
                        {templates
                          .filter((t) => t.status === "APPROVED")
                          .map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.language}) — APPROVED
                            </option>
                          ))}
                        <option value="direct_text">Custom Text (Direct within 24hr Window)</option>
                      </select>
                      {templates.filter((t) => t.status === "APPROVED").length === 0 && (
                        <p className="text-[11px] text-amber-700">
                          No APPROVED templates found in your connected WABA. Create a template in tab (a & b) and wait for Meta approval, or use Custom Text within a 24h window.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedTemplate === "direct_text" && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Custom Message Text
                      </label>
                      <input
                        type="text"
                        placeholder="Type custom test message text..."
                        value={customTestText}
                        onChange={(e) => setCustomTestText(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs rounded-xl border border-brand-soft focus:outline-none focus:ring-2 focus:ring-brand-purple/20 bg-white"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-500">
                      💡 Tip: WhatsApp Meta delivers test template messages to WhatsApp in ~0.3 seconds.
                    </span>

                    <button
                      type="button"
                      onClick={handleSendTestMessage}
                      disabled={sendingTest}
                      className="px-5 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>Send Test Template Message</span>
                    </button>
                  </div>

                  {/* Test Result Display */}
                  {testResult && (
                    <div
                      className={`p-3.5 rounded-xl text-xs space-y-1 animate-in fade-in ${
                        testResult.ok
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : "bg-rose-50 text-rose-900 border border-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {testResult.ok ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.details && !testResult.ok && (
                        <p className="text-[11px] text-rose-700 pl-6 font-mono break-all">
                          {typeof testResult.details === "object"
                            ? JSON.stringify(testResult.details)
                            : String(testResult.details)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: (a) CREATE TEMPLATE & (b) SEE APPROVAL STATUS */}
              {activeTab === "templates" && (
                <div className="space-y-5">
                  {/* (a) Create Template Form */}
                  <div className="bg-white p-4 rounded-xl border border-brand-soft space-y-3">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-brand-purple" />
                      <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        (a) Create New Message Template
                      </h5>
                    </div>

                    <form onSubmit={handleCreateTemplate} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Template Name (lowercase, no spaces)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. welcome_discount_offer"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Category
                          </label>
                          <select
                            value={newTemplateCategory}
                            onChange={(e) => setNewTemplateCategory(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                          >
                            <option value="MARKETING">Marketing (Offers, Announcements)</option>
                            <option value="UTILITY">Utility (Account Updates, Receipts)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Body Text (Message Copy)
                        </label>
                        <textarea
                          rows={2}
                          required
                          placeholder="Welcome to our business! Enjoy 20% off your purchase this week."
                          value={newTemplateBody}
                          onChange={(e) => setNewTemplateBody(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                        />
                      </div>

                      {templateActionMsg && (
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                            templateActionMsg.ok
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {templateActionMsg.ok ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{templateActionMsg.text}</span>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={creatingTemplate}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-purple hover:bg-brand-purple/90 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {creatingTemplate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>Submit to Meta for Approval</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* (b) View Approval Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-brand-purple" />
                        <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          (b) Live Meta Approval Status
                        </h5>
                      </div>

                      <button
                        type="button"
                        onClick={() => fetchTemplates(true)}
                        disabled={syncingTemplates}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-purple hover:bg-white border border-brand-soft transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingTemplates ? "animate-spin" : ""}`} />
                        <span>{syncingTemplates ? "Syncing..." : "Sync Live Status"}</span>
                      </button>
                    </div>

                    {templates.length === 0 ? (
                      <div className="text-center py-6 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                        {loadingTemplates ? "Loading templates..." : "No templates yet in your connected WhatsApp Business Account. Create your first template above and sync status."}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {templates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900">{tpl.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold uppercase">
                                  {tpl.category}
                                </span>
                              </div>
                              <p className="text-slate-500 text-[11px] line-clamp-1">{tpl.bodyText}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {tpl.status === "APPROVED" ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  APPROVED
                                </span>
                              ) : tpl.status === "REJECTED" ? (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  REJECTED
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  PENDING REVIEW
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-brand-soft">
              <span className="text-xs text-slate-muted">
                Need to change or disconnect your WhatsApp Business number?
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleConnectWhatsApp}
                  disabled={connecting}
                  className="px-4 py-2 text-xs font-semibold text-brand-purple hover:bg-brand-light rounded-xl transition border border-brand-soft cursor-pointer"
                >
                  Reconnect / Switch Number
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                >
                  {disconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* 2. NOT CONNECTED STATE (Connect WhatsApp Button via v4)   */
          /* ========================================================= */
          <div className="py-6 sm:py-8 max-w-xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Official WhatsApp Embedded Signup v4</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-heading">
                {t("embeddedSignup.connectHeading")}
              </h3>
              <p className="text-xs sm:text-sm text-slate-muted max-w-md mx-auto leading-relaxed">
                {t("embeddedSignup.connectSubheading")}
              </p>
            </div>

            {/* Highlighted Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-2xl bg-brand-light/50 border border-brand-soft space-y-1">
                <span className="text-xs font-bold text-slate-heading flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  No Code Setup
                </span>
                <p className="text-[11px] text-slate-500">
                  Log in with Facebook and select your business number directly.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-light/50 border border-brand-soft space-y-1">
                <span className="text-xs font-bold text-slate-heading flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Instant Activation
                </span>
                <p className="text-[11px] text-slate-500">
                  Phone registration & webhook subscription configured automatically.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-brand-light/50 border border-brand-soft space-y-1">
                <span className="text-xs font-bold text-slate-heading flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Built on the official WhatsApp Business Platform (Cloud API)
                </span>
                <p className="text-[11px] text-slate-500">
                  Your credentials are AES-256 encrypted and stored safely.
                </p>
              </div>
            </div>

            {/* Connect WhatsApp CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConnectWhatsApp}
                disabled={connecting}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-heading font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-[#1877F2] via-[#1565C0] to-[#0D47A1] hover:opacity-95 shadow-lg shadow-blue-500/25 transition transform active:scale-[0.99] flex items-center justify-center gap-3 mx-auto cursor-pointer disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{t("embeddedSignup.connecting")}</span>
                  </>
                ) : (
                  <>
                    {/* Official Meta Facebook Icon */}
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>{t("embeddedSignup.connectWhatsApp")} (Log in with Facebook)</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 mt-3">
                {t("embeddedSignup.metaHostedNote")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
