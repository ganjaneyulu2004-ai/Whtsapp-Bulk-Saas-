"use client";

import React, { useState, useEffect } from "react";
import { Plus, RefreshCw, Send, CheckCircle2, Clock, Sparkles, MessageSquare } from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([
    {
      id: "1179979744602148",
      name: "ibrainlabs_welcome_offer",
      category: "MARKETING",
      language: "en_US",
      status: "PENDING",
      body: "Welcome to iBrainLabs! Thank you for connecting with us. We look forward to serving you with our verified business solutions.",
    },
    {
      id: "4487785468031595",
      name: "hello_world",
      category: "UTILITY",
      language: "en_US",
      status: "APPROVED",
      body: "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message using the Cloud API.",
    },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [bodyText, setBodyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !bodyText) {
      alert("Please enter Template Name and Body Text");
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const cleanName = templateName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const res = await fetch("https://graph.facebook.com/v20.0/2367270804076581/message_templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer EAAOe4PppfZCIBSyhPLLzoYmzWUB35U5XgC3RezCojrqvjqdJzRYHoaFSWxoN4PDZBMTlsL2g8zEZCHkqrZAWnirvjSccc6ZAjFlzJjV7JtCdVwoWRPYEoFaQ6yQW3psyxIj7gA69buLULa1X3zYZBv0PkFiFqbvWYMaWrDDUzYK2sledzyJjl0RXJCN7Ou7YuADAZDZD",
        },
        body: JSON.stringify({
          name: cleanName,
          category: category,
          language: language,
          components: [{ type: "BODY", text: bodyText }],
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        setTemplates((prev) => [
          {
            id: data.id,
            name: cleanName,
            category: category,
            language: language,
            status: data.status || "PENDING",
            body: bodyText,
          },
          ...prev,
        ]);
        setSuccessMsg(`Template "${cleanName}" submitted successfully to Meta! (ID: ${data.id})`);
        setTemplateName("");
        setBodyText("");
        setTimeout(() => setShowModal(false), 2000);
      } else {
        alert(data.error?.message || "Failed to submit template to Meta");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setSubmitting(false);
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
            Create and manage official WhatsApp templates approved by Meta for iBrainLabs campaigns.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-90 shadow-md transition flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Template</span>
        </button>
      </div>

      {/* Templates List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-purple" />
            Active Templates ({templates.length})
          </h3>
          <span className="text-xs text-slate-400">Account: 2367270804076581 (iBrainLabs)</span>
        </div>

        <div className="divide-y divide-slate-100">
          {templates.map((tpl) => (
            <div key={tpl.id} className="p-6 hover:bg-slate-50/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-slate-900">{tpl.name}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                    {tpl.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{tpl.language}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {tpl.body}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {tpl.status === "APPROVED" ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pending Review
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
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
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Template Name (lowercase, e.g. promo_discount_offer)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ibrainlabs_festival_offer"
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
                  Body Text (Message content)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Welcome to iBrainLabs! Thank you for choosing our software solutions. Enjoy 20% off on your first bulk campaign."
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
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
    </div>
  );
}
