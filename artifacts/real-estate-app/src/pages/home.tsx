import { 
  useGetUserProfile, 
  useGetUserEarnings, 
  getGetUserProfileQueryKey, 
  getGetUserEarningsQueryKey 
} from "@workspace/api-client-react";
import { RefreshCw, MessageCircle, Wallet, Shield, Medal, Coins, CreditCard, CalendarDays, CheckCircle2, Clock, Calendar, Users, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function Home() {
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

  return (
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
              {profile.username?.slice(0,2).toUpperCase() || 'XM'}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">{profile.phone}</span>
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
            <span className="text-2xl font-bold">{profile.balance.toFixed(2)}</span>
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
          <button className="bg-white/20 hover:bg-white/30 transition-colors py-2.5 rounded-full text-sm font-semibold backdrop-blur-sm border border-white/10">
            Withdraw
          </button>
        </div>
      </div>

      {/* ACCOUNT OVERVIEW */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">Account Overview</h2>
        
        <div className="grid grid-cols-3 gap-2">
          {/* Card 1 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">Yesterday's Earnings</span>
            <span className="text-sm font-bold text-slate-800">{earnings.yesterdayEarnings}</span>
            <Coins className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 2 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">Today's Earnings</span>
            <span className="text-sm font-bold text-slate-800">{earnings.todayEarnings}</span>
            <CreditCard className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 3 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">Total Earnings</span>
            <span className="text-sm font-bold text-slate-800">{earnings.totalEarnings}</span>
            <Wallet className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 4 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">This Week's Earnings</span>
            <span className="text-sm font-bold text-slate-800">{earnings.weeklyEarnings}</span>
            <CalendarDays className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 5 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">Completed Today</span>
            <span className="text-sm font-bold text-slate-800">{earnings.completedToday}</span>
            <CheckCircle2 className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 6 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">Remaining Today</span>
            <span className="text-sm font-bold text-slate-800">{earnings.remainingToday}</span>
            <Clock className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 7 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">This Month's Earnings</span>
            <span className="text-sm font-bold text-slate-800">{earnings.monthlyEarnings}</span>
            <Calendar className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 8 */}
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-gray-500 font-medium leading-tight">Subordinate Task Commission</span>
            <span className="text-sm font-bold text-slate-800">{earnings.subordinateCommission}</span>
            <Users className="absolute bottom-2 right-2 w-8 h-8 text-gray-100 -z-0" />
          </div>
          {/* Card 9 */}
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
  );
}
