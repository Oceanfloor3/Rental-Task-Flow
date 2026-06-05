import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, DollarSign, Clock, Bell, RefreshCw,
  Trash2, Edit2, CheckCircle, XCircle, LogOut, ChevronLeft
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type AdminView = "overview" | "users" | "withdrawals";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [position, setPosition] = useState(user.position || "");
  const [level, setLevel] = useState(user.level || "");
  const [balance, setBalance] = useState(user.balance?.toString() || "0");
  const updateUser = useUpdateAdminUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await updateUser.mutateAsync({ id: user.id, data: { position, level, balance: parseFloat(balance) } });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      toast({ title: "User updated" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to update user" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
        <h3 className="font-bold text-lg">Edit User</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Position</label>
            <Input value={position} onChange={e => setPosition(e.target.value)} placeholder="Position" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Level</label>
            <Input value={level} onChange={e => setLevel(e.target.value)} placeholder="Level" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Balance (NGN)</label>
            <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<AdminView>("overview");
  const [editUser, setEditUser] = useState<any>(null);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() }
  });
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetAdminUsers({
    query: { queryKey: getGetAdminUsersQueryKey() }
  });
  const { data: withdrawals, isLoading: withdrawalsLoading, refetch: refetchWithdrawals } = useGetAdminWithdrawalRequests({
    query: { queryKey: getGetAdminWithdrawalRequestsQueryKey() }
  });

  const broadcastMutation = useBroadcastNotification();
  const updateUserMutation = useUpdateAdminUser();
  const deleteUserMutation = useDeleteAdminUser();
  const processWithdrawalMutation = useProcessWithdrawalRequest();

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      toast({ variant: "destructive", title: "Please fill in title and message" });
      return;
    }
    try {
      await broadcastMutation.mutateAsync({ data: { title: broadcastTitle, message: broadcastMessage } });
      toast({ title: "Notification sent to all users!" });
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch {
      toast({ variant: "destructive", title: "Failed to send notification" });
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await updateUserMutation.mutateAsync({ id: user.id, data: { isActive: !user.isActive } });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      toast({ title: `User ${user.isActive ? "disabled" : "activated"}` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update user" });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await deleteUserMutation.mutateAsync({ id: userId });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      toast({ title: "User deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete user" });
    }
  };

  const handleProcessWithdrawal = async (id: number, status: "approved" | "denied") => {
    try {
      await processWithdrawalMutation.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalRequestsQueryKey() });
      toast({ title: `Withdrawal ${status}` });
    } catch {
      toast({ variant: "destructive", title: `Failed to ${status} withdrawal` });
    }
  };

  const navItems: { id: AdminView; label: string; icon: any }[] = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "users", label: "Users", icon: Users },
    { id: "withdrawals", label: "Withdrawals", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-white flex flex-col min-h-screen sticky top-0">
        <div className="p-6 border-b border-slate-700">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg mb-3">
            RE
          </div>
          <p className="font-bold text-sm">Admin Panel</p>
          <p className="text-xs text-slate-400 mt-0.5">Real Estate Investment</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                view === id ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Overview */}
        {view === "overview" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>

            {statsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon={Users} color="bg-blue-500" />
                <StatCard label="Total Invested (NGN)" value={(stats?.totalInvested ?? 0).toLocaleString()} icon={TrendingUp} color="bg-emerald-500" />
                <StatCard label="Total Commission (NGN)" value={(stats?.totalCommission ?? 0).toLocaleString()} icon={DollarSign} color="bg-purple-500" />
                <StatCard label="Pending Withdrawals" value={stats?.pendingWithdrawals ?? 0} icon={Clock} color="bg-orange-500" />
              </div>
            )}

            {/* Broadcast */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-slate-800">Broadcast Notification</h2>
              </div>
              <Input
                placeholder="Notification title"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
              />
              <Textarea
                placeholder="Write your message to all users..."
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                rows={3}
              />
              <Button
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                onClick={handleBroadcast}
                disabled={broadcastMutation.isPending}
              >
                {broadcastMutation.isPending ? "Sending..." : "Send to All Users"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Users */}
        {view === "users" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
              <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {["Name", "Email", "Phone", "Position", "Balance", "Status", "Actions"].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(users as any[])?.map((user: any) => (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {user.firstName} {user.surname}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{user.email}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{user.phone}</td>
                          <td className="px-4 py-3 text-gray-500">{user.position || "—"}</td>
                          <td className="px-4 py-3 font-medium">₦{parseFloat(user.balance || "0").toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {user.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(user)}
                                title={user.isActive ? "Disable" : "Activate"}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  user.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                                }`}
                              >
                                {user.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => setEditUser(user)}
                                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Withdrawals */}
        {view === "withdrawals" && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-800">Withdrawal Requests</h1>
              <Button variant="outline" size="sm" onClick={() => refetchWithdrawals()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </div>

            {withdrawalsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : (withdrawals as any[])?.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">
                No withdrawal requests yet.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(withdrawals as any[])?.map((w: any) => (
                  <div key={w.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-lg">₦{parseFloat(w.amount || "0").toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(w.requestedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        w.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        w.status === "approved" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {w.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Bank:</span> {w.bankName}</p>
                      <p><span className="font-medium">Account:</span> {w.accountNumber}</p>
                      <p><span className="font-medium">Holder:</span> {w.accountHolderName}</p>
                    </div>
                    {w.status === "pending" && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleProcessWithdrawal(w.id, "approved")}
                          disabled={processWithdrawalMutation.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => handleProcessWithdrawal(w.id, "denied")}
                          disabled={processWithdrawalMutation.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Deny
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}
