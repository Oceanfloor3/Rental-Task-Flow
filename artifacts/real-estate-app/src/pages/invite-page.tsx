import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetUserProfile,
  getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, UserPlus, Copy, Check, Share2, Gift, TrendingUp, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InvitePage() {
  const [, navigate] = useLocation();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const p = profile as any;

  const base = window.location.origin + import.meta.env.BASE_URL;
  const inviteLink = `${base.replace(/\/$/, "")}/register?ref=${p?.referralCode || ""}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      toast({ title: "Copied!", description: "Invite link copied to clipboard" });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Real Estate Investment",
          text: `Use my referral code ${p?.referralCode} to sign up and start earning daily!`,
          url: inviteLink,
        });
      } catch { /* dismissed */ }
    } else {
      handleCopy();
    }
  };

  const benefits = [
    { icon: Gift, color: "bg-amber-100 text-amber-600", title: "5% Referral Bonus", desc: "Earn 5% of your referee's first level purchase" },
    { icon: TrendingUp, color: "bg-amber-100 text-amber-700", title: "1% Level Commission", desc: "Get 1% of every level purchase your downline members make" },
    { icon: Users, color: "bg-blue-100 text-blue-600", title: "Build Your Team", desc: "Grow your passive income as your team grows" },
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
          <UserPlus className="w-5 h-5 text-pink-600" />
          <h1 className="text-lg font-bold text-slate-800">Invite Friends</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        {/* Hero */}
        <div className="bg-gradient-to-br from-[#C9973B] via-[#B8820A] to-[#8B5E10] rounded-2xl p-6 text-white shadow-lg text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black">Earn Together</h2>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">
            Share your link. When friends join and invest, you earn automatically.
          </p>
        </div>

        {/* Referral Code */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Your Referral Code</p>
          <div className="bg-amber-50 rounded-xl px-4 py-3.5 flex items-center justify-between border border-amber-100">
            <span className="font-mono text-2xl font-black text-amber-800 tracking-widest">
              {p?.referralCode || "—"}
            </span>
            <button
              onClick={handleCopy}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-amber-100 transition-colors"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-amber-500" />}
            </button>
          </div>

          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-1">Invitation Link</p>
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2 border border-gray-100">
            <span className="text-xs text-gray-500 flex-1 truncate font-mono">{inviteLink}</span>
            <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-200 shrink-0 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            </button>
          </div>
          {copied && <p className="text-xs text-green-600 font-semibold text-center">Copied to clipboard!</p>}

          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-[#C9973B] via-[#B8820A] to-[#8B5E10] text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all mt-1"
          >
            <Share2 className="w-4 h-4" /> Share Invite Link
          </button>
        </div>

        {/* Benefits */}
        <h2 className="text-sm font-bold text-slate-700">Your Referral Benefits</h2>
        <div className="space-y-3">
          {benefits.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
