"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  AlertCircle,
  Radio,
  Trash2,
  X
} from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Test Ping Modal State
  const [testModalTemplate, setTestModalTemplate] = useState<any | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchTemplates = async (sync = false) => {
    if (sync) setSyncing(true);
    else setLoading(true);

    try {
      const url = sync ? "/api/templates?sync=true" : "/api/templates";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (e) {
      console.warn("Error fetching templates:", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchTemplates(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !bodyText.trim()) {
      setErrorMsg("Please enter Template Name and Body Text");
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const cleanName = templateName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          category: category,
          language: language,
          bodyText: bodyText.trim(),
          headerType: "NONE",
        }),
      });

      const data = await res.json();
      if (res.ok && data.template) {
        setSuccessMsg(`Template "${cleanName}" submitted successfully! Status: ${data.template.status}`);
        setTemplateName("");
        setBodyText("");
        fetchTemplates(true);
        setTimeout(() => setShowModal(false), 1800);
      } else {
        setErrorMsg(data.error || "Failed to submit template to Meta");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Network error submitting template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTemplate = async (templateId: string) => {
    setRemovingId(templateId);
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(templateId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTemplates((prev) => prev.filter((item) => item.id !== templateId));
      } else {
        alert(data.error || "Failed to remove template.");
      }
    } catch (err: any) {
      alert(err?.message || "Network error removing template.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleSendTestPing = async () => {
    const cleanPhone = testPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
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
          recipientPhone: cleanPhone,
          templateName: testModalTemplate?.name,
          languageCode: testModalTemplate?.language || "en_US",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          ok: true,
          message: `✅ Test message delivered! Meta Message ID: ${data.waMessageId || "OK"}`,
        });
      } else {
        setTestResult({
          ok: false,
          message: data.error || "Failed to deliver test message.",
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              WhatsApp Message Templates
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-brand-purple text-xs font-semibold border border-purple-200">
              <Sparkles className="w-3.5 h-3.5" />
              Meta Cloud API Synced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, manage, and verify official WhatsApp templates for your OneAmple campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTemplates(true)}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-brand-purple bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Syncing with Meta..." : "Sync Live Meta Status"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setSuccessMsg(null);
              setShowModal(true);
            }}
            className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Template</span>
          </button>
        </div>
      </div>

      {/* Templates List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-purple" />
            Active Templates ({templates.length})
          </h3>
          <span className="text-xs text-slate-500">Live Status from Meta Graph API</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">
              No templates found. Click &quot;Create New Template&quot; above to submit your first template to Meta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-6 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-900">{tpl.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                      {tpl.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{tpl.language}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {tpl.bodyText || tpl.body}
                  </p>
                  {tpl.rejectionReason && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      Rejection Reason: {tpl.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {(() => {
                    const st = String(tpl.status || "").toUpperCase();
                    if (st === "APPROVED") {
                      return (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Approved
                        </span>
                      );
                    }
                    if (st === "REJECTED" || st === "PAUSED" || st === "DISABLED") {
                      const label =
                        st === "PAUSED" ? "Paused" : st === "DISABLED" ? "Disabled" : "Rejected";
                      return (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          {label}
                        </span>
                      );
                    }
                    if (st === "PENDING" || st === "IN_APPEAL") {
                      return (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pending Review
                        </span>
                      );
                    }
                    if (st === "NOT_IN_WABA") {
                      return (
                        <>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                            Not found in Meta
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTemplate(tpl.id)}
                            disabled={removingId === tpl.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{removingId === tpl.id ? "Removing..." : "Remove"}</span>
                          </button>
                        </>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {tpl.status || "Unknown"}
                      </span>
                    );
                  })()}

                  {tpl.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTestModalTemplate(tpl);
                        setTestResult(null);
                        setTestPhone("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-purple hover:bg-brand-light border border-brand-soft transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Send Test</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-purple" />
                Create Official WhatsApp Template
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Name (lowercase, no spaces, e.g. festival_discount_offer)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. promo_offer_2026"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="en_US">English (en_US)</option>
                    <option value="te">Telugu (te)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Body Text (Message copy)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Welcome! Enjoy 20% off your purchase this month with our business."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 transition flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit to Meta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Test Ping Modal */}
      {testModalTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                <span>Test Send: {testModalTemplate.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setTestModalTemplate(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Send this approved template to any 10-digit mobile number to verify live delivery on WhatsApp.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Recipient Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  🇮🇳 +91
                </span>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  maxLength={10}
                  className="w-full pl-16 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testResult.ok
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTestModalTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendTestPing}
                disabled={sendingTest}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Test</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
