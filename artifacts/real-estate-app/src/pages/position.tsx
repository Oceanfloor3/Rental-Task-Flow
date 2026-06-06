import { motion } from "framer-motion";
import { Diamond, Shield, Award, Star, Crown, Zap, Lock, CheckCircle2 } from "lucide-react";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";

const POSITIONS = [
  {
    key: "V1",
    label: "V1 Junior",
    fullLabel: "Junior Position (V1)",
    icon: Shield,
    color: "bg-blue-100 text-blue-600",
    activeColor: "from-blue-500 to-indigo-600",
    borderColor: "border-blue-200",
    securityDeposit: "2,450,000",
    dailyTasks: 50,
    dailyIncome: "12,500",
    description: "Entry level position",
  },
  {
    key: "V2",
    label: "V2 Senior",
    fullLabel: "Senior Manager (V2)",
    icon: Award,
    color: "bg-indigo-100 text-indigo-600",
    activeColor: "from-indigo-500 to-purple-600",
    borderColor: "border-indigo-200",
    securityDeposit: "5,000,000",
    dailyTasks: 100,
    dailyIncome: "25,000",
    description: "Senior management level",
  },
  {
    key: "V3",
    label: "V3 Director",
    fullLabel: "Director (V3)",
    icon: Star,
    color: "bg-purple-100 text-purple-600",
    activeColor: "from-purple-500 to-pink-600",
    borderColor: "border-purple-200",
    securityDeposit: "10,000,000",
    dailyTasks: 150,
    dailyIncome: "50,000",
    description: "Director level position",
  },
  {
    key: "V4",
    label: "V4 Executive",
    fullLabel: "Executive (V4)",
    icon: Zap,
    color: "bg-amber-100 text-amber-600",
    activeColor: "from-amber-500 to-orange-600",
    borderColor: "border-amber-200",
    securityDeposit: "20,000,000",
    dailyTasks: 200,
    dailyIncome: "100,000",
    description: "Executive level position",
  },
  {
    key: "V5",
    label: "V5 Chairman",
    fullLabel: "Chairman (V5)",
    icon: Crown,
    color: "bg-rose-100 text-rose-600",
    activeColor: "from-rose-500 to-red-600",
    borderColor: "border-rose-200",
    securityDeposit: "50,000,000",
    dailyTasks: 300,
    dailyIncome: "250,000",
    description: "Highest level position",
  },
];

function detectUserLevel(position?: string | null): string {
  if (!position) return "V1";
  const upper = position.toUpperCase();
  if (upper.includes("V5")) return "V5";
  if (upper.includes("V4")) return "V4";
  if (upper.includes("V3")) return "V3";
  if (upper.includes("V2")) return "V2";
  return "V1";
}

export default function Position() {
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });

  const userLevel = detectUserLevel(profile?.position);
  const currentPos = POSITIONS.find(p => p.key === userLevel) || POSITIONS[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-5 pb-28"
    >
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold text-slate-800">Your Position</h1>
        <p className="text-gray-500 text-sm mt-1">Upgrade your position to earn higher daily rewards</p>
      </div>

      {/* Current position card */}
      <div className={`bg-gradient-to-br ${currentPos.activeColor} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-8 -mb-8 blur-xl" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="text-white/80 text-xs font-semibold uppercase tracking-widest">Current Level</div>
            <div className="text-3xl font-black mt-1">{currentPos.label}</div>
            <div className="mt-2 inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
              {profile?.position || currentPos.fullLabel}
            </div>
          </div>
          <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
            <Diamond className="w-10 h-10 text-white fill-white/20" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5 relative z-10">
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-white/70 text-xs">Security Deposit</div>
            <div className="text-white font-bold text-sm mt-0.5">₦{currentPos.securityDeposit}</div>
          </div>
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <div className="text-white/70 text-xs">Daily Tasks</div>
            <div className="text-white font-bold text-sm mt-0.5">{currentPos.dailyTasks} tasks</div>
          </div>
        </div>
      </div>

      {/* All positions list */}
      <div>
        <h2 className="font-bold text-slate-800 px-1 mb-3">All Position Levels</h2>
        <div className="space-y-3">
          {POSITIONS.map((pos, idx) => {
            const Icon = pos.icon;
            const isActive = pos.key === userLevel;
            const isUnlocked = POSITIONS.indexOf(currentPos) >= idx;

            return (
              <motion.div
                key={pos.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={`bg-white rounded-xl shadow-sm border-2 relative overflow-hidden ${
                  isActive ? pos.borderColor : "border-gray-100"
                } ${!isUnlocked ? "opacity-70" : ""}`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${pos.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{pos.label}</h3>
                        <p className="text-xs text-gray-500">{pos.description}</p>
                      </div>
                    </div>
                    {isActive ? (
                      <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                      </div>
                    ) : !isUnlocked ? (
                      <Lock className="w-4 h-4 text-gray-300" />
                    ) : (
                      <div className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
                        Unlocked
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">Deposit</div>
                      <div className="text-xs font-bold text-slate-700">₦{pos.securityDeposit}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">Daily Tasks</div>
                      <div className="text-xs font-bold text-slate-700">{pos.dailyTasks}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                      <div className="text-xs text-gray-400 mb-0.5">Daily Income</div>
                      <div className="text-xs font-bold text-green-600">₦{pos.dailyIncome}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
