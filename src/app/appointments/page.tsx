"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle, 
  Bot, 
  MessageCircle, 
  Filter,
  Sparkles,
  Loader2,
  CalendarCheck,
  AlertCircle,
  Tag
} from "lucide-react";

interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  appointmentDate: string;
  slotTime: string;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED";
  bookedBy: "AI_CHATBOT" | "MANUAL";
  notes: string | null;
  createdAt: string;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, upcoming: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "TODAY" | "UPCOMING" | "COMPLETED">("ALL");

  // New Appointment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchAppointments = () => {
    fetch("/api/appointments")
      .then((res) => res.json())
      .then((data) => {
        if (data.appointments) {
          setAppointments(data.appointments);
          setStats(data.stats || { total: 0, today: 0, upcoming: 0, completed: 0 });
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !date || !time) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: custName,
          customerPhone: custPhone,
          serviceName: service,
          appointmentDate: date,
          slotTime: time,
          notes,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setCustName("");
        setCustPhone("");
        setService("");
        setDate("");
        setTime("");
        setNotes("");
        fetchAppointments();
      } else {
        alert("Failed to create appointment.");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: status as any } : a))
        );
        fetchAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const filteredAppointments = appointments.filter((a) => {
    const d = new Date(a.appointmentDate);

    if (filterTab === "TODAY") {
      if (d < startOfToday || d > endOfToday) return false;
    } else if (filterTab === "UPCOMING") {
      if (d <= endOfToday || a.status === "COMPLETED") return false;
    } else if (filterTab === "COMPLETED") {
      if (a.status !== "COMPLETED") return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.customerName.toLowerCase().includes(q);
      const matchPhone = a.customerPhone.includes(q);
      const matchService = (a.serviceName || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchService;
    }

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-[#00a884]" />
            <span>Customer Appointments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Appointments scheduled automatically by WhatsApp AI Chatbot or booked manually.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-md shadow-[#00a884]/20 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Appointment</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Total</span>
            <CalendarIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
            {stats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">All time bookings</div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Today</span>
            <Clock className="w-4 h-4 text-[#00a884]" />
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-emerald-800">
            {stats.today}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1">Scheduled for today</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Upcoming</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
            {stats.upcoming}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Future appointments</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-heading font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900">
            {stats.completed}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Attended successfully</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(["ALL", "TODAY", "UPCOMING", "COMPLETED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold transition whitespace-nowrap cursor-pointer ${
                filterTab === tab
                  ? "bg-[#00a884] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab === "ALL" && `All (${stats.total})`}
              {tab === "TODAY" && `Today (${stats.today})`}
              {tab === "UPCOMING" && `Upcoming (${stats.upcoming})`}
              {tab === "COMPLETED" && `Completed (${stats.completed})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, phone, service..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-[#00a884] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition"
          />
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 animate-pulse font-medium">
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="py-20 px-4 text-center text-slate-400 space-y-3">
            <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-heading font-bold text-slate-700">No appointments found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When customers chat with your WhatsApp AI assistant, booked appointments will automatically appear here!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 text-xs font-bold text-[#00a884] hover:underline cursor-pointer"
            >
              + Create an appointment manually
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAppointments.map((app) => {
              const appDate = new Date(app.appointmentDate);
              const formattedDate = appDate.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={app.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold text-white shadow-xs ${
                      app.status === "COMPLETED"
                        ? "bg-blue-500"
                        : app.status === "CANCELLED"
                        ? "bg-slate-400"
                        : "bg-[#00a884]"
                    }`}>
                      {app.customerName ? app.customerName[0].toUpperCase() : <User className="w-6 h-6" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-heading font-extrabold text-sm text-slate-900">
                          {app.customerName}
                        </span>

                        {app.bookedBy === "AI_CHATBOT" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Bot className="w-3 h-3 text-[#00a884]" />
                            <span>Booked by WhatsApp AI</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            Manual
                          </span>
                        )}

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === "CONFIRMED"
                            ? "bg-green-100 text-green-800"
                            : app.status === "COMPLETED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {app.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1 text-slate-800 font-semibold">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span>{app.serviceName || "Consultation"}</span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-500 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>+{app.customerPhone}</span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                          <span>{formattedDate} at {app.slotTime}</span>
                        </span>
                      </div>

                      {app.notes && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          &quot;{app.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Link
                      href="/inbox"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-[#00a884] text-slate-700 hover:text-[#00a884] text-xs font-bold transition shadow-2xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Chat</span>
                    </Link>

                    {app.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleUpdateStatus(app.id, "COMPLETED")}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition cursor-pointer"
                        title="Mark Completed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    )}

                    {app.status !== "CANCELLED" && (
                      <button
                        onClick={() => handleUpdateStatus(app.id, "CANCELLED")}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 text-xs font-bold transition cursor-pointer"
                        title="Cancel Appointment"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#00a884] flex items-center justify-center">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-extrabold text-slate-900">
                  Book New Appointment
                </h3>
                <p className="text-xs text-slate-500">
                  Add an in-store or online booking for client
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Ramesh Varma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00a884] rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Customer Phone *
                </label>
                <input
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00a884] rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Service / Reason
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="e.g. Bridal Saree Consultation / Trial"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#00a884] rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-[#00a884] rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Time Slot *
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="11:30 AM"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-[#00a884] rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special requests or preferences..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:border-[#00a884] rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-heading font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#008069] text-white font-heading font-bold text-xs shadow-md shadow-[#00a884]/20 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />}
                  <span>Book Appointment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
