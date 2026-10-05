"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  RotateCw, 
  Search, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  UserCheck, 
  PlusCircle, 
  Loader2,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal to activate/extend user
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendPlan, setExtendPlan] = useState("Growth");

  // Modal to create new client directly
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    businessName: "",
    mobile: "",
    username: "",
    password: "",
    plan: "Growth",
    days: 30,
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok && data?.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleExtendUser = async () => {
    if (!targetUser) return;
    setActionLoading(targetUser.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser.id,
          action: "EXTEND",
          days: extendDays,
          plan: extendPlan,
        }),
      });

      if (res.ok) {
        setTargetUser(null);
        await fetchUsers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE",
          ...newClient,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create client");
        return;
      }
      setShowCreateModal(false);
      setNewClient({
        name: "",
        businessName: "",
        mobile: "",
        username: "",
        password: "",
        plan: "Growth",
        days: 30,
      });
      await fetchUsers();
      alert(`Client @${data.user?.username || newClient.username} created & activated successfully!`);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create client");
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.businessName?.toLowerCase().includes(q) ||
      u.mobile?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text-main flex items-center gap-2">
            <Users className="w-7 h-7 text-brand-purple" />
            <span>Manage Platform Users</span>
          </h1>
          <p className="text-slate-muted text-sm mt-1">
            View all registered shop owners, add new clients directly, and manage subscriptions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-gradient text-white hover:opacity-95 text-xs font-heading font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Client</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchUsers();
            }}
            disabled={refreshing}
            className="px-4 py-2.5 rounded-xl border border-brand-soft bg-white text-text-main hover:bg-brand-50 text-xs font-heading font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, business, username or phone..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-soft rounded-2xl text-xs text-text-main placeholder:text-slate-muted focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-brand-soft shadow-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-muted text-xs">
            No users match the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-brand-light/70 border-b border-brand-soft text-slate-muted uppercase font-heading font-semibold">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Business</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-soft">
                {filtered.map((u) => {
                  const isActive = u.status === "ACTIVE" || u.role === "ADMIN";
                  return (
                    <tr key={u.id} className="hover:bg-brand-light/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-heading font-bold text-text-main text-sm">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-muted">
                          @{u.username} • {u.mobile || "No mobile"}
                        </div>
                      </td>

                      <td className="py-4 px-4 font-medium text-text-main">
                        {u.businessName}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase ${
                            u.role === "ADMIN"
                              ? "bg-brand-purple text-white"
                              : "bg-brand-soft text-brand-purple"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-heading font-semibold text-text-main">
                        {u.plan}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : u.status === "PENDING_VERIFICATION"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{u.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-muted">
                        {u.role === "ADMIN"
                          ? "Lifetime (Admin)"
                          : u.expiryDate
                          ? new Date(u.expiryDate).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {u.role !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetUser(u);
                              setExtendDays(30);
                              setExtendPlan(u.plan !== "None" ? u.plan : "Growth");
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-brand-soft text-brand-purple hover:bg-brand-50 text-xs font-heading font-semibold transition-colors cursor-pointer"
                          >
                            Activate / Extend
                          </button>
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

      {/* Extend/Activate Modal */}
      {targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-brand-soft shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="font-heading font-bold text-text-main text-base mb-1">
              Manual Subscription Extension
            </h3>
            <p className="text-xs text-slate-muted mb-4">
              Grant or extend membership for <strong className="text-text-main">{targetUser.name}</strong> (@{targetUser.username}).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-semibold text-text-main mb-1.5">
                  Plan Level
                </label>
                <select
                  value={extendPlan}
                  onChange={(e) => setExtendPlan(e.target.value)}
                  className="w-full p-2.5 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                >
                  <option value="Starter">Starter (2,000 msgs)</option>
                  <option value="Growth">Growth (10,000 msgs)</option>
                  <option value="Pro">Pro (30,000 msgs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-text-main mb-1.5">
                  Duration (Days to Add)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 rounded-xl text-xs font-heading font-semibold border transition-colors ${
                        extendDays === d
                          ? "bg-brand-purple text-white border-brand-purple"
                          : "border-brand-soft text-text-main hover:bg-brand-light"
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-brand-soft">
              <button
                type="button"
                onClick={() => setTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-heading font-semibold text-slate-muted hover:bg-brand-light cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtendUser}
                disabled={actionLoading === targetUser.id}
                className="px-5 py-2 rounded-xl bg-brand-gradient hover:opacity-95 text-white text-xs font-heading font-bold shadow-xs cursor-pointer disabled:opacity-60"
              >
                {actionLoading === targetUser.id ? "Activating..." : "Confirm Activation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Client Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-main/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-brand-soft shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-text-main text-lg mb-1 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-brand-purple" />
              <span>Add New Client & Grant Access</span>
            </h3>
            <p className="text-xs text-slate-muted mb-4">
              Directly register a client, create their business profile, and activate their subscription immediately.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                    Client Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Verma"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Balaji Silks"
                    value={newClient.businessName}
                    onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                  Mobile Number (WhatsApp)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newClient.mobile}
                  onChange={(e) => setNewClient({ ...newClient, mobile: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ramesh_silks"
                    value={newClient.username}
                    onChange={(e) => setNewClient({ ...newClient, username: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client@123"
                    value={newClient.password}
                    onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={newClient.plan}
                    onChange={(e) => setNewClient({ ...newClient, plan: e.target.value })}
                    className="w-full p-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  >
                    <option value="Starter">Starter (2,000 msgs)</option>
                    <option value="Growth">Growth (10,000 msgs)</option>
                    <option value="Pro">Pro (30,000 msgs)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-heading font-semibold text-text-main mb-1">
                    Validity (Days)
                  </label>
                  <select
                    value={newClient.days}
                    onChange={(e) => setNewClient({ ...newClient, days: parseInt(e.target.value, 10) })}
                    className="w-full p-2 bg-brand-light/70 border border-brand-soft rounded-xl text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-purple/40"
                  >
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days (3 Months)</option>
                    <option value={365}>365 Days (1 Year)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-brand-soft">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-heading font-semibold text-slate-muted hover:bg-brand-light cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 rounded-xl bg-brand-gradient hover:opacity-95 text-white text-xs font-heading font-bold shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                >
                  {createLoading ? "Creating Client..." : "Create & Activate Client"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
