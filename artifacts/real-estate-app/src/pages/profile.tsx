import { motion } from "framer-motion";
import { User, Settings, Shield, Bell, HelpCircle, LogOut } from "lucide-react";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";

export default function Profile() {
  const { data: profile } = useGetUserProfile({
    query: { queryKey: getGetUserProfileQueryKey() }
  });

  if (!profile) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-gray-50 min-h-screen"
    >
      <div className="bg-gradient-to-b from-purple-600 to-indigo-700 pt-12 pb-20 px-6 text-center text-white relative">
        <div className="absolute top-4 right-4">
          <Settings className="w-6 h-6 text-white/80" />
        </div>
        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white/30 backdrop-blur-sm p-1 mb-4">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold">
              {profile.username?.slice(0,2).toUpperCase() || 'XM'}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold">{profile.phone}</h1>
        <p className="text-white/80 text-sm mt-1">Referral Code: REF-{profile.id}A8X</p>
      </div>

      <div className="-mt-12 px-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 flex justify-around text-center divide-x border border-gray-100">
          <div className="px-2 w-1/2">
            <div className="text-xs text-gray-500 font-medium mb-1">Balance</div>
            <div className="font-bold text-slate-800 text-lg">{profile.balance.toFixed(2)}</div>
          </div>
          <div className="px-2 w-1/2">
            <div className="text-xs text-gray-500 font-medium mb-1">Security Deposit</div>
            <div className="font-bold text-slate-800 text-lg">{profile.securityDeposit}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center px-4 py-4 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mr-3">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 font-medium text-slate-700">Personal Information</div>
            <div className="text-gray-400">&gt;</div>
          </div>
          <div className="flex items-center px-4 py-4 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 mr-3">
              <Shield className="w-4 h-4" />
            </div>
            <div className="flex-1 font-medium text-slate-700">Account Security</div>
            <div className="text-gray-400">&gt;</div>
          </div>
          <div className="flex items-center px-4 py-4 border-b border-gray-50 active:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mr-3">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 font-medium text-slate-700">Notifications</div>
            <div className="text-gray-400">&gt;</div>
          </div>
          <div className="flex items-center px-4 py-4 active:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 mr-3">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 font-medium text-slate-700">Help Center</div>
            <div className="text-gray-400">&gt;</div>
          </div>
        </div>

        <button className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-center text-red-500 font-bold active:bg-red-50 transition-colors mt-6">
          <LogOut className="w-5 h-5 mr-2" /> Log Out
        </button>
      </div>
    </motion.div>
  );
}
