import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetUserProfile,
  useGetWithdrawalHistory,
  useGetWithdrawalLockStatus,
  useRequestWithdrawal,
  getGetUserProfileQueryKey,
  getGetWithdrawalHistoryQueryKey,
  getGetWithdrawalLockStatusQueryKey,
} from "@workspace/api-client-react";
import {
  Wallet, ArrowLeft, ArrowDownLeft, History, Lock, X, ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

function genTxId(id: number): string {
  const seed = id * 2654435761;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let result = "TXN-";
  let n = (seed >>> 0);
  for (let i = 0; i < 10; i++) {
    result += chars[n % chars.length];
    n = Math.floor(n / chars.length) + (id * (i + 7));
  }
  return result;
}

function WithdrawModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestWithdrawal = useRequestWithdrawal();

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1000) {
      toast({ title: "Invalid Amount", description: "Minimum withdrawal is ₦1,000", variant: "destructive" });
      return;
    }
    const balance = parseFloat(profile?.balance ?? "0");
    if (amt > balance) {
      toast({ title: "Insufficient Balance", description: "Amount exceeds your available balance", variant: "destructive" });
      return;
    }
    try {
      await requestWithdrawal.mutateAsync({
        data: { amount: amt },
      });
      toast({ title: "Request Submitted", description: "Your withdrawal request has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWithdrawalHistoryQueryKey() });
      setAmount("");
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Withdrawal failed", variant: "destructive" });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25 }}
          className="bg-white rounded-t-3xl w-full max-w-[600px] shadow-2xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Request Withdrawal</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-1">
              <p className="text-xs text-purple-500 font-semibold">Bank</p>
              <p className="font-bold text-slate-800">{profile?.bankName || "—"}</p>
              <p className="text-sm text-slate-600">{profile?.accountHolderName}</p>
              <p className="text-sm font-mono text-slate-600">{profile?.accountNumber}</p>
            </div>
            <Input
              type="number"
              placeholder="Enter amount (min ₦1,000)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="rounded-xl text-base"
            />
            <p className="text-xs text-gray-400 text-center">A 10% commission fee will be deducted</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={requestWithdrawal.isPending}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl py-3.5 font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {requestWithdrawal.isPending ? "Processing..." : "Confirm Withdrawal"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function WalletPage() {
  const [, navigate] = useLocation();
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const { data: history } = useGetWithdrawalHistory({ query: { queryKey: getGetWithdrawalHistoryQueryKey() } });
  const { data: lockStatus } = useGetWithdrawalLockStatus({ query: { queryKey: getGetWithdrawalLockStatusQueryKey() } });

  const p = profile as any;
  const txns = (history as any[]) ?? [];
  const isWithdrawalLocked = (lockStatus as any)?.isLocked ?? false;

  const statusStyle: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e1dff3] to-[#f3f4fa]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-white/80"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-purple-600" />
          <h1 className="text-lg font-bold text-slate-800">Wallet</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {/* Balance card */}
        <div className="bg-gradient-to-r from-[#7c6fd8] to-[#6b5fc7] rounded-2xl p-5 text-white shadow-lg">
          <p className="text-white/70 text-xs font-medium">Available Balance</p>
          <p className="text-3xl font-black mt-1">
            ₦{parseFloat(p?.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
          <button
            onClick={() => !isWithdrawalLocked && setShowWithdraw(true)}
            disabled={isWithdrawalLocked}
            className={`mt-4 w-full py-2.5 rounded-xl text-sm font-semibold border border-white/20 flex items-center justify-center gap-2 transition-all ${
              isWithdrawalLocked ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/20 hover:bg-white/30 active:scale-95"
            }`}
          >
            {isWithdrawalLocked ? <Lock className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            {isWithdrawalLocked ? "Withdrawals Locked" : "Request Withdrawal"}
          </button>
        </div>

        {/* Transaction history */}
        <div className="flex items-center gap-2 pt-2">
          <History className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-bold text-slate-700">Transaction History</h2>
        </div>

        {txns.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1 opacity-60">Your withdrawal history will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {txns.map((t: any) => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Withdrawal</p>
                      <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-slate-800">₦{Number(t.amount).toLocaleString()}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[t.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {t.status === "approved" ? "Completed" : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Transaction ID</span>
                    <span className="font-mono font-semibold text-slate-600 text-[10px]">{genTxId(t.id)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Bank</span>
                    <span className="font-semibold text-slate-600">{t.bankName || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Account</span>
                    <span className="font-semibold text-slate-600">{t.accountNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Account Name</span>
                    <span className="font-semibold text-slate-600">{t.accountHolderName || "—"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWithdraw && p && (
        <WithdrawModal profile={p} onClose={() => setShowWithdraw(false)} />
      )}
    </div>
  );
}
