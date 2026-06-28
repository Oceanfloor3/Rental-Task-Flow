import { useLocation } from "wouter";
import {
  useGetReferralsSummary,
  useTransferReferralBalance,
  useTransferLeadershipBalance,
  getGetReferralsSummaryQueryKey,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Users, Gift, Coins, ArrowRightLeft, TrendingUp, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function TeamPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useGetReferralsSummary({ query: { queryKey: getGetReferralsSummaryQueryKey() } });
  const transfer = useTransferReferralBalance();
  const leadershipTransfer = useTransferLeadershipBalance();

  const s = summary as any;
  const referralBonus = Number(s?.referralBonus ?? 0);
  const subordinateCommission = Number(s?.subordinateCommission ?? 0);
  const leadershipBalance = Number(s?.leadershipBalance ?? 0);
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

  const handleLeadershipTransfer = async () => {
    if (leadershipBalance <= 0) {
      toast({ title: "Nothing to Transfer", description: "Your leadership balance is empty.", variant: "destructive" });
      return;
    }
    try {
      const result = await leadershipTransfer.mutateAsync();
      toast({
        title: "Transfer Successful 🎉",
        description: (result as any)?.message ?? `₦${leadershipBalance.toLocaleString()} moved to your main balance`,
      });
      queryClient.invalidateQueries({ queryKey: getGetReferralsSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
    } catch (e: any) {
      toast({ title: "Transfer Failed", description: e?.message ?? "Something went wrong", variant: "destructive" });
    }
  };

  const stats = [
    { label: "Referral Bonus", sub: "5% on each referred member's first purchase", value: referralBonus, icon: Gift, color: "bg-[#2a5585] text-[#b08c10]" },
    { label: "Subordinate Commission", sub: "1% from every level purchase by your downline members", value: subordinateCommission, icon: Coins, color: "bg-[#2a5585] text-[#9a7a18]" },
  ];

  // Leadership milestone thresholds for display
  const MILESTONES = [
    { count: 20, reward: 30000 },
    { count: 50, reward: 70000 },
    { count: 100, reward: 150000 },
    { count: 200, reward: 250000 },
    { count: 500, reward: 500000 },
    { count: 1000, reward: 800000 },
    { count: 1500, reward: 1200000 },
    { count: 2000, reward: 1500000 },
  ];
  const totalReferrals = s?.totalReferrals ?? 0;
  const nextMilestone = MILESTONES.find(m => totalReferrals < m.count);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#132840] to-[#0f2240]">
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
        <div className="bg-gradient-to-br from-[#c9a020] to-[#9a7a18] rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Total Team Members</p>
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-4xl font-black">{isLoading ? "—" : totalReferrals}</p>
          <div className="mt-3 flex items-center gap-1.5 text-white text-xs">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Members who joined using your referral link</span>
          </div>
        </div>

        {/* Referral Balance */}
        <div className="bg-white rounded-2xl border border-white/40 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Referral Balance</h2>
            <span className="text-xs text-white/80 font-medium">Available to transfer</span>
          </div>

          <div className="bg-gradient-to-r from-[#0f2240] to-yellow-50 rounded-xl p-4 border border-white/40 text-center">
            <p className="text-xs text-[#b08c10] font-semibold uppercase tracking-wider mb-1">Total Available</p>
            <p className="text-3xl font-black text-white">
              ₦{totalAvailable.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <button
            onClick={handleTransfer}
            disabled={transfer.isPending || totalAvailable <= 0}
            className="w-full bg-gradient-to-r from-[#c9a020] to-[#9a7a18] text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#c9a020]/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="w-4 h-4" />
            {transfer.isPending ? "Transferring..." : "Transfer to Main Balance"}
          </button>
          <p className="text-xs text-center text-white/80">Transferred funds can be withdrawn from your wallet</p>
        </div>

        {/* Leadership Balance */}
        <div className="bg-white rounded-2xl border border-white/35 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#b08c10]" />
              <h2 className="text-sm font-bold text-slate-700">Leadership Balance</h2>
            </div>
            <span className="text-xs text-[#b08c10] font-semibold bg-[#132840] px-2 py-0.5 rounded-full">Milestone Reward</span>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-[#0f2240] rounded-xl p-4 border border-white/35 text-center">
            <p className="text-xs text-[#b08c10] font-semibold uppercase tracking-wider mb-1">Available</p>
            <p className="text-3xl font-black text-white">
              ₦{leadershipBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>

          {nextMilestone && (
            <div className="bg-[#132840] border border-white/40 rounded-xl px-3 py-2 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5 text-[#c9a020] shrink-0" />
              <p className="text-[11px] text-[#9a7a18]">
                <span className="font-bold">{nextMilestone.count - totalReferrals} more</span> members to unlock ₦{nextMilestone.reward.toLocaleString("en-NG")} milestone
              </p>
            </div>
          )}

          <button
            onClick={handleLeadershipTransfer}
            disabled={leadershipTransfer.isPending || leadershipBalance <= 0}
            className="w-full bg-gradient-to-r from-[#0f2240]0 to-[#9a7a18] text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#c9a020]/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Crown className="w-4 h-4" />
            {leadershipTransfer.isPending ? "Transferring..." : "Claim Leadership Reward"}
          </button>
          <p className="text-xs text-center text-white/80">Milestone rewards are credited when team size thresholds are reached</p>
        </div>

        {/* Breakdown */}
        <h2 className="text-sm font-bold text-slate-700 pt-1">Earnings Breakdown</h2>
        <div className="space-y-3">
          {stats.map(({ label, sub, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-white/40 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 font-medium leading-tight">{label}</p>
                <p className="text-lg font-black text-slate-800">
                  ₦{value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-white/80 leading-tight mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Leadership Milestones Table */}
        <div className="bg-white rounded-2xl border border-white/40 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-[#b08c10]" />
            <h2 className="text-sm font-bold text-slate-700">Leadership Milestones</h2>
          </div>
          <div className="space-y-2">
            {MILESTONES.map((m) => {
              const reached = totalReferrals >= m.count;
              return (
                <div key={m.count} className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${reached ? "bg-[#132840] border border-white/35" : "bg-[#0f2240] border border-white/40"}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${reached ? "bg-[#132840]0 text-white" : "bg-[#2a5585] text-white/90"}`}>
                      {reached ? "✓" : m.count}
                    </div>
                    <span className={`font-semibold ${reached ? "text-white" : "text-white/90"}`}>{m.count} members</span>
                  </div>
                  <span className={`font-bold ${reached ? "text-[#9a7a18]" : "text-white/80"}`}>
                    ₦{m.reward.toLocaleString("en-NG")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-[#132840] border border-white/40 rounded-2xl p-4 space-y-1">
          <p className="text-xs font-bold text-white">How it works</p>
          <ul className="text-xs text-[#9a7a18] space-y-1 list-disc list-inside leading-relaxed">
            <li>Earn <strong>5%</strong> of each referred member's first level purchase</li>
            <li>Earn <strong>1%</strong> from every level purchase made by your downline members</li>
            <li>Reach team size milestones to unlock one-time Leadership Rewards</li>
            <li>Transfer accumulated balance to your main wallet, then withdraw</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
