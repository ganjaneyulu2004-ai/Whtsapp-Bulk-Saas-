"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { 
  Check, 
  X, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Search, 
  AlertCircle,
  ExternalLink,
  Shield,
  Loader2
} from "lucide-react";

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentsData, setPaymentsData] = useState<{
    pending: any[];
    approved: any[];
    rejected: any[];
    counts: { pending: number; approved: number; rejected: number };
  }>({
    pending: [],
    approved: [],
    rejected: [],
    counts: { pending: 0, approved: 0, rejected: 0 },
  });

  // Screenshot modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Reject modal
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      if (res.ok) {
        setPaymentsData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleApprove = async (subscriptionId: string) => {
    setActionLoading(subscriptionId);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action: "APPROVE" }),
      });
      if (res.ok) {
        await fetchPayments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingSubId) return;
    setActionLoading(rejectingSubId);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: rejectingSubId,
          action: "REJECT",
          adminNote: rejectReason.trim() || "Payment verification failed. Invalid UTR or screenshot mismatch.",
        }),
      });
      if (res.ok) {
        setRejectingSubId(null);
        setRejectReason("");
        await fetchPayments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const currentList = paymentsData[activeTab] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-main flex items-center gap-2">
            <Shield className="w-7 h-7 text-brand-purple" />
            <span>UPI Payment Approvals</span>
          </h1>
          <p className="text-slate-muted text-sm mt-1">
            Review and manually verify user UPI payments to activate memberships.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchPayments();
          }}
          disabled={refreshing}
          className="px-4 py-2.5 rounded-xl border border-brand-soft bg-white text-text-main hover:bg-brand-50 text-xs font-heading font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-soft pb-2">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-heading text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "pending"
              ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
              : "text-slate-muted hover:text-text-main hover:bg-brand-soft/50"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Approvals</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "pending" ? "bg-white text-brand-purple" : "bg-brand-soft text-brand-purple"
            }`}
          >
            {paymentsData.counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-heading text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "approved"
              ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
              : "text-slate-muted hover:text-text-main hover:bg-brand-soft/50"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "approved" ? "bg-white text-brand-purple" : "bg-brand-soft text-text-main"
            }`}
          >
            {paymentsData.counts.approved}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rejected")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-heading text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "rejected"
              ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
              : "text-slate-muted hover:text-text-main hover:bg-brand-soft/50"
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Rejected / Expired</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "rejected" ? "bg-white text-brand-purple" : "bg-brand-soft text-text-main"
            }`}
          >
            {paymentsData.counts.rejected}
          </span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-brand-soft shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-brand-soft mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-text-main text-base">
              No {activeTab} payment requests
            </h3>
            <p className="text-xs text-slate-muted mt-1">
              {activeTab === "pending"
                ? "All submitted UPI payments have been processed."
                : "No subscriptions in this tab yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-light/70 border-b border-brand-soft text-slate-muted uppercase font-heading font-semibold">
                  <th className="py-3.5 px-4">User & Business</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Plan & Amount</th>
                  <th className="py-3.5 px-4">UTR Number</th>
                  <th className="py-3.5 px-4">Submitted Time</th>
                  <th className="py-3.5 px-4 text-center">Screenshot</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-soft">
                {currentList.map((item) => {
                  const u = item.user;
                  const isProcessing = actionLoading === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-brand-light/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-heading font-bold text-text-main text-sm">
                          {item.payerName || u?.name || "Customer"}
                        </div>
                        <div className="text-[11px] text-slate-muted">
                          {item.businessName || u?.businessName || "Individual"} • @{u?.username || "N/A"}
                        </div>
                        {item.payerCity && (
                          <div className="text-[10px] text-brand-purple font-medium">
                            City: {item.payerCity} {item.payerGst ? `• GST: ${item.payerGst}` : ""}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 font-medium text-text-main">
                        <div>{item.payerMobile || u?.mobile || "N/A"}</div>
                        {item.payerEmail && (
                          <div className="text-[11px] text-slate-muted">{item.payerEmail}</div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-heading font-bold text-brand-purple">
                          {item.plan}
                        </span>
                        <div className="text-[11px] font-semibold text-text-main">
                          ₹{item.amount?.toLocaleString("en-IN")}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-text-main">
                        {item.utrNumber || "—"}
                      </td>

                      <td className="py-4 px-4 text-slate-muted">
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "—"}
                      </td>

                      <td className="py-4 px-4 text-center">
                        {item.screenshotPath ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(item.screenshotPath)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-light border border-brand-soft text-brand-purple hover:bg-brand-50 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">View</span>
                          </button>
                        ) : (
                          <span className="text-slate-muted text-[11px]">No file</span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {item.status === "PENDING_VERIFICATION" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(item.id)}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-semibold text-xs shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingSubId(item.id);
                                setRejectReason("");
                              }}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-heading font-semibold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : item.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active (+30d)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> {item.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screenshot Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-brand-soft shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-brand-soft mb-4">
              <h3 className="font-heading font-bold text-text-main text-base">
                Payment Screenshot
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl hover:bg-brand-light text-slate-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex justify-center bg-brand-light rounded-2xl p-2 border border-brand-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Payment proof screenshot"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-soft shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-brand-soft mb-4">
              <h3 className="font-heading font-bold text-text-main text-base">
                Reject Payment Verification
              </h3>
              <button
                onClick={() => setRejectingSubId(null)}
                className="p-1.5 rounded-xl hover:bg-brand-light text-slate-muted hover:text-text-main cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-muted mb-4">
              Specify the reason why this payment cannot be approved. The user will see this message.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. UTR number not found in bank statement, or payment amount does not match plan price."
              rows={3}
              className="w-full p-3.5 bg-brand-light/70 border border-brand-soft rounded-2xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
            />

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingSubId(null)}
                className="px-4 py-2 rounded-xl text-xs font-heading font-semibold text-slate-muted hover:bg-brand-light cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-semibold shadow-xs cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
