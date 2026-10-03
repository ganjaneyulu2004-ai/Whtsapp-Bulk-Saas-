"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { 
  Inbox as InboxIcon, 
  MessageSquare, 
  Clock, 
  Zap, 
  RefreshCw, 
  User, 
  Send,
  PlusCircle
} from "lucide-react";

export default function InboxPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<any[]>([]);
  const [activeWindowCount, setActiveWindowCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchInbox, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-extrabold text-slate-heading">
              Customer Replies & Inbox
            </h1>
            <span className="bg-emerald-100 text-emerald-800 font-heading font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>{activeWindowCount} 24h Window Active</span>
            </span>
          </div>
          <p className="text-xs text-slate-muted mt-1">
            Real-time incoming customer replies via Meta Webhook. Contacts with active 24h windows can receive instant free-form image messages!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInbox}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-muted hover:text-slate-heading hover:bg-slate-50 transition-all shadow-xs"
            title="Refresh Inbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/create-campaign"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Campaign</span>
          </Link>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-card space-y-4">
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
                      : "bg-slate-200 text-slate-700"
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

                {/* 24-Hour Window Badge & Quick Action */}
                <div className="flex flex-col items-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
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

                  <Link
                    href="/create-campaign"
                    className="inline-flex items-center gap-1 text-xs font-heading font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <span>Send Campaign</span>
                    <Send className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
