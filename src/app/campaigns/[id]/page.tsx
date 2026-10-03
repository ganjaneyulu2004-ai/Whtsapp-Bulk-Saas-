"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Send, 
  CheckCheck, 
  Eye, 
  AlertCircle, 
  Pause, 
  Play, 
  RotateCcw, 
  Copy, 
  ArrowLeft,
  Download,
  Search,
  RotateCw,
  Users,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Repeat
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "READ" | "NOT_READ" | "FAILED">("ALL");

  // Resend to Not Read modal
  const [showResendModal, setShowResendModal] = useState(false);
  const [resending, setResending] = useState(false);

  const fetchDetail = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      const resData = await res.json();
      if (res.ok && resData.campaign) {
        setData(resData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDetail();
    }, 30000);
    return () => clearInterval(interval);
  }, [campaignId]);

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();
      if (res.ok) {
        if (action === "duplicate" && resData.id) {
          router.push(`/campaigns/${resData.id}`);
        } else {
          await fetchDetail();
        }
      } else {
        alert(resData.error || "Action failed");
      }
    } catch (err: any) {
      alert(err.message || "Failed action");
    }
  };

  const handleResendNotRead = async () => {
    setResending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend_not_read" }),
      });
      const resData = await res.json();
      if (res.ok && resData.newCampaignId) {
        setShowResendModal(false);
        router.push(`/campaigns/${resData.newCampaignId}`);
      } else {
        alert(resData.error || "Failed to create follow-up campaign");
      }
    } catch (e: any) {
      alert(e.message || "Error creating follow-up campaign");
    } finally {
      setResending(false);
    }
  };

  const exportCSV = () => {
    if (!data?.campaign?.messageLogs) return;
    const logs = data.campaign.messageLogs;

    const headers = [
      "Contact Name",
      "Phone",
      "Status",
      "Sent At",
      "Delivered At",
      "Read At",
      "Error Code",
      "Error Message",
    ];

    const rows = logs.map((l: any) => [
      `"${(l.recipientName || "Customer").replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.status}"`,
      `"${l.sentAt ? new Date(l.sentAt).toLocaleString() : ""}"`,
      `"${l.deliveredAt ? new Date(l.deliveredAt).toLocaleString() : ""}"`,
      `"${l.readAt ? new Date(l.readAt).toLocaleString() : ""}"`,
      `"${l.errorCode || ""}"`,
      `"${(l.errorMessage || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `iBrainLabs_${data.campaign.name.replace(/\s+/g, "_")}_Logs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-brand-soft rounded-xl" />
        <div className="h-44 bg-white rounded-3xl border border-brand-soft" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-3xl" />
          <div className="h-64 bg-white rounded-3xl" />
        </div>
      </div>
    );
  }

  const campaign = data?.campaign;
  if (!campaign) {
    return (
      <div className="text-center py-16 space-y-4 bg-white rounded-3xl border border-brand-soft">
        <p className="font-heading font-bold text-lg text-text-main">Campaign not found</p>
        <Link href="/campaigns" className="text-brand-purple font-semibold text-xs underline">
          Back to Campaigns list
        </Link>
      </div>
    );
  }

  const statusCounts = data.statusCounts || {
    sent: campaign.sentCount,
    delivered: campaign.deliveredCount,
    read: campaign.readCount,
    notRead: Math.max(0, campaign.deliveredCount - campaign.readCount),
    failed: campaign.failedCount,
    readRate: campaign.deliveredCount > 0 ? Math.round((campaign.readCount / campaign.deliveredCount) * 100) : 0,
  };

  const pieData = [
    { name: "Read", value: statusCounts.read, color: "#6B2D8F" },
    { name: "Not Read", value: statusCounts.notRead, color: "#4A66B0" },
    { name: "Failed", value: statusCounts.failed, color: "#EF4444" },
    { name: "Pending", value: Math.max(0, campaign.totalRecipients - (statusCounts.sent + statusCounts.failed)), color: "#E9E4F5" },
  ].filter((d) => d.value > 0);

  const logs = campaign.messageLogs || [];

  // Filter logs by search and tab
  const tabFilteredLogs = logs.filter((l: any) => {
    if (activeTab === "READ") return l.status === "READ";
    if (activeTab === "NOT_READ") return l.status === "DELIVERED" || (l.status === "SENT" && !l.readAt);
    if (activeTab === "FAILED") return l.status === "FAILED";
    return true; // ALL
  });

  const finalLogs = tabFilteredLogs.filter((l: any) => {
    const q = logSearch.toLowerCase();
    return (
      l.phone.includes(q) ||
      (l.recipientName && l.recipientName.toLowerCase().includes(q))
    );
  });

  const readCount = logs.filter((l: any) => l.status === "READ").length;
  const notReadCount = logs.filter((l: any) => l.status === "DELIVERED" || (l.status === "SENT" && !l.readAt)).length;
  const failedCount = logs.filter((l: any) => l.status === "FAILED").length;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Bar Back Link & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/campaigns"
            className="p-2.5 rounded-2xl bg-white border border-brand-soft text-slate-muted hover:text-text-main hover:bg-brand-light shadow-xs transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-brand-purple" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-extrabold text-text-main">
                {campaign.name}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-heading font-bold ${
                  campaign.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700"
                    : campaign.status === "SENDING"
                    ? "bg-amber-50 text-amber-700 animate-pulse"
                    : "bg-brand-light text-slate-muted"
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-muted mt-0.5">
              Type: <span className="font-semibold text-text-main">{campaign.type}</span> • Created on{" "}
              {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Resend to Not Read Button */}
          {notReadCount > 0 && (
            <button
              onClick={() => setShowResendModal(true)}
              className="flex items-center gap-1.5 bg-brand-gradient hover:opacity-95 text-white font-heading font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-purple/20 transition-all cursor-pointer"
            >
              <Repeat className="w-4 h-4" />
              <span>Resend to Not Read ({notReadCount})</span>
            </button>
          )}

          {campaign.status === "SENDING" && (
            <button
              onClick={() => handleAction("pause")}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          )}

          {campaign.status === "PAUSED" && (
            <button
              onClick={() => handleAction("resume")}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Resume</span>
            </button>
          )}

          {campaign.failedCount > 0 && (
            <button
              onClick={() => handleAction("resend_failed")}
              className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Resend Failed</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 bg-white border border-brand-soft text-brand-purple hover:bg-brand-50 font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => fetchDetail(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-white border border-brand-soft text-text-main hover:bg-brand-50 font-heading font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info Note on WhatsApp Privacy Settings */}
      <div className="p-4 rounded-2xl bg-brand-light border border-brand-soft flex items-start gap-3 text-xs text-text-main">
        <Info className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-brand-purple">WhatsApp Read Receipts Notice: </span>
          Read status depends on customer's WhatsApp privacy settings – if read receipts are off, the message shows as Delivered.
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-card">
          <span className="text-[11px] font-heading font-semibold text-slate-muted block uppercase">
            Total Sent
          </span>
          <span className="text-2xl font-heading font-extrabold text-text-main mt-1 block">
            {campaign.sentCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-card">
          <span className="text-[11px] font-heading font-semibold text-slate-muted block uppercase flex items-center gap-1">
            Delivered <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <span className="text-2xl font-heading font-extrabold text-brand-purple mt-1 block">
            {campaign.deliveredCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-card">
          <span className="text-[11px] font-heading font-semibold text-brand-blue block uppercase flex items-center gap-1">
            Read <CheckCheck className="w-3.5 h-3.5 text-brand-blue" />
          </span>
          <span className="text-2xl font-heading font-extrabold text-brand-blue mt-1 block">
            {campaign.readCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-card">
          <span className="text-[11px] font-heading font-semibold text-slate-muted block uppercase">
            Not Read
          </span>
          <span className="text-2xl font-heading font-extrabold text-text-main mt-1 block">
            {statusCounts.notRead}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-card">
          <span className="text-[11px] font-heading font-semibold text-rose-600 block uppercase">
            Failed
          </span>
          <span className="text-2xl font-heading font-extrabold text-rose-600 mt-1 block">
            {campaign.failedCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-brand-soft shadow-card">
          <span className="text-[11px] font-heading font-semibold text-slate-muted block uppercase">
            Read Rate %
          </span>
          <span className="text-2xl font-heading font-extrabold text-brand-purple mt-1 block">
            {statusCounts.readRate}%
          </span>
        </div>
      </div>

      {/* Donut Chart & Template Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Breakdown Donut Chart */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-brand-soft shadow-card space-y-4">
          <h2 className="text-base font-heading font-bold text-text-main">
            Delivery & Read Performance
          </h2>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign Template Details */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-brand-soft shadow-card space-y-4">
          <h2 className="text-base font-heading font-bold text-text-main">
            Campaign Template Content
          </h2>
          <div className="bg-brand-light p-4 rounded-2xl border border-brand-soft space-y-2 text-xs">
            <div className="font-heading font-bold text-brand-purple">
              Template: {campaign.template?.name}
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-brand-soft text-text-main whitespace-pre-wrap leading-relaxed">
              {campaign.template?.bodyText}
            </div>
            {campaign.template?.footerText && (
              <div className="text-[11px] text-slate-muted">
                Footer: {campaign.template?.footerText}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Contact-wise Recipient Logs Table */}
      <div className="bg-white rounded-3xl p-6 border border-brand-soft shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-heading font-bold text-text-main">
              Contact-Wise Delivery Logs
            </h2>
            <p className="text-xs text-slate-muted">
              Live status progression, delivery and read timestamps per customer.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-soft bg-brand-light/50 text-xs text-text-main placeholder:text-slate-muted focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
            />
          </div>
        </div>

        {/* Tabs: All | Read | Not Read | Failed */}
        <div className="flex items-center gap-2 border-b border-brand-soft pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-semibold transition-colors cursor-pointer ${
              activeTab === "ALL"
                ? "bg-brand-purple text-white shadow-xs"
                : "text-slate-muted hover:bg-brand-light"
            }`}
          >
            All Contacts ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab("READ")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "READ"
                ? "bg-brand-purple text-white shadow-xs"
                : "text-slate-muted hover:bg-brand-light"
            }`}
          >
            <span>Read (Blue ✓✓)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{readCount}</span>
          </button>

          <button
            onClick={() => setActiveTab("NOT_READ")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "NOT_READ"
                ? "bg-brand-purple text-white shadow-xs"
                : "text-slate-muted hover:bg-brand-light"
            }`}
          >
            <span>Not Read</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{notReadCount}</span>
          </button>

          <button
            onClick={() => setActiveTab("FAILED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "FAILED"
                ? "bg-brand-purple text-white shadow-xs"
                : "text-slate-muted hover:bg-brand-light"
            }`}
          >
            <span>Failed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">{failedCount}</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-brand-soft text-[11px] font-heading font-bold text-slate-muted uppercase tracking-wider bg-brand-light/60">
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sent Time</th>
                <th className="py-3 px-4">Delivered Time</th>
                <th className="py-3 px-4">Read Time</th>
                <th className="py-3 px-4">Failure Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-soft text-text-main">
              {finalLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-muted">
                    No contacts found in this view.
                  </td>
                </tr>
              ) : (
                finalLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-brand-light/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-text-main">
                      {log.recipientName || "Customer"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-brand-purple">
                      +{log.phone}
                    </td>

                    <td className="py-3.5 px-4">
                      {log.status === "READ" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-brand-blue">
                          <CheckCheck className="w-3.5 h-3.5 text-brand-blue" />
                          <span>READ</span>
                        </span>
                      ) : log.status === "DELIVERED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-soft text-brand-purple">
                          <CheckCheck className="w-3.5 h-3.5 text-brand-purple" />
                          <span>DELIVERED</span>
                        </span>
                      ) : log.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>FAILED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{log.status}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-muted">
                      {log.sentAt ? new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-muted">
                      {log.deliveredAt ? new Date(log.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </td>

                    <td className="py-3.5 px-4 text-brand-blue font-medium">
                      {log.readAt ? new Date(log.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                    </td>

                    <td className="py-3.5 px-4 text-rose-600 text-[11px]">
                      {log.errorMessage ? `${log.errorCode ? `[${log.errorCode}] ` : ""}${log.errorMessage}` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for "Resend to Not Read" */}
      {showResendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-soft shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="font-heading font-bold text-text-main text-lg mb-2">
              Resend to Unread Contacts?
            </h3>
            <p className="text-xs text-slate-muted mb-4 leading-relaxed">
              This will create a new targeted follow-up campaign with the <strong className="text-brand-purple">{notReadCount} contacts</strong> who received the message but have not read it yet.
            </p>

            <div className="p-4 bg-brand-light rounded-2xl border border-brand-soft space-y-1.5 text-xs text-text-main mb-6">
              <div className="flex justify-between">
                <span className="text-slate-muted">Original Campaign:</span>
                <span className="font-semibold">{campaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-muted">Unread Recipients:</span>
                <span className="font-bold text-brand-purple">{notReadCount} contacts</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResendModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-heading font-semibold text-slate-muted hover:bg-brand-light cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResendNotRead}
                disabled={resending}
                className="px-5 py-2.5 rounded-xl bg-brand-gradient hover:opacity-95 text-white text-xs font-heading font-bold shadow-md shadow-brand-purple/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {resending ? "Creating Campaign..." : "Confirm & Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
