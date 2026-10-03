"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { 
  BarChart3, 
  Search, 
  Download, 
  FileSpreadsheet, 
  ChevronRight,
  RefreshCw,
  PlusCircle,
  Clock
} from "lucide-react";

export default function CampaignsHistoryPage() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchCampaigns = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    fetch(`/api/campaigns?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCampaigns(data);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaigns();
  }, [search, typeFilter, statusFilter]);

  const exportCSV = () => {
    let csv = "Name,Type,Recipients,Sent,Delivered,Read,Failed,Status,Date\n";
    campaigns.forEach((c) => {
      csv += `"${c.name}","${c.type}",${c.totalRecipients},${c.sentCount},${c.deliveredCount},${c.readCount},${c.failedCount},"${c.status}","${new Date(c.createdAt).toLocaleDateString()}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "iBrainLabs_Campaigns_Report.csv";
    a.click();
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-slate-heading">
            {t("reports.title")}
          </h1>
          <p className="text-xs text-slate-muted mt-1">
            {t("reports.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-heading font-semibold text-xs px-4 py-2.5 rounded-xl border border-emerald-200 shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{t("reports.exportCsv")}</span>
          </button>
          <Link
            href="/create-campaign"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t("dashboard.createCta")}</span>
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-100/80 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-body focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-heading font-semibold text-slate-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Types</option>
            <option value="OFFER">🏷️ Offers</option>
            <option value="WEEKEND">🎉 Weekend</option>
            <option value="FESTIVAL">🪔 Festivals</option>
            <option value="ANNOUNCEMENT">📢 Announcement</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-heading font-semibold text-slate-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="SENDING">Sending</option>
            <option value="WAITING_APPROVAL">Waiting Approval</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PAUSED">Paused</option>
          </select>

          <button
            onClick={fetchCampaigns}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-muted hover:text-slate-heading hover:bg-slate-50 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100/80 shadow-card">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-muted font-heading font-semibold animate-pulse">
            Loading campaigns history...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-muted space-y-2">
            <p className="font-heading font-bold text-sm text-slate-heading">No campaigns found</p>
            <p>Try changing your search terms or filter selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-heading font-bold text-slate-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4">Campaign Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Recipients</th>
                  <th className="py-3.5 px-4">Sent / Delivered / Read</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-body text-xs text-slate-heading">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 font-semibold font-heading text-slate-heading">
                      {camp.name}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-dark text-[11px] font-medium">
                        {camp.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold">
                      {camp.totalRecipients}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-600">Sent: {camp.sentCount}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">Delivered: {camp.deliveredCount}</span>
                        <span>•</span>
                        <span className="text-sky-700 font-semibold">Read: {camp.readCount}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                        camp.status === "COMPLETED" 
                          ? "bg-emerald-100 text-emerald-800"
                          : camp.status === "SENDING"
                          ? "bg-amber-100 text-amber-800 animate-pulse"
                          : camp.status === "WAITING_APPROVAL"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : camp.status === "SCHEDULED"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {camp.status === "WAITING_APPROVAL" ? "Waiting Approval ⏳" : camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-muted text-[11px]">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/campaigns/${camp.id}`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-heading font-semibold hover:underline"
                      >
                        <span>View Analytics</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
