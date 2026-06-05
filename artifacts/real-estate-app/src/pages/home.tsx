import { useState } from "react";
import { 
  useGetUserProfile, 
  useGetUserEarnings, 
  useRequestWithdrawal,
  getGetUserProfileQueryKey, 
  getGetUserEarningsQueryKey 
} from "@workspace/api-client-react";
import { RefreshCw, MessageCircle, Wallet, Shield, Medal, Coins, CreditCard, CalendarDays, CheckCircle2, Clock, Calendar, Users, Globe, X, Building2 } from "lucide-react";
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
      toast({ title: "Withdrawal request submitted!" });
      onClose();
    } catch {
      toast({ variant: "destructive", title: "Failed to submit withdrawal" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white rounded-t-3xl p-6 w-full max-w-[430px] space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Withdraw Funds</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-purple-50 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Withdrawal Account</p>
          <div className="space-y-2">
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
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
            Amount (NGN)
          </label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-lg font-bold h-12 rounded-xl"
          />
          <p className="text-xs text-gray-400 mt-2">
            Available: <span className="font-bold text-green-600">₦{parseFloat(profile.balance || "0").toFixed(2)}</span>
          </p>
        </div>

        <Button
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md"
          onClick={handleSubmit}
          disabled={requestWithdrawal.isPending}
        >
          {requestWithdrawal.isPending ? "Submitting..." : "Submit Withdrawal"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const { data: profile, isLoading: isLoadingProfile } = useGetUserProfile({
    query: { queryKey: getGetUserProfileQueryKey() }
  });
  
  const { data: earnings, isLoading: isLoadingEarnings } = useGetUserEarnings({
    query: { queryKey: getGetUserEarningsQueryKey() }
  });

  if (isLoadingProfile || isLoadingEarnings || !profile || !earnings) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center h-12">
          <Skeleton className="h-8 w-32 rounded-full" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
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

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 space-y-6 pb-8"
      >
        {/* TOP BAR */}
        <div className="flex justify-between items-center">
          <button className="bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-sm">
            Applying for Position
          </button>
          <div className="flex space-x-3 text-gray-700">
            <button className="p-1"><RefreshCw className="w-5 h-5" /></button>
            <button className="p-1"><MessageCircle className="w-5 h-5" /></button>
            <button className="p-1"><Wallet className="w-5 h-5" /></button>
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
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">{firstName}</span>
            <div className="flex space-x-2 mt-1">
              <div className="flex items-center bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Shield className="w-3 h-3 mr-1" />
                {profile.position || 'Senior Position (V1)'}
              </div>
              <div className="flex items-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                <Medal className="w-3 h-3 mr-1" />
                Team Leader
              </div>
            </div>
          </div>
        </div>

        {/* BALANCE CARD */}
        <div className="bg-gradient-to-br from-[#7c6fd8] to-[#6b5fc7] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-lg"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="text-white/80 text-xs font-medium mb-1">Balance (NGN)</span>
              <span className="text-2xl font-bold">{parseFloat(profile.balance?.toString() || "0").toFixed(2)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-white/80 text-xs font-medium mb-1">Security Deposit (NGN)</span>
              <span className="text-2xl font-bold">{profile.securityDeposit}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-6 relative z-10">
            <button className="bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10">
              Recharge
            </button>
            <button
              onClick={() => setShowWithdraw(true)}
              className="bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10"
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* ACCOUNT OVERVIEW */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Account Overview</h2>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Yesterday's Earnings</span>
              <span className="text-sm font-bold text-slate-800">{earnings.yesterdayEarnings}</span>
              <Coins className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Today's Earnings</span>
              <span className="text-sm font-bold text-slate-800">{earnings.todayEarnings}</span>
              <CreditCard className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Total Earnings</span>
              <span className="text-sm font-bold text-slate-800">{earnings.totalEarnings}</span>
              <Wallet className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">This Week's Earnings</span>
              <span className="text-sm font-bold text-slate-800">{earnings.weeklyEarnings}</span>
              <CalendarDays className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Completed Today</span>
              <span className="text-sm font-bold text-slate-800">{earnings.completedToday}</span>
              <CheckCircle2 className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Remaining Today</span>
              <span className="text-sm font-bold text-slate-800">{earnings.remainingToday}</span>
              <Clock className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">This Month's Earnings</span>
              <span className="text-sm font-bold text-slate-800">{earnings.monthlyEarnings}</span>
              <Calendar className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Subordinate Task Commission</span>
              <span className="text-sm font-bold text-slate-800">{earnings.subordinateCommission}</span>
              <Users className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
              <span className="text-[10px] text-gray-500 font-medium leading-tight">Referral Bonus</span>
              <span className="text-sm font-bold text-slate-800">{earnings.referralBonus}</span>
              <Globe className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
            </div>
          </div>
        </div>

        {/* QUICK ACCESS */}
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-bold text-slate-900">Quick Access</h2>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">More features coming soon...</p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showWithdraw && <WithdrawModal profile={profile} onClose={() => setShowWithdraw(false)} />}
      </AnimatePresence>
    </>
  );
}
