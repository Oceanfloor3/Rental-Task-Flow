import { motion } from "framer-motion";
import { Diamond, Shield, Award, ChevronRight, Lock } from "lucide-react";

export default function Position() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-6"
    >
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-slate-800">Your Position</h1>
        <p className="text-gray-500 text-sm mt-1">Upgrade your position to earn higher daily rewards</p>
      </div>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="text-white/80 text-sm font-medium">Current Level</div>
            <div className="text-3xl font-bold mt-1 flex items-center">
              <Shield className="w-6 h-6 mr-2 fill-white/20" /> V1
            </div>
            <div className="mt-2 inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              Senior Position
            </div>
          </div>
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
            <Diamond className="w-10 h-10 text-white fill-white/20" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-slate-800 px-1">Available Positions</h2>
        
        {/* V1 Active */}
        <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-indigo-100 relative">
          <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">ACTIVE</div>
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mr-3">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">V1 Senior</h3>
              <p className="text-xs text-gray-500">Security Deposit: 2,450,000 NGN</p>
            </div>
          </div>
          <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-lg">
            <span className="text-slate-600">Daily Tasks</span>
            <span className="font-bold">50</span>
          </div>
        </div>

        {/* V2 Locked */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative opacity-80">
          <div className="absolute top-4 right-4 text-gray-400">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">V2 Director</h3>
              <p className="text-xs text-gray-500">Security Deposit: 5,000,000 NGN</p>
            </div>
          </div>
          <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-lg mb-3">
            <span className="text-slate-600">Daily Tasks</span>
            <span className="font-bold">100</span>
          </div>
          <button className="w-full bg-slate-100 text-slate-600 font-semibold py-2.5 rounded-lg flex items-center justify-center">
            Apply for Position <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
