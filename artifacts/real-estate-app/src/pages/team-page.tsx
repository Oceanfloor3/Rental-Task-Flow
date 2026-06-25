import { useLocation } from "wouter";
import {
  useGetReferralsSummary,
  useTransferReferralBalance,
  getGetReferralsSummaryQueryKey,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Users, Gift, Coins, ArrowRightLeft, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function TeamPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useGetReferralsSummary({ query: { queryKey: getGetReferralsSummaryQueryKey() } });
  const transfer = useTransferReferralBalance();

  const s = summary as any;
  const referralBonus = Number(s?.referralBonus ?? 0);
  const subordinateCommission = Number(s?.subordinateCommission ?? 0);
  const totalAvailable = referralBonus + subordinateCommission;

  const handleTransfer = async () => {
    if (totalAvailable <= 0) {
      toast({ title: "Nothing to Transfer", description: "Your referral balance is empty.", variant: "destructive" });
      return;
    }
    try {
      const result = await transfer.mutateAsync();
      toast({
        title: "Transfer Successful 🎉",
        description: (result as any)?.message ?? `₦${totalAvailable.toLocaleString()} moved to your main balance`,
      });
      queryClient.invalidateQueries({ queryKey: getGetReferralsSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
    } catch (e: any) {
      toast({ title: "Transfer Failed", description: e?.message ?? "Something went wrong", variant: "destructive" });
    }
  };

  const stats = [
    { label: "Referral Bonus", sub: "5% on each referred member's first purchase", value: referralBonus, icon: Gift, color: "bg-amber-100 text-amber-600", ring: "ring-amber-100" },
    { label: "Subordinate Commission", sub: "1% from every level purchase by your downline members", value: subordinateCommission, icon: Coins, color: "bg-amber-100 text-amber-700", ring: "ring-amber-100" },
  ];

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
          <Users className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-800">Team & Referrals</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {/* Hero card */}
        <div className="bg-gradient-to-br from-[#C9973B] to-[#8B5E10] rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Team Members</p>
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black">{isLoading ? "—" : (s?.totalReferrals ?? 0)}</p>
          <div className="mt-3 flex items-center gap-1.5 text-white/70 text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Members who joined using your referral link</span>
          </div>
        </div>

        {/* Referral Balance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Referral Balance</h2>
            <span className="text-xs text-gray-400 font-medium">Available to transfer</span>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100 text-center">
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Total Available</p>
            <p className="text-3xl font-black text-amber-800">
              ₦{totalAvailable.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <button
            onClick={handleTransfer}
            disabled={transfer.isPending || totalAvailable <= 0}
            className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {transfer.isPending ? "Transferring..." : "Transfer to Main Balance"}
          </button>
          <p className="text-xs text-center text-gray-400">Transferred funds can be withdrawn from your wallet</p>
        </div>

        {/* Breakdown */}
        <h2 className="text-sm font-bold text-slate-700 pt-1">Earnings Breakdown</h2>
        <div className="space-y-3">
          {stats.map(({ label, sub, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium leading-tight">{label}</p>
                <p className="text-lg font-black text-slate-800">
                  ₦{value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-1">
          <p className="text-xs font-bold text-amber-800">How it works</p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside leading-relaxed">
            <li>Earn <strong>5%</strong> of each referred member's first level purchase</li>
            <li>Earn <strong>1%</strong> from every level purchase made by your downline members</li>
            <li>Transfer accumulated balance to your main wallet, then withdraw</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
