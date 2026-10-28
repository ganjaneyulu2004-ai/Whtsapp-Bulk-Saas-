"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { fireBrandConfetti } from "@/lib/confetti";
import { playClickSound, playCelebrationSound } from "@/lib/sounds";
import { 
  Search,
  Send,
  MessageCircle,
  Phone,
  Clock,
  Zap,
  Check,
  CheckCheck,
  User,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  X,
  Loader2,
  Smile,
  Paperclip,
  MoreVertical,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "customer" | "business";
  text: string;
  timestamp: string;
  status?: "sending" | "sent" | "delivered" | "read";
  isTemplate?: boolean;
}

interface Conversation {
  phone: string;
  cleanPhone: string;
  customerName: string;
  isWindowActive: boolean;
  hoursRemaining: number;
  lastMessageText: string;
  lastMessageTime: string;
  messages: ChatMessage[];
}

export default function InboxPage() {
  const { t } = useLanguage();
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [activeWindowCount, setActiveWindowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "expired">("all");
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  // Outgoing sent messages cache in localStorage
  const [sentReplies, setSentReplies] = useState<Record<string, ChatMessage[]>>({});

  // Active chat composer state
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  // New Chat Modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [isSendingNew, setIsSendingNew] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Quick reply preset pills
  const quickChips = [
    { label: "👋 Hello", text: "Hello! Thank you for reaching out to us. How can we assist you today? 🌟" },
    { label: "✅ Checking now", text: "Hi! We have received your query. Our team is looking into this and will update you shortly." },
    { label: "🏷️ Pricing", text: "Hello! Thank you for your interest. Here are the complete details and pricing packages you requested." },
    { label: "📞 Call back", text: "Hi! Would you be available for a brief 2-minute phone call so we can assist you better?" },
    { label: "✨ Special Offer", text: "Exclusive deal today! We have a special discount just for you. Let us know if you'd like the details! 🚀" },
  ];

  // Load sent replies from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wa_inbox_sent_replies_v2");
      if (saved) {
        setSentReplies(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSentReply = (phone: string, msg: ChatMessage) => {
    setSentReplies((prev) => {
      const existing = prev[phone] || [];
      const updated = {
        ...prev,
        [phone]: [...existing, msg],
      };
      try {
        localStorage.setItem("wa_inbox_sent_replies_v2", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const fetchInbox = () => {
    fetch("/api/inbox", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setRawMessages(data.messages);
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

  // Build grouped conversations
  const conversations: Conversation[] = React.useMemo(() => {
    const groups: Record<string, Conversation> = {};

    // Group incoming messages
    rawMessages.forEach((msg) => {
      let clean = String(msg.fromPhone || "").replace(/[^0-9]/g, "");
      if (clean.startsWith("91") && clean.length === 12) {
        clean = clean.slice(2);
      }
      if (!clean) return;

      if (!groups[clean]) {
        groups[clean] = {
          phone: msg.fromPhone,
          cleanPhone: clean,
          customerName: msg.customerName || "Customer",
          isWindowActive: msg.isWindowActive,
          hoursRemaining: msg.hoursRemaining || 0,
          lastMessageText: msg.messageText,
          lastMessageTime: msg.timestamp,
          messages: [],
        };
      } else {
        if (msg.customerName && groups[clean].customerName === "Customer") {
          groups[clean].customerName = msg.customerName;
        }
        if (msg.isWindowActive) {
          groups[clean].isWindowActive = true;
          groups[clean].hoursRemaining = Math.max(groups[clean].hoursRemaining, msg.hoursRemaining || 0);
        }
      }

      groups[clean].messages.push({
        id: msg.id || `in_${clean}_${Date.now()}`,
        sender: "customer",
        text: msg.messageText,
        timestamp: msg.timestamp,
        status: "read",
      });
    });

    // Merge sent outgoing replies
    Object.entries(sentReplies).forEach(([phoneKey, msgs]) => {
      let clean = phoneKey.replace(/[^0-9]/g, "");
      if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);

      if (!groups[clean]) {
        groups[clean] = {
          phone: clean,
          cleanPhone: clean,
          customerName: "Customer",
          isWindowActive: false,
          hoursRemaining: 0,
          lastMessageText: msgs[msgs.length - 1]?.text || "",
          lastMessageTime: msgs[msgs.length - 1]?.timestamp || new Date().toISOString(),
          messages: [],
        };
      }

      // Avoid duplicates
      msgs.forEach((m) => {
        if (!groups[clean].messages.some((existing) => existing.id === m.id)) {
          groups[clean].messages.push(m);
        }
      });
    });

    // Sort messages in each conversation chronologically
    return Object.values(groups).map((c) => {
      c.messages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const last = c.messages[c.messages.length - 1];
      if (last) {
        c.lastMessageText = last.text;
        c.lastMessageTime = last.timestamp;
      }
      return c;
    }).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [rawMessages, sentReplies]);

  // Auto-select first conversation on desktop if none selected
  useEffect(() => {
    if (!selectedPhone && conversations.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setSelectedPhone(conversations[0].cleanPhone);
    }
  }, [conversations, selectedPhone]);

  // Scroll to bottom when conversation or messages update
  const activeConversation = conversations.find((c) => c.cleanPhone === selectedPhone);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Filtered conversation list
  const filteredConversations = conversations.filter((c) => {
    if (filterTab === "active" && !c.isWindowActive) return false;
    if (filterTab === "expired" && c.isWindowActive) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.customerName.toLowerCase().includes(q);
      const matchPhone = c.cleanPhone.includes(q) || c.phone.includes(q);
      const matchText = c.messages.some((m) => m.text.toLowerCase().includes(q));
      return matchName || matchPhone || matchText;
    }
    return true;
  });

  // Send Direct Reply in active chat
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || !replyText.trim() || isSending) return;

    playClickSound();
    const textToSend = replyText.trim();
    const targetPhone = activeConversation.cleanPhone;
    const targetName = activeConversation.customerName;

    // Optimistic message added to chat
    const tempId = `out_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      sender: "business",
      text: textToSend,
      timestamp: new Date().toISOString(),
      status: "sending",
    };

    saveSentReply(targetPhone, newMsg);
    setReplyText("");
    setIsSending(true);
    setSendFeedback(null);

    try {
      const res = await fetch("/api/inbox/send-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: targetPhone,
          recipientName: targetName,
          messageText: textToSend,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Update status to delivered
        setSentReplies((prev) => {
          const list = prev[targetPhone] || [];
          const updated = list.map((m) =>
            m.id === tempId ? { ...m, status: "delivered" as const } : m
          );
          localStorage.setItem(
            "wa_inbox_sent_replies_v2",
            JSON.stringify({ ...prev, [targetPhone]: updated })
          );
          return { ...prev, [targetPhone]: updated };
        });

        fireBrandConfetti();
        playCelebrationSound();
        fetchInbox();
        setTimeout(() => chatInputRef.current?.focus(), 100);
      } else {
        alert(data.error || "Failed to send WhatsApp message via Meta API.");
      }
    } catch (err: any) {
      alert(err.message || "Network error while sending WhatsApp message.");
    } finally {
      setIsSending(false);
    }
  };

  // Handle New Direct Chat
  const handleStartNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newChatPhone.replace(/[^0-9]/g, "");
    if (clean.length !== 10 && clean.length !== 12) {
      setNewChatError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!newChatMessage.trim()) {
      setNewChatError("Please type a message to start the conversation.");
      return;
    }

    setIsSendingNew(true);
    setNewChatError(null);

    const targetPhone = clean.length === 12 && clean.startsWith("91") ? clean.slice(2) : clean;

    try {
      const res = await fetch("/api/inbox/send-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: targetPhone,
          recipientName: newChatName.trim() || "Customer",
          messageText: newChatMessage.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const outMsg: ChatMessage = {
          id: `out_${Date.now()}`,
          sender: "business",
          text: newChatMessage.trim(),
          timestamp: new Date().toISOString(),
          status: "delivered",
        };
        saveSentReply(targetPhone, outMsg);

        fireBrandConfetti();
        playCelebrationSound();
        fetchInbox();
        setIsNewChatOpen(false);
        setSelectedPhone(targetPhone);
        setNewChatPhone("");
        setNewChatName("");
        setNewChatMessage("");
      } else {
        setNewChatError(data.error || "Failed to send WhatsApp message.");
      }
    } catch (err: any) {
      setNewChatError(err.message || "Network error.");
    } finally {
      setIsSendingNew(false);
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  };

  const formatChatListTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-7xl mx-auto">
      
      {/* Top Bar Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-800 flex items-center gap-2">
              <span>WhatsApp Live Inbox</span>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{activeWindowCount} Active 24h</span>
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Live customer conversation stream connected to Official Meta WhatsApp Cloud API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchInbox}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh Inbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playClickSound();
              setIsNewChatOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <Link
            href="/create-campaign"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Bulk Campaign</span>
          </Link>
        </div>
      </div>

      {/* WHATSAPP WEB SHELL CONTAINER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex h-[78vh] min-h-[580px] max-h-[820px]">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CHAT LIST & SEARCH (WhatsApp Web Sidebar) */}
        {/* ========================================================================= */}
        <div className={`w-full md:w-[360px] lg:w-[410px] border-r border-slate-200 flex flex-col bg-white shrink-0 ${
          selectedPhone ? "hidden md:flex" : "flex"
        }`}>
          {/* Sidebar Header */}
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                WA
              </div>
              <div>
                <span className="font-heading font-bold text-sm text-slate-800 block leading-tight">
                  Chats
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {conversations.length} Contacts
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                title="Start New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={fetchInbox}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar (Real WhatsApp style) */}
          <div className="p-2.5 border-b border-slate-100 bg-white space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat..."
                className="w-full pl-9 pr-7 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 border border-transparent focus:border-emerald-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 px-0.5">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition cursor-pointer ${
                  filterTab === "all"
                    ? "bg-emerald-100 text-emerald-800"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab("active")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterTab === "active"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Zap className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                <span>24h Active ({activeWindowCount})</span>
              </button>
              <button
                onClick={() => setFilterTab("expired")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterTab === "expired"
                    ? "bg-slate-800 text-white shadow-2xs"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Expired</span>
              </button>
            </div>
          </div>

          {/* Conversation List Scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400 animate-pulse font-heading font-medium">
                Loading WhatsApp chats...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-16 px-4 text-center text-slate-400 space-y-2">
                <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-heading font-bold text-slate-600">No chats found</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {searchQuery ? "No contacts match your search." : "When customers send WhatsApp messages, they appear here instantly!"}
                </p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="mt-2 text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  + Start a new conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedPhone === c.cleanPhone;
                return (
                  <div
                    key={c.cleanPhone}
                    onClick={() => {
                      playClickSound();
                      setSelectedPhone(c.cleanPhone);
                    }}
                    className={`p-3 sm:px-3.5 sm:py-3 transition flex items-center gap-3 cursor-pointer select-none ${
                      isSelected
                        ? "bg-emerald-50/80 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50 border-l-4 border-transparent"
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full font-bold text-sm flex items-center justify-center text-white shadow-xs ${
                        c.isWindowActive
                          ? "bg-gradient-to-tr from-emerald-600 to-teal-600"
                          : "bg-slate-400"
                      }`}>
                        {c.customerName ? c.customerName[0].toUpperCase() : <User className="w-5 h-5" />}
                      </div>

                      {/* Online 24h Pulse indicator */}
                      {c.isWindowActive && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/50" />
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-heading font-bold text-xs text-slate-800 truncate">
                          {c.customerName || "Customer"}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {formatChatListTime(c.lastMessageTime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-slate-500 truncate font-body">
                          {c.lastMessageText || "WhatsApp message"}
                        </p>

                        {c.isWindowActive ? (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                            {c.hoursRemaining}h
                          </span>
                        ) : (
                          <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        +{c.cleanPhone}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE WHATSAPP CHAT WINDOW */}
        {/* ========================================================================= */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
            
            {/* 1. WhatsApp Chat Header */}
            <div className="p-3 bg-slate-50/95 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back Button for Mobile */}
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center text-white shrink-0 shadow-xs ${
                  activeConversation.isWindowActive
                    ? "bg-emerald-600 shadow-emerald-500/20"
                    : "bg-slate-400"
                }`}>
                  {activeConversation.customerName ? activeConversation.customerName[0].toUpperCase() : <User className="w-5 h-5" />}
                </div>

                {/* Name & Online Status */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-sm text-slate-800 truncate">
                      {activeConversation.customerName || "Customer"}
                    </span>
                    <span className="font-mono text-xs text-slate-500 font-semibold truncate">
                      +{activeConversation.cleanPhone}
                    </span>
                  </div>

                  {activeConversation.isWindowActive ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>Active 24h Window ({activeConversation.hoursRemaining}h remaining)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>24h window expired • reply delivered via Meta utility template</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`tel:+${activeConversation.cleanPhone}`}
                  className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>

                <Link
                  href="/create-campaign"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-heading font-bold transition"
                >
                  <Send className="w-3 h-3" />
                  <span>Campaign</span>
                </Link>
              </div>
            </div>

            {/* 2. Chat Messages Area (WhatsApp Wallpaper Pattern) */}
            <div 
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar"
              style={{
                backgroundColor: "#efeae2",
                backgroundImage: "radial-gradient(#d1d7db 0.8px, transparent 0.8px)",
                backgroundSize: "16px 16px",
              }}
            >
              {/* Date Stamp Pill */}
              <div className="text-center my-2">
                <span className="inline-block px-3 py-1 rounded-lg bg-white/90 backdrop-blur-xs text-[11px] font-heading font-bold text-slate-600 shadow-2xs border border-slate-200/60 uppercase tracking-wider">
                  Today
                </span>
              </div>

              {/* Encryption Notice */}
              <div className="max-w-md mx-auto p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] text-amber-900 text-center flex items-center justify-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Messages sent and received directly with this customer via official <strong>Meta Cloud API</strong>.
                </span>
              </div>

              {/* Message Bubbles */}
              {activeConversation.messages.map((msg, index) => {
                const isIncoming = msg.sender === "customer";

                return (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col ${isIncoming ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`relative p-3 rounded-2xl max-w-[85%] sm:max-w-[70%] shadow-xs text-xs font-body leading-relaxed ${
                        isIncoming
                          ? "bg-white text-slate-900 rounded-tl-xs border border-slate-200/60"
                          : "bg-[#d9fdd3] text-slate-900 rounded-tr-xs border border-emerald-200/60 ml-auto"
                      }`}
                    >
                      {/* Sender label for incoming */}
                      {isIncoming && (
                        <div className="text-[11px] font-heading font-bold text-emerald-700 mb-0.5">
                          {activeConversation.customerName || "Customer"}
                        </div>
                      )}

                      {/* Text */}
                      <p className="whitespace-pre-wrap break-words pr-2">
                        {msg.text}
                      </p>

                      {/* Timestamp & Double Ticks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-mono select-none">
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {!isIncoming && (
                          <span title="Delivered to WhatsApp">
                            {msg.status === "sending" ? (
                              <Clock className="w-3 h-3 text-slate-400 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* 3. Quick Reply Presets Row */}
            <div className="px-3 pt-2 pb-1.5 bg-slate-50 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Quick:
              </span>
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setReplyText(chip.text);
                    chatInputRef.current?.focus();
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-[11px] font-medium border border-slate-200 hover:border-emerald-300 transition whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* 4. WhatsApp Style Typing Composer Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-200/80 shrink-0">
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReplyText((prev) => prev + " 😊");
                    chatInputRef.current?.focus();
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <div className="relative flex-1">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Type a message to ${activeConversation.customerName || 'Customer'}...`}
                    className="w-full pl-4 pr-3 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 transition shadow-inner"
                    disabled={isSending}
                  />
                </div>

                {/* WhatsApp Round Green Send Button */}
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 transition shrink-0 cursor-pointer active:scale-95"
                  title="Send (Enter)"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              </form>

              {/* Status footer note */}
              {!activeConversation.isWindowActive && (
                <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-1 px-2">
                  <span>💡 24h direct window expired. This reply will automatically be sent using verified Meta utility template!</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Empty State when no conversation is selected (WhatsApp Web Welcome screen) */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-slate-50 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100/70 text-emerald-600 flex items-center justify-center shadow-inner">
              <MessageCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-xl font-heading font-extrabold text-slate-800">
                WhatsApp Business Web
              </h2>
              <p className="text-xs text-slate-500">
                Select a conversation on the left to read messages and send direct replies, or start a new WhatsApp chat with any customer.
              </p>
            </div>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start New WhatsApp Chat</span>
            </button>
            <div className="pt-8 text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Connected to Official Meta WhatsApp Cloud API</span>
            </div>
          </div>
        )}

      </div>

      {/* POPUP MODAL: START NEW WHATSAPP CHAT */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsNewChatOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-extrabold text-slate-800">
                  New WhatsApp Chat
                </h3>
                <p className="text-xs text-slate-500">
                  Send an official WhatsApp message to any phone number.
                </p>
              </div>
            </div>

            {newChatError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{newChatError}</span>
              </div>
            )}

            <form onSubmit={handleStartNewChat} className="space-y-3.5">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-xs font-bold text-slate-500">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-16 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="e.g. Ramesh Verma"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Message *
                </label>
                <textarea
                  rows={3}
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Type your WhatsApp greeting or message here..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-heading font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingNew}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSendingNew ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Start Chat & Send</span>
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
