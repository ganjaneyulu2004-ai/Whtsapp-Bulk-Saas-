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
  Phone,
  Reply,
  Filter
} from "lucide-react";

export default function InboxPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [activeWindowCount, setActiveWindowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "expired">("all");

  // Personal Message / Reply Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [replyingToMessage, setReplyingToMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string; waMessageId?: string } | null>(null);

  // Inline reply states
  const [inlineReplies, setInlineReplies] = useState<Record<string, string>>({});
  const [sendingReplyId, setSendingReplyId] = useState<string | null>(null);
  const [replySuccessId, setReplySuccessId] = useState<string | null>(null);

  const quickPresets = [
    { label: "👋 Say Hello", text: "Hello! Thank you for reaching out to us. How can we assist you today? 🌟" },
    { label: "✅ Acknowledge", text: "Hi! We have received your query. Our team is looking into this and will get back to you shortly." },
    { label: "🏷️ Pricing & Details", text: "Hello! Thank you for your interest. Here are the complete details and pricing packages you requested." },
    { label: "📞 Request Call", text: "Hi! Would you be available for a brief 2-minute phone call so we can assist you better?" },
    { label: "✨ Special Update", text: "Hi! We have an exciting update to share with you today. Have a wonderful day ahead! 🚀" },
  ];

  const inlineQuickChips = [
    { label: "👋 Hello", text: "Hello! How can we help you today?" },
    { label: "✅ Checking now", text: "Received your query! Checking this for you right away." },
    { label: "🏷️ Pricing", text: "Thank you for your interest! Sharing our pricing packages now." },
    { label: "📞 Call back", text: "Hi! Can we connect on a quick phone call to assist you?" },
  ];

  const fetchInbox = () => {
    fetch("/api/inbox", { cache: "no-store" })
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

  const openPersonalModal = (phone = "", name = "", replyingTo = "") => {
    playClickSound();
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("91") && clean.length === 12) {
      clean = clean.slice(2);
    }
    setRecipientPhone(clean);
    setRecipientName(name === "Customer" ? "" : name);
    setPersonalMessage("");
    setReplyingToMessage(replyingTo ? replyingTo.trim() : null);
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
        message: "Please type your message to send.",
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
          recipientName: recipientName.trim() || "Customer",
          messageText: personalMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({
          ok: true,
          message: `⚡ Reply successfully sent to +${clean}! Verified by Meta Cloud API.`,
          waMessageId: data.waMessageId,
        });
        fireBrandConfetti();
        playCelebrationSound();
        fetchInbox();
      } else {
        setSendResult({
          ok: false,
          message: data.error || "Failed to deliver WhatsApp reply.",
        });
      }
    } catch (err: any) {
      setSendResult({
        ok: false,
        message: err.message || "Network error while sending reply.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendInlineReply = async (msgId: string, phone: string, name: string) => {
    const text = (inlineReplies[msgId] || "").trim();
    if (!text) return;

    playClickSound();

    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("91") && clean.length === 12) {
      clean = clean.slice(2);
    }

    setSendingReplyId(msgId);
    try {
      const res = await fetch("/api/inbox/send-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: clean,
          recipientName: name || "Customer",
          messageText: text,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInlineReplies((prev) => ({ ...prev, [msgId]: "" }));
        setReplySuccessId(msgId);
        fireBrandConfetti();
        playCelebrationSound();
        fetchInbox();
        setTimeout(() => setReplySuccessId(null), 4000);
      } else {
        alert(data.error || "Failed to send WhatsApp reply.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while sending reply.");
    } finally {
      setSendingReplyId(null);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterTab === "active") return m.isWindowActive;
    if (filterTab === "expired") return !m.isWindowActive;
    return true;
  });

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
            Real-time incoming customer replies via Meta Webhook. Contacts with active 24h windows can receive instant free-form WhatsApp replies!
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

          {/* Send Message to Customer / Friend Button */}
          <button
            onClick={() => openPersonalModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-95 text-white font-heading font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-purple/20 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white/20" />
            <span>Send New Message</span>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setFilterTab("all")}
          className={`px-3.5 py-1.5 rounded-xl font-heading text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            filterTab === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>All Messages</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-inherit font-mono">
            {messages.length}
          </span>
        </button>

        <button
          onClick={() => setFilterTab("active")}
          className={`px-3.5 py-1.5 rounded-xl font-heading text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            filterTab === "active"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Zap className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
          <span>Active 24h Window</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
            {activeWindowCount}
          </span>
        </button>

        <button
          onClick={() => setFilterTab("expired")}
          className={`px-3.5 py-1.5 rounded-xl font-heading text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            filterTab === "expired"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Window Expired</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
            {Math.max(0, messages.length - activeWindowCount)}
          </span>
        </button>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-3xl p-6 border border-brand-soft shadow-card space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-muted font-heading font-semibold animate-pulse">
            Loading customer replies...
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-16 text-center text-slate-muted space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-lg text-slate-heading">
                {filterTab === "all"
                  ? "No customer replies yet"
                  : filterTab === "active"
                  ? "No active 24h window conversations"
                  : "No expired window conversations"}
              </h3>
              <p className="text-xs max-w-sm mx-auto">
                When a customer sends a WhatsApp message (e.g. &quot;Hi&quot; or &quot;Price&quot;), it will appear here in real-time and open a 24-hour free-form messaging window!
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => openPersonalModal()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-light text-brand-purple font-heading font-bold text-xs border border-brand-soft hover:bg-brand-soft transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send a WhatsApp Message Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col gap-3.5 ${
                  msg.isWindowActive
                    ? "bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white border-emerald-200 shadow-xs"
                    : "bg-slate-50/60 border-slate-200"
                }`}
              >
                {/* Header row: Customer info + Reply & Action buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      msg.isWindowActive
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                        : "bg-brand-light text-brand-purple border border-brand-soft"
                    }`}>
                      {msg.customerName?.[0] || <User className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-bold text-sm text-slate-heading">
                          {msg.customerName || "Customer"}
                        </span>
                        <span className="font-mono text-xs text-slate-500 font-semibold">
                          +{msg.fromPhone}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 font-body text-xs text-slate-800 shadow-xs inline-block">
                        &ldquo;{msg.messageText}&rdquo;
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Received {new Date(msg.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Window Badges */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                    {msg.isWindowActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-heading font-bold shadow-xs">
                        <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                        <span>24h Active ({msg.hoursRemaining}h left)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[11px] font-semibold">
                        <Clock className="w-3 h-3" />
                        <span>Window Expired</span>
                      </span>
                    )}

                    {/* NEW: DEDICATED REPLY BUTTON */}
                    <button
                      onClick={() => openPersonalModal(msg.fromPhone, msg.customerName, msg.messageText)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-heading font-bold shadow-xs transition cursor-pointer active:scale-95"
                      title="Reply to this customer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply</span>
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

                {/* DIRECT INLINE REPLY BAR: Available when 24h window is active */}
                {msg.isWindowActive ? (
                  <div className="pt-3 border-t border-slate-200/70 space-y-2">
                    {/* Quick Reply Preset Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Quick Reply:
                      </span>
                      {inlineQuickChips.map((chip, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setInlineReplies((prev) => ({ ...prev, [msg.id]: chip.text }));
                          }}
                          className="px-2.5 py-0.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 text-[11px] font-medium border border-emerald-200/70 transition cursor-pointer"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder={`Type direct WhatsApp reply to ${msg.customerName || 'Customer'}...`}
                          value={inlineReplies[msg.id] || ""}
                          onChange={(e) => setInlineReplies({ ...inlineReplies, [msg.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendInlineReply(msg.id, msg.fromPhone, msg.customerName);
                            }
                          }}
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition font-medium text-slate-800 placeholder:text-slate-400 shadow-inner"
                        />
                        <Reply className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      </div>

                      <button
                        onClick={() => handleSendInlineReply(msg.id, msg.fromPhone, msg.customerName)}
                        disabled={sendingReplyId === msg.id || !inlineReplies[msg.id]?.trim()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-heading font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        {sendingReplyId === msg.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending Reply...</span>
                          </>
                        ) : replySuccessId === msg.id ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white" />
                            <span>Reply Sent! ✓</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>24h direct window expired. You can still send an instant WhatsApp reply to this customer via verified Meta utility template!</span>
                    </div>
                    <button
                      onClick={() => openPersonalModal(msg.fromPhone, msg.customerName, msg.messageText)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue hover:opacity-95 text-white text-xs font-heading font-bold shadow-xs cursor-pointer transition shrink-0 active:scale-95"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply with Template</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPUP MODAL: REPLY TO CUSTOMER / SEND DIRECT MESSAGE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-brand-soft shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white shadow-md shadow-brand-purple/20">
                <Reply className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-extrabold text-slate-heading">
                  {replyingToMessage ? "Reply to Customer" : "Send WhatsApp Message"}
                </h2>
                <p className="text-xs text-slate-muted">
                  Send an official WhatsApp message to this customer via Meta Cloud API.
                </p>
              </div>
            </div>

            {/* Replying To Quote Banner */}
            {replyingToMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-brand-light/50 border border-brand-soft text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-heading font-bold text-brand-purple">
                  <Reply className="w-3.5 h-3.5" />
                  <span>Replying to {recipientName || "Customer"}&apos;s message:</span>
                </div>
                <p className="text-slate-700 italic pl-3 border-l-2 border-brand-purple font-body">
                  &ldquo;{replyingToMessage}&rdquo;
                </p>
              </div>
            )}

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
                    Customer Phone *
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
                    Customer Name (Optional)
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
                  Quick Reply Presets:
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
                    Your Reply Message *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {personalMessage.length}/300 chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  placeholder="Type your WhatsApp reply message here..."
                  maxLength={300}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30 focus:border-brand-purple transition"
                  required
                />
              </div>

              {/* Engine Status Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-purple shrink-0" />
                <span>
                  Delivered via <strong>Meta Official Cloud API</strong> with instant transmission speed.
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
                      <span>Sending Reply...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send WhatsApp Reply</span>
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
