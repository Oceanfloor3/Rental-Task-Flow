import {
  useGetReferralsSummary,
  useGetUserEarnings,
  getGetReferralsSummaryQueryKey,
  getGetUserEarningsQueryKey,
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Gift, TrendingUp, Coins, Calendar, CalendarDays, CheckCircle2, Clock } from "lucide-react";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 font-medium truncate">{label}</div>
        <div className="text-base font-bold text-slate-800 truncate">{value}</div>
      </div>
    </div>
  );
}

export default function Earnings() {
  const { data: refSummary, isLoading: isLoadingRef } = useGetReferralsSummary({
    query: { queryKey: getGetReferralsSummaryQueryKey() }
  });
  const { data: earnings, isLoading: isLoadingEarnings } = useGetUserEarnings({
    query: { queryKey: getGetUserEarningsQueryKey() }
  });

  if (isLoadingRef || isLoadingEarnings || !refSummary || !earnings) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  const totalPie = (refSummary.referralBonus || 0) + (refSummary.subordinateCommission || 0);
  const chartData = totalPie > 0
    ? [
        { name: "Referral Bonus", value: refSummary.referralBonus, color: "#C9973B" },
        { name: "Team Commission", value: refSummary.subordinateCommission, color: "#8B5E10" },
      ]
    : [{ name: "No Data", value: 1, color: "#e5e7eb" }];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-5 pb-28"
    >
      <h1 className="text-2xl font-bold text-slate-800 pt-2">Earnings</h1>

      {/* Task Earnings Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Task Earnings</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Daily Earnings", value: `₦${Number(earnings.todayEarnings).toLocaleString()}`, icon: TrendingUp, bg: "bg-green-50 text-green-600" },
            { label: "Previous Day's Earnings", value: `₦${Number(earnings.yesterdayEarnings).toLocaleString()}`, icon: Coins, bg: "bg-amber-50 text-amber-600" },
            { label: "Weekly Earnings", value: `₦${Number(earnings.weeklyEarnings).toLocaleString()}`, icon: CalendarDays, bg: "bg-blue-50 text-blue-600" },
            { label: "Monthly Earnings", value: `₦${Number(earnings.monthlyEarnings).toLocaleString()}`, icon: Calendar, bg: "bg-amber-50 text-amber-700" },
          ].map(({ label, value, icon: Icon, bg }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3.5 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-medium">{label}</div>
                <div className="text-sm font-bold text-slate-800">{value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-600">Accomplished Today: <strong>{earnings.completedToday}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-600">Pending Today: <strong>{earnings.remainingToday}</strong></span>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-xs text-amber-700 font-medium">Total All-Time Quests Earnings</p>
          <p className="text-2xl font-black text-amber-800 mt-0.5">₦{Number(earnings.totalEarnings).toLocaleString()}</p>
        </div>
      </div>

      {/* Team / Referral Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-4">Team Performance</h2>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={75}
                paddingAngle={totalPie > 0 ? 5 : 0}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {totalPie > 0 && <Tooltip formatter={(v: any) => `₦${Number(v).toLocaleString()}`} />}
            </PieChart>
          </ResponsiveContainer>
        </div>
        {totalPie > 0 && (
          <div className="flex justify-center space-x-6 mt-1">
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
              <span className="text-gray-600 text-xs">Referral</span>
            </div>
            <div className="flex items-center text-sm">
              <div className="w-3 h-3 rounded-full bg-pink-500 mr-2" />
              <span className="text-gray-600 text-xs">Commission</span>
            </div>
          </div>
        )}
        {totalPie === 0 && (
          <p className="text-center text-xs text-gray-400 -mt-2">Invite friends to see team earnings here</p>
        )}
      </div>

      <div className="space-y-3">
        <StatCard icon={Gift} label="Total Referral Commission" value={`₦${Number(refSummary.referralBonus).toLocaleString()}`} color="bg-amber-50 text-amber-700" />
        <StatCard icon={TrendingUp} label="Team Commission" value={`₦${Number(refSummary.subordinateCommission).toLocaleString()}`} color="bg-pink-50 text-pink-600" />
        <StatCard icon={Users} label="Total Team Size" value={`${refSummary.totalReferrals} Members`} color="bg-blue-50 text-blue-600" />
      </div>
    </motion.div>
  );
}
