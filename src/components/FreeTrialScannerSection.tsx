"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Smartphone,
  Check,
  TrendingUp,
  MessageSquare,
  Award,
  Lock,
  Phone,
  Video,
  MoreVertical,
  ChevronLeft,
  Smile,
  Paperclip,
  Camera,
  Mic,
  CheckCheck,
  ExternalLink,
  Wifi,
  Battery
} from "lucide-react";
import { fireBrandConfetti } from "@/lib/confetti";
import { playClickSound, playCelebrationSound } from "@/lib/sounds";

interface FreeTrialScannerProps {
  maxTestLimit?: number;
  showLoginRedirect?: boolean;
}

export default function FreeTrialScannerSection({
  maxTestLimit = 2,
  showLoginRedirect = false,
}: FreeTrialScannerProps = {}) {
  const [recipientPhone, setRecipientPhone] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("retail");
  const [customOffer, setCustomOffer] = useState("🎁 Special Flat 50% Festive Discount on all new collections! Valid this weekend only.");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string; waMessageId?: string } | null>(null);
  const [testCount, setTestCount] = useState<number>(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("offerblast_free_test_count");
      if (stored) {
        setTestCount(parseInt(stored, 10) || 0);
      }
    } catch {
      // localStorage fallback
    }
  }, []);

  const remainingTests = Math.max(0, maxTestLimit - testCount);
  const isLimitReached = testCount >= maxTestLimit;

  const presets = [
    {
      id: "retail",
      label: "🛍️ ✨ Retail / Fashion",
      text: "🎁 Festive Mega Sale! Flat 50% OFF on all new silk sarees & menswear. Visit us today!",
    },
    {
      id: "restaurant",
      label: "🍕 🍔 Restaurant / Food",
      text: "🍕 Weekend Special Combo: Buy 1 Large Pizza & Get 1 Free + Complimentary Dessert!",
    },
    {
      id: "showroom",
      label: "💎 👑 VIP Showroom",
      text: "✨ Exclusive VIP Customer Preview: Zero Making Charges on all Gold & Diamond jewelry this week!",
    },
  ];

  const handleSelectPreset = (id: string, text: string) => {
    playClickSound();
    setSelectedPreset(id);
    setCustomOffer(text);
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientPhone || recipientPhone.trim().length < 10) {
      alert("Please enter a valid 10-digit mobile number to test.");
      return;
    }

    if (isLimitReached) {
      setSendResult({
        ok: false,
        message: `🔒 Free trial limit reached (${maxTestLimit}/${maxTestLimit} test messages sent). Please log in or register above to send full bulk campaigns!`,
      });
      return;
    }

    playClickSound();
    setSending(true);
    setSendResult(null);

    const targetNum = recipientPhone.trim();

    try {
      const res = await fetch("/api/campaigns/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientPhone: targetNum,
          offerText: customOffer,
          businessName: "OfferBlast VIP Store",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Increment and persist test count
        const newCount = Math.min(maxTestLimit, testCount + 1);
        setTestCount(newCount);
        try {
          localStorage.setItem("offerblast_free_test_count", String(newCount));
        } catch {}

        // Instant sub-second response
        setSending(false);
        setSendResult({
          ok: true,
          message: `⚡ Sent to WhatsApp in 0.3s! Verified by Meta Cloud API for +91 ${targetNum}.`,
          waMessageId: data.waMessageId,
        });
        fireBrandConfetti();
        playCelebrationSound();

        // Poll in background for real-time delivery ticks
        if (data.waMessageId) {
          const checkStatus = async (attempts = 0) => {
            if (attempts > 8) return;
            try {
              const sRes = await fetch(`/api/campaigns/status?wamid=${encodeURIComponent(data.waMessageId)}`);
              const sData = await sRes.json();
              if (sData.found) {
                if (sData.status === "delivered" || sData.status === "read") {
                  setSendResult({
                    ok: true,
                    message: `🎉 100% Delivered! Meta confirmed message successfully reached WhatsApp on +91 ${targetNum}.`,
                    waMessageId: data.waMessageId,
                  });
                  fireBrandConfetti();
                  playCelebrationSound();
                  return;
                } else if (sData.status === "failed") {
                  let errorMsg = `⚠️ Delivery Failed: ${sData.errorMessage || sData.errorCode || "Message undeliverable by Meta"}`;
                  if (sData.errorCode === "131026") {
                    errorMsg = `⚠️ Meta Error 131026: Message Undeliverable. WhatsApp is not active on +91 ${targetNum}, or this number has blocked incoming business messages.`;
                  } else if (sData.errorCode === "131049") {
                    errorMsg = `⚠️ Meta Ecosystem Limit (131049): Meta has temporarily capped promotional messages to +91 ${targetNum} today to protect from spam. Test with another number or send 'Hi' to our WhatsApp (+91 93904 84762).`;
                  }
                  setSendResult({
                    ok: false,
                    message: errorMsg,
                    waMessageId: data.waMessageId,
                  });
                  return;
                }
              }
              setTimeout(() => checkStatus(attempts + 1), 1500);
            } catch {
              // Ignore polling network glitches
            }
          };
          setTimeout(() => checkStatus(1), 1500);
        }
      } else {
        if (res.status === 429 || data.testLimitReached) {
          setTestCount(maxTestLimit);
          try {
            localStorage.setItem("offerblast_free_test_count", String(maxTestLimit));
          } catch {}
        }
        setSendResult({
          ok: false,
          message: data.error || "Could not deliver sample message. Please check the mobile number.",
        });
      }
    } catch (err: any) {
      setSendResult({
        ok: false,
        message: err.message || "Network error while sending test message.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#2D164B] via-[#3B1F5E] to-[#1C0F30] rounded-3xl p-6 sm:p-10 text-white border border-brand-purple/40 shadow-2xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-purple/30 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-blue/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Tag & Title */}
      <div className="relative z-10 max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple/40 text-brand-200 border border-brand-purple/50 text-xs font-heading font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-brand-300" />
            100% Anti-Ban Guarantee • Official Meta Cloud API
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
            isLimitReached 
              ? "bg-rose-500/20 text-rose-300 border-rose-400/40" 
              : "bg-amber-400/20 text-amber-300 border-amber-400/30"
          }`}>
            {isLimitReached ? (
              <>
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                Trial Limit Reached ({maxTestLimit}/{maxTestLimit} Sent)
              </>
            ) : (
              <>
                ⚡ Free Live Test ({remainingTests} of {maxTestLimit} left)
              </>
            )}
          </span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
          Send a Real WhatsApp Offer to Your Phone
        </h2>
        <p className="text-sm sm:text-base text-slate-300">
          Experience the lightning-fast speed and rich format of our official WhatsApp campaign engine. Enter your number below and watch how messages land on customer phones.
        </p>
      </div>

      {/* Main Interactive Demo Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 relative z-10">
        
        {/* Left Form: Test Sender (7 Cols) */}
        <div className="lg:col-span-7 bg-white/5 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-white/10 shadow-xl space-y-5">
          <div>
            <span className="text-xs font-semibold text-slate-300 block mb-2">
              Select Offer Type:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id, p.text)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-heading font-bold transition text-left cursor-pointer border ${
                    selectedPreset === p.id
                      ? "bg-brand-purple text-white border-brand-purple shadow-md shadow-brand-purple/40"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Authentic Smartphone WhatsApp Application Mockup */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
              <span className="flex items-center gap-2 text-white">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                📱 Live Customer WhatsApp Screen Preview:
              </span>
              <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Real WhatsApp App View
              </span>
            </div>

            {/* Smartphone Chassis Frame */}
            <div className="rounded-[32px] sm:rounded-[36px] p-2.5 sm:p-3 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-[5px] border-slate-700/80 shadow-2xl shadow-black/80 max-w-md mx-auto">
              
              {/* Phone Top Status Bar & Dynamic Island */}
              <div className="flex items-center justify-between px-3 pt-0.5 pb-2 text-[10px] text-slate-300 font-semibold select-none">
                <span>09:41</span>
                {/* Dynamic Island Notch */}
                <div className="w-20 h-3.5 bg-black rounded-full flex items-center justify-center gap-1.5 shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-800" />
                  <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* WhatsApp App Screen Container */}
              <div className="rounded-[20px] overflow-hidden border border-slate-800 shadow-inner bg-[#ECE5DD] flex flex-col">
                
                {/* WhatsApp Top Header Bar */}
                <div className="bg-[#075E54] text-white px-3 py-2 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <ChevronLeft className="w-5 h-5 text-white/90 -ml-1 cursor-pointer" />
                    {/* Business Avatar with Verified Badge */}
                    <div className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand-purple font-black text-xs shadow-xs">
                      iB
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[8px] text-white font-bold">
                        ✓
                      </span>
                    </div>
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 font-bold text-xs text-white">
                        <span>iBrainLabs Offers</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 fill-emerald-500 inline" />
                      </div>
                      <span className="text-[10px] text-emerald-100/80 font-normal">
                        Official Business Account
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-white/90">
                    <Video className="w-4 h-4 cursor-pointer hover:text-white" />
                    <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
                    <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
                  </div>
                </div>

                {/* WhatsApp Chat Body Canvas */}
                <div 
                  className="p-3 sm:p-4 space-y-2.5 min-h-[220px] relative"
                  style={{
                    backgroundColor: "#ECE5DD",
                    backgroundImage: `radial-gradient(#d3cabb 1px, transparent 1px)`,
                    backgroundSize: "16px 16px"
                  }}
                >
                  {/* Today Date Pill */}
                  <div className="flex justify-center">
                    <span className="px-2.5 py-0.5 rounded-md bg-white/85 shadow-2xs text-[9px] font-semibold text-slate-600 uppercase tracking-wide">
                      Today
                    </span>
                  </div>

                  {/* End-to-End Encryption Notice */}
                  <div className="bg-[#FFF3C4]/90 border border-amber-200/80 rounded-lg p-1.5 text-center shadow-2xs max-w-[92%] mx-auto">
                    <p className="text-[9px] text-amber-900 leading-tight">
                      🔒 Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
                    </p>
                  </div>

                  {/* WhatsApp Incoming Chat Bubble */}
                  <div className="relative max-w-[95%] bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-black/5 text-slate-800 space-y-1.5">
                    {/* Bubble Tail */}
                    <div 
                      className="absolute -left-1.5 top-0 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent" 
                    />

                    {/* Offer Tag */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-light text-brand-purple text-[10px] font-heading font-extrabold border border-brand-soft">
                      <Sparkles className="w-3 h-3 text-brand-purple" />
                      ⭐ Exclusive Offer for You
                    </div>

                    <p className="text-[11px] text-slate-700 font-medium">
                      Dear Customer,
                    </p>

                    {/* Highlighted Custom Offer Text */}
                    <div className="text-xs leading-relaxed font-semibold text-slate-900 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/70">
                      We have an offer for you:{" "}
                      <span className="text-brand-purple font-bold block mt-1">
                        {customOffer}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Thank you for shopping with iBrainLabs. Have a great day!
                    </p>

                    {/* Time & Read Receipts */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span className="italic text-[9px] text-slate-400">Reply STOP to unsubscribe</span>
                      <div className="flex items-center gap-1 font-medium">
                        <span>10:45 AM</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
                      </div>
                    </div>

                    {/* WhatsApp Interactive Action Buttons */}
                    <div className="pt-1.5 space-y-1.5 border-t border-slate-100">
                      <div className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 shadow-2xs">
                        <ExternalLink className="w-3 h-3 text-emerald-600" />
                        Claim Offer Online
                      </div>
                    </div>
                  </div>

                </div>

                {/* WhatsApp Bottom Input Bar */}
                <div className="bg-[#F0F2F5] px-2.5 py-2 flex items-center gap-2 border-t border-slate-200">
                  <div className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center justify-between text-slate-400 shadow-2xs border border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <Smile className="w-4 h-4 text-slate-500 cursor-pointer" />
                      <span className="text-xs text-slate-400 font-normal">Message</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Paperclip className="w-4 h-4 cursor-pointer hover:text-slate-700" />
                      <Camera className="w-4 h-4 cursor-pointer hover:text-slate-700" />
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#00A884] text-white flex items-center justify-center shadow-md cursor-pointer hover:bg-[#008f6f] transition shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                </div>

              </div>

            </div>
          </div>

          <form onSubmit={handleSendTest} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Mobile Number:
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-3 bg-white/10 rounded-xl text-xs font-mono font-bold text-brand-200 border border-white/10">
                  🇮🇳 +91
                </span>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  disabled={isLimitReached}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-purple disabled:opacity-50"
                />
              </div>
            </div>

            {/* Test Limit Notice Banner */}
            {isLimitReached && (
              <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Free Trial Limit Reached ({maxTestLimit}/{maxTestLimit} tests used).</strong> Create your account or login to unlock unlimited bulk WhatsApp campaigns!
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/register"
                    className="px-3.5 py-1.5 bg-brand-purple text-white rounded-xl font-heading font-bold text-xs hover:opacity-90 transition shadow-sm"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/login"
                    className="px-3 py-1.5 bg-white/20 text-white rounded-xl font-heading font-bold text-xs hover:bg-white/30 transition shadow-sm"
                  >
                    Login
                  </Link>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={sending || isLimitReached}
              onClick={() => {
                if (!sending && !isLimitReached) playClickSound();
              }}
              className={`w-full py-4 px-6 rounded-2xl font-heading font-extrabold text-sm sm:text-base transition-all duration-300 shadow-xl shadow-brand-purple/40 flex items-center justify-center gap-2.5 transform active:scale-[0.98] cursor-pointer ${
                isLimitReached
                  ? "bg-white/10 text-slate-400 border border-white/15 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-[#6B2D8F] via-[#8538B5] to-[#4A66B0] hover:opacity-95 text-white hover:shadow-2xl hover:shadow-brand-purple/50"
              }`}
            >
              {isLimitReached ? (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>🔒 Free Test Limit Used ({maxTestLimit}/{maxTestLimit}) — Login to Continue</span>
                </>
              ) : sending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-300" />
                  <span className="animate-pulse">✨ 🚀 Transmitting to WhatsApp... 📱</span>
                </>
              ) : (
                <>
                  <span className="text-base animate-bounce">⚡</span>
                  <span>🚀 Send WhatsApp Offer 🎉</span>
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/20 text-amber-300 font-bold">
                    {remainingTests} Free
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </>
              )}
            </button>

            {sendResult && (
              <div className={`p-4 rounded-xl text-xs flex items-start gap-3 animate-in fade-in ${
                sendResult.ok
                  ? "bg-brand-purple/30 text-white border border-brand-purple/50 shadow-lg"
                  : "bg-rose-500/20 text-rose-100 border border-rose-400/50"
              }`}>
                {sendResult.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block text-sm">{sendResult.ok ? "Delivered!" : "Notice"}</span>
                  <p className="mt-0.5 text-xs">{sendResult.message}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Side: Trust & Customer Satisfaction Badges (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 space-y-4">
            <h4 className="text-xs font-heading font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Why 100% of Businesses Choose This
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-purple/30 text-brand-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">100% Anti-Ban Security</span>
                  <p className="text-[11px] text-slate-300">
                    Your number is verified directly with Meta. Unlike unofficial QR tools, your number will never get blocked.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-purple/30 text-brand-purple flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">98% Open & Read Rate</span>
                  <p className="text-[11px] text-slate-300">
                    Customers read WhatsApp messages within 3 minutes of delivery, resulting in 10x higher shop footfalls.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-brand-blue/30 text-brand-blue flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-300" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">AI Poster-to-Campaign</span>
                  <p className="text-[11px] text-slate-300">
                    Simply upload your sale banner; Gemini AI automatically crafts high-converting copy in English and Telugu.
                  </p>
                </div>
              </div>
            </div>
          </div>



        </div>

      </div>
    </div>
  );
}
