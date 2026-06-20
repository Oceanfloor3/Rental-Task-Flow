import { useState, useEffect } from "react";
import {
  useGetUserProfile,
  useGetUserEarnings,
  useRequestWithdrawal,
  useGetWithdrawalLockStatus,
  useGetNotifications,
  useMarkNotificationRead,
  getGetUserProfileQueryKey,
  getGetUserEarningsQueryKey,
  getGetWithdrawalLockStatusQueryKey,
  getGetNotificationsQueryKey,
} from "@workspace/api-client-react";
import {
  RefreshCw, Wallet, Shield, Coins, CreditCard,
  CalendarDays, CheckCircle2, Clock, Calendar,
  Users, Globe, X, Building2, TrendingUp, Lock, Bell,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function useCountdown(unlockAt: string | null | undefined) {
  const [remaining, setRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!unlockAt) { setRemaining(null); return; }
    const target = new Date(unlockAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlockAt]);

  return remaining;
}

function WithdrawModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestWithdrawal = useRequestWithdrawal();

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    if (num > parseFloat(profile.balance || "0")) {
      toast({ variant: "destructive", title: "Insufficient balance" });
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({ data: { amount: num } });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserEarningsQueryKey() });
      toast({ title: "Withdrawal request submitted!", description: "Admin will review and approve shortly." });
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to submit withdrawal";
      toast({ variant: "destructive", title: "Withdrawal failed", description: msg });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white rounded-t-3xl p-6 w-full max-w-[430px] space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Withdraw Funds</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Withdrawal Account</p>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-slate-700 font-medium">{profile.bankName || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-slate-700 font-medium">{profile.accountNumber || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-slate-700 font-medium">{profile.accountHolderName || "—"}</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amount (NGN)</label>
          <Input
            type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-lg font-bold h-12 rounded-xl"
          />
          <p className="text-xs text-gray-400 mt-2">
            Available: <span className="font-bold text-green-600">₦{parseFloat(profile.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        {parseFloat(amount) > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Fee Breakdown</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Requested amount</span>
              <span className="font-semibold text-slate-800">₦{parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-500">Commission fee (15%)</span>
              <span className="font-semibold text-red-500">− ₦{(parseFloat(amount) * 0.15).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-amber-200 pt-2 flex justify-between">
              <span className="font-bold text-slate-700">You will receive</span>
              <span className="font-bold text-green-700 text-base">₦{(parseFloat(amount) * 0.85).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md"
          onClick={handleSubmit} disabled={requestWithdrawal.isPending}
        >
          {requestWithdrawal.isPending ? "Submitting..." : "Submit Withdrawal Request"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: notifications } = useGetNotifications({ query: { queryKey: getGetNotificationsQueryKey() } });
  const markRead = useMarkNotificationRead();

  const handleMarkRead = async (id: number) => {
    try {
      await markRead.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white rounded-t-3xl w-full max-w-[430px] shadow-2xl max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {!(notifications as any[])?.length ? (
            <div className="py-12 text-center text-gray-400">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (notifications as any[])?.map((n: any) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
              className="w-full bg-gray-50 rounded-2xl border border-gray-100 p-4 text-left flex items-start gap-3 active:bg-gray-100 transition-colors"
            >
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-blue-500" : "bg-gray-300"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${!n.isRead ? "text-slate-800" : "text-slate-500"}`}>{n.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1.5">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile } = useGetUserProfile({
    query: { queryKey: getGetUserProfileQueryKey() }
  });
  const { data: earnings, isLoading: isLoadingEarnings } = useGetUserEarnings({
    query: { queryKey: getGetUserEarningsQueryKey() }
  });
  const { data: lockStatus } = useGetWithdrawalLockStatus({
    query: {
      queryKey: getGetWithdrawalLockStatusQueryKey(),
      refetchInterval: 15000,
    }
  });
  const { data: notifications } = useGetNotifications({
    query: { queryKey: getGetNotificationsQueryKey() }
  });
  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead).length || 0;

  const countdown = useCountdown(lockStatus?.unlockAt);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoadingProfile || isLoadingEarnings || !profile || !earnings) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center h-12">
          <Skeleton className="h-8 w-32 rounded-full" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  const firstName = (profile as any).firstName || profile.username || profile.phone;
  const balance = parseFloat(profile.balance?.toString() || "0");
  const isWithdrawalLocked = lockStatus?.locked === true;
  const lockReason = lockStatus?.reason;
  const lockUnlockAt = lockStatus?.unlockAt;

  const statCards = [
    { label: "Yesterday's Earnings", value: `₦${Number(earnings.yesterdayEarnings).toLocaleString()}`, icon: Coins, color: "text-amber-400" },
    { label: "Today's Earnings", value: `₦${Number(earnings.todayEarnings).toLocaleString()}`, icon: TrendingUp, color: "text-green-400" },
    { label: "Total Earnings", value: `₦${Number(earnings.totalEarnings).toLocaleString()}`, icon: Wallet, color: "text-purple-400" },
    { label: "This Week", value: `₦${Number(earnings.weeklyEarnings).toLocaleString()}`, icon: CalendarDays, color: "text-blue-400" },
    { label: "Completed Today", value: String(earnings.completedToday), icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Remaining Today", value: String(earnings.remainingToday), icon: Clock, color: "text-orange-400" },
    { label: "This Month", value: `₦${Number(earnings.monthlyEarnings).toLocaleString()}`, icon: Calendar, color: "text-indigo-400" },
    { label: "Subordinate Commission", value: `₦${Number(earnings.subordinateCommission).toLocaleString()}`, icon: Users, color: "text-pink-400" },
    { label: "Referral Bonus", value: `₦${Number(earnings.referralBonus).toLocaleString()}`, icon: Globe, color: "text-cyan-400" },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 space-y-6 pb-8"
      >
        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <span className="bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
            {profile.position || "No Current Level"}
          </span>
          <div className="flex space-x-3 text-gray-500">
            <button onClick={handleRefresh} className="p-1.5 rounded-full hover:bg-white/80 transition-colors" title="Refresh">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-1.5 rounded-full hover:bg-white/80 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-purple-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => !isWithdrawalLocked && setShowWithdraw(true)}
              className={`p-1.5 rounded-full transition-colors ${isWithdrawalLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-white/80"}`}
              title={isWithdrawalLocked ? "Withdrawals are restricted" : "Withdraw"}
            >
              {isWithdrawalLocked ? <Lock className="w-5 h-5 text-red-500" /> : <Wallet className="w-5 h-5 text-purple-600" />}
            </button>
          </div>
        </div>

        {/* USER HEADER */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-white text-lg font-bold border-2 border-white shadow-sm">
                {((profile as any).firstName?.[0] || profile.username?.[0] || 'X').toUpperCase()}
                {((profile as any).surname?.[0] || profile.username?.[1] || 'M').toUpperCase()}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{firstName}</span>
            <div className="flex space-x-2 mt-1 flex-wrap gap-y-1">
              <div className="flex items-center bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Shield className="w-3 h-3 mr-1" />
                {profile.level || "No Level"}
              </div>
              <div className="flex items-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {profile.referralCode && <span>Ref: {profile.referralCode}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* BALANCE CARD */}
        <div className="bg-gradient-to-br from-[#7c6fd8] to-[#6b5fc7] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-lg" />
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="text-white/80 text-xs font-medium mb-1">Balance (NGN)</span>
              <span className="text-3xl font-black tracking-tight">₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-white/80 text-xs font-medium mb-1">Security Deposit</span>
              <span className="text-lg font-bold">₦{Number(profile.securityDeposit || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* LOCK COUNTDOWN BANNER */}
          {isWithdrawalLocked && (
            <div className="mt-4 relative z-10 bg-black/30 rounded-2xl px-4 py-2.5 flex items-center gap-2.5 border border-white/10">
              <Lock className="w-4 h-4 text-red-300 shrink-0" />
              <div className="flex flex-col min-w-0">
                {lockReason === "master" ? (
                  <>
                    <span className="text-[10px] text-white/70 font-medium">Withdrawals locked by administrator</span>
                    {countdown ? (
                      <span className="text-xs font-bold text-amber-300 tabular-nums">{countdown} remaining</span>
                    ) : lockUnlockAt ? (
                      <span className="text-xs font-bold text-amber-300">
                        Unlocks {new Date(lockUnlockAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-red-300">Locked indefinitely</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-white/70 font-medium">Your withdrawals are restricted</span>
                    <span className="text-xs font-bold text-red-300">Contact support to unlock</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 relative z-10">
            <button
              onClick={() => !isWithdrawalLocked && setShowWithdraw(true)}
              disabled={isWithdrawalLocked}
              className={`w-full py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center justify-center gap-1.5 transition-all ${
                isWithdrawalLocked
                  ? "bg-white/10 opacity-50 cursor-not-allowed"
                  : "bg-white/20 hover:bg-white/30 active:scale-95"
              }`}
              title={isWithdrawalLocked ? "Withdrawals are locked" : "Withdraw"}
            >
              {isWithdrawalLocked ? <Lock className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              {isWithdrawalLocked ? "Locked" : "Withdraw"}
            </button>
          </div>
        </div>

        {/* ACCOUNT OVERVIEW */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Account Overview</h2>
          <div className="grid grid-cols-3 gap-2">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
                <span className="text-[10px] text-gray-500 font-medium leading-tight">{label}</span>
                <span className="text-sm font-bold text-slate-800 truncate">{value}</span>
                <Icon className={`absolute bottom-2 right-2 w-8 h-8 opacity-10 ${color}`} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showWithdraw && <WithdrawModal profile={profile} onClose={() => setShowWithdraw(false)} />}
        {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
      </AnimatePresence>
    </>
  );
}
