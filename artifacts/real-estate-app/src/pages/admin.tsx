import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, TrendingUp, Percent, Clock,
  Send, RefreshCw, Trash2, Edit2,
  CheckCircle2, XCircle, UserCheck, UserX,
  LogOut, ChevronDown, X, Banknote, Receipt, ZoomIn,
  Lock, Unlock, Key, PlusCircle, MinusCircle,
  Sun, Moon, MessageSquare, Megaphone, Search, ChevronLeft, ChevronRight as ChevronRightIcon,
  Bell, FileImage, Wallet,
} from "lucide-react";
import {
  useGetAdminStats,
  useBroadcastNotification,
  useGetAdminUsers,
  useUpdateAdminUser,
  useDeleteAdminUser,
  useGetAdminWithdrawalRequests,
  useProcessWithdrawalRequest,
  useGetAdminHelpCenter,
  useUpdateAdminHelpCenter,
  useGetAdminPaymentProofs,
  useUpdatePaymentProofStatus,
  useDeletePaymentProof,
  useActivateUserLevel,
  useGetWithdrawalSettings,
  useUpdateWithdrawalSettings,
  useToggleUserWithdrawalLock,
  useAdminBalanceAdjust,
  useDeleteWithdrawalRequest,
  useGetAdminFlashMessage,
  useGetAdminLockFundsVisible,
  useSetAdminLockFundsVisible,
  setFlashMessage,
  clearFlashMessage,
  getGetAdminStatsQueryKey,
  getGetAdminUsersQueryKey,
  getGetAdminWithdrawalRequestsQueryKey,
  getGetAdminHelpCenterQueryKey,
  getGetAdminPaymentProofsQueryKey,
  getGetWithdrawalSettingsQueryKey,
  getGetAdminFlashMessageQueryKey,
  getGetAdminLockFundsVisibleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
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

function Field({ label, value, onChange, type = "text", placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function EditModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [surname, setSurname] = useState(user.surname || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || user.whatsappNumber || "");
  const [position, setPosition] = useState(user.position || "");
  const [level, setLevel] = useState(user.level || "");
  const [balance, setBalance] = useState(user.balance?.toString() || "0");
  const [securityDeposit, setSecurityDeposit] = useState(user.securityDeposit?.toString() || "0");
  const [bankName, setBankName] = useState(user.bankName || "");
  const [accountNumber, setAccountNumber] = useState(user.accountNumber || "");
  const [accountHolderName, setAccountHolderName] = useState(user.accountHolderName || "");

  const updateUser = useUpdateAdminUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const save = async () => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        data: {
          firstName, surname, email, whatsappNumber: phone,
          position, level,
          balance: parseFloat(balance) || 0,
          securityDeposit: parseFloat(securityDeposit) || 0,
          bankName, accountNumber, accountHolderName,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      toast({ title: "User updated successfully" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to update user" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between text-white">
          <div>
            <h3 className="font-bold text-base">Edit User</h3>
            <p className="text-blue-200 text-xs mt-0.5">{user.firstName} {user.surname} · ID #{user.id}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Personal Info</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={firstName} onChange={setFirstName} placeholder="First name" />
            <Field label="Surname" value={surname} onChange={setSurname} placeholder="Surname" />
          </div>
          <Field label="Email Address" value={email} onChange={setEmail} type="email" placeholder="email@example.com" />
          <Field label="WhatsApp Number" value={phone} onChange={setPhone} placeholder="+234..." />

          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pt-1">Account Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Position</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={position} onChange={e => setPosition(e.target.value)}>
                <option value="">— Select —</option>
                <option value="V0 PREMIER">V0 PREMIER</option>
                <option value="V1 FOUNDATION">V1 FOUNDATION</option>
                <option value="V2 CORNERSTONE">V2 CORNERSTONE</option>
                <option value="V3 HORIZON">V3 HORIZON</option>
                <option value="V4 LANDMARK">V4 LANDMARK</option>
                <option value="V5 PINNACLE">V5 PINNACLE</option>
                <option value="V6 PRESTIGE">V6 PRESTIGE</option>
                <option value="V7 ELITE">V7 ELITE</option>
                <option value="V8 LEGACY">V8 LEGACY</option>
                <option value="V9 EMPIRE">V9 EMPIRE</option>
                <option value="V10 SOVEREIGN">V10 SOVEREIGN</option>
                <option value="V11 CROWN COLLECTIVE">V11 CROWN COLLECTIVE</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Level</label>
              <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={level} onChange={e => setLevel(e.target.value)}>
                <option value="">— Select —</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Diamond">Diamond</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Balance (NGN)" value={balance} onChange={setBalance} type="number" placeholder="0.00" />
            <Field label="Activation Deposit (NGN)" value={securityDeposit} onChange={setSecurityDeposit} type="number" placeholder="0.00" />
          </div>

          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest pt-1">Bank Details</p>
          <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. Access Bank" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account Number" value={accountNumber} onChange={setAccountNumber} placeholder="0123456789" />
            <Field label="Account Holder Name" value={accountHolderName} onChange={setAccountHolderName} placeholder="Full name on account" />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={updateUser.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
            {updateUser.isPending ? "Saving…" : "Save Changes"}
          </button>
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
  const [levelsUser, setLevelsUser] = useState<any>(null);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem("adminTheme") !== "light");
  const [flashDraft, setFlashDraft] = useState("");
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [ppSearch, setPpSearch] = useState("");
  const [ppPage, setPpPage] = useState(1);
  const [wSearch, setWSearch] = useState("");
  const [wPage, setWPage] = useState(1);
  const [deletingW, setDeletingW] = useState<number | null>(null);

  const PAGE_SIZE = 10;

  const [lockDays, setLockDays] = useState("0");
  const [togglingLockFor, setTogglingLockFor] = useState<number | null>(null);
  const [updatingManualLock, setUpdatingManualLock] = useState(false);
  const [updatingAutoSchedule, setUpdatingAutoSchedule] = useState(false);
  const [spinning, setSpinning] = useState<string | null>(null);
  const [balanceAdjust, setBalanceAdjust] = useState<Record<number, { amount: string; note: string }>>({});

  type AdminNotif = { id: number; type: "payment_proof" | "withdrawal"; title: string; message: string };
  const [notifs, setNotifs] = useState<AdminNotif[]>([]);
  const notifIdRef = useRef(0);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      es = new EventSource("/api/admin/events");
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as Record<string, unknown>;
          const id = ++notifIdRef.current;
          if (data.type === "payment_proof") {
            const title = "New Payment Proof";
            const message = `${data.userName} submitted proof for ${data.positionLabel}`;
            setNotifs(prev => [...prev, { id, type: "payment_proof", title, message }]);
            setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 12000);
          } else if (data.type === "withdrawal") {
            const title = "New Withdrawal Request";
            const amount = Number(data.amount).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
            const message = `${data.userName} requested ${amount}`;
            setNotifs(prev => [...prev, { id, type: "withdrawal", title, message }]);
            setTimeout(() => setNotifs(prev => prev.filter(n => n.id !== id)), 12000);
          }
        } catch { /* ignore parse errors */ }
      };
      es.onerror = () => {
        es?.close();
        retryTimer = setTimeout(connect, 5000);
      };
    }

    connect();
    return () => { es?.close(); if (retryTimer) clearTimeout(retryTimer); };
  }, []);

  const handleRefresh = (key: string, fn: () => void) => {
    setSpinning(key);
    fn();
    setTimeout(() => setSpinning(null), 900);
  };

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetAdminStats({ query: { queryKey: getGetAdminStatsQueryKey() } });
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useGetAdminUsers({ query: { queryKey: getGetAdminUsersQueryKey() } });
  const { data: withdrawals, isLoading: wLoading, refetch: refetchW } = useGetAdminWithdrawalRequests({ query: { queryKey: getGetAdminWithdrawalRequestsQueryKey() } });
  const { data: helpContacts, isLoading: hcLoading, refetch: refetchHC } = useGetAdminHelpCenter({ query: { queryKey: getGetAdminHelpCenterQueryKey() } });
  const { data: wSettings, refetch: refetchWSettings } = useGetWithdrawalSettings({ query: { queryKey: getGetWithdrawalSettingsQueryKey() } });

  const broadcastMutation = useBroadcastNotification();
  const updateUserMutation = useUpdateAdminUser();
  const deleteUserMutation = useDeleteAdminUser();
  const processWMutation = useProcessWithdrawalRequest();
  const updateHCMutation = useUpdateAdminHelpCenter();
  const activateLevelMutation = useActivateUserLevel();
  const updateWSettingsMutation = useUpdateWithdrawalSettings();
  const toggleUserLockMutation = useToggleUserWithdrawalLock();
  const balanceAdjustMutation = useAdminBalanceAdjust();
  const deleteWMutation = useDeleteWithdrawalRequest();
  const { data: lockFundsData, refetch: refetchLockFunds } = useGetAdminLockFundsVisible({ query: { queryKey: getGetAdminLockFundsVisibleQueryKey() } });
  const setLockFundsMutation = useSetAdminLockFundsVisible();

  const deleteWithdrawal = async (id: number) => {
    if (!confirm("Delete this withdrawal request? This cannot be undone.")) return;
    setDeletingW(id);
    try {
      await deleteWMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetAdminWithdrawalRequestsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      toast({ title: "Withdrawal request deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete withdrawal request" });
    } finally {
      setDeletingW(null);
    }
  };

  const { data: flashData, refetch: refetchFlash } = useGetAdminFlashMessage({ query: { queryKey: getGetAdminFlashMessageQueryKey() } });
  const setFlashMutation = useMutation({
    mutationFn: (message: string) => setFlashMessage({ message }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminFlashMessageQueryKey() }); toast({ title: "✅ Flash message set — users will see it on next login." }); setFlashDraft(""); },
    onError: () => toast({ variant: "destructive", title: "Failed to set flash message" }),
  });
  const clearFlashMutation = useMutation({
    mutationFn: () => clearFlashMessage(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetAdminFlashMessageQueryKey() }); toast({ title: "Flash message cleared" }); },
    onError: () => toast({ variant: "destructive", title: "Failed to clear flash message" }),
  });

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("adminTheme", next ? "dark" : "light");
  };

  const { data: paymentProofs, isLoading: ppLoading, refetch: refetchPP } = useGetAdminPaymentProofs({ query: { queryKey: getGetAdminPaymentProofsQueryKey() } });
  const updateProofStatus = useUpdatePaymentProofStatus();
  const deleteProofMutation = useDeletePaymentProof();
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [updatingProof, setUpdatingProof] = useState<number | null>(null);
  const [deletingProof, setDeletingProof] = useState<number | null>(null);

  const handleProofStatus = async (id: number, status: "approved" | "rejected") => {
    setUpdatingProof(id);
    try {
      await updateProofStatus.mutateAsync({ id, data: { status } });
      queryClient.invalidateQueries({ queryKey: getGetAdminPaymentProofsQueryKey() });
      toast({ title: status === "approved" ? "Proof Approved ✅" : "Proof Rejected ❌" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setUpdatingProof(null);
    }
  };

  const handleDeleteProof = async (id: number) => {
    setDeletingProof(id);
    try {
      await deleteProofMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetAdminPaymentProofsQueryKey() });
      toast({ title: "Proof deleted" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete proof" });
    } finally {
      setDeletingProof(null);
    }
  };

  const [hcEdits, setHcEdits] = useState<Record<number, { platform: string; handle: string; url: string; isActive: boolean }>>({});
  const [savingHC, setSavingHC] = useState<number | null>(null);

  const getHcEdit = (c: any) => hcEdits[c.id] ?? { platform: c.platform, handle: c.handle, url: c.url, isActive: c.isActive };
  const setHcField = (id: number, field: string, value: string | boolean) =>
    setHcEdits(prev => ({ ...prev, [id]: { ...getHcEdit({ id, ...((helpContacts as any[])?.find((x: any) => x.id === id) ?? {}) }), [field]: value } }));

  const saveHC = async (id: number) => {
    const edit = hcEdits[id];
    if (!edit) return;
    setSavingHC(id);
    try {
      await updateHCMutation.mutateAsync({ id, data: edit });
      queryClient.invalidateQueries({ queryKey: getGetAdminHelpCenterQueryKey() });
      setHcEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
      toast({ title: "Help Center updated — changes are live for all users." });
    } catch {
      toast({ variant: "destructive", title: "Failed to save changes" });
    } finally {
      setSavingHC(null);
    }
  };

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

  const toggleMasterLock = async (locked: boolean) => {
    try {
      const days = parseInt(lockDays, 10) || 0;
      await updateWSettingsMutation.mutateAsync({ data: { masterLocked: locked, lockDays: locked ? days : 0 } });
      queryClient.invalidateQueries({ queryKey: getGetWithdrawalSettingsQueryKey() });
      toast({ title: locked ? `🔒 Withdrawals locked for all users${days > 0 ? ` (${days} days)` : ""}` : "🔓 Withdrawals unlocked for all users" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update withdrawal lock" });
    }
  };

  const toggleManualLock = async (enabled: boolean) => {
    setUpdatingManualLock(true);
    try {
      await updateWSettingsMutation.mutateAsync({ data: { masterLocked: wSettings?.masterLocked ?? false, manualLocked: enabled } });
      queryClient.invalidateQueries({ queryKey: getGetWithdrawalSettingsQueryKey() });
      toast({ title: enabled ? "🔒 Manual lock enabled — all withdrawals blocked" : "🔓 Manual lock disabled" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update manual lock" });
    } finally {
      setUpdatingManualLock(false);
    }
  };

  const toggleAutoSchedule = async (enabled: boolean) => {
    setUpdatingAutoSchedule(true);
    try {
      await updateWSettingsMutation.mutateAsync({ data: { masterLocked: wSettings?.masterLocked ?? false, autoScheduleEnabled: enabled } });
      queryClient.invalidateQueries({ queryKey: getGetWithdrawalSettingsQueryKey() });
      toast({ title: enabled ? "🗓️ Auto-schedule enabled — withdrawals open on set windows only" : "🗓️ Auto-schedule disabled" });
    } catch {
      toast({ variant: "destructive", title: "Failed to update auto-schedule" });
    } finally {
      setUpdatingAutoSchedule(false);
    }
  };

  const toggleUserLock = async (user: any) => {
    const newLocked = !user.withdrawalLocked;
    setTogglingLockFor(user.id);
    try {
      await toggleUserLockMutation.mutateAsync({ id: user.id, data: { locked: newLocked } });
      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      toast({ title: newLocked ? `🔒 Withdrawal restricted for ${user.firstName}` : `🔓 Withdrawal unrestricted for ${user.firstName}` });
    } catch {
      toast({ variant: "destructive", title: "Failed to update user withdrawal lock" });
    } finally {
      setTogglingLockFor(null);
    }
  };

  const masterLocked = wSettings?.masterLocked ?? false;
  const unlockAt = wSettings?.unlockAt ? new Date(wSettings.unlockAt) : null;
  const masterLockExpired = unlockAt ? new Date() >= unlockAt : false;
  const isEffectivelyLocked = masterLocked && !masterLockExpired;

  const pending = (withdrawals as any[])?.filter((w: any) => w.status === "pending") ?? [];
  const processed = (withdrawals as any[])?.filter((w: any) => w.status !== "pending") ?? [];

  const th = darkMode
    ? { bg: "bg-slate-950", header: "bg-slate-900 border-slate-800", card: "bg-slate-800/60 border-slate-700", input: "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:ring-amber-500", text: "text-white", muted: "text-slate-400", label: "text-slate-500" }
    : { bg: "bg-gray-50", header: "bg-white border-gray-200", card: "bg-white border-gray-200 shadow-sm", input: "bg-white border-gray-300 text-slate-900 placeholder-gray-400 focus:ring-amber-500", text: "text-slate-900", muted: "text-slate-500", label: "text-slate-400" };

  return (
    <div className={`min-h-screen ${th.bg} ${th.text}`}>
      {/* Real-time admin notification popups */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifs.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="pointer-events-auto flex items-start gap-3 bg-white border border-amber-200 shadow-2xl rounded-2xl px-4 py-3 min-w-[280px] max-w-[340px]"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.type === "payment_proof" ? "bg-blue-100" : "bg-emerald-100"}`}>
                {n.type === "payment_proof"
                  ? <FileImage className="w-5 h-5 text-blue-600" />
                  : <Wallet className="w-5 h-5 text-emerald-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Bell className="w-3 h-3 text-amber-500" />
                  <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">{n.title}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>
              <button
                onClick={() => setNotifs(prev => prev.filter(x => x.id !== n.id))}
                className="shrink-0 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Nav */}
      <header className={`border-b px-6 py-4 flex items-center justify-between sticky top-0 z-40 ${th.header}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center font-extrabold text-sm text-white">RE</div>
          <div>
            <p className={`font-bold text-sm ${th.text}`}>Admin Control Panel</p>
            <p className={`text-[11px] ${th.muted}`}>Real Estate Investment Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${darkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-gray-100 text-amber-600 hover:bg-gray-200"}`}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            {darkMode ? "Light" : "Dark"}
          </button>
          <button onClick={logout} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${darkMode ? "bg-slate-800 hover:bg-red-900/40 hover:text-red-400 text-slate-400" : "bg-gray-100 hover:bg-red-50 hover:text-red-500 text-slate-500"}`}>
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* ── STATS CARDS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Overview</h2>
            <button onClick={() => handleRefresh("stats", refetchStats)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all active:scale-90">
              <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${spinning === "stats" ? "animate-spin" : ""}`} />
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
                sub="15% on withdrawals"
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
          <h2 className={`text-lg font-bold mb-4 ${th.text}`}>Send Notification to All Users</h2>
          <div className={`border rounded-2xl p-5 space-y-3 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200 shadow-sm"}`}>
            <input
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${th.input}`}
              placeholder="Message title…"
              value={msgTitle}
              onChange={e => setMsgTitle(e.target.value)}
            />
            <textarea
              rows={3}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none ${th.input}`}
              placeholder="Write your message here…"
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
            />
            <button
              onClick={handleBroadcast}
              disabled={broadcastMutation.isPending}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              {broadcastMutation.isPending ? "Sending…" : "Send to All Users"}
            </button>
          </div>
        </section>

        {/* ── FLASH MESSAGE ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              <h2 className={`text-lg font-bold ${th.text}`}>Login Flash Message</h2>
            </div>
            <button onClick={() => refetchFlash()} className={`p-1.5 rounded-lg transition-all active:scale-90 ${darkMode ? "bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white" : "bg-gray-100 hover:bg-amber-500 hover:text-white text-slate-500"}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {flashData?.message && (
            <div className="mb-3 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
              <MessageSquare className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-1">Active Flash Message</p>
                <p className={`text-sm ${th.text} break-words`}>{flashData.message}</p>
              </div>
              <button
                onClick={() => clearFlashMutation.mutate()}
                disabled={clearFlashMutation.isPending}
                className="shrink-0 flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          )}

          {!flashData?.message && (
            <div className={`mb-3 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs ${darkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              <MessageSquare className="w-4 h-4" />
              No active flash message — users see nothing.
            </div>
          )}

          <div className={`border rounded-2xl p-5 space-y-3 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200 shadow-sm"}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider ${th.label}`}>Set new flash message</p>
            <textarea
              rows={3}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none ${th.input}`}
              placeholder="Type a message that all users will see as a popup the next time they log in…"
              value={flashDraft}
              onChange={e => setFlashDraft(e.target.value)}
            />
            <button
              onClick={() => { if (flashDraft.trim()) setFlashMutation.mutate(flashDraft.trim()); }}
              disabled={setFlashMutation.isPending || !flashDraft.trim()}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <Megaphone className="w-4 h-4" />
              {setFlashMutation.isPending ? "Saving…" : "Set Flash Message"}
            </button>
          </div>
        </section>

        {/* ── LOCK FUNDS CARD VISIBILITY ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <h2 className={`text-lg font-bold ${th.text}`}>Lock Funds Card</h2>
            </div>
            <button onClick={() => refetchLockFunds()} className={`p-1.5 rounded-lg transition-all active:scale-90 ${darkMode ? "bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white" : "bg-gray-100 hover:bg-amber-500 hover:text-white text-slate-500"}`}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className={`border rounded-2xl p-5 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200 shadow-sm"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className={`font-semibold text-sm ${th.text}`}>Show "Lock Funds" on user dashboards</p>
                <p className={`text-xs mt-1 ${th.muted}`}>
                  When enabled, a <strong className={th.text}>Lock Funds</strong> card appears under Quick Actions for every user.
                  Turn it off to hide it from all dashboards instantly.
                </p>
              </div>
              <button
                onClick={async () => {
                  const next = !(lockFundsData as any)?.enabled;
                  await setLockFundsMutation.mutateAsync({ data: { enabled: next } });
                  queryClient.invalidateQueries({ queryKey: getGetAdminLockFundsVisibleQueryKey() });
                  toast({ title: next ? "✅ Lock Funds card is now VISIBLE to users" : "Lock Funds card hidden from users" });
                }}
                disabled={setLockFundsMutation.isPending}
                className={`shrink-0 relative w-14 h-7 rounded-full transition-colors duration-200 disabled:opacity-50 focus:outline-none ${(lockFundsData as any)?.enabled ? "bg-amber-500" : darkMode ? "bg-slate-700" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${(lockFundsData as any)?.enabled ? "translate-x-7" : "translate-x-0"}`} />
              </button>
            </div>
            <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${(lockFundsData as any)?.enabled ? "bg-amber-500/10 text-amber-600" : darkMode ? "bg-slate-800 text-slate-500" : "bg-gray-100 text-gray-400"}`}>
              <div className={`w-2 h-2 rounded-full ${(lockFundsData as any)?.enabled ? "bg-amber-500" : "bg-gray-400"}`} />
              {(lockFundsData as any)?.enabled ? "Lock Funds card is currently VISIBLE on all user dashboards" : "Lock Funds card is currently hidden from all user dashboards"}
            </div>
          </div>
        </section>

        {/* ── WITHDRAWAL LOCK CONTROLS ── */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Withdrawal Lock Controls</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">

            {/* Master Lock */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Master Lock</p>
                  <p className="text-slate-400 text-xs mt-0.5">Lock or unlock withdrawals for ALL users at once</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isEffectivelyLocked ? "bg-red-900/60 text-red-400" : "bg-green-900/60 text-green-400"}`}>
                    {isEffectivelyLocked ? "LOCKED" : "UNLOCKED"}
                  </span>
                </div>
              </div>

              {unlockAt && !masterLockExpired && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-red-300">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  Locked until {unlockAt.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })} · {wSettings?.lockDays} day period
                </div>
              )}

              <div className="flex gap-2 items-end flex-wrap">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Lock Period (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={lockDays}
                    onChange={e => setLockDays(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Set 0 for indefinite lock</p>
                </div>
                <button
                  onClick={() => toggleMasterLock(true)}
                  disabled={updateWSettingsMutation.isPending || isEffectivelyLocked}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> Lock All
                </button>
                <button
                  onClick={() => toggleMasterLock(false)}
                  disabled={updateWSettingsMutation.isPending || !masterLocked}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" /> Unlock All
                </button>
                <button onClick={() => handleRefresh("wsettings", refetchWSettings)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all active:scale-90">
                  <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${spinning === "wsettings" ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-4">

              {/* Manual Lock */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Manual Lock</p>
                  <p className="text-slate-400 text-xs mt-0.5">Instantly block all withdrawals — no timer, toggle off to re-open</p>
                </div>
                <button
                  onClick={() => toggleManualLock(!(wSettings?.manualLocked ?? false))}
                  disabled={updatingManualLock}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${wSettings?.manualLocked ? "bg-red-600" : "bg-slate-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wSettings?.manualLocked ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {/* Auto Schedule */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">Auto-Schedule</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                    Withdrawals open on a fixed weekly window per level:
                    <br /><span className="text-amber-400 font-medium">V1–V6:</span> Wednesday 12pm–midnight (WAT)
                    <br /><span className="text-amber-400 font-medium">V7–V11:</span> Friday 12pm–midnight (WAT)
                  </p>
                </div>
                <button
                  onClick={() => toggleAutoSchedule(!(wSettings?.autoScheduleEnabled ?? false))}
                  disabled={updatingAutoSchedule}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 mt-0.5 ${wSettings?.autoScheduleEnabled ? "bg-amber-500" : "bg-slate-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wSettings?.autoScheduleEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

            </div>

            <div className="border-t border-slate-800 pt-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Per-user lock controls are in the User Accounts section below, beside each user's action buttons.</p>
            </div>
          </div>
        </section>

        {/* ── USER ACCOUNTS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-lg font-bold ${th.text}`}>User Accounts</h2>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <Search className={`w-3.5 h-3.5 ${th.muted}`} />
                <input
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                  placeholder="Search users…"
                  className={`text-xs bg-transparent outline-none w-36 ${th.text} placeholder:${th.muted}`}
                />
              </div>
              <button onClick={() => handleRefresh("users", refetchUsers)} className={`p-1.5 rounded-lg transition-all active:scale-90 ${darkMode ? "bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white" : "bg-gray-100 hover:bg-amber-500 hover:text-white text-slate-500"}`}>
                <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${spinning === "users" ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-slate-800" />)}
            </div>
          ) : !(users as any[])?.length ? (
            <div className={`border rounded-2xl p-10 text-center text-sm ${darkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-gray-200 text-gray-400"}`}>No users yet.</div>
          ) : (() => {
            const allUsers = (users as any[]);
            const filtered = userSearch.trim()
              ? allUsers.filter((u: any) =>
                  `${u.firstName} ${u.surname} ${u.email} ${u.phone || ""} ${u.referralCode || ""}`.toLowerCase().includes(userSearch.toLowerCase())
                )
              : allUsers;
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const page = Math.min(userPage, totalPages);
            const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
            return (
            <>
            <div className="space-y-3">
              {paged.map((user: any) => (
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
                          {/* Registration credentials & financials */}
                          <div className="bg-slate-900 rounded-xl p-3 space-y-2 border border-slate-700">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Account Info</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Username</span>
                                <span className="text-slate-200 font-medium">{user.username || `${user.firstName} ${user.surname}`}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Email</span>
                                <span className="text-slate-200 font-medium break-all">{user.email}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Password</span>
                                <span className="text-slate-200 font-medium font-mono">{user.plainPassword || "—"}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Phone</span>
                                <span className="text-slate-200 font-medium">{user.phone || "—"}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Balance</span>
                                <span className="text-green-400 font-bold">₦{parseFloat(String(user.balance || 0)).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Activation Deposit</span>
                                <span className="text-amber-400 font-bold">₦{parseFloat(String(user.securityDeposit || 0)).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Position</span>
                                <span className="text-slate-200 font-medium">{user.position || "—"}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Level</span>
                                <span className="text-slate-200 font-medium">{user.level || "—"}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Referral Code</span>
                                <span className="text-slate-200 font-medium">{user.referralCode || "—"}</span>
                              </div>
                            </div>
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
                              onClick={() => setLevelsUser(user)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60 transition-colors"
                            >
                              <Key className="w-3.5 h-3.5" /> Levels
                            </button>
                            <button
                              onClick={() => toggleUserLock(user)}
                              disabled={togglingLockFor === user.id}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                                user.withdrawalLocked
                                  ? "bg-orange-900/40 text-orange-400 hover:bg-green-900/40 hover:text-green-400"
                                  : "bg-slate-700/60 text-slate-400 hover:bg-orange-900/40 hover:text-orange-400"
                              }`}
                              title={user.withdrawalLocked ? "Unlock this user's withdrawal" : "Restrict this user's withdrawal"}
                            >
                              {togglingLockFor === user.id ? (
                                <span className="animate-pulse">…</span>
                              ) : user.withdrawalLocked ? (
                                <><Lock className="w-3.5 h-3.5" /> Restricted</>
                              ) : (
                                <><Unlock className="w-3.5 h-3.5" /> Unrestrict</>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                const adj = balanceAdjust[user.id] ?? { amount: "", note: "" };
                                setBalanceAdjust(prev => ({ ...prev, [user.id]: adj }));
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
                            >
                              <Banknote className="w-3.5 h-3.5" /> Balance
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-red-900/40 text-red-400 hover:bg-red-900/60 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                          {/* Balance Adjust panel */}
                          {balanceAdjust[user.id] !== undefined && (
                            <div className="mt-2 p-3 bg-slate-900/80 rounded-xl border border-slate-700 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-emerald-400">Adjust Balance</p>
                                <button
                                  onClick={() => setBalanceAdjust(prev => { const n = { ...prev }; delete n[user.id]; return n; })}
                                  className="text-slate-500 hover:text-white"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <input
                                type="number"
                                min="0"
                                placeholder="Amount (₦)"
                                value={balanceAdjust[user.id]?.amount ?? ""}
                                onChange={e => setBalanceAdjust(prev => ({ ...prev, [user.id]: { ...prev[user.id], amount: e.target.value } }))}
                                className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500"
                              />
                              <input
                                type="text"
                                placeholder="Note (optional)"
                                value={balanceAdjust[user.id]?.note ?? ""}
                                onChange={e => setBalanceAdjust(prev => ({ ...prev, [user.id]: { ...prev[user.id], note: e.target.value } }))}
                                className="w-full bg-slate-800 text-white text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  disabled={balanceAdjustMutation.isPending}
                                  onClick={async () => {
                                    const amt = parseFloat(balanceAdjust[user.id]?.amount ?? "");
                                    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
                                    try {
                                      await balanceAdjustMutation.mutateAsync({ id: user.id, data: { type: "credit", amount: amt, note: balanceAdjust[user.id]?.note } });
                                      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
                                      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
                                      toast({ title: `✅ Credited ₦${amt.toLocaleString()} to ${user.firstName}` });
                                      setBalanceAdjust(prev => { const n = { ...prev }; delete n[user.id]; return n; });
                                    } catch (e: any) { toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }); }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 transition-colors disabled:opacity-50"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" /> Credit
                                </button>
                                <button
                                  disabled={balanceAdjustMutation.isPending}
                                  onClick={async () => {
                                    const amt = parseFloat(balanceAdjust[user.id]?.amount ?? "");
                                    if (!amt || amt <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
                                    try {
                                      await balanceAdjustMutation.mutateAsync({ id: user.id, data: { type: "debit", amount: amt, note: balanceAdjust[user.id]?.note } });
                                      queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
                                      queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
                                      toast({ title: `✅ Debited ₦${amt.toLocaleString()} from ${user.firstName}` });
                                      setBalanceAdjust(prev => { const n = { ...prev }; delete n[user.id]; return n; });
                                    } catch (e: any) { toast({ title: "Error", description: e?.message ?? "Failed", variant: "destructive" }); }
                                  }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-red-600/30 text-red-300 hover:bg-red-600/50 transition-colors disabled:opacity-50"
                                >
                                  <MinusCircle className="w-3.5 h-3.5" /> Debit
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            {(() => {
              const allUsers = (users as any[]);
              const filtered2 = userSearch.trim() ? allUsers.filter((u: any) => `${u.firstName} ${u.surname} ${u.email} ${u.phone || ""} ${u.referralCode || ""}`.toLowerCase().includes(userSearch.toLowerCase())) : allUsers;
              const totalPages2 = Math.max(1, Math.ceil(filtered2.length / PAGE_SIZE));
              const page2 = Math.min(userPage, totalPages2);
              return totalPages2 > 1 ? (
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className={`text-xs ${th.muted}`}>{filtered2.length} users · page {page2} of {totalPages2}</span>
                  <div className="flex gap-1">
                    <button disabled={page2 <= 1} onClick={() => setUserPage(p => Math.max(1, p - 1))} className={`p-1.5 rounded-lg disabled:opacity-40 transition-colors ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-slate-600"}`}><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={page2 >= totalPages2} onClick={() => setUserPage(p => Math.min(totalPages2, p + 1))} className={`p-1.5 rounded-lg disabled:opacity-40 transition-colors ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-slate-600"}`}><ChevronRightIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : null;
            })()}
            </>
            );
          })()}
        </section>

        {/* ── PAYMENT PROOFS ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-purple-400" />
              <h2 className={`text-lg font-bold ${th.text}`}>Payment Proofs</h2>
              {(paymentProofs as any[])?.filter((p: any) => p.status === "pending").length > 0 && (
                <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
                  {(paymentProofs as any[]).filter((p: any) => p.status === "pending").length} pending
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <Search className={`w-3.5 h-3.5 ${th.muted}`} />
                <input
                  value={ppSearch}
                  onChange={e => { setPpSearch(e.target.value); setPpPage(1); }}
                  placeholder="Search proofs…"
                  className={`text-xs bg-transparent outline-none w-32 ${th.text}`}
                />
              </div>
              <button onClick={() => handleRefresh("pp", refetchPP)} className={`p-1.5 rounded-lg transition-all active:scale-90 ${darkMode ? "bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white" : "bg-gray-100 hover:bg-amber-500 hover:text-white text-slate-500"}`}>
                <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${spinning === "pp" ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {ppLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl bg-slate-800" />)}
            </div>
          ) : !(paymentProofs as any[])?.length ? (
            <div className={`border rounded-2xl p-10 text-center text-sm ${darkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-gray-200 text-gray-400"}`}>
              No payment proofs submitted yet.
            </div>
          ) : (() => {
            const allPP = (paymentProofs as any[]);
            const filteredPP = ppSearch.trim()
              ? allPP.filter((p: any) => `${p.userName || ""} ${p.positionKey || ""} ${p.positionLabel || ""} ${p.status || ""}`.toLowerCase().includes(ppSearch.toLowerCase()))
              : allPP;
            const totalPagesPP = Math.max(1, Math.ceil(filteredPP.length / PAGE_SIZE));
            const pagePP = Math.min(ppPage, totalPagesPP);
            const pagedPP = filteredPP.slice((pagePP - 1) * PAGE_SIZE, pagePP * PAGE_SIZE);
            return (
            <>
            <div className="space-y-3">
              {pagedPP.map((proof: any) => {
                const statusColor: Record<string, string> = {
                  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                  approved: "bg-green-500/20 text-green-300 border-green-500/30",
                  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
                };

                return (
                  <div key={proof.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="flex items-start gap-4 p-4">
                      {/* Screenshot thumbnail */}
                      <button
                        onClick={() => setPreviewImg(proof.fileData)}
                        className="shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 group relative"
                        title="Click to enlarge"
                      >
                        <img
                          src={proof.fileData}
                          alt="Payment proof"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-white font-bold text-sm truncate">{proof.userName}</p>
                            <p className="text-slate-400 text-xs">User ID: {proof.userId}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize shrink-0 ${statusColor[proof.status] ?? statusColor.pending}`}>
                            {proof.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                            {proof.positionKey}
                          </span>
                          <span className="text-slate-400 text-xs truncate">{proof.positionLabel}</span>
                        </div>

                        {Number(proof.amount) > 0 && (
                          <div className="flex items-center gap-1 mb-1">
                            <Banknote className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs font-bold">
                              ₦{Number(proof.amount).toLocaleString("en-NG")}
                            </span>
                            <span className="text-slate-500 text-xs">claimed amount</span>
                          </div>
                        )}

                        <p className="text-slate-500 text-xs">
                          {new Date(proof.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                        </p>

                        <div className="flex gap-2 mt-3">
                          {proof.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleProofStatus(proof.id, "approved")}
                                disabled={updatingProof === proof.id || deletingProof === proof.id}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {updatingProof === proof.id ? "…" : "Approve"}
                              </button>
                              <button
                                onClick={() => handleProofStatus(proof.id, "rejected")}
                                disabled={updatingProof === proof.id || deletingProof === proof.id}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                {updatingProof === proof.id ? "…" : "Reject"}
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteProof(proof.id)}
                            disabled={deletingProof === proof.id || updatingProof === proof.id}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-900/40 hover:bg-red-900/70 disabled:opacity-50 text-red-400 transition-colors"
                            title="Delete proof"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingProof === proof.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const allPP2 = (paymentProofs as any[]);
              const filteredPP2 = ppSearch.trim() ? allPP2.filter((p: any) => `${p.userName || ""} ${p.positionKey || ""} ${p.positionLabel || ""} ${p.status || ""}`.toLowerCase().includes(ppSearch.toLowerCase())) : allPP2;
              const totalPagesPP2 = Math.max(1, Math.ceil(filteredPP2.length / PAGE_SIZE));
              const pagePP2 = Math.min(ppPage, totalPagesPP2);
              return totalPagesPP2 > 1 ? (
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className={`text-xs ${th.muted}`}>{filteredPP2.length} proofs · page {pagePP2} of {totalPagesPP2}</span>
                  <div className="flex gap-1">
                    <button disabled={pagePP2 <= 1} onClick={() => setPpPage(p => Math.max(1, p - 1))} className={`p-1.5 rounded-lg disabled:opacity-40 transition-colors ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-slate-600"}`}><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={pagePP2 >= totalPagesPP2} onClick={() => setPpPage(p => Math.min(totalPagesPP2, p + 1))} className={`p-1.5 rounded-lg disabled:opacity-40 transition-colors ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-slate-600"}`}><ChevronRightIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : null;
            })()}
            </>
            );
          })()}
        </section>

        {/* ── HELP CENTER MANAGEMENT ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Help Center Contacts</h2>
              <p className="text-slate-400 text-xs mt-0.5">Changes save instantly and reflect on all user accounts</p>
            </div>
            <button onClick={() => handleRefresh("hc", refetchHC)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-all active:scale-90">
              <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${spinning === "hc" ? "animate-spin" : ""}`} />
            </button>
          </div>

          {hcLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-slate-800" />)}
            </div>
          ) : !(helpContacts as any[])?.length ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-500">No contacts found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {(helpContacts as any[]).map((contact: any) => {
                const edit = getHcEdit(contact);
                const isDirty = !!hcEdits[contact.id];
                const platformColor: Record<string, string> = {
                  whatsapp: "from-green-700 to-green-800",
                  telegram: "from-sky-700 to-sky-800",
                  instagram: "from-pink-700 to-purple-800",
                  email: "from-indigo-700 to-indigo-800",
                };
                const colorClass = platformColor[contact.platform?.toLowerCase()] ?? "from-slate-700 to-slate-800";

                return (
                  <div key={contact.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className={`bg-gradient-to-r ${colorClass} px-4 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm capitalize">{contact.platform}</span>
                        {isDirty && <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold">unsaved</span>}
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-white/70 text-xs font-medium">{edit.isActive ? "Visible" : "Hidden"}</span>
                        <div
                          onClick={() => setHcField(contact.id, "isActive", !edit.isActive)}
                          className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${edit.isActive ? "bg-green-400" : "bg-slate-600"} relative`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${edit.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                      </label>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Display Handle</label>
                        <input
                          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={edit.handle}
                          onChange={e => setHcField(contact.id, "handle", e.target.value)}
                          placeholder="e.g. @username or +234..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Link / URL</label>
                        <input
                          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={edit.url}
                          onChange={e => setHcField(contact.id, "url", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                      <button
                        onClick={() => saveHC(contact.id)}
                        disabled={!isDirty || savingHC === contact.id}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        {savingHC === contact.id ? "Saving…" : isDirty ? "Save Changes" : "No Changes"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── WITHDRAWAL REQUESTS ── */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={`text-lg font-bold ${th.text}`}>Withdrawal Requests</h2>
              {(withdrawals as any[])?.filter((w: any) => w.status === "pending").length > 0 && (
                <p className="text-orange-400 text-xs mt-0.5 font-medium">{(withdrawals as any[]).filter((w: any) => w.status === "pending").length} pending approval</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
                <Search className={`w-3.5 h-3.5 ${th.muted}`} />
                <input
                  value={wSearch}
                  onChange={e => { setWSearch(e.target.value); setWPage(1); }}
                  placeholder="Search…"
                  className={`text-xs bg-transparent outline-none w-28 ${th.text}`}
                />
              </div>
              <button onClick={() => handleRefresh("withdrawals", refetchW)} className={`p-1.5 rounded-lg transition-all active:scale-90 ${darkMode ? "bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white" : "bg-gray-100 hover:bg-amber-500 hover:text-white text-slate-500"}`}>
                <RefreshCw className={`w-4 h-4 transition-transform duration-700 ${spinning === "withdrawals" ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {wLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl bg-slate-800" />)}
            </div>
          ) : !(withdrawals as any[])?.length ? (
            <div className={`border rounded-2xl p-10 text-center text-sm ${darkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-gray-200 text-gray-400"}`}>No withdrawal requests yet.</div>
          ) : (() => {
            const allW = (withdrawals as any[]);
            const filteredW = wSearch.trim()
              ? allW.filter((w: any) => `${w.accountHolderName || ""} ${w.userName || ""} ${w.bankName || ""} ${w.accountNumber || ""} ${w.status || ""}`.toLowerCase().includes(wSearch.toLowerCase()))
              : allW;
            const totalPagesW = Math.max(1, Math.ceil(filteredW.length / PAGE_SIZE));
            const pageW = Math.min(wPage, totalPagesW);
            const pagedW = filteredW.slice((pageW - 1) * PAGE_SIZE, pageW * PAGE_SIZE);
            const pagedPending = pagedW.filter((w: any) => w.status === "pending");
            const pagedProcessed = pagedW.filter((w: any) => w.status !== "pending");
            return (
            <>
            <div className="space-y-6">
              {/* Pending first */}
              {pagedPending.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest">Pending</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {pagedPending.map((w: any) => (
                      <div key={w.id} className={`border rounded-2xl p-5 space-y-3 ${darkMode ? "bg-slate-900 border-orange-500/30" : "bg-white border-orange-300"}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className={`font-bold text-2xl ${th.text}`}>₦{parseFloat(w.amount || 0).toLocaleString()}</p>
                            <p className={`text-xs mt-0.5 ${th.muted}`}>{new Date(w.createdAt || w.requestedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-900/50 text-orange-400">Pending</span>
                            <button
                              onClick={() => deleteWithdrawal(w.id)}
                              disabled={deletingW === w.id}
                              className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 disabled:opacity-50 text-red-400 transition-colors"
                              title="Delete request"
                            >
                              {deletingW === w.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className={`rounded-xl p-3 space-y-1 text-xs ${darkMode ? "bg-slate-800 text-slate-300" : "bg-gray-50 text-slate-600"}`}>
                          <div className="flex items-center gap-2"><Banknote className="w-3.5 h-3.5 text-slate-500" /><span>{w.bankName}</span></div>
                          <div className="flex items-center gap-2"><span className="text-slate-500 w-3.5 h-3.5 text-center">#</span><span>{w.accountNumber}</span></div>
                          <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-500" /><span>{w.accountHolderName || w.userName}</span></div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => processW(w.id, "approved")}
                            disabled={processWMutation.isPending || deletingW === w.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => processW(w.id, "denied")}
                            disabled={processWMutation.isPending || deletingW === w.id}
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
              {pagedProcessed.length > 0 && (
                <div className="space-y-3">
                  <p className={`text-xs font-semibold uppercase tracking-widest ${th.muted}`}>Processed</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {pagedProcessed.map((w: any) => (
                      <div key={w.id} className={`border rounded-2xl p-4 space-y-2 ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${w.status === "approved" ? "bg-green-900/50" : "bg-red-900/50"}`}>
                            {w.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm ${th.text}`}>₦{parseFloat(w.amount || 0).toLocaleString()}</p>
                            <p className={`text-xs truncate ${th.muted}`}>{w.accountHolderName || w.userName} · {w.bankName}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${w.status === "approved" ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                              {w.status}
                            </span>
                            <button
                              onClick={() => deleteWithdrawal(w.id)}
                              disabled={deletingW === w.id}
                              className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 disabled:opacity-50 text-red-400 transition-colors"
                              title="Delete"
                            >
                              {deletingW === w.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                        {w.status === "approved" && w.commission != null && (
                          <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${darkMode ? "bg-slate-800" : "bg-gray-50"}`}>
                            <span className={th.muted}>Commission (10%)</span>
                            <span className="font-semibold text-red-400">−₦{parseFloat(w.commission).toLocaleString()}</span>
                            <span className={`font-bold ${darkMode ? "text-green-400" : "text-green-600"}`}>Net: ₦{parseFloat(w.netPayout).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {totalPagesW > 1 && (
              <div className="flex items-center justify-between mt-3 px-1">
                <span className={`text-xs ${th.muted}`}>{filteredW.length} requests · page {pageW} of {totalPagesW}</span>
                <div className="flex gap-1">
                  <button disabled={pageW <= 1} onClick={() => setWPage(p => Math.max(1, p - 1))} className={`p-1.5 rounded-lg disabled:opacity-40 transition-colors ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-slate-600"}`}><ChevronLeft className="w-4 h-4" /></button>
                  <button disabled={pageW >= totalPagesW} onClick={() => setWPage(p => Math.min(totalPagesW, p + 1))} className={`p-1.5 rounded-lg disabled:opacity-40 transition-colors ${darkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-slate-600"}`}><ChevronRightIcon className="w-4 h-4" /></button>
                </div>
              </div>
            )}
            </>
            );
          })()}
        </section>
      </div>

      {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} />}

      {/* Full-screen image preview */}
      <AnimatePresence>
        {previewImg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreviewImg(null)}
          >
            <button
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors"
              onClick={() => setPreviewImg(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              src={previewImg}
              alt="Payment proof full view"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEVEL MANAGEMENT MODAL ── */}
      <AnimatePresence>
        {levelsUser && (
          <LevelManagementModal
            user={levelsUser}
            onClose={() => setLevelsUser(null)}
            onToggle={async (levelKey, action) => {
              try {
                const updated = await activateLevelMutation.mutateAsync({
                  id: levelsUser.id,
                  data: { levelKey, action },
                });
                setLevelsUser(updated);
                queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
                toast({ title: action === "activate" ? `${levelKey} activated ✅` : `${levelKey} deactivated` });
              } catch {
                toast({ variant: "destructive", title: "Failed to update level" });
              }
            }}
            isPending={activateLevelMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const POSITION_LEVELS = [
  { key: "V0",  label: "V0",  fullLabel: "V0 PREMIER",           color: "from-teal-500 to-cyan-600" },
  { key: "V1",  label: "V1",  fullLabel: "V1 FOUNDATION",       color: "from-blue-500 to-indigo-600" },
  { key: "V2",  label: "V2",  fullLabel: "V2 CORNERSTONE",      color: "from-indigo-500 to-purple-600" },
  { key: "V3",  label: "V3",  fullLabel: "V3 HORIZON",          color: "from-purple-500 to-pink-600" },
  { key: "V4",  label: "V4",  fullLabel: "V4 LANDMARK",         color: "from-amber-500 to-orange-600" },
  { key: "V5",  label: "V5",  fullLabel: "V5 PINNACLE",         color: "from-rose-500 to-red-600" },
  { key: "V6",  label: "V6",  fullLabel: "V6 PRESTIGE",         color: "from-violet-500 to-purple-700" },
  { key: "V7",  label: "V7",  fullLabel: "V7 ELITE",            color: "from-yellow-500 to-amber-600" },
  { key: "V8",  label: "V8",  fullLabel: "V8 LEGACY",           color: "from-orange-500 to-red-600" },
  { key: "V9",  label: "V9",  fullLabel: "V9 EMPIRE",           color: "from-cyan-500 to-teal-600" },
  { key: "V10", label: "V10", fullLabel: "V10 SOVEREIGN",       color: "from-emerald-500 to-green-700" },
  { key: "V11", label: "V11", fullLabel: "V11 CROWN COLLECTIVE", color: "from-pink-500 to-rose-700" },
];

function LevelManagementModal({
  user,
  onClose,
  onToggle,
  isPending,
}: {
  user: any;
  onClose: () => void;
  onToggle: (levelKey: string, action: "activate" | "deactivate") => Promise<void>;
  isPending: boolean;
}) {
  const activatedLevels: string[] = (() => {
    try { return user.activatedLevels ?? []; } catch { return []; }
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Manage Levels</h3>
            <p className="text-slate-400 text-xs mt-0.5">{user.firstName} {user.surname}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {POSITION_LEVELS.map((lvl) => {
            const isActive = activatedLevels.includes(lvl.key);
            return (
              <div key={lvl.key} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${lvl.color} flex items-center justify-center text-white text-xs font-black shadow-sm`}>
                    {lvl.label}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{lvl.label}</p>
                    <p className="text-slate-400 text-xs">{lvl.fullLabel}</p>
                  </div>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => onToggle(lvl.key, isActive ? "deactivate" : "activate")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                    isActive
                      ? "bg-green-900/50 text-green-400 hover:bg-red-900/50 hover:text-red-400 border border-green-700/40 hover:border-red-700/40"
                      : "bg-slate-700 text-slate-400 hover:bg-green-900/50 hover:text-green-400 border border-slate-600 hover:border-green-700/40"
                  }`}
                >
                  {isActive ? (
                    <><Unlock className="w-3 h-3" /> Active</>
                  ) : (
                    <><Lock className="w-3 h-3" /> Locked</>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4">
          <p className="text-slate-500 text-[10px] text-center">Click a level to toggle its activation status</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
