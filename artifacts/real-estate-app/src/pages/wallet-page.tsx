import { useState } from "react";

const LEVEL_TRANSFER_LIMITS: Record<string, number> = {
  V0:  5_000,
  V1:  10_000,
  V2:  20_000,
  V3:  30_000,
  V4:  50_000,
  V5:  100_000,
  V6:  150_000,
  V7:  200_000,
  V8:  250_000,
  V9:  350_000,
  V10: 500_000,
  V11: 1_000_000,
};

function detectLevelKey(position?: string | null): string | null {
  if (!position) return null;
  const upper = position.toUpperCase();
  if (upper.includes("V11")) return "V11";
  if (upper.includes("V10")) return "V10";
  if (upper.includes("V9"))  return "V9";
  if (upper.includes("V8"))  return "V8";
  if (upper.includes("V7"))  return "V7";
  if (upper.includes("V6"))  return "V6";
  if (upper.includes("V5"))  return "V5";
  if (upper.includes("V4"))  return "V4";
  if (upper.includes("V3"))  return "V3";
  if (upper.includes("V2"))  return "V2";
  if (upper.includes("V1"))  return "V1";
  if (upper.includes("V0"))  return "V0";
  return null;
}
import { useLocation } from "wouter";
import {
  useGetUserProfile,
  useGetWithdrawalHistory,
  useGetWithdrawalLockStatus,
  useRequestWithdrawal,
  useGetUserTransactions,
  useUserTransfer,
  getGetUserProfileQueryKey,
  getGetWithdrawalHistoryQueryKey,
  getGetWithdrawalLockStatusQueryKey,
  getGetUserTransactionsQueryKey,
} from "@workspace/api-client-react";
import {
  Wallet, ArrowLeft, ArrowDownLeft, ArrowUpRight, ArrowDownRight,
  History, Lock, Send, PlusCircle, MinusCircle, RefreshCw, Users,
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

const WITHDRAWAL_PRESETS = [5000, 15000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 20000000, 50000000];

function PinModal({ onConfirm, onCancel, isLoading }: {
  onConfirm: (pin: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [pin, setPin] = useState("");

  const handleDigit = (d: string) => {
    if (pin.length >= 4 || isLoading) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) onConfirm(next);
  };

  const handleDelete = () => { if (!isLoading) setPin(p => p.slice(0, -1)); };

  const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm bg-white rounded-t-3xl px-6 pt-5 pb-10"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h3 className="font-bold text-slate-800 text-lg text-center mb-1">Transaction PIN</h3>
        <p className="text-xs text-gray-400 text-center mb-6">Enter your 4-digit PIN to continue</p>
        <div className="flex justify-center gap-4 mb-7">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${i < pin.length ? "bg-amber-600 scale-110" : "bg-gray-200"}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {keys.map((k, i) => (
            <button
              key={i}
              onClick={() => k === "⌫" ? handleDelete() : k !== "" ? handleDigit(k) : undefined}
              disabled={isLoading || k === ""}
              className={`h-14 rounded-2xl text-lg font-bold transition-all active:scale-95 ${
                k === "" ? "opacity-0 pointer-events-none" :
                k === "⌫" ? "bg-gray-100 text-slate-600 hover:bg-gray-200 active:bg-gray-300" :
                "bg-amber-50 border border-amber-100 text-slate-800 hover:bg-amber-100 active:bg-amber-200"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {k}
            </button>
          ))}
        </div>
        <button onClick={onCancel} disabled={isLoading} className="w-full py-3 text-sm text-gray-400 font-medium hover:text-gray-600">
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}

function WithdrawPage({ profile, onBack }: { profile: any; onBack: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showPin, setShowPin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestWithdrawal = useRequestWithdrawal();
  const { data: lockStatus } = useGetWithdrawalLockStatus({ query: { queryKey: getGetWithdrawalLockStatusQueryKey() } });
  const isScheduleLocked = (lockStatus as any)?.locked === true && (lockStatus as any)?.reason === "schedule";
  const balance = parseFloat(profile?.balance ?? "0");
  const fee = selected ? selected * 0.1 : 0;
  const youGet = selected ? selected - fee : 0;

  const handleRequestPin = () => {
    if (!selected || selected <= 0) {
      toast({ title: "Select an Amount", description: "Please tap an amount to proceed", variant: "destructive" });
      return;
    }
    if (selected > balance) {
      toast({ title: "Insufficient Balance", description: "Amount exceeds your available balance", variant: "destructive" });
      return;
    }
    setShowPin(true);
  };

  const handleSubmit = async (pin: string) => {
    try {
      await requestWithdrawal.mutateAsync({ data: { amount: selected!, transactionPin: pin } });
      setShowPin(false);
      toast({ title: "Request Submitted", description: "Your withdrawal request has been submitted for review." });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWithdrawalHistoryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserTransactionsQueryKey() });
      onBack();
    } catch (e: any) {
      setShowPin(false);
      toast({ title: "Error", description: e?.message ?? "Withdrawal failed", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="min-h-screen flex flex-col bg-gradient-to-b from-[#F5E4B5] to-[#FFF8E7]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-white/80"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="w-5 h-5 text-amber-700" />
          <h1 className="text-lg font-bold text-slate-800">Request Withdrawal</h1>
        </div>
      </div>

      <div className="flex-1 px-4 pb-10 space-y-5 overflow-y-auto">
        {/* Balance pill */}
        <div className="bg-gradient-to-r from-[#C9973B] to-[#8B5E10] rounded-2xl px-5 py-4 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-white/70 text-xs font-medium">Available Balance</p>
            <p className="text-2xl font-black mt-0.5">
              ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Bank info card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Bank Account</p>
              <p className="text-xs text-gray-400">Funds will be sent to this account</p>
            </div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-amber-500 font-medium">Bank</span>
              <span className="font-bold text-slate-700">{profile?.bankName || "—"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-amber-500 font-medium">Account Name</span>
              <span className="font-bold text-slate-700">{profile?.accountHolderName || "—"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-amber-500 font-medium">Account Number</span>
              <span className="font-mono font-bold text-slate-700">{profile?.accountNumber || "—"}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-3">Select Amount (₦)</p>
            <div className="grid grid-cols-2 gap-2">
              {WITHDRAWAL_PRESETS.map(preset => {
                const isSelected = selected === preset;
                const canAfford = preset <= balance;
                return (
                  <button
                    key={preset}
                    onClick={() => canAfford && setSelected(isSelected ? null : preset)}
                    className={`rounded-xl py-3 px-3 text-sm font-bold border-2 transition-all ${
                      isSelected
                        ? "bg-amber-600 border-amber-600 text-white shadow-md"
                        : canAfford
                          ? "bg-white border-amber-200 text-slate-700 hover:border-amber-400 hover:bg-amber-50"
                          : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    ₦{preset.toLocaleString("en-NG")}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Available: <span className="font-bold text-green-600">₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </p>
          </div>

          {selected && selected > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 rounded-2xl p-4 space-y-1.5 border border-amber-100"
            >
              <p className="text-xs font-bold text-amber-700 mb-2">Withdrawal Summary</p>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Withdrawal amount</span>
                <span className="font-semibold text-slate-700">₦{selected.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Commission fee (10%)</span>
                <span className="font-semibold text-red-500">−₦{fee.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-amber-200 pt-1.5 flex justify-between text-xs">
                <span className="font-bold text-slate-700">You receive</span>
                <span className="font-black text-amber-800">₦{youGet.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
            </motion.div>
          )}
        </div>

        <button
          onClick={handleRequestPin}
          disabled={requestWithdrawal.isPending || !selected || selected > balance || isScheduleLocked}
          className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-amber-200"
        >
          <ArrowDownLeft className="w-4 h-4" />
          {requestWithdrawal.isPending ? "Processing..." : "Submit Withdrawal Request"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Requests are reviewed within 24–48 hours. A 10% commission is deducted.
        </p>
      </div>
      <AnimatePresence>
        {showPin && (
          <PinModal
            onConfirm={handleSubmit}
            onCancel={() => setShowPin(false)}
            isLoading={requestWithdrawal.isPending}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TransferPage({ balance, userPosition, weeklyTransferUsed, weeklyTransferLimit, onBack }: {
  balance: number;
  userPosition?: string | null;
  weeklyTransferUsed?: number | null;
  weeklyTransferLimit?: number | null;
  onBack: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [showPin, setShowPin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const transferMutation = useUserTransfer();

  const used = weeklyTransferUsed ?? 0;
  const limit = weeklyTransferLimit ?? ((() => {
    const k = detectLevelKey(userPosition);
    return k ? (LEVEL_TRANSFER_LIMITS[k] ?? null) : null;
  })());
  const remaining = limit !== null ? Math.max(0, limit - used) : null;

  const handleRequestPin = () => {
    const amt = parseFloat(amount);
    if (!recipient.trim()) {
      toast({ title: "Enter recipient", description: "Enter the recipient's username or email", variant: "destructive" });
      return;
    }
    if (!amt || amt <= 0) {
      toast({ title: "Invalid Amount", description: "Enter a valid transfer amount", variant: "destructive" });
      return;
    }
    if (amt > balance) {
      toast({ title: "Insufficient Balance", description: "Amount exceeds your available balance", variant: "destructive" });
      return;
    }
    if (remaining !== null && amt > remaining) {
      toast({
        title: "Weekly Limit Exceeded",
        description: `You have ₦${remaining.toLocaleString("en-NG")} remaining in your weekly transfer allowance.`,
        variant: "destructive",
      });
      return;
    }
    setShowPin(true);
  };

  const handleSubmit = async (pin: string) => {
    const amt = parseFloat(amount);
    try {
      const result = await transferMutation.mutateAsync({ data: { recipientUsername: recipient.trim(), amount: amt, transactionPin: pin } });
      setShowPin(false);
      toast({ title: "Transfer Successful ✅", description: (result as any)?.message ?? "Transfer complete" });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserTransactionsQueryKey() });
      setRecipient("");
      setAmount("");
      onBack();
    } catch (e: any) {
      setShowPin(false);
      toast({ title: "Transfer Failed", description: e?.message ?? "Could not complete transfer", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="min-h-screen flex flex-col bg-gradient-to-b from-[#F5E4B5] to-[#FFF8E7]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-white/80"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-700" />
            <h1 className="text-lg font-bold text-slate-800">Transfer Funds</h1>
          </div>
          {limit !== null && (
            <p className="text-xs text-gray-500 mt-0.5 ml-7">
              Max <span className="font-semibold text-amber-700">₦{limit.toLocaleString("en-NG")}</span> / week
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 pb-10 space-y-5 overflow-y-auto">
        {/* Balance pill */}
        <div className="bg-gradient-to-r from-[#C9973B] to-[#8B5E10] rounded-2xl px-5 py-4 text-white flex items-center justify-between shadow-lg">
          <div>
            <p className="text-white/70 text-xs font-medium">Available Balance</p>
            <p className="text-2xl font-black mt-0.5">
              ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Weekly limit banner */}
        {limit !== null && (
          <div className={`rounded-2xl px-4 py-3 flex items-center justify-between border ${remaining === 0 ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
            <div>
              <p className={`text-xs font-bold ${remaining === 0 ? "text-red-600" : "text-amber-700"}`}>Weekly Transfer Allowance</p>
              <p className="text-xs text-gray-400 mt-0.5">Resets every Monday</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-black ${remaining === 0 ? "text-red-600" : "text-slate-800"}`}>
                ₦{(remaining ?? 0).toLocaleString("en-NG")} left
              </p>
              <p className="text-xs text-gray-400">of ₦{limit.toLocaleString("en-NG")}</p>
            </div>
          </div>
        )}

        {/* Transfer form card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-gray-100">
            <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Send to User</p>
              <p className="text-xs text-gray-400">Instant transfer, no fees</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Recipient Username or Email</label>
              <Input
                type="text"
                placeholder="e.g. REF123 or john@email.com"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                className="rounded-xl text-sm h-12"
              />
              <p className="text-xs text-gray-400">Enter their referral code, username, or email address</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 block">Amount (₦)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="rounded-xl text-sm h-12"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Available: <span className="font-semibold text-slate-600">₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span></span>
                {remaining !== null && (
                  <span>Weekly left: <span className={`font-semibold ${remaining === 0 ? "text-red-500" : "text-amber-700"}`}>₦{remaining.toLocaleString("en-NG")}</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Summary row */}
          {recipient && amount && parseFloat(amount) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="bg-amber-50 rounded-2xl p-4 space-y-1.5 border border-amber-100"
            >
              <p className="text-xs font-bold text-amber-700 mb-2">Transfer Summary</p>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">To</span>
                <span className="font-semibold text-slate-700">{recipient}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-slate-700">₦{parseFloat(amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Fee</span>
                <span className="font-semibold text-green-600">Free</span>
              </div>
            </motion.div>
          )}
        </div>

        <button
          onClick={handleRequestPin}
          disabled={transferMutation.isPending || !recipient.trim() || !amount}
          className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-2xl py-4 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 shadow-lg shadow-amber-200"
        >
          <Send className="w-4 h-4" />
          {transferMutation.isPending ? "Sending..." : "Confirm Transfer"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Transfers are instant and cannot be reversed. Please double-check the recipient.
        </p>
      </div>
      <AnimatePresence>
        {showPin && (
          <PinModal
            onConfirm={handleSubmit}
            onCancel={() => setShowPin(false)}
            isLoading={transferMutation.isPending}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type TxTab = "all" | "withdrawals";

const txConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; sign: "+" | "-" }> = {
  admin_credit:      { label: "Credit",    icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,  color: "text-emerald-600", bg: "bg-emerald-100", sign: "+" },
  admin_debit:       { label: "Debit",     icon: <MinusCircle className="w-4 h-4 text-red-500" />,     color: "text-red-500",    bg: "bg-red-100",     sign: "-" },
  transfer_sent:     { label: "Sent",      icon: <ArrowUpRight className="w-4 h-4 text-orange-500" />, color: "text-orange-500", bg: "bg-orange-100",  sign: "-" },
  transfer_received: { label: "Received",  icon: <ArrowDownRight className="w-4 h-4 text-amber-600" />,color: "text-blue-600",   bg: "bg-blue-100",    sign: "+" },
  withdrawal:             { label: "Withdrawal", icon: <ArrowDownLeft className="w-4 h-4 text-amber-700" />, color: "text-amber-700", bg: "bg-amber-100", sign: "-" },
  withdrawal_requested:   { label: "Withdrawal", icon: <ArrowDownLeft className="w-4 h-4 text-amber-700" />, color: "text-amber-700", bg: "bg-amber-100", sign: "-" },
  activation_deposit:     { label: "Activation Deposit",      icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,  color: "text-emerald-600", bg: "bg-emerald-100", sign: "+" },
  welcome_bonus:          { label: "Welcome Bonus",           icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,  color: "text-emerald-600", bg: "bg-emerald-100", sign: "+" },
  referral_bonus:         { label: "Referral Bonus",          icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,  color: "text-emerald-600", bg: "bg-emerald-100", sign: "+" },
  subordinate_commission: { label: "Subordinate Commission",  icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,  color: "text-emerald-600", bg: "bg-emerald-100", sign: "+" },
};

const txStatusStyle: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  denied:    "bg-red-100 text-red-600",
};

const withdrawalStatusStyle: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
  denied:   "bg-red-100 text-red-600",
};

export default function WalletPage() {
  const [, navigate] = useLocation();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [tab, setTab] = useState<TxTab>("all");

  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const { data: history } = useGetWithdrawalHistory({ query: { queryKey: getGetWithdrawalHistoryQueryKey() } });
  const { data: lockStatus } = useGetWithdrawalLockStatus({ query: { queryKey: getGetWithdrawalLockStatusQueryKey() } });
  const { data: transactions, refetch: refetchTx } = useGetUserTransactions({ query: { queryKey: getGetUserTransactionsQueryKey() } });

  const p = profile as any;
  const balance = parseFloat(p?.balance ?? "0");
  const withdrawalTxns = (history as any[]) ?? [];
  const allTxns = ((transactions as any[]) ?? []).filter((t: any) => t.type !== "quest_earning");
  const isWithdrawalLocked = (lockStatus as any)?.locked === true;

  const displayedTxns = tab === "all" ? allTxns : withdrawalTxns;

  if (showWithdraw && p) {
    return (
      <AnimatePresence mode="wait">
        <WithdrawPage key="withdraw" profile={p} onBack={() => setShowWithdraw(false)} />
      </AnimatePresence>
    );
  }

  if (showTransfer) {
    return (
      <AnimatePresence mode="wait">
        <TransferPage key="transfer" balance={balance} userPosition={p?.position} weeklyTransferUsed={p?.weeklyTransferUsed} weeklyTransferLimit={p?.weeklyTransferLimit} onBack={() => setShowTransfer(false)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F5E4B5] to-[#FFF8E7]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-white/80"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-amber-700" />
          <h1 className="text-lg font-bold text-slate-800">Wallet</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {/* Balance card */}
        <div className="bg-gradient-to-r from-[#C9973B] to-[#8B5E10] rounded-2xl p-5 text-white shadow-lg">
          <p className="text-white/70 text-xs font-medium">Available Balance</p>
          <p className="text-3xl font-black mt-1">
            ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => !isWithdrawalLocked && setShowWithdraw(true)}
              disabled={isWithdrawalLocked}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/20 flex items-center justify-center gap-2 transition-all ${
                isWithdrawalLocked ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/20 hover:bg-white/30 active:scale-95"
              }`}
            >
              {isWithdrawalLocked ? <Lock className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
              {isWithdrawalLocked ? "Locked" : "Withdraw"}
            </button>
            <button
              onClick={() => setShowTransfer(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-white/20 bg-white/20 hover:bg-white/30 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Transfer
            </button>
          </div>
          {p?.weeklyTransferLimit != null && (
            <div className="mt-3 flex items-center justify-end gap-1.5">
              <Send className="w-3 h-3 text-white/50" />
              <p className="text-xs text-white/70">
                Transfer limit: <span className="font-bold text-white">₦{Number(p.weeklyTransferLimit).toLocaleString("en-NG")}</span>/week
              </p>
            </div>
          )}
        </div>

        {/* Transaction history header with tabs */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-700">Transaction History</h2>
          </div>
          <button onClick={() => refetchTx()} className="p-1.5 rounded-lg bg-white/60 hover:bg-white border border-gray-200 transition-all active:scale-90">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/60 backdrop-blur-sm rounded-xl p-1 border border-gray-100">
          {([["all", "All Transactions"], ["withdrawals", "Withdrawals"]] as [TxTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === key
                  ? "bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Transactions list */}
        {tab === "all" ? (
          allTxns.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions yet</p>
              <p className="text-xs mt-1 opacity-60">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allTxns.map((t: any) => {
                const cfg = txConfig[t.type] ?? {
                  label: t.type,
                  icon: <History className="w-4 h-4 text-gray-400" />,
                  color: "text-slate-600",
                  bg: "bg-gray-100",
                  sign: "+" as const,
                };
                const isWithdrawal = t.type === "withdrawal_requested";
                const txStatus: string = t.status ?? "completed";
                return (
                  <div key={t.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 shadow-sm flex items-center gap-3">
                    <div className={`w-9 h-9 ${cfg.bg} rounded-full flex items-center justify-center shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
                        {isWithdrawal && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${txStatusStyle[txStatus] ?? "bg-gray-100 text-gray-500"}`}>
                            {txStatus === "completed" ? "Completed" : txStatus.charAt(0).toUpperCase() + txStatus.slice(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{t.description || t.relatedUserName || "—"}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">
                        {new Date(t.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <p className={`text-base font-black shrink-0 ${cfg.color}`}>
                      {cfg.sign}₦{Number(t.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          withdrawalTxns.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No withdrawals yet</p>
              <p className="text-xs mt-1 opacity-60">Your withdrawal history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawalTxns.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Withdrawal</p>
                        <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-800">₦{Number(t.amount).toLocaleString()}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${withdrawalStatusStyle[t.status] ?? "bg-gray-100 text-gray-500"}`}>
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
          )
        )}
      </div>

    </div>
  );
}
