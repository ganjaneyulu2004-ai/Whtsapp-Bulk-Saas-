"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageContext";
import { 
  CreditCard,
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
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  detectVariableSlotType,
  getGenericFallbackForVariable,
  sanitizeVariableValue,
} from "@/lib/template-variables";

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

  // Approved Client WABA Templates State (synced from Meta, MARKETING + UTILITY)
  const [approvedTemplates, setApprovedTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [var1UseContactName, setVar1UseContactName] = useState(true);
  const [templateVarValues, setTemplateVarValues] = useState<Record<number, string>>({});
  const [varMeta, setVarMeta] = useState<
    Record<number, { aiFilled?: boolean; manualEdited?: boolean; missingFromPoster?: boolean }>
  >({});
  const [regeneratingVar, setRegeneratingVar] = useState<number | null>(null);
  const [showEditMessage, setShowEditMessage] = useState(false);
  const varMetaRef = React.useRef(varMeta);
  varMetaRef.current = varMeta;
  const lastAnalyzedSourceRef = React.useRef<string | null>(null);
  const [offerText, setOfferText] = useState("");
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

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
  const [waConnected, setWaConnected] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/embedded-signup")
      .then((res) => res.json())
      .then((data) => {
        if (data?.config?.isConnected) {
          setWaConnected(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Load business profile to prefill business name and default booking link
    setLoadingProfile(true);
    fetch("/api/business/profile")
      .then((res) => res.json())
      .then((profile) => {
        if (profile) {
          setBusinessProfile(profile);
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
      .catch((e) => console.error("Error loading business profile:", e))
      .finally(() => setLoadingProfile(false));

    setLoadingTemplates(true);
    fetch("/api/templates?sync=true&approvedOnly=true", { cache: "no-store" })
      .then((res) => res.json())
      .then((list) => {
        if (Array.isArray(list)) {
          const valid = list.filter((tpl: any) => {
            const cat = String(tpl.category || "").toUpperCase();
            return (
              String(tpl.status || "").toUpperCase() === "APPROVED" &&
              tpl.name !== "hello_world" &&
              (cat === "MARKETING" || cat === "UTILITY")
            );
          });
          setApprovedTemplates(valid);
          if (valid.length > 0) {
            const approvedImageTemplates = valid.filter((t: any) => t.headerType === "IMAGE");
            const preferredTpl =
              approvedImageTemplates.length === 1 ? approvedImageTemplates[0] : valid[0];
            setSelectedTemplateId((prev) =>
              prev && valid.some((t: any) => t.id === prev) ? prev : preferredTpl.id
            );
          } else {
            setSelectedTemplateId("");
          }
        }
        setLoadingTemplates(false);
      })
      .catch((e) => {
        console.error(e);
        setLoadingTemplates(false);
      });
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
    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      // Clear ref so effect triggers fresh Vision analysis + auto-fill for this uploaded image
      lastAnalyzedSourceRef.current = null;
      setPosterImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const activeTemplate = approvedTemplates.find((tpl) => tpl.id === selectedTemplateId) || null;
  const selectedTemplateName = activeTemplate?.name || "None selected";
  const selectedTemplateLang = activeTemplate?.language || "—";
  const isImageHeader = activeTemplate?.headerType === "IMAGE";
  const defaultTemplateImageUrl = isImageHeader
    ? activeTemplate?.headerImageUrl || activeTemplate?.headerMediaUrl || null
    : null;
  const effectivePreviewImage = isImageHeader ? posterImage || defaultTemplateImageUrl : null;
  const isApproved = Boolean(activeTemplate && String(activeTemplate.status).toUpperCase() === "APPROVED");
  const has24hContacts = (windowAnalysis?.windowCount || 0) > 0;
  const firstContactName = parsedResult?.contacts?.[0]?.name?.trim() || "Customer";

  const businessContext = React.useMemo(() => ({
    name: businessName.trim(),
    bookingLink: bookingLink.trim(),
    recipientName: firstContactName || "Customer",
    servicesAndPricing: businessProfile?.servicesAndPricing,
    businessDescription: businessProfile?.businessDescription,
    category: businessProfile?.category,
  }), [businessName, bookingLink, firstContactName, businessProfile]);

  const templateBodyExamples: string[] = React.useMemo(() => {
    if (!activeTemplate?.bodyExamplesJson) return [];
    try {
      const parsed = JSON.parse(activeTemplate.bodyExamplesJson);
      return Array.isArray(parsed) ? parsed.map((x) => String(x ?? "")) : [];
    } catch {
      return [];
    }
  }, [activeTemplate?.bodyExamplesJson]);

  const bodyVariables: number[] = React.useMemo(() => {
    const body = activeTemplate?.bodyText || "";
    let maxIdx = 0;
    const regex = /\{\{(\d+)\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body)) !== null) {
      const idx = parseInt(match[1], 10);
      if (!Number.isNaN(idx) && idx > maxIdx) maxIdx = idx;
    }
    return maxIdx > 0 ? Array.from({ length: maxIdx }, (_, i) => i + 1) : [];
  }, [activeTemplate?.bodyText]);

  const applySuggestedVariables = (
    suggested: Record<string, string | null> | undefined,
    opts?: { onlyVar?: number; respectManual?: boolean }
  ) => {
    if (!suggested) return;
    const varsToUpdate = opts?.onlyVar ? [opts.onlyVar] : bodyVariables;
    const currentMetaSnapshot = varMetaRef.current;

    setTemplateVarValues((prev) => {
      const next = { ...prev };
      const used = new Set<string>();

      // Record any variables that are not being updated so fallbacks don't collide
      for (const v of bodyVariables) {
        if (!varsToUpdate.includes(v) && next[v] && next[v].trim()) {
          used.add(next[v].trim().toLowerCase());
        }
      }

      for (const v of varsToUpdate) {
        if (!opts?.onlyVar && v === 1 && var1UseContactName) {
          used.add((firstContactName || "Customer").toLowerCase());
          continue;
        }
        if (opts?.respectManual && currentMetaSnapshot[v]?.manualEdited) {
          if (next[v]) used.add(next[v].trim().toLowerCase());
          continue;
        }

        const raw = suggested[String(v)];
        if (raw && String(raw).trim()) {
          const cleaned = sanitizeVariableValue(raw, 2);
          next[v] = cleaned;
          used.add(cleaned.toLowerCase());
          if (v === 2) setOfferText(cleaned);
        } else {
          const fallback = getGenericFallbackForVariable(
            v,
            activeTemplate?.bodyText,
            extractedDetails,
            businessContext,
            used
          );
          next[v] = fallback;
          used.add(fallback.toLowerCase());
          if (v === 2) setOfferText(fallback);
        }
      }
      return next;
    });

    setVarMeta((prev) => {
      const next = { ...prev };
      for (const v of varsToUpdate) {
        if (!opts?.onlyVar && v === 1 && var1UseContactName) continue;
        if (opts?.respectManual && prev[v]?.manualEdited) continue;

        next[v] = { aiFilled: true, manualEdited: false, missingFromPoster: false };
      }
      return next;
    });
  };

  const analyzeWithGemini = async (
    base64Img?: string | null,
    type?: string,
    lang?: string,
    options?: { targetVar?: number; respectManual?: boolean }
  ) => {
    const isSingleVar = typeof options?.targetVar === "number";
    if (isSingleVar) {
      setRegeneratingVar(options!.targetVar!);
    } else {
      setAnalyzing(true);
      setAnalysisError(null);
    }

    try {
      const res = await fetch("/api/templates/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64Img || undefined,
          mimeType: type || mimeType,
          targetLang: lang || "auto",
          note: shortNote,
          bookingLink: bookingLink.trim(),
          templateId: activeTemplate?.id,
          templateBodyText: activeTemplate?.bodyText,
          templateExamples: templateBodyExamples,
          targetVariable: options?.targetVar,
          extractedDetails: !base64Img && !defaultTemplateImageUrl ? extractedDetails : undefined,
        }),
      });
      const data = await res.json();

      if (data.error && !isSingleVar) {
        setAnalysisError(data.error);
      }

      if (data.extractedDetails) {
        setExtractedDetails(data.extractedDetails);
        if (data.extractedDetails.poster_language && ["English", "Telugu", "Hindi"].includes(data.extractedDetails.poster_language)) {
          setOfferLanguage(data.extractedDetails.poster_language);
        }
      }

      if (data.generatedOptions) {
        const picked = data.generatedOptions.short || data.generatedOptions.standard || data.generatedOptions.detailed || "";
        setGeneratedOptions(data.generatedOptions);
        setOfferText(picked);
        setSelectedOptionType("short");
      }

      if (data.suggestedVariables) {
        applySuggestedVariables(data.suggestedVariables, {
          onlyVar: options?.targetVar,
          respectManual: options?.respectManual ?? !isSingleVar,
        });
      }
    } catch (err: any) {
      console.error("Gemini Vision Error:", err);
      if (!isSingleVar) {
        setAnalysisError(err.message || "Failed to analyze poster image");
      }
    } finally {
      if (isSingleVar) {
        setRegeneratingVar(null);
      } else {
        setAnalyzing(false);
      }
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
          templateId: activeTemplate?.id,
          templateBodyText: activeTemplate?.bodyText,
          templateExamples: templateBodyExamples,
        }),
      });
      const data = await res.json();
      if (data.generatedOptions) {
        const picked = data.generatedOptions[selectedOptionType] || data.generatedOptions.short || "";
        setGeneratedOptions(data.generatedOptions);
        setOfferText(picked);
      }
      if (data.suggestedVariables) {
        applySuggestedVariables(data.suggestedVariables, { respectManual: true });
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
    a.download = "OneAmple_Sample_Contacts.csv";
    a.click();
  };

  // Auto-fill template variables with safe generic fallbacks whenever active template or bodyVariables change
  useEffect(() => {
    if (loadingProfile || !activeTemplate?.id || bodyVariables.length === 0) return;
    setTemplateVarValues((prev) => {
      const next = { ...prev };
      const used = new Set<string>();
      let changed = false;

      // Keep manually edited variables in used set so fallbacks don't collide with them
      for (const v of bodyVariables) {
        if (next[v] && next[v].trim() && varMetaRef.current[v]?.manualEdited) {
          used.add(next[v].trim().toLowerCase());
        }
      }

      for (const v of bodyVariables) {
        const isManual = varMetaRef.current[v]?.manualEdited;
        // Fill if empty OR refresh AI value when real business profile arrives
        if (!isManual && (!next[v] || !next[v].trim() || varMetaRef.current[v]?.aiFilled)) {
          const fallback = getGenericFallbackForVariable(
            v,
            activeTemplate.bodyText,
            extractedDetails,
            businessContext,
            used
          );
          if (next[v] !== fallback) {
            next[v] = fallback;
            changed = true;
            if (v === 2 && (!offerText || !isManual)) {
              setOfferText(fallback);
            }
          }
          used.add(fallback.toLowerCase());
        }
      }
      return changed ? next : prev;
    });

    setVarMeta((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const v of bodyVariables) {
        if (!next[v]) {
          next[v] = { aiFilled: true, manualEdited: false, missingFromPoster: false };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [loadingProfile, activeTemplate?.id, bodyVariables, businessContext]);

  // Automatically run Gemini Vision analysis & auto-fill when Step 2 uses an uploaded or template default image
  useEffect(() => {
    if (step !== 2 || !isImageHeader || !activeTemplate?.id || !effectivePreviewImage) {
      return;
    }
    const sourceKey = `${activeTemplate.id}::${
      posterImage ? `upload:${posterImage.length}:${posterImage.slice(-32)}` : `default:${defaultTemplateImageUrl}`
    }`;
    if (lastAnalyzedSourceRef.current === sourceKey) {
      return;
    }
    lastAnalyzedSourceRef.current = sourceKey;
    analyzeWithGemini(posterImage || undefined, mimeType, "auto", {
      respectManual: true,
    });
  }, [step, isImageHeader, activeTemplate?.id, posterImage, defaultTemplateImageUrl, effectivePreviewImage]);

  const describeNeededVariable = (bodyText: string | null | undefined, varNum: number): string => {
    if (!bodyText) return `variable {{${varNum}}}`;
    const slot = detectVariableSlotType(bodyText, varNum);
    switch (slot) {
      case "NAME":
        return "contact name";
      case "DATE":
        return "valid-till date";
      case "OFFER":
        return "offer details";
      case "BUSINESS_NAME":
        return "business name";
      case "LINK":
        return "booking link";
      case "PHONE":
        return "phone number";
      case "PRICE":
        return "price";
      case "DISCOUNT":
        return "discount";
      case "PRODUCT_OR_SERVICE":
        return "service or product";
      case "LOCATION":
        return "location";
      default:
        return `value for {{${varNum}}}`;
    }
  };

  const hasMissingStep2Fields =
    !activeTemplate ||
    !isApproved ||
    (isImageHeader && !effectivePreviewImage);

  const renderVariableCard = (varNum: number) => {
    const currentVal = templateVarValues[varNum] || "";
    const isFirst = varNum === 1;
    const showTextBox = !(isFirst && var1UseContactName);
    const rawExample = templateBodyExamples[varNum - 1] || "";
    const neededLabel = describeNeededVariable(activeTemplate?.bodyText, varNum);
    const inputPlaceholder = rawExample
      ? `Example: ${rawExample}`
      : `Enter ${neededLabel}`;
    const isRegeneratingThis = regeneratingVar === varNum;
    const canRegenerate = Boolean(
      isImageHeader && (effectivePreviewImage || extractedDetails)
    );

    return (
      <div
        key={varNum}
        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5 transition-all"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-heading font-bold text-slate-heading">
              Variable <span className="font-mono text-emerald-700">{`{{${varNum}}}`}</span>
            </label>
            {showTextBox && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                AI
              </span>
            )}
          </div>

          {showTextBox && (
            <div className="flex items-center gap-2">
              {canRegenerate && (
                <button
                  type="button"
                  disabled={isRegeneratingThis || analyzing}
                  onClick={() =>
                    analyzeWithGemini(
                      posterImage || undefined,
                      mimeType,
                      "auto",
                      { targetVar: varNum, respectManual: false }
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-heading font-bold transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegeneratingThis ? "animate-spin" : ""}`} />
                  <span>{isRegeneratingThis ? "Generating..." : "Regenerate"}</span>
                </button>
              )}
              {currentVal && (
                <button
                  type="button"
                  onClick={() => {
                    setTemplateVarValues((prev) => ({ ...prev, [varNum]: "" }));
                    if (varNum === 2) setOfferText("");
                    setVarMeta((prev) => ({
                      ...prev,
                      [varNum]: {
                        aiFilled: false,
                        manualEdited: false,
                        missingFromPoster: false,
                      },
                    }));
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-[10px] font-heading font-bold transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
              <span className={`text-[10px] font-mono ${currentVal.length > 300 ? "text-rose-600 font-bold" : "text-slate-muted"}`}>
                {currentVal.length} / 300
              </span>
            </div>
          )}
        </div>

        {isFirst && (
          <select
            value={var1UseContactName ? "contact_name" : "custom_text"}
            onChange={(e) => setVar1UseContactName(e.target.value === "contact_name")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="contact_name">
              Contact Name (dynamic per recipient, e.g. &quot;{firstContactName}&quot;)
            </option>
            <option value="custom_text">
              Custom Text (same value for all recipients)
            </option>
          </select>
        )}

        {showTextBox && (
          <textarea
            rows={2}
            maxLength={300}
            value={currentVal}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[\r\n\t]/g, " ").replace(/ {5,}/g, "    ");
              const nextVal = cleaned.substring(0, 300);
              setTemplateVarValues((prev) => ({ ...prev, [varNum]: nextVal }));
              setVarMeta((prev) => ({
                ...prev,
                [varNum]: {
                  aiFilled: false,
                  manualEdited: nextVal.trim().length > 0,
                  missingFromPoster: false,
                },
              }));
              if (varNum === 2) {
                setOfferText(nextVal);
              }
            }}
            placeholder={inputPlaceholder}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body focus:ring-2 focus:ring-emerald-500"
          />
        )}
      </div>
    );
  };

  const resolvePreviewVarValue = (varNum: number): string => {
    if (varNum === 1 && var1UseContactName) {
      return firstContactName || "Customer";
    }
    const typed = (templateVarValues[varNum] || "").trim();
    if (typed) return typed;
    return getGenericFallbackForVariable(
      varNum,
      activeTemplate?.bodyText,
      extractedDetails,
      businessContext
    );
  };

  const buildCustomBodyParameters = (): string[] | undefined => {
    if (bodyVariables.length === 0) return undefined;
    const maxIdx = Math.max(...bodyVariables);
    const used = new Set<string>();
    for (let i = 1; i <= maxIdx; i++) {
      const t = (templateVarValues[i] || "").trim();
      if (t) used.add(t.toLowerCase());
    }
    return Array.from({ length: maxIdx }, (_, idx) => {
      const num = idx + 1;
      if (num === 1 && var1UseContactName) {
        return "__CONTACT_NAME__";
      }
      const typed = (templateVarValues[num] || "").trim();
      if (typed) return typed;
      const fallback = getGenericFallbackForVariable(
        num,
        activeTemplate?.bodyText,
        extractedDetails,
        businessContext,
        used
      );
      used.add(fallback.toLowerCase());
      return fallback;
    });
  };

  const renderRealTemplateBody = (bodyText?: string | null) => {
    if (!bodyText) {
      return <span className="text-slate-400 italic">Select an approved template to preview message text.</span>;
    }
    const parts = bodyText.split(/(\{\{\d+\}\})/g);
    return parts.map((part, idx) => {
      const m = part.match(/^\{\{(\d+)\}\}$/);
      if (m) {
        const varNum = parseInt(m[1], 10);
        const val = resolvePreviewVarValue(varNum);
        return (
          <span key={idx} className="font-bold text-emerald-700">
            {val}
          </span>
        );
      }
      return <React.Fragment key={idx}>{renderWhatsAppText(part)}</React.Fragment>;
    });
  };

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
    if (!activeTemplate || !isApproved) {
      alert("Please select an APPROVED WhatsApp template before sending a test.");
      return;
    }
    if (isImageHeader && !effectivePreviewImage) {
      alert("This template requires an IMAGE header. Please upload a JPG or PNG image in Step 2.");
      setStep(2);
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: "919390487233",
          recipientName: firstContactName,
          businessName: businessName.trim() || "OneAmple",
          bookingLink: bookingLink.trim() || undefined,
          posterImage: isImageHeader ? posterImage : null,
          headerImageUrl: effectivePreviewImage || undefined,
          templateName: activeTemplate.name,
          languageCode: activeTemplate.language,
          customBodyParameters: buildCustomBodyParameters(),
          offerText: offerText || shortNote,
          forceTemplate: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || `Accepted by Meta (ID: ${data.waMessageId || "OK"}) for template ${activeTemplate.name}.`);
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
    if (!activeTemplate || !isApproved) {
      alert("Campaign launch blocked: you must select a template that is APPROVED in Meta.");
      setStep(2);
      return;
    }
    if (isImageHeader && !effectivePreviewImage) {
      alert("This template requires an IMAGE header. Please upload a JPG/PNG image.");
      setStep(2);
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
        templateId: activeTemplate.id,
        posterImage: isImageHeader ? posterImage : null,
        headerImageUrl: isImageHeader ? effectivePreviewImage || undefined : undefined,
        bodyVariables: buildCustomBodyParameters(),
        scheduledAt: sendOption === "SCHEDULE" ? scheduledDateTime : null,
        contactsData: validContacts,
        status: "SENDING",
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`🚀 Campaign Launched Successfully with ${activeTemplate.name}!`);
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

      {/* Meta Billing Hub Notice (shown only when WhatsApp is connected) */}
      {waConnected && (
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
              <CreditCard className="w-5 h-5" />
            </div>
            <p className="font-heading font-semibold text-xs sm:text-sm text-blue-950">
              {t("dashboard.metaBillingNotice")}
            </p>
          </div>
          <a
            href="https://business.facebook.com/billing_hub"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-heading font-bold text-xs shadow-xs transition-all shrink-0 flex items-center gap-1.5"
          >
            <span>{t("dashboard.openMetaBillingHub")}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

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
              <span>Please add your business name below so we can show your sender profile header cleanly.</span>
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
              <p className="text-[11px] text-slate-400">Prefilled from Business Profile for direct session messages.</p>
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
            
            {/* Approved Client WABA Template Picker (auto-selected when single approved IMAGE template) */}
            <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-heading font-bold text-slate-heading text-sm">
                    {approvedTemplates.length === 1 && isApproved
                      ? `Template: ${activeTemplate?.name}`
                      : "Approved WhatsApp Template"}
                  </span>
                </div>
                {loadingTemplates ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    Syncing from Meta...
                  </span>
                ) : approvedTemplates.length > 0 && isApproved ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    APPROVED · {activeTemplate?.category} ({selectedTemplateLang})
                  </span>
                ) : (
                  <Link href="/templates" className="text-[11px] font-bold text-brand-purple hover:underline">
                    Manage Templates →
                  </Link>
                )}
              </div>

              {loadingTemplates ? (
                <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs text-slate-500">
                  Loading APPROVED templates from your WhatsApp Business Account...
                </div>
              ) : approvedTemplates.length > 1 ? (
                <select
                  value={selectedTemplateId || activeTemplate?.id || ""}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value);
                    setPosterImage(null);
                    setVar1UseContactName(true);
                    setTemplateVarValues({});
                    setVarMeta({});
                    setExtractedDetails(null);
                    setGeneratedOptions(null);
                    setShowEditMessage(false);
                    lastAnalyzedSourceRef.current = null;
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {approvedTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} · {tpl.category} ({tpl.language}) — {tpl.headerType === "IMAGE" ? "Image Header" : "Text Only"}
                    </option>
                  ))}
                </select>
              ) : approvedTemplates.length === 0 ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <p className="font-heading font-bold">No APPROVED templates available</p>
                  <p className="text-[11px]">
                    Only MARKETING or UTILITY templates with APPROVED status in your connected Meta WABA can launch a campaign.{" "}
                    <Link href="/templates" className="underline font-bold">
                      Create or sync a template
                    </Link>{" "}
                    first.
                  </p>
                </div>
              ) : null}
            </div>

            {/* Header Image Upload (ONLY shown when chosen template has IMAGE header) */}
            {isImageHeader && (
              <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-card space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-heading font-bold text-slate-heading flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-600" />
                    <span>Upload Campaign Poster</span>
                  </h2>
                  <div className="flex items-center gap-3">
                    {effectivePreviewImage && (
                      <button
                        type="button"
                        disabled={analyzing}
                        onClick={() => {
                          lastAnalyzedSourceRef.current = null;
                          analyzeWithGemini(posterImage || undefined, mimeType, "auto", {
                            respectManual: true,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-heading font-bold transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                        <span>{analyzing ? "Reading poster..." : "Regenerate"}</span>
                      </button>
                    )}
                    {posterImage && defaultTemplateImageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          lastAnalyzedSourceRef.current = null;
                          setPosterImage(null);
                        }}
                        className="text-[11px] font-bold text-brand-purple hover:underline cursor-pointer"
                      >
                        Use Default Image
                      </button>
                    )}
                  </div>
                </div>

                <label className="relative border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-pastel-mint/20 hover:bg-pastel-mint/40 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center min-h-[160px]">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePosterUpload(e.target.files[0])}
                  />
                  {effectivePreviewImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={effectivePreviewImage} alt="Header image preview" className="h-36 object-contain rounded-xl shadow-md" />
                      <span className="text-xs text-emerald-700 font-medium">
                        {posterImage
                          ? "Poster uploaded — click to replace"
                          : "Template default image — click to upload another JPG/PNG"}
                      </span>
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
                        Upload JPG or PNG (max 5 MB) — AI fills the message automatically
                      </p>
                    </div>
                  )}
                </label>

                {analyzing && (
                  <div className="flex items-center justify-center gap-3 p-4 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-heading font-semibold animate-pulse">
                    <Sparkles className="w-5 h-5 text-emerald-600 animate-spin" />
                    <span>Reading poster with Gemini Vision &amp; filling message...</span>
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
                        type="button"
                        onClick={() => {
                          if (effectivePreviewImage) {
                            analyzeWithGemini(posterImage || undefined, mimeType, "auto", {
                              respectManual: true,
                            });
                          }
                        }}
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
            )}

            {/* Collapsed "Edit message (optional)" section for reviewing/editing filled variables */}
            {isApproved && (
              <div className="bg-white rounded-3xl border border-emerald-100 shadow-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowEditMessage((prev) => !prev)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-sm font-heading font-bold text-slate-heading">
                      Edit message (optional)
                    </span>
                    {!analyzing && (!isImageHeader || Boolean(effectivePreviewImage)) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Ready for preview
                      </span>
                    )}
                  </div>
                  {showEditMessage ? (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                {showEditMessage && (
                  <div className="px-6 pb-6 pt-2 space-y-5 border-t border-slate-100">
                    {bodyVariables.length === 0 ? (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        This template has no editable body variables — your exact approved message will be sent cleanly.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bodyVariables.map((varNum) => renderVariableCard(varNum))}
                      </div>
                    )}

                    {/* Optional Alternative Generated Offer Options */}
                    {isImageHeader && generatedOptions && bodyVariables.some((v) => v > 1) && (
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-heading font-bold text-slate-heading flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Alternative AI Styles (tap to apply to {"{{2}}"})
                          </span>
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg gap-1">
                            {(["English", "Telugu", "Hindi"] as const).map((lang) => (
                              <button
                                key={lang}
                                type="button"
                                onClick={() => {
                                  setOfferLanguage(lang);
                                  handleRegenerateOptions(extractedDetails, lang);
                                }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-heading font-bold transition-all ${
                                  offerLanguage === lang
                                    ? "bg-white text-emerald-800 shadow-xs"
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                              >
                                {lang}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { key: "short", label: "⚡ Short", text: generatedOptions.short },
                            { key: "detailed", label: "📋 Standard", text: (generatedOptions as any).standard || generatedOptions.detailed },
                            { key: "festive", label: "🌸 Festive", text: generatedOptions.festive },
                          ]
                            .filter((o) => o.text)
                            .map((option) => {
                              const isSelected = selectedOptionType === option.key;
                              return (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => {
                                    setSelectedOptionType(option.key as any);
                                    setOfferText(option.text);
                                    setTemplateVarValues((prev) => ({ ...prev, 2: option.text }));
                                    setVarMeta((prev) => ({
                                      ...prev,
                                      2: { aiFilled: true, manualEdited: false, missingFromPoster: false },
                                    }));
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                                    isSelected
                                      ? "bg-emerald-50/90 border-emerald-400"
                                      : "bg-slate-50/50 border-slate-200 hover:border-emerald-300"
                                  }`}
                                >
                                  <div className="text-[11px] font-heading font-bold text-slate-heading">
                                    {option.label}
                                  </div>
                                  <p className="text-[11px] text-slate-700 font-mono leading-relaxed">
                                    {option.text}
                                  </p>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400 leading-tight">
                      ⚠️ Meta Rule: Single line only, max 300 chars per variable, max 2 emojis.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-slate-muted hover:text-slate-heading font-heading font-semibold text-sm px-4 py-2.5"
              >
                <span>{t("createCampaign.prevStep")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeTemplate || !isApproved) {
                    alert("Please select an APPROVED WhatsApp template from your connected account before proceeding.");
                    return;
                  }
                  if (isImageHeader && !effectivePreviewImage) {
                    alert("Please upload a JPG or PNG campaign poster image before continuing.");
                    return;
                  }
                  // Safety net: ensure any blank variable is safely filled with fallback before advancing
                  setTemplateVarValues((prev) => {
                    const next = { ...prev };
                    const used = new Set<string>();
                    for (const v of bodyVariables) {
                      if (next[v] && next[v].trim()) used.add(next[v].trim().toLowerCase());
                    }
                    for (const v of bodyVariables) {
                      if (!next[v] || !next[v].trim()) {
                        const fallback = getGenericFallbackForVariable(
                          v,
                          activeTemplate?.bodyText,
                          extractedDetails,
                          businessContext,
                          used
                        );
                        next[v] = fallback;
                        used.add(fallback.toLowerCase());
                      }
                    }
                    return next;
                  });
                  setStep(3);
                }}
                disabled={analyzing || hasMissingStep2Fields || loadingTemplates}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-bold text-sm px-6 py-3.5 rounded-2xl shadow-md transition-all"
              >
                <span>{analyzing ? "Reading poster..." : t("createCampaign.nextStep")}</span>
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
                    {isImageHeader ? (
                      effectivePreviewImage ? (
                        <img src={effectivePreviewImage} alt="Header poster" className="w-full h-36 object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[11px] text-slate-400">
                          Upload JPG / PNG header image
                        </div>
                      )
                    ) : activeTemplate?.headerText ? (
                      <div className="font-heading font-bold text-slate-800 text-xs border-b border-slate-100 pb-1">
                        {activeTemplate.headerText}
                      </div>
                    ) : null}

                    <div className="whitespace-pre-wrap text-slate-800 text-[11px] leading-relaxed">
                      {renderRealTemplateBody(activeTemplate?.bodyText)}
                    </div>

                    {activeTemplate?.footerText && (
                      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                        {activeTemplate.footerText}
                      </div>
                    )}
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

          {/* Blocked Launch Notice when no APPROVED template is selected */}
          {!isApproved && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-heading font-bold text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  Campaign launch is blocked: only templates with APPROVED status in your connected Meta WABA can be launched. Please go back to Step 2 and select an approved template.
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
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        APPROVED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        {activeTemplate?.status || "NOT APPROVED"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-muted font-heading font-bold">Language:</span>
                  <span className="font-semibold text-slate-heading">{selectedTemplateLang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-muted font-heading font-bold">Recipients:</span>
                  <span className="font-semibold text-slate-heading">{parsedResult?.validCount || 0} customers</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-heading font-heading font-bold">{t("createCampaign.estimatedCost")}:</span>
                  <span className="font-heading font-semibold text-xs text-blue-700">
                    {t("createCampaign.metaDirectBilling")}
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

              {isApproved && (
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
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      APPROVED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300">
                      {activeTemplate?.status || "NOT APPROVED"}
                    </span>
                  )}
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
                  {/* Header */}
                  {isImageHeader && effectivePreviewImage ? (
                    <img src={effectivePreviewImage} alt="Header poster" className="h-40 w-full object-cover rounded-lg shadow-xs" />
                  ) : activeTemplate?.headerText ? (
                    <div className="font-heading font-bold text-slate-800 text-xs border-b border-slate-100 pb-1">
                      {activeTemplate.headerText}
                    </div>
                  ) : null}

                  {/* Body Content */}
                  {previewTab === "template" ? (
                    <div className="whitespace-pre-wrap text-[11px] text-slate-800 leading-relaxed">
                      {renderRealTemplateBody(activeTemplate?.bodyText)}
                    </div>
                  ) : (
                    // Direct 24-Hour Session Window Message
                    <div className="space-y-2 text-[11px] text-slate-800 leading-relaxed">
                      <div className="whitespace-pre-wrap">
                        {renderRealTemplateBody(activeTemplate?.bodyText)}
                      </div>
                      {offerText && (
                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          {getDirectMessageLines().map((line, idx) => (
                            <div key={idx} className="text-slate-900">
                              {renderWhatsAppText(line)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 flex items-center justify-between gap-2">
                    <span>
                      {previewTab === "template" ? (activeTemplate?.footerText || "WhatsApp Business Template") : "⚡ Direct Session Message"}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 shrink-0">
                      {previewTab === "template" ? `${selectedTemplateName} (${selectedTemplateLang})` : "24h Window Free"}
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

            <button
              onClick={handleLaunchCampaign}
              disabled={!isApproved || submittingCampaign}
              className="flex items-center gap-2 bg-coral-500 hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-extrabold text-base px-8 py-4 rounded-2xl shadow-xl shadow-coral-500/30 hover:-translate-y-0.5 transition-all"
            >
              <Send className="w-5 h-5" />
              <span>
                {!isApproved
                  ? "Select Approved Template to Launch"
                  : submittingCampaign
                    ? "Launching..."
                    : sendOption === "SCHEDULE"
                      ? "Schedule Campaign 📅"
                      : "Launch Campaign Now 🚀"}
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
