"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageContext";
import { 
  CheckCircle2, 
  Upload, 
  Sparkles, 
  Phone, 
  MessageSquare, 
  Calendar, 
  AlertTriangle, 
  FileSpreadsheet, 
  Download,
  Send,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Bot,
  ShieldCheck,
  Zap,
  Clock
} from "lucide-react";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [step, setStep] = useState(1);

  // Step 1 State
  const [campaignType, setCampaignType] = useState("OFFER");
  const [customType, setCustomType] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [bookingLink, setBookingLink] = useState("");
  const [shortNote, setShortNote] = useState("");
  const [isBusinessNameMissing, setIsBusinessNameMissing] = useState(false);

  // Step 2 State (Poster & Vision Extraction)
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [extractedDetails, setExtractedDetails] = useState<any>(null);
  const [generatedOptions, setGeneratedOptions] = useState<{
    short: string;
    standard?: string;
    detailed: string;
    festive: string;
  } | null>(null);
  const [offerLanguage, setOfferLanguage] = useState<"English" | "Telugu" | "Hindi">("English");
  const [selectedOptionType, setSelectedOptionType] = useState<"short" | "detailed" | "festive">("short");
  const [previewTab, setPreviewTab] = useState<"template" | "direct">("template");

  // Reusable Template State
  const [reusableTemplate, setReusableTemplate] = useState<any>(null);
  const [posterTemplate, setPosterTemplate] = useState<any>(null);
  const [textTemplate, setTextTemplate] = useState<any>(null);
  const [offerText, setOfferText] = useState("");

  // Step 3 State (Contacts)
  const [fileData, setFileData] = useState<any>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [nameColIndex, setNameColIndex] = useState(0);
  const [phoneColIndex, setPhoneColIndex] = useState(1);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [optInConfirmed, setOptInConfirmed] = useState(false);

  // 24-Hour Window Split State
  const [windowAnalysis, setWindowAnalysis] = useState<{
    windowCount: number;
    outsideCount: number;
    windowPhones: string[];
    total: number;
  } | null>(null);

  // Step 4 State (Review & Send)
  const [alwaysUseTemplate, setAlwaysUseTemplate] = useState(true); // Default ON as requested
  const [sendOption, setSendOption] = useState<"NOW" | "SCHEDULE" | "WAITING_APPROVAL">("NOW");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const perMessageRate = 0.80;

  useEffect(() => {
    // Load business profile to prefill business name and default booking link
    fetch("/api/business/profile")
      .then((res) => res.json())
      .then((profile) => {
        if (profile) {
          if (profile.name && profile.name.trim()) {
            setBusinessName(profile.name.trim());
            setIsBusinessNameMissing(false);
          } else {
            setIsBusinessNameMissing(true);
          }
          if (profile.defaultBookingLink && profile.defaultBookingLink.trim()) {
            setBookingLink(profile.defaultBookingLink.trim());
          }
        }
      })
      .catch((e) => console.error("Error loading business profile:", e));

    fetch("/api/templates/reusable")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.posterTemplate) setPosterTemplate(data.posterTemplate);
          if (data.textTemplate) setTextTemplate(data.textTemplate);
          setReusableTemplate(data);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // When step changes to 4, analyze 24h window split across valid contacts
  useEffect(() => {
    if (step === 4 && parsedResult?.contacts) {
      const validPhones = parsedResult.contacts
        .filter((c: any) => c.isValid && !c.isDuplicate)
        .map((c: any) => c.cleanPhone);

      fetch("/api/contacts/check-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phones: validPhones }),
      })
        .then((res) => res.json())
        .then((data) => {
          setWindowAnalysis(data);
        })
        .catch((e) => console.error(e));
    }
  }, [step, parsedResult]);

  const handlePosterUpload = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Poster image size must be less than 5 MB");
      return;
    }
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPosterImage(base64);
      analyzeWithGemini(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeWithGemini = async (base64Img: string, type: string, lang?: string) => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/templates/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64Img,
          mimeType: type,
          targetLang: lang || offerLanguage,
          note: shortNote,
          bookingLink: bookingLink.trim(),
        }),
      });
      const data = await res.json();

      if (data.error) {
        setAnalysisError(data.error);
      }

      if (data.extractedDetails) {
        setExtractedDetails(data.extractedDetails);
        if (data.extractedDetails.poster_language && ["English", "Telugu", "Hindi"].includes(data.extractedDetails.poster_language)) {
          setOfferLanguage(data.extractedDetails.poster_language);
        }
      }

      if (data.generatedOptions) {
        setGeneratedOptions(data.generatedOptions);
        setOfferText(data.generatedOptions.short || data.generatedOptions.standard || data.generatedOptions.detailed || "");
        setSelectedOptionType("short");
      }
    } catch (err: any) {
      console.error("Gemini Vision Error:", err);
      setAnalysisError(err.message || "Failed to analyze poster image");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRegenerateOptions = async (updatedDetails?: any, targetLang?: string) => {
    const detailsToUse = updatedDetails || extractedDetails;
    const langToUse = targetLang || offerLanguage;
    if (!detailsToUse) return;

    setAnalyzing(true);
    try {
      const res = await fetch("/api/templates/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedDetails: detailsToUse,
          targetLang: langToUse,
          bookingLink: bookingLink.trim(),
        }),
      });
      const data = await res.json();
      if (data.generatedOptions) {
        setGeneratedOptions(data.generatedOptions);
        setOfferText(data.generatedOptions[selectedOptionType] || data.generatedOptions.short || "");
      }
    } catch (err: any) {
      console.error("Error regenerating options:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleContactFileUpload = async (file: File) => {
    setParsingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("nameColIndex", String(nameColIndex));
      formData.append("phoneColIndex", String(phoneColIndex));

      const res = await fetch("/api/contacts/parse", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setParsedResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to parse contacts file");
    } finally {
      setParsingFile(false);
    }
  };

  const downloadSampleExcel = () => {
    const sampleCsv = `Name,Phone Number\nRavi Kumar,9848012345\nSuresh Babu,9848023456\nPriya Sharma,9848034567\nLakshmi Rao,9848045678`;
    const blob = new Blob([sampleCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iBrainLabs_Sample_Contacts.csv";
    a.click();
  };

  const hasPoster = !!posterImage;
  const activeTemplate = hasPoster ? (posterTemplate || reusableTemplate) : (textTemplate || reusableTemplate);
  const selectedTemplateName = hasPoster ? "offer_poster_v1" : "offer_update_v1";
  const isApproved = (activeTemplate?.status || "APPROVED") === "APPROVED";
  const has24hContacts = (windowAnalysis?.windowCount || 0) > 0;
  const canLaunchNow = isApproved || has24hContacts;
  const firstContactName = parsedResult?.contacts?.[0]?.name?.trim() || "Customer";

  const renderWhatsAppText = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(1, -1)}
          </strong>
        );
      }
      return part;
    });
  };

  const getFullOfferText = () => {
    let base = (offerText || shortNote || "Special Offer for you today!").trim();
    if (bookingLink.trim() && !base.includes(bookingLink.trim())) {
      base = `${base} 👉 ${bookingLink.trim()}`;
    }
    return base
      .replace(/[\r\n\t]/g, " ")
      .replace(/ {5,}/g, "    ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 300);
  };

  const getDirectMessageLines = () => {
    const full = getFullOfferText();
    if (full.includes("|")) {
      return full.split("|").map((p) => p.trim()).filter(Boolean);
    }
    // Balanced format: "<1 emoji> *<title>* – <sentence>. <cta> 👉 <link>"
    const match = full.match(/^([^*]*\*[^*]+\*)\s*–\s*(.*)$/);
    if (match) {
      const titleLine = match[1].trim();
      const rest = match[2].trim();
      const lines = [titleLine];
      if (rest.includes("👉")) {
        const [sentencePart, linkPart] = rest.split(/(?=👉)/);
        if (sentencePart.trim()) lines.push(sentencePart.trim());
        if (linkPart.trim()) lines.push(linkPart.trim());
      } else {
        lines.push(rest);
      }
      return lines;
    }
    return [full];
  };

  const handleSendTestToMe = async () => {
    setSendingTest(true);
    try {
      const res = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: "919390487233",
          recipientName: firstContactName,
          businessName: businessName.trim() || "iBrainLabs",
          bookingLink: bookingLink.trim() || undefined,
          posterImage,
          templateName: selectedTemplateName,
          offerText: offerText || shortNote,
          forceTemplate: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Test message sent to your phone! 📱\nName: ${firstContactName}\nTemplate: ${selectedTemplateName}`);
      } else {
        alert(`Test Send Error: ${data.error || "Failed to send test"}`);
      }
    } catch (err: any) {
      alert(err.message || "Test send failed");
    } finally {
      setSendingTest(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!businessName.trim()) {
      alert("Please add your business name in Step 1 before launching.");
      setStep(1);
      return;
    }
    if (bookingLink.trim() && !bookingLink.trim().startsWith("https://")) {
      alert("Booking link must be a valid https:// URL.");
      setStep(1);
      return;
    }
    if (!optInConfirmed || submittingCampaign) {
      if (!optInConfirmed) alert("Please confirm customer opt-in agreement checkbox.");
      return;
    }
    setSubmittingCampaign(true);
    try {
      const validContacts = parsedResult?.contacts?.filter((c: any) => c.isValid && !c.isDuplicate) || [];

      const payload = {
        name: campaignName || `${campaignType} Campaign`,
        businessName: businessName.trim(),
        bookingLink: bookingLink.trim() || null,
        alwaysUseTemplate,
        type: campaignType,
        customType,
        note: offerText || shortNote,
        templateId: activeTemplate?.id,
        posterImage,
        scheduledAt: sendOption === "SCHEDULE" ? scheduledDateTime : null,
        contactsData: validContacts,
        status: !isApproved && !has24hContacts ? "WAITING_APPROVAL" : "SENDING",
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (!isApproved && has24hContacts) {
          alert(`🚀 Launching instant direct image messages for ${windowAnalysis?.windowCount} contacts in 24h window!\n\nRemaining ${windowAnalysis?.outsideCount} contacts saved under WAITING_APPROVAL.`);
        } else if (!isApproved) {
          alert(`⌛ Campaign Saved & Scheduled! It will send automatically once Meta approves ${selectedTemplateName}.`);
        } else {
          alert(`🚀 Campaign Launched Successfully with ${selectedTemplateName}!`);
        }
        router.push("/campaigns");
      } else {
        alert(`Error: ${data.error || "Failed to launch campaign"}`);
      }
    } catch (err: any) {
      alert(err.message || "Launch failed");
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const steps = [
    { num: 1, label: t("createCampaign.step1") },
    { num: 2, label: t("createCampaign.step2") },
    { num: 3, label: t("createCampaign.step3") },
    { num: 4, label: t("createCampaign.step4") },
  ];

  const typeCards = [
    { key: "OFFER", icon: "🏷️", title: "Offers & Sales", desc: "Discounts, clearance & promo codes" },
    { key: "WEEKEND", icon: "🎉", title: "Weekend Special", desc: "Saturday & Sunday flash deals" },
    { key: "FESTIVAL", icon: "🪔", title: "Festivals & Holidays", desc: "Ugadi, Diwali, Sankranti offers" },
    { key: "ANNOUNCEMENT", icon: "📢", title: "Announcement", desc: "New stock, store opening & news" },
    { key: "CUSTOM", icon: "✏️", title: "Custom Type", desc: "Type your own custom campaign type" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-heading font-extrabold text-slate-heading">
          {t("createCampaign.title")}
        </h1>
        <p className="text-sm text-slate-muted max-w-xl mx-auto">
          {t("createCampaign.subtitle")}
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-emerald-100 shadow-card">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => isDone && setStep(s.num)}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isDone ? "cursor-pointer hover:bg-emerald-50" : ""
                } ${isActive ? "bg-emerald-50 border border-emerald-200" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-xs shrink-0 ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isActive
                    ? "bg-brand-500 text-white ring-4 ring-emerald-100"
                    : "bg-slate-100 text-slate-muted"
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-heading font-semibold line-clamp-1 ${
                  isActive ? "text-emerald-800" : isDone ? "text-emerald-700" : "text-slate-muted"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: CAMPAIGN TYPE & DETAILS */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-card space-y-8">
          <div className="space-y-4">
            <label className="block text-sm font-heading font-bold text-slate-heading">
              Select Campaign Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {typeCards.map((card) => (
                <div
                  key={card.key}
                  onClick={() => setCampaignType(card.key)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all text-center space-y-2 ${
                    campaignType === card.key
                      ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-400/20"
                      : "border-slate-200 hover:border-emerald-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="text-3xl">{card.icon}</div>
                  <div className="font-heading font-bold text-xs text-slate-heading">{card.title}</div>
                  <div className="text-[11px] text-slate-muted leading-tight">{card.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {campaignType === "CUSTOM" && (
            <div className="space-y-2">
              <label className="block text-xs font-heading font-semibold text-slate-heading">
                Enter Custom Campaign Type
              </label>
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="e.g. VIP Member Exclusive"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-body"
              />
            </div>
          )}

          {isBusinessNameMissing && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-heading font-semibold">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Please add your business name below. It will be sent as parameter {"{{3}}"} to all contacts.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-heading font-bold text-slate-heading">
                {t("createCampaign.campaignNameLabel")} *
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={t("createCampaign.campaignNamePlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-body"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-heading font-bold text-slate-heading">
                {t("createCampaign.businessNameLabel")} *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  if (e.target.value.trim()) setIsBusinessNameMissing(false);
                }}
                placeholder="e.g. iBrainLabs"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-body font-semibold text-slate-heading"
              />
              <p className="text-[11px] text-slate-400">Prefilled from Business Profile. You can customize it for this campaign.</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-xs font-heading font-bold text-slate-heading">
                Booking Link (Optional)
              </label>
              <input
                type="text"
                value={bookingLink}
                onChange={(e) => setBookingLink(e.target.value)}
                placeholder="https://ibrainlabs.com/contact/"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-body font-mono"
              />
              <p className="text-[11px] text-slate-400">Prefilled from Business Profile. If provided, "Book now: &lt;link&gt;" will be automatically appended to offer text variable {"{{2}}"}.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-heading font-bold text-slate-heading">
              {t("createCampaign.shortNoteLabel")}
            </label>
            <textarea
              rows={3}
              value={shortNote}
              onChange={(e) => setShortNote(e.target.value)}
              placeholder={t("createCampaign.shortNotePlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-body"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                if (!businessName.trim()) {
                  alert("Please enter your business name before proceeding.");
                  return;
                }
                if (bookingLink.trim() && !bookingLink.trim().startsWith("https://")) {
                  alert("Booking link must be a valid https:// URL.");
                  return;
                }
                if (!campaignName) {
                  setCampaignName(`${campaignType} Special Campaign`);
                }
                setStep(2);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
            >
              <span>{t("createCampaign.nextStep")}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: UPLOAD POSTER & VISION EXTRACTED OFFER TEXT */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            
            {reusableTemplate && (
              <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-heading font-bold text-slate-heading">
                      Reusable Meta Template: <code className="text-emerald-800 font-mono">offer_update_v1</code>
                    </span>
                    <span className="block text-[11px] text-slate-muted">
                      {isApproved
                        ? "Approved by Meta! Zero waiting time for campaigns."
                        : "Meta review in progress. Contacts in 24h window can receive direct image messages now!"}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                  isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {reusableTemplate.status}
                </span>
              </div>
            )}

            {/* Upload Poster Image */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-card space-y-4">
              <h2 className="text-base font-heading font-bold text-slate-heading flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                <span>Upload Campaign Poster (Header Image)</span>
              </h2>

              <label className="relative border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-pastel-mint/20 hover:bg-pastel-mint/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center min-h-[160px]">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handlePosterUpload(e.target.files[0])}
                />
                {posterImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={posterImage} alt="Poster preview" className="h-36 object-contain rounded-xl shadow-md" />
                    <span className="text-xs text-emerald-700 font-medium">Click to replace poster image</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-heading font-semibold text-slate-heading">
                      {t("createCampaign.dragDropPoster")}
                    </p>
                    <p className="text-[11px] text-slate-muted">
                      {t("createCampaign.orClickToBrowse")}
                    </p>
                  </div>
                )}
              </label>

              {analyzing && (
                <div className="flex items-center justify-center gap-3 p-4 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-heading font-semibold animate-pulse">
                  <Sparkles className="w-5 h-5 text-emerald-600 animate-spin" />
                  <span>Reading poster text with Gemini AI Vision...</span>
                </div>
              )}

              {analysisError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between text-rose-800 font-heading font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Poster Reading Notice
                    </span>
                    <button
                      onClick={() => posterImage && analyzeWithGemini(posterImage, mimeType)}
                      className="flex items-center gap-1 bg-white border border-rose-300 text-rose-700 px-2.5 py-1 rounded-lg text-[11px]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{analysisError}</p>
                </div>
              )}
            </div>

            {/* Editable "Poster Details" Card */}
            {extractedDetails && (
              <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white rounded-3xl p-6 border border-emerald-200/80 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800 font-heading font-bold text-sm">
                    <Bot className="w-5 h-5 text-emerald-600" />
                    <span>✨ Editable Poster Details (Vision Extracted)</span>
                  </div>
                  <button
                    onClick={() => handleRegenerateOptions()}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate Options</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Business Name</label>
                    <input
                      type="text"
                      value={extractedDetails.business_name || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, business_name: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Jungle Tiger Resort (or empty)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-heading"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Business Type</label>
                    <input
                      type="text"
                      value={extractedDetails.business_type || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, business_type: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Resort & Safari, Restaurant, Shop..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Offer Title / Headline</label>
                    <input
                      type="text"
                      value={extractedDetails.offer_title || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, offer_title: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Wildlife Safari Package"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Discount / Offer</label>
                    <input
                      type="text"
                      value={extractedDetails.discount || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, discount: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. 20% OFF (or empty if no discount)"
                      className="w-full px-3 py-2 rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-emerald-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Products / Services</label>
                    <input
                      type="text"
                      value={extractedDetails.products_or_services || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, products_or_services: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Safari Stay, Rooms & Guided Tours"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-heading"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Occasion / Festival</label>
                    <input
                      type="text"
                      value={extractedDetails.occasion || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, occasion: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Monsoon Special"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Valid Till Date</label>
                    <input
                      type="text"
                      value={extractedDetails.valid_till || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, valid_till: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Valid till Oct 31"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Location / Address</label>
                    <input
                      type="text"
                      value={extractedDetails.location || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, location: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. Nagarhole National Park"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Phone Number</label>
                    <input
                      type="text"
                      value={extractedDetails.phone || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, phone: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. +91 93904 84762"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-muted uppercase">Website / Social</label>
                    <input
                      type="text"
                      value={extractedDetails.website || extractedDetails.social_handle || ""}
                      onChange={(e) => {
                        const updated = { ...extractedDetails, website: e.target.value || null };
                        setExtractedDetails(updated);
                      }}
                      placeholder="e.g. www.resort.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Language Selector & 3 Generated Options Picker */}
            {generatedOptions && (
              <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-card space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-heading font-bold text-slate-heading flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Select Generated Offer Text Option
                    </h3>
                    <p className="text-[11px] text-slate-muted mt-0.5">
                      Choose one of 3 generated options for variable {"{{2}}"} of our template
                    </p>
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
                    {(["English", "Telugu", "Hindi"] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setOfferLanguage(lang);
                          handleRegenerateOptions(extractedDetails, lang);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all ${
                          offerLanguage === lang
                            ? "bg-white text-emerald-800 shadow-xs border border-emerald-200"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {lang === "English" ? "🇬🇧 English" : lang === "Telugu" ? "🇮🇳 Telugu" : "🇮🇳 Hindi"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Generated Options */}
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: "short", label: "⚡ Short", text: generatedOptions.short },
                    { key: "detailed", label: "📋 Standard", text: (generatedOptions as any).standard || generatedOptions.detailed },
                    { key: "festive", label: "🌸 Festive", text: generatedOptions.festive },
                  ].map((option) => {
                    const isSelected = selectedOptionType === option.key;
                    return (
                      <div
                        key={option.key}
                        onClick={() => {
                          setSelectedOptionType(option.key as any);
                          setOfferText(option.text);
                        }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-1.5 ${
                          isSelected
                            ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400/20"
                            : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-heading font-bold ${isSelected ? "text-emerald-900" : "text-slate-heading"}`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                              Selected ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-body text-slate-700 leading-relaxed font-mono">
                          {option.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Editable Offer Text Area */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-heading font-bold text-slate-heading">
                    Offer Text Message (Variable {"{{2}}"})
                  </h3>
                  <p className="text-[11px] text-slate-muted mt-0.5">
                    Format: &lt;emoji&gt; *&lt;Title&gt;* – &lt;one short sentence&gt;. &lt;call to action&gt; 👉 &lt;link&gt;
                  </p>
                </div>
                <span className={`text-[11px] font-mono ${offerText.length > 300 ? "text-rose-600 font-bold" : "text-slate-muted"}`}>
                  {offerText.length} / 300 chars
                </span>
              </div>

              <textarea
                rows={3}
                maxLength={300}
                value={offerText}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[\r\n\t]/g, " ").replace(/ {5,}/g, "    ");
                  setOfferText(cleaned.substring(0, 300));
                }}
                placeholder="Example: 🎙️ *Studio Booking @ ₹1,999/hour* – Podcast, video shoot & green screen studio with editing support. Book your slot today 👉 https://vaivastudios.com/online-booking/"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-body focus:ring-2 focus:ring-emerald-500 font-mono"
              />

              <p className="text-[11px] text-slate-400 leading-tight">
                ⚠️ Meta Variable Rule: Max 300 chars, single line only. Title: max 35 chars in *bold*, 1 sentence (max 100 chars), short CTA, exactly 2 emojis, no &quot;|&quot; pipe.
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-slate-muted hover:text-slate-heading font-heading font-semibold text-sm px-4 py-2.5"
              >
                <span>{t("createCampaign.prevStep")}</span>
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
              >
                <span>{t("createCampaign.nextStep")}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-center font-heading font-bold text-xs text-slate-muted uppercase tracking-wider">
              {t("createCampaign.templatePreviewTitle")}
            </h3>

            <div className="max-w-[320px] mx-auto bg-slate-900 p-3.5 rounded-[40px] shadow-2xl border-4 border-slate-800">
              <div className="bg-[#E5DDD5] rounded-[28px] overflow-hidden min-h-[500px] flex flex-col">
                <div className="bg-[#075E54] text-white p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-300 text-emerald-900 font-bold flex items-center justify-center text-xs">
                    {(businessName || "OB").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-heading font-bold text-xs">{businessName || "Your Business"}</div>
                    <div className="text-[10px] opacity-80">Official Business Account ✅</div>
                  </div>
                </div>

                <div className="p-3 flex-1 space-y-3 overflow-y-auto font-body text-xs">
                  <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-md border border-slate-200/50 space-y-2 max-w-[90%]">
                    {posterImage ? (
                      <img src={posterImage} alt="Header poster" className="w-full h-36 object-cover rounded-xl" />
                    ) : (
                      <div className="font-heading font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 text-emerald-800">
                        Exclusive Offer for <span className="text-emerald-700">{firstContactName}</span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap text-slate-800 text-[11px] leading-relaxed">
                      Dear <span className="font-bold text-emerald-700">{firstContactName}</span>,
                      <br /><br />
                      We have an offer for you: {offerText || shortNote || "Special Offer for you today!"}{bookingLink.trim() ? ` Book now: ${bookingLink.trim()}` : ""}
                      <br /><br />
                      Thank you for shopping with <span className="font-semibold">{businessName || "Your Business"}</span>. Have a great day!
                    </div>

                    <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                      Reply STOP to unsubscribe
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: UPLOAD CONTACTS */}
      {step === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-card space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-xl font-heading font-bold text-slate-heading">
                {t("createCampaign.uploadCsvTitle")}
              </h2>
              <p className="text-xs text-slate-muted mt-0.5">
                Upload your Excel or CSV customer sheet. Numbers are normalized to E.164 automatically.
              </p>
            </div>
            <button
              onClick={downloadSampleExcel}
              className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-heading font-semibold text-xs px-4 py-2.5 rounded-xl border border-emerald-200 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t("createCampaign.downloadSample")}</span>
            </button>
          </div>

          <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-pastel-mint/10 hover:bg-pastel-mint/30 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleContactFileUpload(e.target.files[0])}
            />
            <FileSpreadsheet className="w-12 h-12 text-emerald-600 mb-3" />
            <span className="font-heading font-bold text-sm text-slate-heading">
              Drop customer CSV or Excel file here
            </span>
          </label>

          {parsingFile && (
            <div className="text-center py-6 text-xs text-emerald-700 font-heading font-semibold animate-pulse">
              Parsing and normalizing phone numbers...
            </div>
          )}

          {parsedResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <span className="text-2xl font-heading font-extrabold text-emerald-800">
                    {parsedResult.validCount}
                  </span>
                  <span className="block text-xs font-semibold text-emerald-700">Valid Contacts</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <span className="text-2xl font-heading font-extrabold text-amber-800">
                    {parsedResult.duplicateCount}
                  </span>
                  <span className="block text-xs font-semibold text-amber-700">Duplicates Removed</span>
                </div>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  ✕
                </div>
                <div>
                  <span className="text-2xl font-heading font-extrabold text-rose-800">
                    {parsedResult.invalidCount}
                  </span>
                  <span className="block text-xs font-semibold text-rose-700">Invalid Numbers</span>
                </div>
              </div>
            </div>
          )}

          {parsedResult?.previewRows && parsedResult.previewRows.length > 0 && (
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-xs text-slate-heading">
                    📋 Uploaded Contacts Preview (First 5 Rows)
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Auto-Detected Columns
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Name Column: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-700 font-bold">{parsedResult.detectedNameCol || "Name"}</code> • Phone Column: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-700 font-bold">{parsedResult.detectedPhoneCol || "Phone"}</code>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-heading font-bold text-slate-muted uppercase">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Detected Contact Name ({"{{1}}"})</th>
                      <th className="py-2 px-3">Raw Input Phone</th>
                      <th className="py-2 px-3">Normalized Phone (E.164)</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-body">
                    {parsedResult.previewRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/60 transition-colors">
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-heading">
                          <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-200">
                            {row.name || "Customer"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{row.rawPhone || "—"}</td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">+{row.cleanPhone || "—"}</td>
                        <td className="py-2.5 px-3">
                          {row.isValid ? (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">Valid ✓</span>
                          ) : (
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full">Invalid ✕</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                ℹ️ Each customer will be addressed by their exact name in the WhatsApp message {"{{1}}"}. Empty names will safely receive "Customer".
              </p>
            </div>
          )}

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="optin"
              checked={optInConfirmed}
              onChange={(e) => setOptInConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="optin" className="text-xs font-heading font-semibold text-slate-heading cursor-pointer leading-relaxed">
              {t("createCampaign.optInCheckbox")}
            </label>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 text-slate-muted hover:text-slate-heading font-heading font-semibold text-sm px-4 py-2.5"
            >
              <span>{t("createCampaign.prevStep")}</span>
            </button>
            <button
              onClick={() => {
                if (!optInConfirmed) {
                  alert("Please check the customer agreement box.");
                  return;
                }
                setStep(4);
              }}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
            >
              <span>{t("createCampaign.nextStep")}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: REVIEW & LAUNCH */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-card space-y-8">
          <h2 className="text-xl font-heading font-bold text-slate-heading border-b border-slate-100 pb-4">
            {t("createCampaign.summaryTitle")}
          </h2>

          {/* 24-Hour Customer Window & Template Status Breakdown Card */}
          {windowAnalysis && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-2xl p-5 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-xs text-slate-heading flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  24-Hour Customer Window Delivery Breakdown
                </span>
                <span className="text-[11px] bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold text-emerald-800">
                  Total: {windowAnalysis.total} Contacts
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-heading font-bold">
                    <span>⚡ Direct Image Message (Free / 24h Window)</span>
                    <span className="text-sm font-extrabold">{windowAnalysis.windowCount}</span>
                  </div>
                  <p className="text-[11px] text-slate-muted">
                    Contacts who messaged in last 24h. Receive direct image + caption message (free of charge).
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-800 font-heading font-bold">
                    <span>📢 Template Message ({selectedTemplateName})</span>
                    <span className="text-sm font-extrabold">{windowAnalysis.outsideCount}</span>
                  </div>
                  <p className="text-[11px] text-slate-muted">
                    Contacts outside 24h window. Dispatched instantly using Meta approved {selectedTemplateName} template.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Approval Notice (hidden when template is APPROVED) */}
          {!isApproved && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-heading font-bold text-xs">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {has24hContacts
                    ? `Your offer template is waiting for Meta approval, but ${windowAnalysis?.windowCount} contacts in your 24h window can receive direct messages now!`
                    : "Your offer template is waiting for Meta approval. You can send a test to yourself or schedule this campaign – it will send automatically once approved."}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 text-xs font-body">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-muted font-heading font-bold">Campaign Name:</span>
                  <span className="font-semibold text-slate-heading">{campaignName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-muted font-heading font-bold">Template Used:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-emerald-800 font-bold text-xs">{selectedTemplateName}</span>
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      APPROVED
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-muted font-heading font-bold">Language:</span>
                  <span className="font-semibold text-slate-heading">en_US</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-muted font-heading font-bold">Recipients:</span>
                  <span className="font-semibold text-slate-heading">{parsedResult?.validCount || 0} customers</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-heading font-heading font-bold">{t("createCampaign.estimatedCost")}:</span>
                  <span className="font-heading font-extrabold text-sm text-emerald-700">
                    ₹{((parsedResult?.validCount || 0) * perMessageRate).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Always use approved template toggle */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-xs text-slate-heading">
                        Always use approved template
                      </span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {alwaysUseTemplate
                        ? `ON: Every contact gets ${selectedTemplateName}, even if they messaged in the 24h window.`
                        : "OFF: Contacts in the 24h window receive free direct image messages without template."}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={alwaysUseTemplate}
                      onChange={(e) => setAlwaysUseTemplate(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {canLaunchNow && (
                <div className="space-y-3 pt-2">
                  <label className="block font-heading font-bold text-slate-heading">
                    Sending Options
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSendOption("NOW")}
                      className={`p-3.5 rounded-2xl border text-xs font-heading font-bold transition-all ${
                        sendOption === "NOW"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "bg-white text-slate-heading border-slate-200"
                      }`}
                    >
                      🚀 {t("createCampaign.sendNow")}
                    </button>
                    <button
                      onClick={() => setSendOption("SCHEDULE")}
                      className={`p-3.5 rounded-2xl border text-xs font-heading font-bold transition-all ${
                        sendOption === "SCHEDULE"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                          : "bg-white text-slate-heading border-slate-200"
                      }`}
                    >
                      📅 {t("createCampaign.scheduleLater")}
                    </button>
                  </div>

                  {sendOption === "SCHEDULE" && (
                    <div className="space-y-1 pt-2">
                      <label className="text-[11px] font-heading font-semibold text-slate-heading">
                        Select Date & Time (Asia/Kolkata)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp Styled Preview */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-heading font-bold text-emerald-900 block">
                    WhatsApp Customer Preview
                  </span>
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    APPROVED
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mode switcher */}
                  <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-heading font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("template")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        previewTab === "template"
                          ? "bg-white text-emerald-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      📢 Template
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("direct")}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        previewTab === "direct"
                          ? "bg-white text-emerald-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ⚡ Direct 24h
                    </button>
                  </div>

                  <button
                    onClick={handleSendTestToMe}
                    disabled={sendingTest}
                    className="flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-heading font-bold text-xs px-3 py-1 rounded-xl transition-all shadow-xs"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>{sendingTest ? "Sending Test..." : "Send Test to Me 📱"}</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#E5DDD5] p-3 rounded-2xl shadow-inner space-y-2 border border-slate-300/50">
                <div className="bg-[#075E54] text-white p-2.5 rounded-xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center text-xs">
                      {(businessName || "OB").substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-xs leading-none">{businessName || "iBrainLabs"}</div>
                      <div className="text-[9px] opacity-80 mt-0.5">Official Business Account ✅</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded text-white">
                    {previewTab === "template" ? selectedTemplateName : "Direct 24h"}
                  </span>
                </div>

                <div className="bg-white rounded-xl rounded-tl-none p-3.5 shadow-md border border-slate-200/60 space-y-2.5 text-xs text-slate-800 max-w-[95%]">
                  {/* Poster Header */}
                  {posterImage ? (
                    <img src={posterImage} alt="Poster" className="h-40 w-full object-cover rounded-lg shadow-xs" />
                  ) : previewTab === "template" ? (
                    <div className="font-heading font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 text-emerald-800">
                      Exclusive Offer for <span className="text-emerald-700">{firstContactName}</span>
                    </div>
                  ) : null}

                  {/* Body Content */}
                  {previewTab === "template" ? (
                    // Meta Template view (offer_poster_v1)
                    <div className="space-y-2 text-[11px] text-slate-800 leading-relaxed">
                      <p>
                        Dear <span className="font-bold text-emerald-700">{firstContactName}</span>,
                      </p>
                      <p className="font-body text-slate-900">
                        We have an offer for you: {renderWhatsAppText(getFullOfferText())}
                      </p>
                      <p>
                        Thank you for shopping with <span className="font-semibold text-slate-900">{businessName || "iBrainLabs"}</span>. Have a great day!
                      </p>
                    </div>
                  ) : (
                    // Direct 24-Hour Session Window Message (with line breaks)
                    <div className="space-y-2 text-[11px] text-slate-800 leading-relaxed">
                      <p>
                        Dear <span className="font-bold text-emerald-700">{firstContactName}</span>,
                      </p>
                      <div className="space-y-1 py-1">
                        {getDirectMessageLines().map((line, idx) => (
                          <div key={idx} className="text-slate-900">
                            {renderWhatsAppText(line)}
                          </div>
                        ))}
                      </div>
                      <p>
                        Thank you for shopping with <span className="font-semibold text-slate-900">{businessName || "iBrainLabs"}</span>. Have a great day!
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 flex items-center justify-between">
                    <span>
                      {previewTab === "template" ? "Reply STOP to unsubscribe" : "⚡ Direct Session Message"}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400">
                      {previewTab === "template" ? `Template ${selectedTemplateName} (en_US)` : "24h Window Free"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 text-slate-muted hover:text-slate-heading font-heading font-semibold text-sm px-4 py-2.5"
            >
              <span>{t("createCampaign.prevStep")}</span>
            </button>

            {canLaunchNow ? (
              <button
                onClick={handleLaunchCampaign}
                disabled={submittingCampaign}
                className="flex items-center gap-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-coral-500/30 hover:-translate-y-0.5 transition-all"
              >
                <Send className="w-5 h-5" />
                <span>
                  {submittingCampaign
                    ? "Launching..."
                    : "Launch Campaign Now 🚀"}
                </span>
              </button>
            ) : (
              <button
                onClick={handleLaunchCampaign}
                disabled={submittingCampaign}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold text-sm px-6 py-3.5 rounded-2xl shadow-lg transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>{submittingCampaign ? "Saving..." : "Schedule – Send When Approved 📅"}</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
