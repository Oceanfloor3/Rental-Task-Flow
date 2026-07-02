import { useState, useEffect } from "react";

function stripVPrefix(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\bV\d{1,2}\s*[-–]?\s*/gi, "").trim() || text;
}
import { useLocation } from "wouter";
import {
  useGetUserProfile,
  useGetUserEarnings,
  useRequestWithdrawal,
  useGetWithdrawalLockStatus,
  useGetWithdrawalHistory,
  useGetHelpCenter,
  useGetReferralsSummary,
  useGetFlashMessage,
  useGetLockFundsVisible,
  getGetUserProfileQueryKey,
  getGetUserEarningsQueryKey,
  getGetWithdrawalLockStatusQueryKey,

  getGetWithdrawalHistoryQueryKey,
  getGetHelpCenterQueryKey,
  getGetReferralsSummaryQueryKey,
  getGetFlashMessageQueryKey,
  getGetLockFundsVisibleQueryKey,
} from "@workspace/api-client-react";
import {
  RefreshCw, Wallet, Shield, Coins, CreditCard,
  CalendarDays, CheckCircle2, Clock, Calendar,
  Users, Globe, X, Building2, TrendingUp, Lock,
  ClipboardList, Gift, Layers, Headphones, Settings,
  Banknote, UserPlus, Copy, Check, Share2, ChevronRight,
  ArrowDownLeft, History, Megaphone, MessageCircle, BookOpen, Download,
} from "lucide-react";
import { Document, Page, Text, View, StyleSheet, usePDF } from "@react-pdf/renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useOverlay } from "@/contexts/OverlayContext";
import { useChatBadge } from "@/hooks/useChatBadge";

const REGION_TO_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  JP: "JPY", CN: "CNY", IN: "INR", KR: "KRW", SG: "SGD", HK: "HKD",
  CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK",
  HU: "HUF", RO: "RON", ZA: "ZAR", GH: "GHS", KE: "KES", UG: "UGX",
  TZ: "TZS", RW: "RWF", ET: "ETB", EG: "EGP", MA: "MAD", TN: "TND",
  SN: "XOF", CI: "XOF", CM: "XAF", CD: "CDF", AO: "AOA", MZ: "MZN",
  ZM: "ZMW", BW: "BWP", NA: "NAD", MU: "MUR", SC: "SCR",
  AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR",
  IL: "ILS", TR: "TRY", PK: "PKR", BD: "BDT", LK: "LKR", MM: "MMK",
  TH: "THB", ID: "IDR", MY: "MYR", PH: "PHP", VN: "VND",
  BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP", PE: "PEN",
  RU: "RUB", UA: "UAH", NG: "NGN",
};

interface LocalCurrencyResult {
  currencyCode: string;
  formattedLocal: string;
  isNGN: boolean;
}

function useLocalCurrency(ngnAmount: number): LocalCurrencyResult {
  const [result, setResult] = useState<LocalCurrencyResult>({
    currencyCode: "NGN",
    formattedLocal: `₦${ngnAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
    isNGN: true,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function detect() {
      let currency = "NGN";

      // 1. Try IP-based geolocation (returns currency directly)
      try {
        const geo = await fetch("https://ipapi.co/json/", { signal: controller.signal });
        const geoData = await geo.json();
        currency = geoData?.currency
          ?? REGION_TO_CURRENCY[geoData?.country_code ?? ""]
          ?? "NGN";
      } catch {
        // 2. Fall back to browser locale
        try {
          const region = new Intl.Locale(navigator.language || "en-NG").maximize().region ?? "NG";
          currency = REGION_TO_CURRENCY[region] ?? "NGN";
        } catch { /* stay NGN */ }
      }

      if (currency === "NGN") {
        setResult({
          currencyCode: "NGN",
          formattedLocal: `₦${ngnAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`,
          isNGN: true,
        });
        return;
      }

      // 3. Fetch live exchange rate NGN → local currency
      try {
        const rateRes = await fetch(
          `https://api.frankfurter.app/latest?from=NGN&to=${currency}`,
          { signal: controller.signal }
        );
        const rateData = await rateRes.json();
        const rate = rateData?.rates?.[currency];
        if (!rate) return;
        const amount = ngnAmount * rate;
        const formatted = new Intl.NumberFormat(navigator.language, {
          style: "currency", currency, maximumFractionDigits: 2,
        }).format(amount);
        setResult({ currencyCode: currency, formattedLocal: formatted, isNGN: false });
      } catch { /* keep NGN default */ }
    }

    detect().catch(() => {});
    return () => controller.abort();
  }, [ngnAmount]);

  return result;
}

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
      className="fixed inset-0 z-[999] bg-black/60 flex items-end justify-center"
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
                k === "⌫" ? "bg-gray-100 text-slate-600 hover:bg-gray-200" :
                "bg-amber-50 border border-amber-100 text-slate-800 hover:bg-amber-100"
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

function WithdrawModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showPin, setShowPin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestWithdrawal = useRequestWithdrawal();

  const handleRequestPin = () => {
    if (!selected || selected <= 0) {
      toast({ variant: "destructive", title: "Select a withdrawal amount" });
      return;
    }
    if (selected > parseFloat(profile.balance || "0")) {
      toast({ variant: "destructive", title: "Insufficient balance" });
      return;
    }
    setShowPin(true);
  };

  const handleSubmit = async (pin: string) => {
    try {
      await requestWithdrawal.mutateAsync({ data: { amount: selected!, transactionPin: pin } });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserEarningsQueryKey() });
      toast({ title: "Withdrawal request submitted!", description: "Admin will review and approve shortly." });
      setShowPin(false);
      onClose();
    } catch (e: any) {
      setShowPin(false);
      const msg = e?.response?.data?.error || e?.message || "Failed to submit withdrawal";
      toast({ variant: "destructive", title: "Withdrawal failed", description: msg });
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col p-6 gap-5 overflow-y-auto"
    >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slateate-800">Request Withdrawal</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Withdrawal Account</p>
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Select Amount (NGN)</p>
          <div className="grid grid-cols-2 gap-2">
            {WITHDRAWAL_PRESETS.map(preset => {
              const isSelected = selected === preset;
              const canAfford = preset <= parseFloat(profile.balance || "0");
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
            Available: <span className="font-bold text-green-600">₦{parseFloat(profile.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
          </p>
        </div>

        {selected && selected > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Fee Breakdown</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Requested amount</span>
              <span className="font-semibold text-slate-800">₦{selected.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-500">Commission fee (10%)</span>
              <span className="font-semibold text-red-500">− ₦{(selected * 0.10).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="border-t border-amber-200 pt-2 flex justify-between">
              <span className="font-bold text-slate-700">You will receive</span>
              <span className="font-bold text-green-700 text-base">₦{(selected * 0.90).toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        <Button
          className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] hover:from-[#A07830] hover:to-[#7A4F0C] text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md disabled:opacity-50"
          onClick={handleRequestPin} disabled={!selected || requestWithdrawal.isPending}
        >
          {requestWithdrawal.isPending ? "Submitting..." : "Confirm Withdrawal"}
        </Button>
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


function genTxId(id: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = (id * 2654435761) >>> 0;
  let result = "";
  for (let i = 0; i < 12; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    result += chars[s % chars.length];
  }
  return result.slice(0, 4) + "-" + result.slice(4, 8) + "-" + result.slice(8, 12);
}

function WalletPanel({ profile, isWithdrawalLocked, onWithdraw, onClose }: {
  profile: any; isWithdrawalLocked: boolean; onWithdraw: () => void; onClose: () => void;
}) {
  const { data: history } = useGetWithdrawalHistory({ query: { queryKey: getGetWithdrawalHistoryQueryKey() } });
  const txns = ((history as any[]) ?? []).filter((t: any) => t.type !== "quest_earning");

  const statusStyle: Record<string, string> = {
    pending:  "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col"
    >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-bold text-slate-800">Wallet</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Balance strip */}
        <div className="mx-4 mt-4 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] rounded-2xl p-4 text-white shrink-0">
          <p className="text-white/70 text-xs font-medium">Available Balance</p>
          <p className="text-2xl font-black mt-0.5">
            ₦{parseFloat(profile.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
          <button
            onClick={() => { if (!isWithdrawalLocked) { onClose(); onWithdraw(); } }}
            disabled={isWithdrawalLocked}
            className={`mt-3 w-full py-2 rounded-xl text-sm font-semibold border border-white/20 flex items-center justify-center gap-1.5 transition-all ${
              isWithdrawalLocked ? "bg-white/10 opacity-50 cursor-not-allowed" : "bg-white/20 hover:bg-white/30 active:scale-95"
            }`}
          >
            {isWithdrawalLocked ? <Lock className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
            {isWithdrawalLocked ? "Withdrawals Locked" : "Request Withdrawal"}
          </button>
        </div>

        {/* History */}
        <div className="px-4 pt-4 pb-2 shrink-0 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700">Transaction History</h3>
        </div>
        <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-3">
          {txns.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : txns.map((t: any) => (
            <div key={t.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Withdrawal</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">₦{Number(t.amount).toLocaleString()}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle[t.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {t.status === "approved" ? "Completed" : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1">
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
    </motion.div>
  );
}

function InviteModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const base = window.location.origin + import.meta.env.BASE_URL;
  const inviteLink = `${base.replace(/\/$/, "")}/?ref=${profile.referralCode || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Real Estate Investment",
          text: `Use my referral code ${profile.referralCode} to sign up and start earning!`,
          url: inviteLink,
        });
      } catch { /* dismissed */ }
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col p-6 gap-5 overflow-y-auto"
    >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-bold text-slate-800">Invite Friends</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Graphic / hero */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 text-center border border-amber-100">
          <div className="w-16 h-16 bg-gradient-to-br from-[#C9973B] to-[#8B5E10] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-200">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-black text-slate-800 text-base">Earn Together</h3>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Share your referral link. When friends join and start earning, you earn commission too.
          </p>
        </div>

        {/* Referral code */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Referral Code</p>
          <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center justify-between border border-amber-100">
            <span className="font-mono text-xl font-black text-amber-800 tracking-widest">{profile.referralCode || "—"}</span>
            <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-500" />}
            </button>
          </div>
        </div>

        {/* Invite link */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Invitation Link</p>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-gray-100">
            <span className="text-xs text-gray-500 flex-1 truncate font-mono">{inviteLink}</span>
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-200 shrink-0 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          </div>
          {copied && <p className="text-xs text-green-600 font-semibold text-center">Copied to clipboard!</p>}
        </div>

        <button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-200 active:scale-95 transition-all"
        >
          <Share2 className="w-4 h-4" /> Share Invite Link
        </button>
    </motion.div>
  );
}

const LOCK_TIERS = [
  { amount: 1_000_000,  label: "₦1,000,000"  },
  { amount: 1_500_000,  label: "₦1,500,000"  },
  { amount: 2_000_000,  label: "₦2,000,000"  },
  { amount: 3_000_000,  label: "₦3,000,000"  },
  { amount: 5_000_000,  label: "₦5,000,000"  },
  { amount: 10_000_000, label: "₦10,000,000" },
  { amount: 15_000_000, label: "₦15,000,000" },
];

const TIER_GRADIENTS = [
  "from-[#4A90D9] to-[#3B75B4]",
  "from-[#C9973B] to-[#A07020]",
  "from-[#C9973B] to-[#D4864A]",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-red-600",
  "from-purple-600 to-purple-800",
  "from-slate-700 to-slate-900",
];

function LockFundsPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-[90] bg-gray-50 flex flex-col"
    >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C9973B] to-[#8B5E10] px-5 pt-6 pb-5 flex items-center justify-between shrink-0">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Investment Plans</p>
            <h2 className="text-white font-extrabold text-xl leading-tight">Lock Funds</h2>
            <p className="text-white/70 text-xs mt-1">Choose a tier to lock your funds and earn guaranteed returns</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Cards */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3 pb-8">
          {LOCK_TIERS.map((tier, idx) => (
            <motion.div
              key={tier.amount}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Card header gradient */}
              <div className={`bg-gradient-to-r ${TIER_GRADIENTS[idx]} px-4 py-3 flex items-center justify-between`}>
                <div>
                  <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">Lock Amount</p>
                  <p className="text-white font-extrabold text-xl leading-tight mt-0.5">{tier.label}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Card body */}
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lock Duration</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800">1 MONTH – 12 MONTHS</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Return on Lock</span>
                  </div>
                  <span className="text-xs font-bold text-green-600">Contact Admin</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
    </motion.div>
  );
}

function FlashModal({ message, userName, onClose }: { message: string; userName?: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="bg-white rounded-3xl w-full max-w-[360px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 px-6 pt-7 pb-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-0.5">Welcome Back</p>
          <h2 className="text-white font-extrabold text-lg leading-tight">{userName || "Valued Member"}</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-slate-700 text-base leading-relaxed text-center whitespace-pre-wrap">{message}</p>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-2xl py-3 font-bold text-sm active:scale-95 transition-all"
          >
            Got it, thanks!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TeamPanel({ onClose }: { onClose: () => void }) {
  const { data: summary } = useGetReferralsSummary({ query: { queryKey: getGetReferralsSummaryQueryKey() } });
  const s = summary as any;

  const stats = [
    { label: "Referral Commission", value: `₦${Number(s?.referralBonus ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`, icon: Gift, color: "bg-amber-100 text-amber-600" },
    { label: "Team Commission", value: `₦${Number(s?.subordinateCommission ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`, icon: Coins, color: "bg-amber-100 text-amber-700" },
    { label: "Total Referrals", value: String(s?.totalReferrals ?? 0), icon: Users, color: "bg-blue-100 text-blue-600" },
  ];

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col p-5 gap-5 overflow-y-auto"
    >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Team</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100 text-center">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Team Performance</p>
          <p className="text-3xl font-black text-blue-700">{s?.totalReferrals ?? 0}</p>
          <p className="text-xs text-blue-400 mt-0.5">Total Team Members</p>
        </div>

        <div className="space-y-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-base font-black text-slate-800 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
    </motion.div>
  );
}

function SupportPanel({ onClose }: { onClose: () => void }) {
  const { data: helpCenter } = useGetHelpCenter({ query: { queryKey: getGetHelpCenterQueryKey() } });
  const contacts = (helpCenter as any[]) ?? [];

  const platformEmoji: Record<string, string> = { whatsapp: "📱", telegram: "✈️", instagram: "📸", email: "✉️" };
  const platformColor: Record<string, string> = {
    whatsapp: "bg-green-50 text-green-700 border-green-100",
    telegram: "bg-blue-50 text-blue-700 border-amber-100",
    instagram: "bg-pink-50 text-pink-700 border-pink-100",
    email: "bg-gray-50 text-gray-700 border-gray-100",
  };

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col"
    >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-amber-700" />
            <h2 className="text-lg font-bold text-slate-800">Support</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {contacts.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">No support contacts available.</div>
          ) : contacts.map((h: any) => {
            const key = h.platform?.toLowerCase() ?? "";
            const colorClass = platformColor[key] ?? "bg-amber-50 text-amber-800 border-amber-100";
            const emoji = platformEmoji[key] ?? "💬";
            return (
              <a key={h.id} href={h.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-3 p-4 rounded-2xl border ${colorClass} active:opacity-80 transition-opacity`}
              >
                <span className="text-2xl">{emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-sm capitalize">{h.platform}</p>
                  {h.handle && <p className="text-xs opacity-70 mt-0.5">{h.handle}</p>}
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </a>
            );
          })}
        </div>
    </motion.div>
  );
}

// ── PDF document definition ──────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page:        { padding: 36, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  logo:        { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#7c3aed", marginBottom: 4 },
  tagline:     { fontSize: 9, color: "#6b7280", marginBottom: 24 },
  sectionTitle:{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#1e1b4b", marginBottom: 8, marginTop: 18, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingBottom: 4 },
  body:        { fontSize: 9.5, color: "#374151", lineHeight: 1.6, marginBottom: 8 },
  bullet:      { fontSize: 9.5, color: "#374151", lineHeight: 1.6, marginBottom: 4, marginLeft: 12 },
  highlight:   { backgroundColor: "#f5f3ff", borderRadius: 4, padding: 10, marginVertical: 8 },
  hlLabel:     { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#5b21b6", marginBottom: 6 },
  qNum:        { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#5b21b6", marginBottom: 2 },
  answer:      { fontSize: 9, color: "#374151", lineHeight: 1.6, marginBottom: 10 },
  footer:      { position: "absolute", bottom: 24, left: 36, right: 36, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8, flexDirection: "row", justifyContent: "space-between" },
  footerText:  { fontSize: 8, color: "#9ca3af" },
});

const FAQ_DATA = [
  { q: "1. What is Meridianflow?", a: "Meridianflow is a digital advertising platform where users earn money by completing daily tasks (mainly clicking on real estate listings) to help our partners increase their property visibility." },
  { q: "2. How do I earn money?", a: "After purchasing a package, you gain access to a specific number of daily tasks. You earn rewards for completing these tasks. Additional commissions are also available when properties are sold through campaigns you helped promote." },
  { q: "3. Do I need any experience?", a: "No prior experience is required. All you need is a device with internet access and a few minutes daily to complete your tasks." },
  { q: "4. How much can I earn?", a: "Earnings depend on the package you choose and the consistency of your task completion. While there is no fixed amount, many active members earn significant income through regular activity and referrals." },
  { q: "5. What is a referral bonus?", a: "When your friends register and purchase a package using your referral link, you automatically earn a 5% bonus on their first purchase." },
  { q: "6. Are the packages refundable?", a: "All package purchases are final and non-refundable, as they grant immediate access to tasks and earning opportunities." },
  { q: "7. When and how do I get paid?", a: "Earnings are credited to your account upon task verification. Withdrawals are processed through supported payment methods once you reach the minimum threshold." },
  { q: "8. Is this a legitimate opportunity?", a: "Yes. We work directly with real estate companies that pay us for advertising services. Our model is based on real traffic generation and performance." },
  { q: "9. Can I have multiple accounts?", a: "No. Only one account per person is allowed. Creating multiple accounts will result in permanent suspension and forfeiture of earnings." },
  { q: "10. How do I get started?", a: "Simply register, choose a suitable package, and begin completing your daily tasks." },
];

function LearningHubDocument() {
  return (
    <Document title="Meridianflow Learning Hub" author="Meridianflow">
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <Text style={pdfStyles.logo}>Meridianflow</Text>
        <Text style={pdfStyles.tagline}>Learning Hub — Everything you need to know</Text>

        {/* About */}
        <Text style={pdfStyles.sectionTitle}>About Meridianflow</Text>
        <Text style={pdfStyles.body}>
          Meridianflow is a global digital advertising platform, that connects real estate companies with motivated individuals who help amplify property visibility through targeted engagement. It is a subsidiary of MERIDIAN FLOW PTE. LTD situated in Singapore.
        </Text>
        <Text style={pdfStyles.body}>
          We partner with real estate developers and Software development agencies worldwide to run high-impact advertising campaigns. Users on our platform purchase flexible packages that grant access to a set number of daily tasks primarily clicking on quality real estate listings. These actions help properties gain massive online exposure and reach potential buyers.
        </Text>
        <View style={pdfStyles.highlight}>
          <Text style={pdfStyles.hlLabel}>At Meridianflow, everyone wins:</Text>
          <Text style={pdfStyles.bullet}>• Users earn real income by completing simple daily tasks.</Text>
          <Text style={pdfStyles.bullet}>• Real estate partners receive genuine traffic and increased visibility for their listings.</Text>
          <Text style={pdfStyles.bullet}>• Top performers can earn additional commissions when properties are sold through our campaigns.</Text>
        </View>
        <Text style={pdfStyles.body}>
          Our mission is to create a transparent, accessible, and rewarding way for individuals to earn from the booming real estate market while delivering measurable advertising results to property professionals across the globe.
        </Text>
        <Text style={pdfStyles.body}>
          Join thousands of members who are already earning and contributing to the success of premium real estate campaigns.
        </Text>

        {/* FAQ */}
        <Text style={pdfStyles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQ_DATA.map((item) => (
          <View key={item.q}>
            <Text style={pdfStyles.qNum}>{item.q}</Text>
            <Text style={pdfStyles.answer}>{item.a}</Text>
          </View>
        ))}

        {/* Packages */}
        <Text style={pdfStyles.sectionTitle}>Meridianflow Packages</Text>
        <Text style={pdfStyles.body}>
          At Meridianflow, we offer flexible, tiered packages designed to suit different levels of participation. Each package provides a specific number of daily tasks (quests) and a corresponding daily earning potential.
        </Text>
        <View style={pdfStyles.highlight}>
          <Text style={pdfStyles.hlLabel}>How It Works</Text>
          <Text style={pdfStyles.body}>
            When you activate a package, you gain immediate access to your allocated daily quests. By completing these simple tasks (primarily engaging with real estate listings), you help our partners generate quality advertising traffic while earning consistent daily rewards.
          </Text>
        </View>

        {/* Footer */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>Meridianflow Learning Hub</Text>
          <Text style={pdfStyles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

function LearningHubModal({ onClose }: { onClose: () => void }) {
  const [instance] = usePDF({ document: <LearningHubDocument /> });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ maxWidth: 430, margin: "0 auto" }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ height: "88vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base leading-tight">Learning Hub</h2>
              <p className="text-xs text-slate-500">Meridianflow Guide</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {instance.url && (
              <a
                href={instance.url}
                download="meridianflow-learning-hub.pdf"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-100 hover:bg-purple-200 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Download className="w-4 h-4 text-purple-700" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* PDF viewer area */}
        <div className="flex-1 min-h-0 px-3 pb-4">
          {instance.loading && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-purple-600">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-sm font-medium">Generating PDF…</p>
            </div>
          )}
          {instance.error && (
            <div className="h-full flex items-center justify-center text-red-500 text-sm">
              Failed to generate PDF. Please try again.
            </div>
          )}
          {!instance.loading && !instance.error && instance.url && (
            <iframe
              src={instance.url}
              className="w-full h-full rounded-2xl border border-gray-200 shadow-inner"
              title="Meridianflow Learning Hub"
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showLockFunds, setShowLockFunds] = useState(false);
  const [showLearningHub, setShowLearningHub] = useState(false);
  const [dismissedMsg, setDismissedMsg] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { setOverlayOpen } = useOverlay();
  const { chatBadge } = useChatBadge();

  useEffect(() => {
    setOverlayOpen(showWithdraw || showLockFunds || showLearningHub);
  }, [showWithdraw, showLockFunds, showLearningHub, setOverlayOpen]);

  const { data: flashData } = useGetFlashMessage({ query: { queryKey: getGetFlashMessageQueryKey() } });
  const { data: lockFundsData } = useGetLockFundsVisible({ query: {
    queryKey: getGetLockFundsVisibleQueryKey(),
    refetchInterval: 10000,
    staleTime: 0,
    refetchOnMount: "always" as const,
    refetchOnWindowFocus: "always" as const,
  }});
  const lockFundsVisible = lockFundsData?.enabled === true;

  const flashMsg = (flashData as any)?.message ?? null;
  const showFlash = !!flashMsg && flashMsg !== dismissedMsg;

  const dismissFlash = () => {
    setDismissedMsg(flashMsg);
  };

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
  const countdown = useCountdown(lockStatus?.unlockAt);

  const balance = parseFloat((profile as any)?.balance?.toString() || "0");
  const localCurrency = useLocalCurrency(balance);

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
  const isWithdrawalLocked = lockStatus?.locked === true;
  const lockReason = lockStatus?.reason;
  const lockUnlockAt = lockStatus?.unlockAt;

  const statCards = [
    { label: "Previous Day's Earnings", value: `₦${Number(earnings.yesterdayEarnings).toLocaleString()}`, icon: Coins, color: "text-amber-400" },
    { label: "Daily Earnings", value: `₦${Number(earnings.todayEarnings).toLocaleString()}`, icon: TrendingUp, color: "text-green-400" },
    { label: "Total Earnings", value: `₦${Number(earnings.totalEarnings).toLocaleString()}`, icon: Wallet, color: "text-amber-500" },
    { label: "Weekly Earnings", value: `₦${Number(earnings.weeklyEarnings).toLocaleString()}`, icon: CalendarDays, color: "text-blue-400" },
    { label: "Accomplished Today", value: String(earnings.completedToday), icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Pending Today", value: String(earnings.remainingToday), icon: Clock, color: "text-orange-400" },
    { label: "Monthly Earnings", value: `₦${Number(earnings.monthlyEarnings).toLocaleString()}`, icon: Calendar, color: "text-amber-500" },
    { label: "Team Commission", value: `₦${Number(earnings.subordinateCommission).toLocaleString()}`, icon: Users, color: "text-pink-400" },
    { label: "Referral Commission", value: `₦${Number(earnings.referralBonus).toLocaleString()}`, icon: Globe, color: "text-cyan-400" },
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
          <div className="flex space-x-3 text-gray-500 ml-auto">
            <button onClick={handleRefresh} className="p-1.5 rounded-full hover:bg-white/80 transition-colors" title="Refresh">
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={() => !isWithdrawalLocked && setShowWithdraw(true)}
              className={`p-1.5 rounded-full transition-colors ${isWithdrawalLocked ? "opacity-40 cursor-not-allowed" : "hover:bg-white/80"}`}
              title={isWithdrawalLocked && lockReason !== "schedule" ? "Withdrawals are restricted" : "Withdraw"}
            >
              {isWithdrawalLocked ? <Lock className="w-5 h-5 text-red-500" /> : <Wallet className="w-5 h-5 text-amber-700" />}
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
            {profile.referralCode && (
              <div className="flex items-center bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 self-start">
                <span>Ref: {profile.referralCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* BALANCE CARD */}
        <div className="bg-gradient-to-br from-[#C9973B] to-[#8B5E10] rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-lg" />
          <div className="flex justify-between items-start relative z-10">
            <div className="flex flex-col">
              <span className="text-white/80 text-xs font-medium mb-1">
                Balance ({localCurrency.currencyCode})
              </span>
              {localCurrency.isNGN ? (
                <span className="text-xl font-black tracking-tight">
                  ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </span>
              ) : (
                <>
                  <span className="text-xl font-black tracking-tight">{localCurrency.formattedLocal}</span>
                  <span className="text-white/60 text-[11px] font-medium mt-0.5">
                    ≈ ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-col text-right">
              <span className="text-white/80 text-xs font-medium mb-1">Activation Deposit</span>
              <span className="text-lg font-bold">₦{Number(profile.securityDeposit || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* LOCK COUNTDOWN BANNER — not shown for auto-schedule (button is simply inactive) */}
          {isWithdrawalLocked && lockReason !== "schedule" && (
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
          <h2 className="text-base font-bold text-slate-900">Portfolio Hub</h2>
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

        {/* QUICK ACTIONS */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">Smart Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: "Quests",         icon: ClipboardList, color: "bg-amber-100 text-amber-700",   action: () => navigate("/tasks") },
              { label: "My Wallet",    icon: Wallet,        color: "bg-amber-100 text-amber-700",   action: () => navigate("/wallet") },
              { label: "Incentives",   icon: Gift,          color: "bg-amber-100 text-amber-600",   action: () => navigate("/earnings") },
              { label: "My Team",      icon: Users,         color: "bg-blue-100  text-blue-600",    action: () => navigate("/team") },
              { label: "My Levels",    icon: Layers,        color: "bg-amber-100 text-amber-700",   action: () => navigate("/position") },
              { label: "Contact Us",   icon: Headphones,    color: "bg-green-100 text-green-600",   action: () => navigate("/support") },
              { label: "Settings",     icon: Settings,      color: "bg-slate-100 text-slate-600",   action: () => navigate("/my") },
              { label: "Monthly Payout", icon: Banknote,    color: "bg-emerald-100 text-emerald-600", action: () => toast({ title: "🚧 COMING SOON!!!", description: "The Monthly Payout feature is under development. Stay tuned!" }) },
              { label: "Invite & Earn", icon: UserPlus,     color: "bg-pink-100  text-pink-600",    action: () => navigate("/invite") },
              { label: "Chat Users",   icon: MessageCircle, color: "bg-teal-100 text-teal-600",    action: () => navigate("/chat") },
              { label: "Learning Hub", icon: BookOpen,      color: "bg-purple-100 text-purple-600", action: () => setShowLearningHub(true) },
            ] as { label: string; icon: any; color: string; action: () => void }[]).map(({ label, icon: Icon, color, action }) => {
              const isChatBtn = label === "Chat Users";
              const showBadge = isChatBtn && chatBadge > 0;
              return (
                <button
                  key={label}
                  onClick={action}
                  className="flex flex-col items-center justify-center gap-2 bg-white rounded-2xl py-4 shadow-sm border border-gray-100 active:scale-95 transition-transform"
                >
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none shadow">
                        {chatBadge > 99 ? "99+" : chatBadge}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 leading-tight text-center">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LOCK FUNDS CARD — shown below Quick Actions when admin enables it */}
        {lockFundsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#C9973B] to-[#8B5E10] rounded-2xl p-4 shadow-md flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-extrabold text-base leading-tight">Lock Funds</p>
              <p className="text-white/70 text-xs mt-0.5">Secure your funds & earn guaranteed returns</p>
            </div>
            <button
              onClick={() => setShowLockFunds(true)}
              className="shrink-0 bg-white text-[#8B5E10] text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform"
            >
              Explore
            </button>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {showFlash && flashMsg && (
          <FlashModal
            message={flashMsg}
            userName={`${(profile as any)?.firstName || ""} ${(profile as any)?.surname || ""}`.trim() || undefined}
            onClose={dismissFlash}
          />
        )}
        {showWithdraw && <WithdrawModal profile={profile} onClose={() => setShowWithdraw(false)} />}
        {showLockFunds && <LockFundsPanel onClose={() => setShowLockFunds(false)} />}
        {showLearningHub && <LearningHubModal onClose={() => setShowLearningHub(false)} />}
      </AnimatePresence>
    </>
  );
}
