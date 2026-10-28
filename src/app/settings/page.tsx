"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { 
  Store, 
  Save, 
  MapPin, 
  Calendar, 
  Bot, 
  Clock, 
  Tag, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2,
  FileText
} from "lucide-react";

export default function SettingsPage() {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Business Profile Form
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Retail Shop");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [defaultBookingLink, setDefaultBookingLink] = useState("");
  const [locationMapLink, setLocationMapLink] = useState("");
  const [servicesAndPricing, setServicesAndPricing] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  // AI Chatbot Settings
  const [aiBotEnabled, setAiBotEnabled] = useState(true);
  const [aiTone, setAiTone] = useState("friendly_respectful");
  const [aiCustomInstructions, setAiCustomInstructions] = useState("");
  const [autoBookingEnabled, setAutoBookingEnabled] = useState(true);

  // Meta Credentials
  const [waToken, setWaToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waApiVersion, setWaApiVersion] = useState("v26.0");
  const [metaAppId, setMetaAppId] = useState("");

  const loadSettings = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          const b = data.business;
          setName(b.name || "");
          setCategory(b.category || "Retail Shop");
          setPhone(b.phone || "");
          setAddress(b.address || "");
          setWebsite(b.website || "");
          setDefaultBookingLink(b.defaultBookingLink || "");
          setLocationMapLink(b.locationMapLink || "");
          setServicesAndPricing(b.servicesAndPricing || "");
          setWorkingHours(b.workingHours || "");
          setBusinessDescription(b.businessDescription || "");
          setAiBotEnabled(b.aiBotEnabled !== false);
          setAiTone(b.aiTone || "friendly_respectful");
          setAiCustomInstructions(b.aiCustomInstructions || "");
          setAutoBookingEnabled(b.autoBookingEnabled !== false);
        }
        if (data.whatsappConfig) {
          const c = data.whatsappConfig;
          setWaToken(c.waToken || "");
          setWaPhoneNumberId(c.waPhoneNumberId || "");
          setWaBusinessAccountId(c.waBusinessAccountId || "");
          setWaApiVersion(c.waApiVersion || "v26.0");
          setMetaAppId(c.metaAppId || "");
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
    setSaving(true);
    setSaveSuccess(false);

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
          locationMapLink,
          servicesAndPricing,
          workingHours,
          businessDescription,
          aiBotEnabled,
          aiTone,
          aiCustomInstructions,
          autoBookingEnabled,
          waToken,
          waPhoneNumberId,
          waBusinessAccountId,
          waApiVersion,
          metaAppId,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert("Failed to save settings. Please try again.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto py-8">
        <div className="h-8 w-48 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-white rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
            Business Profile & AI Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure your business details, Google Maps location, booking links, and human-like WhatsApp AI chatbot.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-sm px-6 py-3 rounded-2xl shadow-md shadow-[#00a884]/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
        >
          {saving ? (
            <span>Saving...</span>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Business profile and AI Assistant settings have been updated and are active now! ✨</span>
        </div>
      )}

      {/* 1. REAL HUMAN AI WHATSAPP CHATBOT SETTINGS */}
      <div className="bg-gradient-to-br from-white to-[#f0fdf4] rounded-3xl p-5 sm:p-8 border border-emerald-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#00a884] text-white flex items-center justify-center shadow-md shadow-[#00a884]/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-extrabold text-slate-900 flex items-center gap-2">
                <span>Human-like AI WhatsApp Assistant</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Powered by Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                Chats naturally like a warm, polite human (1-3 sentences), auto-shares location/booking links, and schedules appointments.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={aiBotEnabled}
              onChange={(e) => setAiBotEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
          </label>
        </div>

        {aiBotEnabled && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  AI Chatbot Conversational Tone
                </label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
                >
                  <option value="friendly_respectful">Warm, Polite & Respectful (Human Touch) ⭐</option>
                  <option value="enthusiastic">Enthusiastic & Sales-Focused</option>
                  <option value="professional">Direct & Professional</option>
                  <option value="telugu_friendly">Telugu & Telugish Friendly (నమస్కారం!)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  AI responds in the customer&apos;s language (English, Telugu, Telugish, Hindi) with short 1-3 sentence human replies.
                </p>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Auto-Book Appointments in Chat
                </label>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Direct WhatsApp Booking</div>
                    <div className="text-[10px] text-slate-500">Auto-saves to Appointments Tab</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBookingEnabled}
                    onChange={(e) => setAutoBookingEnabled(e.target.checked)}
                    className="w-4 h-4 text-[#00a884] rounded border-slate-300 focus:ring-[#00a884]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Special Custom Instructions for AI (Optional)
              </label>
              <textarea
                rows={2}
                value={aiCustomInstructions}
                onChange={(e) => setAiCustomInstructions(e.target.value)}
                placeholder="e.g. Always address customer as sir/ma'am with 🙏 emoji. For wedding collections, offer a free trial appointment."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#00a884]"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. BUSINESS DETAILS & LINKS */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-slate-900">
              Business Information
            </h2>
            <p className="text-xs text-slate-500">
              Basic store details shown in campaigns and used by AI Chatbot
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
              Business Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sri Lakshmi Sarees / Brain Labs"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
              Category / Industry
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884] bg-white"
            >
              <option value="Clothing & Saree Store">Clothing & Saree Store</option>
              <option value="Restaurant & Food">Restaurant & Cafe</option>
              <option value="Beauty Salon & Spa">Beauty Salon & Spa</option>
              <option value="Healthcare & Clinic">Healthcare & Clinic</option>
              <option value="Jewellery & Accessories">Jewellery & Accessories</option>
              <option value="Technology & IT Services">Technology & IT Services</option>
              <option value="Retail & Supermarket">Retail & Supermarket</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Education & Coaching">Education & Coaching</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
              Official WhatsApp Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 919876543210"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#00a884]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
              Website URL (Optional)
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
            />
          </div>
        </div>

        {/* Location & Booking Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Google Maps Location Link</span>
            </label>
            <input
              type="url"
              value={locationMapLink}
              onChange={(e) => setLocationMapLink(e.target.value)}
              placeholder="e.g. https://maps.app.goo.gl/xyz123"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
            />
            <p className="text-[11px] text-slate-400">
              When a customer asks &quot;Where are you located?&quot; or &quot;location పంపండి&quot;, AI shares this link.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#00a884]" />
              <span>Online Booking Link</span>
            </label>
            <input
              type="url"
              value={defaultBookingLink}
              onChange={(e) => setDefaultBookingLink(e.target.value)}
              placeholder="e.g. https://calendly.com/your-business or https://oneample.com/book"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#00a884]"
            />
            <p className="text-[11px] text-slate-400">
              Shared automatically when customers ask to register or book online.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
            Physical Store Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Door No. 4-20, MG Road, Vijayawada, Andhra Pradesh - 520010"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Working Hours & Schedule</span>
          </label>
          <input
            type="text"
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            placeholder="e.g. Mon-Sat: 10:00 AM - 9:00 PM | Sunday: 11:00 AM - 6:00 PM"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-600" />
            <span>Services & Pricing List (Used by AI to quote prices)</span>
          </label>
          <textarea
            rows={3}
            value={servicesAndPricing}
            onChange={(e) => setServicesAndPricing(e.target.value)}
            placeholder="e.g. 1. Pattu Sarees: ₹2,500 to ₹15,000 | 2. Bridal Sarees: ₹8,000 to ₹35,000 | 3. Alterations & Stitching: Free"
            className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>About Business / Description</span>
          </label>
          <textarea
            rows={2}
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
            placeholder="e.g. Leading textile showroom in Vijayawada offering handloom silk sarees, wedding wear, and customized ethnic outfits since 2012."
            className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a884]"
          />
        </div>
      </div>

      {/* Save Settings Bar */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-400">
          All settings are saved directly to your business profile.
        </p>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-sm px-8 py-3.5 rounded-2xl shadow-lg shadow-[#00a884]/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving Changes..." : "Save All Settings"}</span>
        </button>
      </div>

    </div>
  );
}
