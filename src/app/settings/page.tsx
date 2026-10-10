"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { Store, Save } from "lucide-react";

export default function SettingsPage() {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  // Meta Credentials
  const [waToken, setWaToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waApiVersion, setWaApiVersion] = useState("v19.0");
  const [metaAppId, setMetaAppId] = useState("");

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
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadSettings();
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
          Manage your business profile details and official Meta WhatsApp connection.
        </p>
      </div>

      {/* 1. Business Profile Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-8 border border-emerald-100 shadow-card space-y-6">
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


      {/* Save Settings Bar */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm px-8 py-3.5 rounded-2xl shadow-lg transition-all cursor-pointer"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? "Saving..." : t("settings.saveSettings")}</span>
        </button>
      </div>

    </div>
  );
}
