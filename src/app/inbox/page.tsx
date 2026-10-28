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
  CheckCheck,
  User,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  X,
  Loader2,
  Smile,
  ShieldCheck,
  AlertCircle,
  Paperclip,
  Image as ImageIcon,
  Video,
  Link2
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "customer" | "business";
  text: string;
  timestamp: string;
  status?: "sending" | "sent" | "delivered" | "read";
  isTemplate?: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "video";
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

  // Media attachment state
  const [attachedMedia, setAttachedMedia] = useState<{
    url: string;
    type: "image" | "video";
    name: string;
  } | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isMediaUrlModalOpen, setIsMediaUrlModalOpen] = useState(false);
  const [inputMediaUrl, setInputMediaUrl] = useState("");
  const [inputMediaType, setInputMediaType] = useState<"image" | "video">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Chat Modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [newChatMediaUrl, setNewChatMediaUrl] = useState("");
  const [newChatMediaType, setNewChatMediaType] = useState<"image" | "video">("image");
  const [isSendingNew, setIsSendingNew] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
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
      const saved = localStorage.getItem("wa_inbox_sent_replies_v3");
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
        localStorage.setItem("wa_inbox_sent_replies_v3", JSON.stringify(updated));
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

  const activeConversation = conversations.find((c) => c.cleanPhone === selectedPhone);

  // Scroll ONLY the inner chat messages container, NEVER the whole window!
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, preferredType?: "image" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      alert("File size exceeds 16MB Meta WhatsApp limit. Please select a smaller file.");
      return;
    }

    const isVideo = file.type.startsWith("video/") || preferredType === "video";
    const type: "image" | "video" = isVideo ? "video" : "image";

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedMedia({
        url: reader.result as string,
        type,
        name: file.name,
      });
      setShowMediaMenu(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAttachMediaUrl = (url: string, type: "image" | "video") => {
    if (!url.trim()) return;
    setAttachedMedia({
      url: url.trim(),
      type,
      name: url.split("/").pop() || (type === "video" ? "video.mp4" : "image.jpg"),
    });
    setIsMediaUrlModalOpen(false);
    setInputMediaUrl("");
    setShowMediaMenu(false);
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  // Send Direct Reply in active chat
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeConversation || (!replyText.trim() && !attachedMedia) || isSending) return;

    playClickSound();
    const textToSend = replyText.trim();
    const targetPhone = activeConversation.cleanPhone;
    const targetName = activeConversation.customerName;
    const mediaToSend = attachedMedia;

    // Optimistic message added to chat
    const tempId = `out_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: tempId,
      sender: "business",
      text: textToSend,
      timestamp: new Date().toISOString(),
      status: "sending",
      mediaUrl: mediaToSend?.url,
      mediaType: mediaToSend?.type,
    };

    saveSentReply(targetPhone, newMsg);
    setReplyText("");
    setAttachedMedia(null);
    setIsSending(true);

    // Scroll inner container immediately
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 50);

    try {
      const res = await fetch("/api/inbox/send-personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: targetPhone,
          recipientName: targetName,
          messageText: textToSend,
          mediaUrl: mediaToSend?.url,
          mediaType: mediaToSend?.type,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSentReplies((prev) => {
          const list = prev[targetPhone] || [];
          const updated = list.map((m) =>
            m.id === tempId ? { ...m, status: "delivered" as const } : m
          );
          localStorage.setItem(
            "wa_inbox_sent_replies_v3",
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
          mediaUrl: newChatMediaUrl.trim() || undefined,
          mediaType: newChatMediaType,
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
          mediaUrl: newChatMediaUrl.trim() || undefined,
          mediaType: newChatMediaType,
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
        setNewChatMediaUrl("");
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
    <div className="w-full h-full flex flex-col flex-1 min-h-0">
      {/* REAL WHATSAPP WEB APPLICATION SHELL */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xl overflow-hidden flex flex-1 h-full min-h-0 transition-all">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CHAT LIST & SEARCH (Real WhatsApp Web Sidebar) */}
        {/* ========================================================================= */}
        <div className={`w-full md:w-[350px] lg:w-[390px] border-r border-slate-200 flex flex-col bg-white shrink-0 ${
          selectedPhone ? "hidden md:flex" : "flex"
        }`}>
          
          {/* WhatsApp Web Left Top Header */}
          <div className="h-16 px-4 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#00a884] text-white font-heading font-extrabold text-sm flex items-center justify-center shadow-xs">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-sm text-[#111b21] leading-tight">
                  WhatsApp Chats
                </h2>
                <div className="flex items-center gap-1 text-[11px] text-[#00a884] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-pulse" />
                  <span>{activeWindowCount} Active 24h</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  playClickSound();
                  setIsNewChatOpen(true);
                }}
                className="p-2 rounded-full text-slate-600 hover:text-[#00a884] hover:bg-white transition cursor-pointer"
                title="New WhatsApp Chat"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                onClick={fetchInbox}
                className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-white transition cursor-pointer"
                title="Refresh Chats"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* WhatsApp Search Bar */}
          <div className="p-2.5 bg-white border-b border-slate-100 space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full pl-9 pr-7 py-2 bg-[#f0f2f5] focus:bg-white rounded-xl text-xs font-medium text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884]/40 border border-transparent focus:border-[#00a884] transition"
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1 rounded-full text-[11px] font-heading font-bold transition cursor-pointer ${
                  filterTab === "all"
                    ? "bg-[#e7fce3] text-[#008069] border border-[#00a884]/30"
                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-slate-200"
                }`}
              >
                All ({conversations.length})
              </button>
              <button
                onClick={() => setFilterTab("active")}
                className={`px-3 py-1 rounded-full text-[11px] font-heading font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterTab === "active"
                    ? "bg-[#00a884] text-white shadow-xs"
                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-slate-200"
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>24h Active ({activeWindowCount})</span>
              </button>
              <button
                onClick={() => setFilterTab("expired")}
                className={`px-3 py-1 rounded-full text-[11px] font-heading font-bold transition flex items-center gap-1 cursor-pointer ${
                  filterTab === "expired"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-slate-200"
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
              <div className="py-20 text-center text-xs text-slate-400 animate-pulse font-heading font-medium">
                Loading WhatsApp contacts...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-20 px-4 text-center text-slate-400 space-y-2">
                <MessageCircle className="w-9 h-9 text-slate-300 mx-auto" />
                <p className="text-xs font-heading font-bold text-slate-700">No conversations found</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {searchQuery ? "No contacts match your query." : "Incoming customer messages appear here in real-time!"}
                </p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="mt-2 text-xs font-bold text-[#00a884] hover:underline cursor-pointer"
                >
                  + Start a new chat
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
                    className={`px-3.5 py-3 transition-all flex items-center gap-3 cursor-pointer select-none border-l-4 ${
                      isSelected
                        ? "bg-[#f0f2f5] border-[#00a884]"
                        : "hover:bg-slate-50/90 border-transparent"
                    }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-full font-bold text-sm flex items-center justify-center text-white shadow-xs ${
                        c.isWindowActive
                          ? "bg-gradient-to-tr from-[#00a884] to-[#128c7e]"
                          : "bg-slate-400"
                      }`}>
                        {c.customerName ? c.customerName[0].toUpperCase() : <User className="w-6 h-6" />}
                      </div>

                      {/* Online 24h Green Status Dot */}
                      {c.isWindowActive && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#25d366] border-2 border-white" />
                      )}
                    </div>

                    {/* Chat Text Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-heading font-extrabold text-xs text-[#111b21] truncate">
                          {c.customerName || "Customer"}
                        </span>
                        <span className="text-[10px] font-mono text-[#8696a0] shrink-0">
                          {formatChatListTime(c.lastMessageTime)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-[#667781] truncate font-body">
                          {c.lastMessageText || "WhatsApp message"}
                        </p>

                        {c.isWindowActive ? (
                          <span className="shrink-0 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#d9fdd3] text-[#008069] font-mono">
                            {c.hoursRemaining}h
                          </span>
                        ) : (
                          <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                        )}
                      </div>

                      <div className="text-[10px] font-mono text-[#8696a0] truncate mt-0.5">
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
        {/* RIGHT COLUMN: REAL WHATSAPP CHAT CONVERSATION WINDOW */}
        {/* ========================================================================= */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden">
            
            {/* 1. WhatsApp Chat Sticky Top Header */}
            <div className="h-16 px-4 bg-[#f0f2f5] border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs z-20">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="md:hidden p-1.5 -ml-1 rounded-full text-slate-600 hover:bg-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center text-white shrink-0 shadow-xs ${
                  activeConversation.isWindowActive
                    ? "bg-[#00a884]"
                    : "bg-slate-400"
                }`}>
                  {activeConversation.customerName ? activeConversation.customerName[0].toUpperCase() : <User className="w-5 h-5" />}
                </div>

                {/* Contact Name & Online Status */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-sm text-[#111b21] truncate">
                      {activeConversation.customerName || "Customer"}
                    </span>
                    <span className="font-mono text-xs text-[#667781] font-semibold truncate">
                      +{activeConversation.cleanPhone}
                    </span>
                  </div>

                  {activeConversation.isWindowActive ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#008069] font-medium leading-none mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse shrink-0" />
                      <span>online • 24h active window ({activeConversation.hoursRemaining}h left)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-[#8696a0] font-medium leading-none mt-0.5">
                      <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>24h window expired (Meta template delivery)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`tel:+${activeConversation.cleanPhone}`}
                  className="p-2 rounded-full text-[#54656f] hover:text-[#00a884] hover:bg-white transition cursor-pointer"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>

                <Link
                  href="/create-campaign"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-[#111b21] text-xs font-heading font-bold border border-slate-200 shadow-2xs transition"
                >
                  <Send className="w-3 h-3 text-[#00a884]" />
                  <span>Campaign</span>
                </Link>
              </div>
            </div>

            {/* 2. Chat Messages Area (Authentic WhatsApp Wallpaper) */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 custom-scrollbar"
              style={{
                backgroundColor: "#efeae2",
                backgroundImage: "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)",
                backgroundSize: "20px 20px",
              }}
            >
              {/* Date Stamp Pill */}
              <div className="text-center my-1 select-none">
                <span className="inline-block px-3 py-1 rounded-lg bg-white text-[11px] font-heading font-bold text-[#54656f] shadow-xs uppercase tracking-wider">
                  Today
                </span>
              </div>

              {/* Encryption Banner */}
              <div className="max-w-md mx-auto p-2 rounded-xl bg-[#ffeecd] text-[11px] text-[#54656f] text-center flex items-center justify-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-[#008069] shrink-0" />
                <span>
                  Official Meta Cloud API transmission. End-to-end verified.
                </span>
              </div>

              {/* Message Bubbles */}
              {activeConversation.messages.map((msg, index) => {
                const isIncoming = msg.sender === "customer";
                const isVideo = msg.mediaType === "video" || 
                  (msg.mediaUrl && (msg.mediaUrl.startsWith("data:video/") || Boolean(msg.mediaUrl.match(/\.(mp4|mov|webm|3gp)/i))));

                return (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col ${isIncoming ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`relative px-3.5 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[70%] shadow-xs text-xs font-body leading-relaxed ${
                        isIncoming
                          ? "bg-white text-[#111b21] rounded-tl-xs border border-slate-200/50"
                          : "bg-[#d9fdd3] text-[#111b21] rounded-tr-xs border border-[#bbf7d0]/60 ml-auto"
                      }`}
                    >
                      {/* Customer Name Label in Emerald Green */}
                      {isIncoming && (
                        <div className="text-[11px] font-heading font-extrabold text-[#008069] mb-1">
                          {activeConversation.customerName || "Customer"}
                        </div>
                      )}

                      {/* Attached Image or Video */}
                      {msg.mediaUrl && (
                        <div className="mb-2 overflow-hidden rounded-xl bg-black/5 border border-slate-200/60 shadow-2xs">
                          {isVideo ? (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="w-full max-h-72 rounded-xl object-contain bg-black"
                              playsInline
                            />
                          ) : (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block group relative"
                            >
                              <img
                                src={msg.mediaUrl}
                                alt="WhatsApp Media"
                                className="w-full max-h-72 rounded-xl object-cover group-hover:opacity-95 transition"
                              />
                              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs opacity-0 group-hover:opacity-100 transition">
                                View Full
                              </span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      {msg.text && (
                        <p className="whitespace-pre-wrap break-words pr-2">
                          {msg.text}
                        </p>
                      )}

                      {/* Timestamp & Double Blue Ticks */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0] font-mono select-none">
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {!isIncoming && (
                          <span title="Delivered to WhatsApp">
                            {msg.status === "sending" ? (
                              <Clock className="w-3 h-3 text-[#8696a0] animate-spin" />
                            ) : (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* 3. Quick Reply Presets Bar */}
            <div className="px-3 py-1.5 bg-[#f0f2f5] border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-heading font-bold text-[#54656f] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#00a884]" />
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
                  className="px-2.5 py-1 rounded-full bg-white hover:bg-[#e7fce3] text-[#111b21] hover:text-[#008069] text-[11px] font-medium border border-slate-200/90 transition whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Attached Media Preview Bar */}
            {attachedMedia && (
              <div className="px-4 py-2 bg-[#e9edef] border-t border-slate-200 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {attachedMedia.type === "video" ? (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 border border-slate-300">
                      <Video className="w-6 h-6 text-[#25d366]" />
                    </div>
                  ) : (
                    <img
                      src={attachedMedia.url}
                      alt="Attachment Preview"
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-300 shadow-2xs"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#00a884] text-white">
                        {attachedMedia.type === "video" ? "Video Ready" : "Photo Ready"}
                      </span>
                      <span className="text-xs font-bold text-[#111b21] truncate max-w-[200px]">
                        {attachedMedia.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667781] truncate">
                      Add an optional caption below and click Send
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedMedia(null)}
                  className="p-1.5 rounded-full hover:bg-slate-300 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 4. WhatsApp Style Typing Composer */}
            <div className="p-3 bg-[#f0f2f5] border-t border-slate-200/80 shrink-0 relative">
              
              {/* Media Attachment Dropdown Popover */}
              {showMediaMenu && (
                <div className="absolute bottom-16 left-4 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 w-52 animate-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "image/*";
                        fileInputRef.current.click();
                      }
                      setShowMediaMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#e7fce3] text-[#111b21] hover:text-[#008069] text-xs font-heading font-bold transition text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#e7fce3] text-[#008069] flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Photos & Images</div>
                      <div className="text-[10px] text-slate-400 font-normal">PNG, JPG, WEBP</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "video/*";
                        fileInputRef.current.click();
                      }
                      setShowMediaMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-purple-50 text-[#111b21] hover:text-purple-700 text-xs font-heading font-bold transition text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Video Clip</div>
                      <div className="text-[10px] text-slate-400 font-normal">MP4, 3GP, MOV</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMediaMenu(false);
                      setIsMediaUrlModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-sky-50 text-[#111b21] hover:text-sky-700 text-xs font-heading font-bold transition text-left cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Media Web Link</div>
                      <div className="text-[10px] text-slate-400 font-normal">Direct Image / Video URL</div>
                    </div>
                  </button>
                </div>
              )}

              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                {/* Media Attachment Clip Icon */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowMediaMenu((prev) => !prev);
                  }}
                  className={`p-2 rounded-full transition cursor-pointer ${
                    showMediaMenu || attachedMedia
                      ? "bg-[#00a884] text-white"
                      : "text-[#54656f] hover:text-[#111b21] hover:bg-white"
                  }`}
                  title="Attach Photo or Video"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Emoji Smile Icon */}
                <button
                  type="button"
                  onClick={() => {
                    setReplyText((prev) => prev + " 😊");
                    chatInputRef.current?.focus();
                  }}
                  className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-white rounded-full transition cursor-pointer"
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
                    placeholder={
                      attachedMedia
                        ? "Add a caption for this media..."
                        : `Type a message to ${activeConversation.customerName || 'Customer'}...`
                    }
                    className="w-full pl-4 pr-3 py-2.5 bg-white border border-transparent focus:border-[#00a884] rounded-2xl text-xs sm:text-sm font-medium text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition shadow-2xs"
                    disabled={isSending}
                  />
                </div>

                {/* WhatsApp Vibrant Green Send Button */}
                <button
                  type="submit"
                  disabled={(!replyText.trim() && !attachedMedia) || isSending}
                  className="w-11 h-11 rounded-full bg-[#25d366] hover:bg-[#20bd5a] disabled:opacity-40 text-white flex items-center justify-center shadow-md shadow-[#25d366]/30 transition shrink-0 cursor-pointer active:scale-95"
                  title="Send (Enter)"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              </form>

              {/* Status footer notice */}
              {!activeConversation.isWindowActive && (
                <div className="mt-1 text-[10px] text-[#8696a0] flex items-center gap-1 px-2">
                  <span>💡 24h direct window expired. This message will be delivered via verified Meta utility template.</span>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Empty State Welcome Screen when no chat selected */
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-[#f0f2f5] text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#d9fdd3] text-[#00a884] flex items-center justify-center shadow-sm">
              <MessageCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h2 className="text-xl font-heading font-extrabold text-[#111b21]">
                WhatsApp Business Web
              </h2>
              <p className="text-xs text-[#667781]">
                Select a customer on the left to view incoming messages and send live WhatsApp replies.
              </p>
            </div>
            <button
              onClick={() => {
                playClickSound();
                setIsNewChatOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-xs shadow-md shadow-[#00a884]/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Start New WhatsApp Chat</span>
            </button>
            <div className="pt-8 text-[11px] text-[#8696a0] flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#00a884]" />
              <span>Connected to Official Meta WhatsApp Cloud API</span>
            </div>
          </div>
        )}

      </div>

      {/* NEW CHAT MODAL */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsNewChatOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md shadow-[#00a884]/20">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-extrabold text-[#111b21]">
                  New WhatsApp Chat
                </h3>
                <p className="text-xs text-[#667781]">
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
                    className="w-full pl-16 pr-3 py-2.5 bg-[#f0f2f5] border border-transparent focus:border-[#00a884] rounded-xl text-sm font-semibold text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
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
                  className="w-full px-3 py-2.5 bg-[#f0f2f5] border border-transparent focus:border-[#00a884] rounded-xl text-sm font-semibold text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
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
                  className="w-full p-3 bg-[#f0f2f5] border border-transparent focus:border-[#00a884] rounded-xl text-xs sm:text-sm font-medium text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                  required
                />
              </div>

              {/* Optional Image or Video Attachment Link */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Attach Photo / Video Link (Optional)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChatMediaType("image")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      newChatMediaType === "image"
                        ? "bg-[#00a884] text-white"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChatMediaType("video")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      newChatMediaType === "video"
                        ? "bg-purple-600 text-white"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={newChatMediaUrl}
                  onChange={(e) => setNewChatMediaUrl(e.target.value)}
                  placeholder="https://example.com/poster.jpg or video.mp4"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-[#111b21] focus:outline-none focus:border-[#00a884]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-heading font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingNew}
                  className="px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-xs shadow-md shadow-[#00a884]/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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

      {/* MEDIA URL MODAL */}
      {isMediaUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsMediaUrlModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Link2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-extrabold text-[#111b21]">
                  Attach Media Web Link
                </h3>
                <p className="text-xs text-[#667781]">
                  Share an image or video URL with client
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Media Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMediaType("image")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      inputMediaType === "image"
                        ? "bg-[#e7fce3] text-[#008069] border-[#00a884]"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo / Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMediaType("video")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                      inputMediaType === "video"
                        ? "bg-purple-100 text-purple-700 border-purple-400"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Video Clip</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Direct Media URL *
                </label>
                <input
                  type="url"
                  value={inputMediaUrl}
                  onChange={(e) => setInputMediaUrl(e.target.value)}
                  placeholder={inputMediaType === "video" ? "https://example.com/demo.mp4" : "https://example.com/product.jpg"}
                  className="w-full px-3.5 py-2.5 bg-[#f0f2f5] border border-transparent focus:border-[#00a884] rounded-xl text-sm font-medium text-[#111b21] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMediaUrlModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-heading font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!inputMediaUrl.trim()}
                  onClick={() => handleAttachMediaUrl(inputMediaUrl, inputMediaType)}
                  className="px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-xs shadow-md shadow-[#00a884]/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <span>Attach Media</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
