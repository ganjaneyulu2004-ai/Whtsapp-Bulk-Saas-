"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { 
  Settings as SettingsIcon, 
  Store, 
  KeyRound, 
  PhoneCall, 
  Globe, 
  DollarSign, 
  UserX, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Send,
  Webhook,
  Copy,
  Check,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import WhatsAppEmbeddedSignup from "@/components/WhatsAppEmbeddedSignup";

export default function SettingsPage() {
  const { t, lang, setLang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [fullConfig, setFullConfig] = useState<any>(null);

  // Business Profile Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Technology & Business");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [defaultBookingLink, setDefaultBookingLink] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [perMessageCost, setPerMessageCost] = useState("0.80");
  const [prefLang, setPrefLang] = useState("en");

  // Meta Credentials Form
  const [waToken, setWaToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waApiVersion, setWaApiVersion] = useState("v19.0");
  const [metaAppId, setMetaAppId] = useState("");

  // Webhook Status
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Opt out list
  const [optOutContacts, setOptOutContacts] = useState<any[]>([]);
  const [optOutCount, setOptOutCount] = useState(0);

  const loadSettings = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setName(data.business.name || "");
          setCategory(data.business.category || "");
          setPhone(data.business.phone || "");
          setAddress(data.business.address || "");
          setWebsite(data.business.website || "");
          setDefaultBookingLink(data.business.defaultBookingLink || "");
          setLogoUrl(data.business.logoUrl || "");
          setPerMessageCost(String(data.business.perMessageCost || "0.80"));
          setPrefLang(data.business.language || "en");
        }
        if (data.whatsappConfig) {
          setFullConfig(data.whatsappConfig);
          setWaToken(data.whatsappConfig.waToken || "");
          setWaPhoneNumberId(data.whatsappConfig.waPhoneNumberId || "");
          setWaBusinessAccountId(data.whatsappConfig.waBusinessAccountId || "");
          setWaApiVersion(data.whatsappConfig.waApiVersion || "v19.0");
          setMetaAppId(data.whatsappConfig.metaAppId || "");
        }
        if (data.optOutContacts) {
          setOptOutContacts(data.optOutContacts);
          setOptOutCount(data.optOutCount || 0);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSettings();

    // Fetch Webhook Status
    fetch("/api/webhooks/status")
      .then((res) => res.json())
      .then((data) => setWebhookInfo(data))
      .catch((e) => console.error(e));
  }, []);

  const handleSaveSettings = async () => {
    if (defaultBookingLink && defaultBookingLink.trim() && !defaultBookingLink.trim().startsWith("https://")) {
      alert("Default booking link must be a valid https:// URL.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          phone,
          address,
          website,
          defaultBookingLink,
          logoUrl,
          perMessageCost,
          language: prefLang,
          waToken,
          waPhoneNumberId,
          waBusinessAccountId,
          waApiVersion,
          metaAppId,
        }),
      });
      if (res.ok) {
        window.dispatchEvent(new Event("businessProfileUpdated"));
        alert("Settings saved successfully! ✅");
      } else {
        alert("Failed to save settings");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waToken,
          waPhoneNumberId,
          waApiVersion,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const callbackUrl = `${currentOrigin}/api/webhooks/whatsapp`;
  const verifyToken = webhookInfo?.verifyToken || "offerblast_verify_token_123";

  const copyToClipboard = (text: string, type: "url" | "token") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-white rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-slate-heading">
          {t("settings.title")}
        </h1>
        <p className="text-xs text-slate-muted mt-1">
          Manage your shop details, Meta WhatsApp API keys, message rate estimations, and opt-out list.
        </p>
      </div>

      {/* 1. Webhook Status & Meta Dashboard Setup Card */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl p-6 sm:p-8 border border-emerald-200/80 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-heading">
                Meta WhatsApp Webhook Status
              </h2>
              <p className="text-xs text-slate-muted">Paste these credentials into Meta App Dashboard</p>
            </div>
          </div>
          <span className={`text-xs font-heading font-bold px-3 py-1 rounded-full ${
            webhookInfo?.lastReceivedAt
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}>
            {webhookInfo?.lastReceivedAt ? "Active ✅" : "Pending First Webhook ⏳"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Callback URL box */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-slate-heading">Meta Callback URL</span>
              <button
                onClick={() => copyToClipboard(callbackUrl, "url")}
                className="flex items-center gap-1 text-[11px] font-heading font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-all"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl text-xs font-mono text-emerald-800 break-all select-all">
              {callbackUrl}
            </div>
          </div>

          {/* Verify Token box */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-slate-heading">Verify Token</span>
              <button
                onClick={() => copyToClipboard(verifyToken, "token")}
                className="flex items-center gap-1 text-[11px] font-heading font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition-all"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedToken ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl text-xs font-mono text-slate-800 select-all">
              {verifyToken}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-600 flex items-center justify-between border-t border-emerald-100/60 pt-3">
          <span>
            Last webhook event received:{" "}
            <strong className="text-slate-heading">
              {webhookInfo?.lastReceivedAt
                ? new Date(webhookInfo.lastReceivedAt).toLocaleString()
                : "No events received yet"}
            </strong>
          </span>
          <span className="text-[11px] text-emerald-700 font-medium">
            Subscribed fields: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">messages</code>
          </span>
        </div>
      </div>

      {/* 2. Business Profile Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-card space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-slate-heading">
              {t("settings.profileSection")}
            </h2>
            <p className="text-xs text-slate-muted">This info appears on WhatsApp campaign headers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              {t("settings.businessName")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              {t("settings.category")}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body"
            >
              <option value="Clothing & Saree Store">Clothing & Saree Store</option>
              <option value="Restaurant & Food">Restaurant & Multi-Cuisine</option>
              <option value="Beauty Salon & Spa">Beauty Salon & Spa</option>
              <option value="Gym & Fitness">Gym & Fitness Center</option>
              <option value="Retail & Supermarket">Retail & Supermarket</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              {t("settings.phone")}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              {t("settings.perMessageCost")}
            </label>
            <input
              type="number"
              step="0.05"
              value={perMessageCost}
              onChange={(e) => setPerMessageCost(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-heading">
            {t("settings.address")}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              Website URL
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="e.g. https://ibrainlabs.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              Default Booking Link (must start with https://)
            </label>
            <input
              type="text"
              value={defaultBookingLink}
              onChange={(e) => setDefaultBookingLink(e.target.value)}
              placeholder="e.g. https://ibrainlabs.com/contact/"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-heading">
            Logo URL (Optional)
          </label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body"
          />
        </div>
      </div>

      {/* 3. Primary WhatsApp Connection: Embedded Signup */}
      <WhatsAppEmbeddedSignup
        initialConfig={fullConfig}
        metaAppId={metaAppId || "1083272431077581"}
        onConfigUpdated={loadSettings}
      />

      {/* 4. Advanced: Manual Meta WhatsApp Credentials Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-bold text-slate-heading">
                  Advanced: Manual API Keys Setup
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-muted">For developers or businesses with their own Meta Developer Apps</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowManualConfig(!showManualConfig)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-purple hover:text-brand-purple/80 px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50/50 transition"
            >
              <span>{showManualConfig ? "Hide Manual Fields" : "Show Manual Fields"}</span>
              {showManualConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showManualConfig && (
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-heading font-bold text-xs px-4 py-2 rounded-xl transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testing ? "Testing..." : t("settings.testConnection")}</span>
              </button>
            )}
          </div>
        </div>

        {showManualConfig && (
          <>
            {testResult && (
              <div className={`p-4 rounded-2xl text-xs font-heading font-semibold flex items-center gap-2 ${
                testResult.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>
                {testResult.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span>{testResult.message}</span>
              </div>
            )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-heading">
              {t("settings.waToken")}
            </label>
            <input
              type="password"
              value={waToken}
              onChange={(e) => setWaToken(e.target.value)}
              placeholder="EAAG..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-heading font-bold text-slate-heading">
                {t("settings.waPhoneId")}
              </label>
              <input
                type="text"
                value={waPhoneNumberId}
                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                placeholder="100609346..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-heading font-bold text-slate-heading">
                {t("settings.wabaId")}
              </label>
              <input
                type="text"
                value={waBusinessAccountId}
                onChange={(e) => setWaBusinessAccountId(e.target.value)}
                placeholder="104829375..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>
          </div>
        </div>
        </>
      )}
      </div>

      {/* 4. Opt-Out List Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-slate-heading">
                {t("settings.optOutTitle")}
              </h2>
              <p className="text-xs text-slate-muted">Customers who replied STOP, UNSUBSCRIBE, or ఆపు (Excluded automatically)</p>
            </div>
          </div>
          <span className="text-xs font-heading font-bold bg-rose-100 text-rose-800 px-3 py-1 rounded-full">
            {optOutCount} Customers
          </span>
        </div>

        {optOutContacts.length === 0 ? (
          <p className="text-xs text-slate-muted text-center py-4">No customers have opted out yet.</p>
        ) : (
          <div className="space-y-2">
            {optOutContacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs font-body">
                <span className="font-semibold text-slate-heading">{c.name}</span>
                <span className="font-mono text-slate-600">+{c.phone}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Settings Bar */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm px-8 py-3.5 rounded-2xl shadow-lg transition-all"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? "Saving..." : t("settings.saveSettings")}</span>
        </button>
      </div>

    </div>
  );
}
