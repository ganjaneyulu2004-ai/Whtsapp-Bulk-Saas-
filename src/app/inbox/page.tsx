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
  Link2,
  FileText,
  Download,
  Files,
  Tag,
  ChevronDown,
  Check,
  MousePointerClick
} from "lucide-react";

const LEAD_TAGS: Record<string, { label: string; emoji: string; badgeClass: string; dotColor: string }> = {
  ALL: { label: "All Chats", emoji: "💬", badgeClass: "bg-slate-100 text-slate-700 border-slate-300", dotColor: "#64748b" },
  HOT_LEAD: { label: "Hot Lead", emoji: "🔥", badgeClass: "bg-rose-50 text-rose-700 border-rose-200", dotColor: "#e11d48" },
  WEDDING_ENQUIRY: { label: "Wedding Enquiry", emoji: "💍", badgeClass: "bg-purple-50 text-purple-700 border-purple-200", dotColor: "#9333ea" },
  ADVANCE_PAID: { label: "Advance Paid", emoji: "💰", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", dotColor: "#16a34a" },
  PENDING_FOLLOWUP: { label: "Pending Follow-up", emoji: "⏳", badgeClass: "bg-amber-50 text-amber-700 border-amber-200", dotColor: "#d97706" },
  VIP_CLIENT: { label: "VIP Client", emoji: "⭐", badgeClass: "bg-blue-50 text-blue-700 border-blue-200", dotColor: "#2563eb" },
  NEW_ENQUIRY: { label: "New Enquiry", emoji: "🆕", badgeClass: "bg-slate-50 text-slate-700 border-slate-200", dotColor: "#64748b" },
};

const PRESET_INTERACTIVE_BUTTONS = [
  { id: "btn_book", title: "📅 Book Slot" },
  { id: "btn_packages", title: "🏷️ View Packages" },
  { id: "btn_call", title: "📞 Call Studio" },
];

interface ChatMessage {
  id: string;
  sender: "customer" | "business";
  text?: string;
  timestamp: string;
  status?: "sending" | "sent" | "delivered" | "read";
  isTemplate?: boolean;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document";
  fileName?: string;
  isAiReply?: boolean;
}

interface AttachedMediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "document";
  name: string;
  size?: number;
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
  leadTag?: string;
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
  const isSendingRef = useRef(false);

  // Customer Lead Stage Tags
  const [contactTags, setContactTags] = useState<Record<string, { tag: string; notes?: string }>>({});
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("ALL");
  const [showTagMenuForPhone, setShowTagMenuForPhone] = useState<string | null>(null);

  // WhatsApp Interactive Reply Buttons state
  const [attachedButtons, setAttachedButtons] = useState<Array<{ id: string; title: string }>>([]);
  const [showButtonMenu, setShowButtonMenu] = useState(false);
  const [customButtonTitle, setCustomButtonTitle] = useState("");

  // Multi-media attachment state
  const [attachedMediaList, setAttachedMediaList] = useState<AttachedMediaItem[]>([]);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isMediaUrlModalOpen, setIsMediaUrlModalOpen] = useState(false);
  const [inputMediaUrl, setInputMediaUrl] = useState("");
  const [inputMediaType, setInputMediaType] = useState<"image" | "video" | "document">("image");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Chat Modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [newChatMediaUrl, setNewChatMediaUrl] = useState("");
  const [newChatMediaType, setNewChatMediaType] = useState<"image" | "video" | "document">("image");
  const [isSendingNew, setIsSendingNew] = useState(false);
  const [newChatError, setNewChatError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<any>(null);

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

  const fetchTags = () => {
    fetch("/api/inbox/tags", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.tags) {
          setContactTags(data.tags);
        }
      })
      .catch((e) => console.error(e));
  };

  const handleUpdateContactTag = async (phone: string, newTag: string) => {
    playClickSound();
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);

    setContactTags((prev) => ({
      ...prev,
      [clean]: { tag: newTag },
      [phone]: { tag: newTag },
    }));
    setShowTagMenuForPhone(null);

    try {
      await fetch("/api/inbox/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, tag: newTag }),
      });
    } catch (e) {
      console.error("Failed to persist lead tag:", e);
    }
  };

  useEffect(() => {
    fetchInbox();
    fetchTags();
    const interval = setInterval(fetchInbox, 4000);
    return () => clearInterval(interval);
  }, []);

  // Build grouped conversations
  const conversations: Conversation[] = React.useMemo(() => {
    const groups: Record<string, Conversation> = {};

    // Group incoming messages (including AI replies and business sent messages)
    rawMessages.forEach((msg) => {
      let clean = String(msg.fromPhone || "").replace(/[^0-9]/g, "");
      if (clean.startsWith("91") && clean.length === 12) {
        clean = clean.slice(2);
      }
      if (!clean) return;

      const isFromAi = msg.customerName === "__BUSINESS_AI__";
      const isFromBusiness = msg.customerName === "__BUSINESS_REPLY__";
      const isOutgoingSystem = isFromAi || isFromBusiness;

      if (!groups[clean]) {
        groups[clean] = {
          phone: msg.fromPhone,
          cleanPhone: clean,
          customerName: isOutgoingSystem ? "Customer" : (msg.customerName || "Customer"),
          isWindowActive: msg.isWindowActive,
          hoursRemaining: msg.hoursRemaining || 0,
          lastMessageText: msg.messageText,
          lastMessageTime: msg.timestamp,
          messages: [],
          leadTag: contactTags[clean]?.tag || "NEW_ENQUIRY",
        };
      } else {
        if (!isOutgoingSystem && msg.customerName && groups[clean].customerName === "Customer") {
          groups[clean].customerName = msg.customerName;
        }
        if (msg.isWindowActive) {
          groups[clean].isWindowActive = true;
          groups[clean].hoursRemaining = Math.max(groups[clean].hoursRemaining, msg.hoursRemaining || 0);
        }
        if (contactTags[clean]?.tag) {
          groups[clean].leadTag = contactTags[clean].tag;
        }
      }

      groups[clean].messages.push({
        id: msg.id || `in_${clean}_${Date.now()}`,
        sender: isOutgoingSystem ? "business" : "customer",
        text: msg.messageText,
        timestamp: msg.timestamp,
        status: "delivered",
        isAiReply: isFromAi,
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
          leadTag: contactTags[clean]?.tag || "NEW_ENQUIRY",
        };
      }

      // Avoid duplicates from localStorage
      msgs.forEach((m) => {
        const textM = (m.text || "").trim().toLowerCase();
        const timeM = new Date(m.timestamp).getTime();

        const alreadyInGroup = groups[clean].messages.some((existing) => {
          if (existing.id === m.id) return true;
          const textE = (existing.text || "").trim().toLowerCase();
          const timeE = new Date(existing.timestamp).getTime();
          const timeDiff = Math.abs(timeE - timeM);

          if (
            existing.sender === m.sender &&
            ((textM && textE && textM === textE) || (m.fileName && existing.fileName === m.fileName)) &&
            timeDiff < 600000 // 10 minutes
          ) {
            return true;
          }
          return false;
        });

        if (!alreadyInGroup) {
          groups[clean].messages.push(m);
        }
      });
    });

    // Sort messages in each conversation chronologically and deduplicate
    return Object.values(groups).map((c) => {
      c.messages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const uniqueMsgs: ChatMessage[] = [];
      for (const msg of c.messages) {
        const textMsg = (msg.text || "").trim().toLowerCase();
        const timeMsg = new Date(msg.timestamp).getTime();

        const isDuplicate = uniqueMsgs.some((existing) => {
          if (existing.id && msg.id && existing.id === msg.id) return true;

          const sameSender = existing.sender === msg.sender;
          const textExisting = (existing.text || "").trim().toLowerCase();
          const timeExisting = new Date(existing.timestamp).getTime();
          const timeDiff = Math.abs(timeExisting - timeMsg);

          // 1. Text message deduplication (same text within 3 minutes)
          if (sameSender && textMsg && textExisting && textMsg === textExisting && timeDiff < 180000) {
            return true;
          }

          // 2. Media message deduplication (same file or url within 3 minutes)
          if (
            sameSender &&
            (msg.mediaUrl || msg.fileName) &&
            (existing.fileName === msg.fileName || (existing.mediaUrl && existing.mediaUrl === msg.mediaUrl)) &&
            timeDiff < 180000
          ) {
            return true;
          }

          return false;
        });

        if (!isDuplicate) {
          uniqueMsgs.push(msg);
        }
      }

      c.messages = uniqueMsgs;

      const last = c.messages[c.messages.length - 1];
      if (last) {
        c.lastMessageText = last.text || (last.fileName ? `📄 ${last.fileName}` : last.mediaType ? `[${last.mediaType}]` : "");
        c.lastMessageTime = last.timestamp || new Date().toISOString();
      }
      return c;
    }).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }, [rawMessages, sentReplies, contactTags]);

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

  // Filtered conversation list with safe guards
  const filteredConversations = conversations.filter((c) => {
    if (filterTab === "active" && !c.isWindowActive) return false;
    if (filterTab === "expired" && c.isWindowActive) return false;

    // Filter by Lead Stage Tag
    if (selectedTagFilter !== "ALL") {
      const cTag = contactTags[c.cleanPhone]?.tag || c.leadTag || "NEW_ENQUIRY";
      if (cTag !== selectedTagFilter) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.customerName || "").toLowerCase().includes(q);
      const matchPhone = (c.cleanPhone || "").includes(q) || (c.phone || "").includes(q);
      const matchText = c.messages.some((m) => 
        (m.text || "").toLowerCase().includes(q) || (m.fileName || "").toLowerCase().includes(q)
      );
      return matchName || matchPhone || matchText;
    }
    return true;
  });

  // Multi-file upload handler supporting photos, videos, and documents
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, preferredType?: "image" | "video" | "document") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: AttachedMediaItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 16 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 16MB Meta WhatsApp limit. Skipping.`);
        continue;
      }

      let type: "image" | "video" | "document" = "image";
      const lowerName = file.name.toLowerCase();

      if (
        preferredType === "document" ||
        file.type.includes("pdf") ||
        file.type.includes("sheet") ||
        file.type.includes("excel") ||
        file.type.includes("word") ||
        file.type.includes("document") ||
        file.type.includes("csv") ||
        file.type.includes("text") ||
        Boolean(lowerName.match(/\.(pdf|docx?|xlsx?|csv|txt)$/))
      ) {
        type = "document";
      } else if (
        file.type.startsWith("video/") || 
        preferredType === "video" || 
        Boolean(lowerName.match(/\.(mp4|mov|webm|3gp)$/))
      ) {
        type = "video";
      }

      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newItems.push({
        id: `att_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        url: dataUrl,
        type,
        name: file.name,
        size: file.size,
      });
    }

    if (newItems.length > 0) {
      setAttachedMediaList((prev) => [...prev, ...newItems]);
      setShowMediaMenu(false);
      setTimeout(() => chatInputRef.current?.focus(), 100);
    }
    e.target.value = "";
  };

  const handleAttachMediaUrl = (url: string, type: "image" | "video" | "document") => {
    if (!url.trim()) return;
    const cleanUrl = url.trim();
    const fallbackName =
      type === "document" ? "document.pdf" : type === "video" ? "video.mp4" : "image.jpg";
    const name = cleanUrl.split("/").pop() || fallbackName;

    setAttachedMediaList((prev) => [
      ...prev,
      {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: cleanUrl,
        type,
        name,
      },
    ]);
    setIsMediaUrlModalOpen(false);
    setInputMediaUrl("");
    setShowMediaMenu(false);
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const handleRemoveAttachedItem = (id: string) => {
    setAttachedMediaList((prev) => prev.filter((item) => item.id !== id));
  };

  // Send Direct Reply in active chat (supports multiple media files + text)
  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isSendingRef.current || isSending) return;
    if (!activeConversation || (!replyText.trim() && attachedMediaList.length === 0)) return;

    isSendingRef.current = true;
    setIsSending(true);

    playClickSound();
    const textToSend = replyText.trim();
    const targetPhone = activeConversation.cleanPhone;
    const targetName = activeConversation.customerName;
    const mediaToSend = [...attachedMediaList];
    const buttonsToSend = [...attachedButtons];
    const buttonSuffix = buttonsToSend.length > 0
      ? "\n\n🔘 Buttons: " + buttonsToSend.map(b => `[ ${b.title} ]`).join("  ")
      : "";

    // Optimistic messages added to chat
    const tempIds: string[] = [];
    if (mediaToSend.length > 0) {
      mediaToSend.forEach((item, idx) => {
        const tempId = `out_${Date.now()}_${idx}`;
        tempIds.push(tempId);
        const newMsg: ChatMessage = {
          id: tempId,
          sender: "business",
          text: idx === 0 ? (textToSend + buttonSuffix) : undefined,
          timestamp: new Date().toISOString(),
          status: "sending",
          mediaUrl: item.url,
          mediaType: item.type,
          fileName: item.name,
        };
        saveSentReply(targetPhone, newMsg);
      });
    } else {
      const tempId = `out_${Date.now()}`;
      tempIds.push(tempId);
      const newMsg: ChatMessage = {
        id: tempId,
        sender: "business",
        text: textToSend + buttonSuffix,
        timestamp: new Date().toISOString(),
        status: "sending",
      };
      saveSentReply(targetPhone, newMsg);
    }

    setReplyText("");
    setAttachedMediaList([]);
    setAttachedButtons([]);
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
          buttons: buttonsToSend,
          mediaList: mediaToSend.map((m) => ({
            url: m.url,
            type: m.type,
            name: m.name,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSentReplies((prev) => {
          const list = prev[targetPhone] || [];
          const updated = list.map((m) =>
            tempIds.includes(m.id) ? { ...m, status: "delivered" as const } : m
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
      isSendingRef.current = false;
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
    if (!newChatMessage.trim() && !newChatMediaUrl.trim()) {
      setNewChatError("Please type a message or provide a media URL to start the conversation.");
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
          fileName: newChatMediaUrl.trim() ? newChatMediaUrl.split("/").pop() : undefined,
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
          fileName: newChatMediaUrl.trim() ? newChatMediaUrl.split("/").pop() : undefined,
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

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "";
    }
  };

  const formatChatListTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
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

            {/* Lead Stage Tag Filter Scrollable Strip */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <span className="text-[10px] font-heading font-extrabold text-slate-400 shrink-0 flex items-center gap-0.5">
                <Tag className="w-3 h-3 text-[#00a884]" />
                Tags:
              </span>
              {Object.entries(LEAD_TAGS).map(([k, t]) => {
                const isSelected = selectedTagFilter === k;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      playClickSound();
                      setSelectedTagFilter(k);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold shrink-0 transition flex items-center gap-1 cursor-pointer border ${
                      isSelected
                        ? `${t.badgeClass} ring-2 ring-offset-1 ring-[#00a884]/40 shadow-xs`
                        : "bg-[#f8fafc] text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
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
                  {selectedTagFilter !== "ALL" ? `No contacts tagged under "${LEAD_TAGS[selectedTagFilter]?.label}".` : searchQuery ? "No contacts match your query." : "Incoming customer messages appear here in real-time!"}
                </p>
                <button
                  onClick={() => {
                    setSelectedTagFilter("ALL");
                    setIsNewChatOpen(true);
                  }}
                  className="mt-2 text-xs font-bold text-[#00a884] hover:underline cursor-pointer"
                >
                  + Start a new chat
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedPhone === c.cleanPhone;
                const contactTagKey = contactTags[c.cleanPhone]?.tag || c.leadTag || "NEW_ENQUIRY";
                const contactTagInfo = LEAD_TAGS[contactTagKey] || LEAD_TAGS.NEW_ENQUIRY;

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

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[10px] font-mono text-[#8696a0] truncate">
                          +{c.cleanPhone}
                        </span>

                        {/* Customer Lead Stage Tag Pill */}
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-heading font-extrabold border shrink-0 ${contactTagInfo.badgeClass}`}>
                          <span>{contactTagInfo.emoji}</span>
                          <span>{contactTagInfo.label}</span>
                        </span>
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

              {/* Action Buttons & Lead Tag Selector */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Lead Stage Tag Selector Dropdown */}
                {(() => {
                  const currentTag = contactTags[activeConversation.cleanPhone]?.tag || activeConversation.leadTag || "NEW_ENQUIRY";
                  const currentInfo = LEAD_TAGS[currentTag] || LEAD_TAGS.NEW_ENQUIRY;
                  const isOpen = showTagMenuForPhone === activeConversation.cleanPhone;

                  return (
                    <div className="relative">
                      <button
                        onClick={() => setShowTagMenuForPhone(isOpen ? null : activeConversation.cleanPhone)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading font-extrabold border transition shadow-2xs cursor-pointer ${currentInfo.badgeClass}`}
                        title="Click to change Lead Stage Tag"
                      >
                        <span>{currentInfo.emoji}</span>
                        <span>{currentInfo.label}</span>
                        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                      </button>

                      {isOpen && (
                        <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 w-52 animate-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1 text-[10px] uppercase font-heading font-extrabold text-slate-400 tracking-wider">
                            Set Lead Stage Tag
                          </div>
                          {Object.entries(LEAD_TAGS)
                            .filter(([k]) => k !== "ALL")
                            .map(([k, t]) => (
                              <button
                                key={k}
                                onClick={() => handleUpdateContactTag(activeConversation.cleanPhone, k)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-heading font-bold transition text-left cursor-pointer ${
                                  currentTag === k
                                    ? `${t.badgeClass} ring-1 ring-inset ring-current`
                                    : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span>{t.emoji}</span>
                                  <span>{t.label}</span>
                                </div>
                                {currentTag === k && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

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

                      {/* Attached Image, Video, or Document */}
                      {msg.mediaUrl && (
                        <div className="mb-2 overflow-hidden rounded-xl bg-black/5 border border-slate-200/60 shadow-2xs">
                          {msg.mediaType === "document" || msg.mediaUrl.match(/\.(pdf|docx?|xlsx?|csv|txt)/i) || msg.mediaUrl.startsWith("data:application/") ? (
                            <div className="p-3 bg-white/90 rounded-xl flex items-center justify-between gap-3 border border-slate-200">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-heading font-bold text-[#111b21] truncate max-w-[200px]">
                                    {msg.fileName || msg.mediaUrl.split("/").pop() || "Document.pdf"}
                                  </div>
                                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                    WhatsApp Document
                                  </div>
                                </div>
                              </div>
                              <a
                                href={msg.mediaUrl}
                                download={msg.fileName || "document"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-[#00a884] text-white hover:bg-[#008069] transition shrink-0 shadow-2xs flex items-center justify-center"
                                title="Download Document"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ) : isVideo ? (
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

                      {/* AI Assistant Badge if sent by AI */}
                      {msg.isAiReply && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-bold mb-1.5 bg-emerald-100/90 px-2 py-0.5 rounded-full w-fit shadow-2xs">
                          <span>🤖 AI Assistant</span>
                        </div>
                      )}

                      {/* Message Content */}
                      {msg.text && (
                        <div>
                          <p className="whitespace-pre-wrap break-words pr-2">
                            {msg.text.split("🔘 Buttons:")[0].trim()}
                          </p>

                          {/* WhatsApp Interactive Buttons Preview */}
                          {msg.text.includes("🔘 Buttons:") && (
                            <div className="mt-2.5 pt-2 border-t border-black/10 space-y-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <MousePointerClick className="w-3 h-3 text-[#00a884]" />
                                Interactive Buttons
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.text
                                  .split("🔘 Buttons:")[1]
                                  ?.match(/\[\s*(.*?)\s*\]/g)
                                  ?.map((btnStr, bIdx) => {
                                    const cleanTitle = btnStr.replace(/^\[\s*|\s*\]$/g, "");
                                    return (
                                      <div
                                        key={bIdx}
                                        className="px-3 py-1.5 rounded-xl bg-white/95 border border-[#00a884]/40 text-[#008069] font-heading font-extrabold text-xs shadow-2xs flex items-center gap-1.5"
                                      >
                                        <span>{cleanTitle}</span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
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

            {/* Hidden File Input (supports multiple files) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
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

            {/* Multi-Media Attachment Preview Gallery Strip */}
            {attachedMediaList.length > 0 && (
              <div className="px-4 py-2.5 bg-[#e9edef] border-t border-slate-200 animate-in fade-in slide-in-from-bottom-2 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-[#111b21]">
                    <Files className="w-4 h-4 text-[#00a884]" />
                    <span>{attachedMediaList.length} File{attachedMediaList.length > 1 ? "s" : ""} Attached</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (Will be sent together to WhatsApp)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedMediaList([])}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-bold transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {attachedMediaList.map((item) => (
                    <div
                      key={item.id}
                      className="relative flex items-center gap-2 bg-white rounded-xl p-1.5 pr-2.5 border border-slate-300 shadow-2xs shrink-0 max-w-[220px] group"
                    >
                      {item.type === "document" ? (
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : item.type === "video" ? (
                        <div className="w-9 h-9 rounded-lg bg-purple-900 text-white flex items-center justify-center shrink-0 border border-purple-400">
                          <Video className="w-4 h-4 text-purple-300" />
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt="Thumbnail"
                          className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 shadow-2xs"
                        />
                      )}

                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[#111b21] truncate max-w-[130px]" title={item.name}>
                          {item.name}
                        </div>
                        <span className="text-[9px] uppercase font-bold tracking-wider px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                          {item.type}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAttachedItem(item.id)}
                        className="p-1 rounded-full bg-slate-200 hover:bg-rose-500 hover:text-white text-slate-600 transition cursor-pointer ml-1"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Add more button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = "*/*";
                        fileInputRef.current.click();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#e7fce3] text-[#008069] border border-dashed border-[#00a884] text-xs font-bold transition shrink-0 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add More</span>
                  </button>
                </div>
              </div>
            )}

            {/* 4. WhatsApp Style Typing Composer */}
            <div className="p-3 bg-[#f0f2f5] border-t border-slate-200/80 shrink-0 relative">
              
              {/* Media Attachment Dropdown Popover */}
              {showMediaMenu && (
                <div className="absolute bottom-16 left-4 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 w-56 animate-in zoom-in-95 duration-150">
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
                    <div className="w-8 h-8 rounded-full bg-[#e7fce3] text-[#008069] flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Photos & Images</div>
                      <div className="text-[10px] text-slate-400 font-normal">PNG, JPG, WEBP (Multiple)</div>
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
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Video Clip</div>
                      <div className="text-[10px] text-slate-400 font-normal">MP4, 3GP, MOV (Multiple)</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain";
                        fileInputRef.current.click();
                      }
                      setShowMediaMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-[#111b21] hover:text-rose-700 text-xs font-heading font-bold transition text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Documents</div>
                      <div className="text-[10px] text-slate-400 font-normal">PDF, DOC, XLSX, CSV</div>
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
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div>Media Web Link</div>
                      <div className="text-[10px] text-slate-400 font-normal">Direct Image, Video, or PDF URL</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Attached Interactive Buttons Preview Strip */}
              {attachedButtons.length > 0 && (
                <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar animate-in slide-in-from-bottom-2 duration-150">
                  <span className="text-[10px] font-heading font-extrabold text-[#008069] flex items-center gap-1 shrink-0 uppercase tracking-wider bg-[#e7fce3] px-2.5 py-1 rounded-xl border border-[#00a884]/30 shadow-2xs">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    Buttons ({attachedButtons.length}/3):
                  </span>
                  {attachedButtons.map((btn, bIdx) => (
                    <div
                      key={bIdx}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-[#008069] border border-[#00a884] text-xs font-heading font-extrabold shrink-0 shadow-2xs"
                    >
                      <span>{btn.title}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedButtons((prev) => prev.filter((_, i) => i !== bIdx))}
                        className="p-0.5 rounded-full hover:bg-rose-500 hover:text-white text-slate-400 transition cursor-pointer"
                        title="Remove button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendReply(e);
                }}
                className="flex items-center gap-2"
              >
                {/* Media Attachment Clip Icon */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setShowMediaMenu((prev) => !prev);
                  }}
                  className={`p-2 rounded-full transition cursor-pointer ${
                    showMediaMenu || attachedMediaList.length > 0
                      ? "bg-[#00a884] text-white"
                      : "text-[#54656f] hover:text-[#111b21] hover:bg-white"
                  }`}
                  title="Attach Photos, Videos, or Documents"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                {/* Emoji Smile Icon */}
                <button
                  type="button"
                  onClick={() => {
                    setReplyText((prev) => prev + " 😊");
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-white rounded-full transition cursor-pointer"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {/* Bullet Points Helper Button */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setReplyText((prev) => (prev ? `${prev}\n• ` : "• "));
                    setTimeout(() => chatInputRef.current?.focus(), 50);
                  }}
                  className="px-2 py-1.5 rounded-xl bg-white hover:bg-[#e7fce3] text-[#54656f] hover:text-[#008069] text-xs font-bold border border-slate-200/90 transition shadow-2xs shrink-0 cursor-pointer"
                  title="Insert Bullet Point (Shift+Enter for newline)"
                >
                  • Point
                </button>

                {/* Interactive Buttons Helper Tool */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowButtonMenu((prev) => !prev);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-heading font-extrabold border transition shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      attachedButtons.length > 0 || showButtonMenu
                        ? "bg-[#e7fce3] text-[#008069] border-[#00a884]"
                        : "bg-white text-[#54656f] hover:text-[#008069] hover:bg-[#e7fce3] border-slate-200/90"
                    }`}
                    title="Attach WhatsApp Interactive Buttons"
                  >
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span>Buttons {attachedButtons.length > 0 ? `(${attachedButtons.length})` : ""}</span>
                  </button>

                  {showButtonMenu && (
                    <div className="absolute bottom-12 left-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 space-y-2 w-64 animate-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[11px] font-heading font-extrabold text-[#111b21] flex items-center gap-1">
                          <MousePointerClick className="w-3.5 h-3.5 text-[#00a884]" />
                          <span>Interactive Buttons (Max 3)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowButtonMenu(false)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-heading font-extrabold tracking-wider">Quick Presets:</div>
                        {PRESET_INTERACTIVE_BUTTONS.map((btn) => {
                          const isAttached = attachedButtons.some((b) => b.id === btn.id);
                          return (
                            <button
                              key={btn.id}
                              type="button"
                              onClick={() => {
                                playClickSound();
                                if (isAttached) {
                                  setAttachedButtons((prev) => prev.filter((b) => b.id !== btn.id));
                                } else if (attachedButtons.length < 3) {
                                  setAttachedButtons((prev) => [...prev, btn]);
                                } else {
                                  alert("Meta WhatsApp allows a maximum of 3 buttons per message.");
                                }
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-heading font-bold transition text-left cursor-pointer ${
                                isAttached
                                  ? "bg-[#e7fce3] text-[#008069] border border-[#00a884]/40"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                              }`}
                            >
                              <span>{btn.title}</span>
                              {isAttached ? <Check className="w-3.5 h-3.5 text-[#008069]" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Button Input */}
                      <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                        <div className="text-[10px] text-slate-400 uppercase font-heading font-extrabold tracking-wider">Custom Button:</div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={customButtonTitle}
                            onChange={(e) => setCustomButtonTitle(e.target.value.slice(0, 20))}
                            placeholder="e.g. ⭐ Google Review"
                            className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a884] font-medium"
                            maxLength={20}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!customButtonTitle.trim()) return;
                              if (attachedButtons.length >= 3) {
                                alert("Meta WhatsApp allows maximum 3 buttons per message.");
                                return;
                              }
                              setAttachedButtons((prev) => [
                                ...prev,
                                { id: `custom_${Date.now()}`, title: customButtonTitle.trim() },
                              ]);
                              setCustomButtonTitle("");
                            }}
                            disabled={!customButtonTitle.trim() || attachedButtons.length >= 3}
                            className="px-2.5 py-1 bg-[#00a884] text-white rounded-lg text-xs font-heading font-bold disabled:opacity-40 cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                        <span className="text-[9px] text-slate-400 block font-normal">Max 20 chars per button (Meta limit)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative flex-1 flex items-center">
                  <textarea
                    ref={chatInputRef}
                    rows={1}
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isSendingRef.current && !isSending) {
                          handleSendReply();
                        }
                      }
                    }}
                    placeholder={
                      attachedMediaList.length > 0
                        ? `Add caption for ${attachedMediaList.length} attached file(s)... (Shift+Enter for new line)`
                        : `Type a message to ${activeConversation.customerName || 'Customer'}... (Shift+Enter for new line)`
                    }
                    className="w-full pl-4 pr-3 py-2 bg-white border border-transparent focus:border-[#00a884] rounded-2xl text-xs sm:text-sm font-medium text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition shadow-2xs resize-none max-h-32 leading-relaxed"
                    disabled={isSending}
                  />
                </div>

                {/* WhatsApp Vibrant Green Send Button */}
                <button
                  type="submit"
                  disabled={(!replyText.trim() && attachedMediaList.length === 0) || isSending}
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

              {/* Optional Image, Video, or Document Attachment Link */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-[11px] font-heading font-bold text-slate-700 uppercase tracking-wider">
                  Attach Photo / Video / Document Link (Optional)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewChatMediaType("image")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      newChatMediaType === "image"
                        ? "bg-[#00a884] text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChatMediaType("video")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      newChatMediaType === "video"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChatMediaType("document")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      newChatMediaType === "document"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Document</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={newChatMediaUrl}
                  onChange={(e) => setNewChatMediaUrl(e.target.value)}
                  placeholder={
                    newChatMediaType === "document"
                      ? "https://example.com/brochure.pdf"
                      : newChatMediaType === "video"
                      ? "https://example.com/demo.mp4"
                      : "https://example.com/poster.jpg"
                  }
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
                  Share an image, video, or document link with client
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Media Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMediaType("image")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputMediaType === "image"
                        ? "bg-[#e7fce3] text-[#008069] border-[#00a884] shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMediaType("video")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputMediaType === "video"
                        ? "bg-purple-100 text-purple-700 border-purple-400 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMediaType("document")}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      inputMediaType === "document"
                        ? "bg-rose-100 text-rose-700 border-rose-400 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Document</span>
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
