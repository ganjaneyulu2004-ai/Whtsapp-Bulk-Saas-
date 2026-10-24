"use client";

import { useEffect, useState } from "react";
import { 
  PhoneCall, 
  RotateCw, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Send, 
  ExternalLink, 
  Check, 
  Building2, 
  Loader2,
  Trash2,
  Layers,
  HelpCircle,
  Copy
} from "lucide-react";

export default function AdminNumbersPage() {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, active: 0, pending: 0, maxAllowed: 20 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal to activate number
  const [targetNumber, setTargetNumber] = useState<any | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [verifiedName, setVerifiedName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Test Ping Modal
  const [pingTarget, setPingTarget] = useState<any | null>(null);
  const [pingRecipient, setPingRecipient] = useState("");
  const [pingResult, setPingResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pingLoading, setPingLoading] = useState(false);

  const fetchNumbers = async () => {
    try {
      const res = await fetch("/api/admin/numbers");
      const data = await res.json();
      if (res.ok && data?.numbers) {
        setNumbers(data.numbers);
        setStats(data.stats || { total: data.numbers.length, active: 0, pending: 0, maxAllowed: 20 });
      }
    } catch (err) {
      console.error("Error fetching numbers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const openActivateModal = (item: any) => {
    setTargetNumber(item);
    setPhoneNumberId(item.waPhoneNumberId || "");
    setDisplayPhone(item.displayPhoneNumber || item.phone || "");
    setVerifiedName(item.verifiedName || item.businessName || "");
  };

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNumber || !phoneNumberId.trim()) return;

    setActionLoading(targetNumber.businessId);
    try {
      const res = await fetch("/api/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTIVATE",
          businessId: targetNumber.businessId,
          waPhoneNumberId: phoneNumberId.trim(),
          displayPhoneNumber: displayPhone.trim(),
          verifiedName: verifiedName.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTargetNumber(null);
        await fetchNumbers();
      } else {
        alert(data.error || "Failed to activate number");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async (businessId: string) => {
    if (!confirm("Are you sure you want to disconnect this number?")) return;
    setActionLoading(businessId);
    try {
      const res = await fetch("/api/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCONNECT", businessId }),
      });
      if (res.ok) {
        await fetchNumbers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendPing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingTarget || !pingRecipient.trim()) return;

    setPingLoading(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/admin/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TEST_PING",
          businessId: pingTarget.businessId,
          testPhone: pingRecipient.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPingResult({ ok: true, message: data.message });
      } else {
        setPingResult({ ok: false, message: data.error || "Failed to send test ping" });
      }
    } catch (err: any) {
      setPingResult({ ok: false, message: err.message || "Network error" });
    } finally {
      setPingLoading(false);
    }
  };

  const filtered = numbers.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.businessName?.toLowerCase().includes(q) ||
      item.user?.name?.toLowerCase().includes(q) ||
      item.user?.username?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q) ||
      item.displayPhoneNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-slate-heading">
                WhatsApp Client Numbers
              </h1>
              <p className="text-xs text-slate-muted">
                Manage and activate client phone numbers under your Verified Meta Business Account.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchNumbers();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-emerald-700" : "text-emerald-700"}`} />
            <span>⚡ Sync &amp; Auto-Activate from Meta</span>
          </button>

          <a
            href="https://business.facebook.com/wa/manage/phone-numbers/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166fe5] rounded-xl transition shadow-sm cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Meta Business Suite</span>
          </a>
        </div>
      </div>

      {/* 3 Step Admin Guide Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-emerald-950 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            Admin Quick Guide: 2-Minute Client Number Activation
          </h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Quota: {stats.active} / {stats.maxAllowed} Used
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-emerald-900 pt-1">
          <div className="p-3 rounded-xl bg-white/70 border border-emerald-200/60 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-emerald-950">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
              Add in Meta Suite
            </span>
            <p className="text-slate-600">
              Open Meta Business Suite ➡️ WhatsApp Accounts ➡️ Phone Numbers ➡️ Add Phone Number.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 border border-emerald-200/60 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-emerald-950">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              Verify Client OTP
            </span>
            <p className="text-slate-600">
              Enter client's shop name & mobile. Ask client for the 6-digit Meta SMS/WhatsApp OTP.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/70 border border-emerald-200/60 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-emerald-950">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">3</span>
              1-Click Auto Sync
            </span>
            <p className="text-slate-600">
              Click <strong>&quot;⚡ Sync &amp; Auto-Activate&quot;</strong> above! OfferBlast auto-detects the number and activates instantly without manual copying!
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-muted block font-medium">Total Clients</span>
          <span className="text-2xl font-heading font-extrabold text-slate-heading mt-1 block">
            {stats.total}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-emerald-700 block font-medium">Active Brand Numbers</span>
          <span className="text-2xl font-heading font-extrabold text-emerald-600 mt-1 block">
            {stats.active}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-amber-700 block font-medium">Pending OTP Requests</span>
          <span className="text-2xl font-heading font-extrabold text-amber-600 mt-1 block">
            {stats.pending}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-muted block font-medium">Available Meta Slots</span>
          <span className="text-2xl font-heading font-extrabold text-slate-heading mt-1 block">
            {Math.max(0, stats.maxAllowed - stats.active)}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by business name, owner name, username or mobile..."
          className="flex-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-heading font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Business / Brand</th>
                <th className="py-3.5 px-4">Owner / Username</th>
                <th className="py-3.5 px-4">Requested Mobile</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Meta Phone Number ID</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-purple" />
                    <span>Loading WhatsApp client numbers...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No clients found matching &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isActive = item.status === "ACTIVE";
                  const isPending = item.status === "PENDING_ACTIVATION";

                  return (
                    <tr key={item.businessId} className="hover:bg-slate-50/60 transition">
                      {/* Brand Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isActive ? "bg-emerald-50 text-emerald-600" : isPending ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-heading font-bold text-slate-heading block">
                              {item.verifiedName || item.businessName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {item.category || "Retail"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-medium block">{item.user?.name || "N/A"}</span>
                        <span className="text-[10px] text-slate-400">@{item.user?.username}</span>
                      </td>

                      {/* Requested Mobile */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        {item.displayPhoneNumber || item.phone || "Not Set"}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Official Active
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending OTP
                          </span>
                        ) : item.status === "OFFICE_DEMO" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Office Demo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                            Not Connected
                          </span>
                        )}
                      </td>

                      {/* Phone Number ID */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        {item.waPhoneNumberId ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <span>{item.waPhoneNumberId}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.waPhoneNumberId);
                                setCopiedId(item.waPhoneNumberId);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="p-1 hover:text-brand-purple cursor-pointer"
                              title="Copy ID"
                            >
                              {copiedId === item.waPhoneNumberId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openActivateModal(item)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-2xs cursor-pointer"
                          >
                            {isActive ? "Edit Phone ID" : "Activate Number"}
                          </button>

                          {isActive && (
                            <button
                              onClick={() => {
                                setPingTarget(item);
                                setPingRecipient(item.phone || item.user?.mobile || "");
                                setPingResult(null);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-brand-purple bg-brand-light hover:bg-brand-soft/50 rounded-xl border border-brand-soft transition cursor-pointer"
                              title="Send test message to verify delivery"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isActive && (
                            <button
                              onClick={() => handleDisconnect(item.businessId)}
                              disabled={actionLoading === item.businessId}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Disconnect"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTIVATE NUMBER MODAL */}
      {targetNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-heading">
                    Activate WhatsApp Number
                  </h3>
                  <p className="text-xs text-slate-muted">
                    Assign Meta Cloud API credentials for {targetNumber.businessName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTargetNumber(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-heading uppercase tracking-wider mb-1">
                  Meta Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 1443849605471143 (15-16 digits)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Found in Meta Business Suite ➡️ WhatsApp ➡️ Phone Numbers column.
                </p>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-heading uppercase tracking-wider mb-1">
                  Display Phone Number
                </label>
                <input
                  type="text"
                  value={displayPhone}
                  onChange={(e) => setDisplayPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-heading uppercase tracking-wider mb-1">
                  Verified Brand Name
                </label>
                <input
                  type="text"
                  value={verifiedName}
                  onChange={(e) => setVerifiedName(e.target.value)}
                  placeholder="e.g. Sri Lakshmi Silks"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">💡 Zero Setup Required by Client:</span>
                <p>Once you click Activate, this client will immediately see their brand name active on their dashboard and can send bulk WhatsApp campaigns!</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTargetNumber(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === targetNumber.businessId || !phoneNumberId.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading === targetNumber.businessId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Activate Number</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEST PING MODAL */}
      {pingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-heading">
                Test Ping from {pingTarget.verifiedName || pingTarget.businessName}
              </h3>
              <button
                onClick={() => setPingTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendPing} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-heading uppercase tracking-wider mb-1">
                  Recipient WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={pingRecipient}
                  onChange={(e) => setPingRecipient(e.target.value)}
                  placeholder="e.g. 9642683699 (10 digits)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>

              {pingResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    pingResult.ok
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {pingResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{pingResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPingTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={pingLoading || !pingRecipient.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-brand-purple hover:bg-brand-purple/90 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {pingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Send Test Ping</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
