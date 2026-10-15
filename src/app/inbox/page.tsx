"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { fireBrandConfetti } from "@/lib/confetti";
import { playClickSound, playCelebrationSound } from "@/lib/sounds";
import { 
  Inbox as InboxIcon, 
  MessageSquare, 
  Clock, 
  Zap, 
  RefreshCw, 
  User, 
  Send,
  PlusCircle,
  MessageCircle,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone
} from "lucide-react";

export default function InboxPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [activeWindowCount, setActiveWindowCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Personal Message Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string; waMessageId?: string } | null>(null);

  const quickPresets = [
    { label: "👋 Say Hello", text: "Hello! Just wanted to say hi from my new WhatsApp SaaS dashboard! 🚀" },
    { label: "🚀 Testing Platform", text: "Hey bro! Testing our iBrainLabs WhatsApp messaging platform. Let me know if you receive this!" },
    { label: "✨ Special Update", text: "Hi! We have a quick update to share with you today. Have a wonderful day ahead! 🌟" },
  ];

  const fetchInbox = () => {
    fetch("/api/inbox")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
          setActiveWindowCount(data.activeWindowCount || 0);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(fetchInbox, 4000);
    return () => clearInterval(interval);
  }, []);

  const openPersonalModal = (phone = "", name = "") => {
    playClickSound();
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("91") && clean.length === 12) {
      clean = clean.slice(2);
    }
    setRecipientPhone(clean);
    setRecipientName(name === "Customer" ? "" : name);
    setPersonalMessage("");
    setSendResult(null);
    setIsModalOpen(true);
  };

  const handleSendPersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    const clean = recipientPhone.replace(/[^0-9]/g, "");
    if (clean.length !== 10 && clean.length !== 12) {
      setSendResult({
        ok: false,
        message: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    if (!personalMessage.trim()) {
      setSendResult({
        ok: false,
        message: "Please type your personal message to send.",
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/inbox/send-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: clean,
          recipientName: recipientName.trim() || "Friend",
          messageText: personalMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({
          ok: true,
          message: `⚡ Message successfully sent to +${clean}! Verified by Meta Cloud API.`,
          waMessageId: data.waMessageId,
        });
        fireBrandConfetti();
        playCelebrationSound();
        fetchInbox();
      } else {
        setSendResult({
          ok: false,
          message: data.error || "Failed to deliver personal message.",
        });
      }
    } catch (err: any) {
      setSendResult({
        ok: false,
        message: err.message || "Network error while sending message.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-extrabold text-slate-heading">
              Customer Replies & Inbox
            </h1>
            <span className="bg-emerald-100 text-emerald-800 font-heading font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>{activeWindowCount} 24h Window Active</span>
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Real-time incoming customer replies via Meta Webhook. Contacts with active 24h windows can receive instant free-form image messages!
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchInbox}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-muted hover:text-slate-heading hover:bg-slate-50 transition-all shadow-xs cursor-pointer"
            title="Refresh Inbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* NEW: Send Personal Message to Friend Button */}
          <button
            onClick={() => openPersonalModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-95 text-white font-heading font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-purple/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white/20" />
            <span>Send Personal Message</span>
          </button>

          <Link
            href="/create-campaign"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-heading font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Campaign</span>
          </Link>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-3xl p-6 border border-brand-soft shadow-card space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-muted font-heading font-semibold animate-pulse">
            Loading customer replies...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-slate-muted space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-lg text-slate-heading">No customer replies yet</h3>
              <p className="text-xs max-w-sm mx-auto">
                When a customer sends a WhatsApp message (e.g. "Hi" or "Price"), it will appear here in real-time and open a 24-hour free-form messaging window!
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => openPersonalModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-light text-brand-purple font-heading font-bold text-xs border border-brand-soft hover:bg-brand-soft transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send a Personal Message to a Friend Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  msg.isWindowActive
                    ? "bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-white border-emerald-200"
                    : "bg-slate-50/60 border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    msg.isWindowActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                      : "bg-brand-light text-brand-purple border border-brand-soft"
                  }`}>
                    {msg.customerName?.[0] || <User className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-slate-heading">
                        {msg.customerName || "Customer"}
                      </span>
                      <span className="font-mono text-xs text-slate-500 font-semibold">
                        +{msg.fromPhone}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 font-body text-xs text-slate-800 shadow-xs inline-block">
                      "{msg.messageText}"
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Received {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Actions & 24h Window Badge */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                  {msg.isWindowActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-heading font-bold shadow-xs">
                      <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                      <span>24h Window Active ({msg.hoursRemaining}h left)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px] font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>Window Expired</span>
                    </span>
                  )}

                  {/* Reply / Send Personal Message to this friend */}
                  <button
                    onClick={() => openPersonalModal(msg.fromPhone, msg.customerName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-95 text-white font-heading font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send Personal Message</span>
                  </button>

                  <Link
                    href="/create-campaign"
                    className="inline-flex items-center gap-1 text-xs font-heading font-semibold text-slate-500 hover:text-slate-800 hover:underline px-2 py-1"
                  >
                    <span>Campaign</span>
                    <Send className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPUP MODAL: SEND PERSONAL MESSAGE TO FRIEND */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-brand-soft shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                playClickSound();
                setIsModalOpen(false);
              }}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white shadow-md shadow-brand-purple/20">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-extrabold text-slate-heading">
                  Send Personal Message to Friend
                </h2>
                <p className="text-xs text-slate-muted">
                  Transmit an instant custom message directly to their WhatsApp via Meta API.
                </p>
              </div>
            </div>

            {/* Result Alerts */}
            {sendResult && (
              <div
                className={`mb-4 p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                  sendResult.ok
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium"
                    : "bg-rose-50 border border-rose-200 text-rose-700 font-medium"
                }`}
              >
                {sendResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p>{sendResult.message}</p>
                  {sendResult.waMessageId && (
                    <p className="text-[10px] text-emerald-600 font-mono mt-1">
                      Meta ID: {sendResult.waMessageId}
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendPersonal} className="space-y-4">
              {/* Recipient Phone & Name Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Friend Mobile Number *
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                      placeholder="9876543210"
                      className="w-full pl-16 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Friend Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="absolute inset-y-0 left-0 ml-3 my-auto w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Ramesh / Friend"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Message Chips */}
              <div>
                <label className="block text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Quick Message Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {quickPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setPersonalMessage(preset.text);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-brand-light/70 hover:bg-brand-soft text-[11px] font-heading font-bold text-brand-purple border border-brand-soft transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Content */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider">
                    Your Personal Message *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {personalMessage.length}/300 chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Type your message here... (e.g. Hi bro! This is a test message from our WhatsApp SaaS application.)"
                  maxLength={300}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition"
                  required
                />
              </div>

              {/* Engine Status Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-purple shrink-0" />
                <span>
                  Delivered via <strong>Meta Official Cloud API</strong> with instant 0.3s transmission speed.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-heading font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-95 text-white font-heading font-bold text-xs shadow-md shadow-brand-purple/20 transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending to WhatsApp...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send to Friend Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
