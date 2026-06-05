import { useGetReferralsSummary, getGetReferralsSummaryQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Gift, TrendingUp } from "lucide-react";

export default function Earnings() {
  const { data: refSummary, isLoading } = useGetReferralsSummary({
    query: { queryKey: getGetReferralsSummaryQueryKey() }
  });

  if (isLoading || !refSummary) {
    return <div className="p-4 space-y-4"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  const chartData = [
    { name: "Referral Bonus", value: refSummary.referralBonus, color: "#8b5cf6" },
    { name: "Subordinate Commission", value: refSummary.subordinateCommission, color: "#ec4899" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-6"
    >
      <h1 className="text-2xl font-bold text-slate-800">Earnings Breakdown</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="font-bold text-slate-700 mb-4">Team Performance</h2>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-center space-x-6 mt-2">
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
            <span className="text-gray-600">Referral</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
            <span className="text-gray-600">Commission</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mr-4">
            <Gift className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 font-medium">Total Referral Bonus</div>
            <div className="text-lg font-bold text-slate-800">{refSummary.referralBonus.toLocaleString()} NGN</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 font-medium">Subordinate Commission</div>
            <div className="text-lg font-bold text-slate-800">{refSummary.subordinateCommission.toLocaleString()} NGN</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-gray-500 font-medium">Total Team Size</div>
            <div className="text-lg font-bold text-slate-800">{refSummary.totalReferrals} Members</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
