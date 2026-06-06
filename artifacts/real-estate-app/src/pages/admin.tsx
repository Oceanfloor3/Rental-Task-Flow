import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, Percent, Clock,
  Send, RefreshCw, Trash2, Edit2,
  CheckCircle2, XCircle, UserCheck, UserX,
  LogOut, ChevronDown, X, Banknote,
} from "lucide-react";
import {
  useGetAdminStats,
  useBroadcastNotification,
  useGetAdminUsers,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useGetAdminWithdrawalRequests,
  useProcessWithdrawalRequest,
  getGetAdminStatsQueryKey,
  getGetAdminUsersQueryKey,
  getGetAdminWithdrawalRequestsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  label, value, sub, icon: Icon, gradient, prefix = "",
}: {
  label: string; value: string | number; sub?: string;
  icon: any; gradient: string; prefix?: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg relative overflow-hidden ${gradient}`}>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute -bottom-6 -left-4 w-20 h-20 bg-white/10 rounded-full" />
      <div className="relative z-10">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold mt-1">
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function EditModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [position, setPosition] = useState(user.position || "");
  const [level, setLevel] = useState(user.level || "");
  const [balance, setBalance] = useState(user.balance?.toString() || "0");
  const updateUser = useUpdateAdminUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = async () => {
    try {
      await updateUser.mutateAsync({ id: user.id, data: { position, level, balance: parseFloat(balance) } });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      toast({ title: "User updated successfully" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to update user" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between text-white">
          <div>
            <h3 className="font-bold text-base">Edit User</h3>
            <p className="text-blue-200 text-xs mt-0.5">{user.firstName} {user.surname}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Position</label>
            <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Senior Manager (V2)" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</label>
            <input className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. Gold" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance (NGN)</label>
            <input type="number" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={updateUser.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {updateUser.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Admin() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<any>(null);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetAdminUsers({ query: { queryKey: getGetAdminUsersQueryKey() } });
  const { data: withdrawals, isLoading: wLoading, refetch: refetchW } = useGetAdminWithdrawalRequests({ query: { queryKey: getGetAdminWithdrawalRequestsQueryKey() } });

  const broadcastMutation = useBroadcastNotification();
  const updateUserMutation = useUpdateAdminUser();
  const deleteUserMutation = useDeleteAdminUser();
  const processWMutation = useProcessWithdrawalRequest();

  const handleBroadcast = async () => {
    if (!msgTitle.trim() || !msgBody.trim()) {
      toast({ variant: "destructive", title: "Please fill in both title and message" });
      return;
    }
    try {
      await broadcastMutation.mutateAsync({ data: { title: msgTitle, message: msgBody } });
      toast({ title: "✅ Message sent to all users!" });
      setMsgTitle(""); setMsgBody("");
    } catch {
      toast({ variant: "destructive", title: "Failed to send message" });
    }
  };

  const toggleActive = async (user: any) => {
    try {
      await updateUserMutation.mutateAsync({ id: user.id, data: { isActive: !user.isActive } });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: `User ${user.isActive ? "disabled" : "activated"} successfully` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update user" });
    }
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`Delete ${user.firstName} ${user.surname}? This cannot be undone.`)) return;
    try {
      await deleteUserMutation.mutateAsync({ id: user.id });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: "User deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete user" });
    }
  };

  const processW = async (id: number, status: "approved" | "denied") => {
    try {
      await processWMutation.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: `Withdrawal ${status} successfully` });
    } catch {
      toast({ variant: "destructive", title: `Failed to ${status} withdrawal` });
    }
  };

  const pending = (withdrawals as any[])?.filter((w: any) => w.status === "pending") ?? [];
  const processed = (withdrawals as any[])?.filter((w: any) => w.status !== "pending") ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Nav */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center font-extrabold text-sm">RE</div>
          <div>
            <p className="font-bold text-sm text-white">Admin Control Panel</p>
            <p className="text-slate-400 text-[11px]">Real Estate Investment Platform</p>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-400 transition-colors px-3 py-2 rounded-xl text-xs font-semibold">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── STATS CARDS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Overview</h2>
            <button onClick={() => refetchStats()} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {statsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-slate-800" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Users Joined"
                value={stats?.totalUsers ?? 0}
                sub="registered accounts"
                icon={Users}
                gradient="bg-gradient-to-br from-blue-600 to-blue-800"
              />
              <StatCard
                label="Total Invested"
                value={(stats?.totalInvested ?? 0).toLocaleString()}
                sub="security deposits"
                icon={TrendingUp}
                prefix="₦"
                gradient="bg-gradient-to-br from-emerald-600 to-emerald-800"
              />
              <StatCard
                label="Commission Earned"
                value={(stats?.totalCommission ?? 0).toLocaleString()}
                sub="5% on withdrawals"
                icon={Percent}
                prefix="₦"
                gradient="bg-gradient-to-br from-purple-600 to-purple-800"
              />
              <StatCard
                label="Pending Withdrawals"
                value={stats?.pendingWithdrawals ?? 0}
                sub="awaiting approval"
                icon={Clock}
                gradient="bg-gradient-to-br from-orange-600 to-orange-800"
              />
            </div>
          )}
        </section>

        {/* ── BROADCAST MESSAGE ── */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Send Message to All Users</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Message title…"
              value={msgTitle}
              onChange={e => setMsgTitle(e.target.value)}
            />
            <textarea
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="Write your message here…"
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
            />
            <button
              onClick={handleBroadcast}
              disabled={broadcastMutation.isPending}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              {broadcastMutation.isPending ? "Sending…" : "Send to All Users"}
            </button>
          </div>
        </section>

        {/* ── USER ACCOUNTS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">User Accounts</h2>
            <button onClick={() => refetchUsers()} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {usersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-slate-800" />)}
            </div>
          ) : !(users as any[])?.length ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">No users yet.</div>
          ) : (
            <div className="space-y-3">
              {(users as any[]).map((user: any) => (
                <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  {/* User row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {(user.firstName?.[0] || "?").toUpperCase()}{(user.surname?.[0] || "").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-white">{user.firstName} {user.surname}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.isActive ? "bg-green-900/60 text-green-400" : "bg-red-900/60 text-red-400"}`}>
                          {user.isActive ? "Active" : "Disabled"}
                        </span>
                        {user.role === "admin" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-400">Admin</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs mt-0.5">{user.email} · ₦{parseFloat(user.balance || 0).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)} className="p-1.5 text-slate-400 hover:text-white transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedUser === user.id ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Expanded actions */}
                  <AnimatePresence>
                    {expandedUser === user.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-slate-800"
                      >
                        <div className="px-4 py-3 bg-slate-800/50 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                            <span><span className="text-slate-500">Position:</span> {user.position || "—"}</span>
                            <span><span className="text-slate-500">Level:</span> {user.level || "—"}</span>
                            <span><span className="text-slate-500">Phone:</span> {user.phone || "—"}</span>
                            <span><span className="text-slate-500">Referral:</span> {user.referralCode || "—"}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              onClick={() => toggleActive(user)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${user.isActive ? "bg-red-900/40 text-red-400 hover:bg-red-900/60" : "bg-green-900/40 text-green-400 hover:bg-green-900/60"}`}
                            >
                              {user.isActive ? <><UserX className="w-3.5 h-3.5" /> Disable</> : <><UserCheck className="w-3.5 h-3.5" /> Activate</>}
                            </button>
                            <button
                              onClick={() => setEditUser(user)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── WITHDRAWAL REQUESTS ── */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Withdrawal Requests</h2>
              {pending.length > 0 && (
                <p className="text-orange-400 text-xs mt-0.5 font-medium">{pending.length} pending approval</p>
              )}
            </div>
            <button onClick={() => refetchW()} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {wLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl bg-slate-800" />)}
            </div>
          ) : !(withdrawals as any[])?.length ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">No withdrawal requests yet.</div>
          ) : (
            <div className="space-y-6">
              {/* Pending first */}
              {pending.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Pending</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {pending.map((w: any) => (
                      <div key={w.id} className="bg-slate-900 border border-orange-500/30 rounded-2xl p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-2xl text-white">₦{parseFloat(w.amount || 0).toLocaleString()}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{new Date(w.createdAt || w.requestedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-900/50 text-orange-400">Pending</span>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-3 space-y-1 text-xs text-slate-300">
                          <div className="flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-slate-500" /><span>{w.bankName}</span></div>
                          <div className="flex items-center gap-2"><span className="text-slate-500 w-3.5 h-3.5 text-center">#</span><span>{w.accountNumber}</span></div>
                          <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-500" /><span>{w.accountHolderName || w.userName}</span></div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => processW(w.id, "approved")}
                            disabled={processWMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => processW(w.id, "denied")}
                            disabled={processWMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-red-900/60 hover:text-red-400 disabled:opacity-60 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processed */}
              {processed.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Processed</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {processed.map((w: any) => (
                      <div key={w.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${w.status === "approved" ? "bg-green-900/50" : "bg-red-900/50"}`}>
                          {w.status === "approved" ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">₦{parseFloat(w.amount || 0).toLocaleString()}</p>
                          <p className="text-slate-400 text-xs truncate">{w.accountHolderName || w.userName} · {w.bankName}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${w.status === "approved" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}
