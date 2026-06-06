import { useState } from "react";
import {
  useGetUserProfile,
  useGetUserEarnings,
  useRequestWithdrawal,
  useRechargeWallet,
  getGetUserProfileQueryKey,
  getGetUserEarningsQueryKey,
} from "@workspace/api-client-react";
import {
  RefreshCw, Wallet, Shield, Coins, CreditCard,
  CalendarDays, CheckCircle2, Clock, Calendar,
  Users, Globe, X, Building2, TrendingUp, PlusCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
      toast({ variant: "destructive", title: e?.message || "Failed to submit withdrawal" });
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

function RechargeModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rechargeWallet = useRechargeWallet();

  const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    try {
      const res = await rechargeWallet.mutateAsync({ data: { amount: num } });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserEarningsQueryKey() });
      toast({ title: "Wallet Recharged!", description: `New balance: ₦${res.newBalance.toLocaleString()}` });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: e?.message || "Failed to recharge wallet" });
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
          <h2 className="text-xl font-bold text-slate-800">Recharge Wallet</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-green-50 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">Current Balance</span>
          <span className="font-bold text-green-700 text-lg">₦{parseFloat(profile.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amount (NGN)</label>
          <Input
            type="number" placeholder="0.00" value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-lg font-bold h-12 rounded-xl"
          />
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-2 font-medium">Quick amounts</p>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map(q => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${amount === String(q) ? "bg-purple-600 text-white border-purple-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300"}`}
              >
                ₦{q.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        <Button
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md"
          onClick={handleSubmit} disabled={rechargeWallet.isPending}
        >
          {rechargeWallet.isPending ? "Processing..." : "Recharge Now"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, isLoading: isLoadingProfile } = useGetUserProfile({
    query: { queryKey: getGetUserProfileQueryKey() }
  });
  const { data: earnings, isLoading: isLoadingEarnings } = useGetUserEarnings({
    query: { queryKey: getGetUserEarningsQueryKey() }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetUserEarningsQueryKey() });
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
            <button onClick={() => setShowRecharge(true)} className="p-1.5 rounded-full hover:bg-white/80 transition-colors" title="Recharge">
              <PlusCircle className="w-5 h-5 text-green-600" />
            </button>
            <button onClick={() => setShowWithdraw(true)} className="p-1.5 rounded-full hover:bg-white/80 transition-colors" title="Withdraw">
              <Wallet className="w-5 h-5 text-purple-600" />
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
          <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
            <button
              onClick={() => setShowRecharge(true)}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Recharge
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="bg-white/20 hover:bg-white/30 active:scale-95 transition-all py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10 flex items-center justify-center gap-1.5"
            >
              <Wallet className="w-4 h-4" /> Withdraw
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
        {showRecharge && <RechargeModal profile={profile} onClose={() => setShowRecharge(false)} />}
      </AnimatePresence>
    </>
  );
}
