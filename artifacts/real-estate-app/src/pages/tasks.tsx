import { useState, useEffect } from "react";
import { useGetTasks, useGetTasksSummary, useCompleteTask, getGetTasksQueryKey, getGetTasksSummaryQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Home, MapPin, TrendingUp, AlertCircle, Loader2, Lock, ShieldCheck, PhoneCall, Clock, Coffee, Gem, Watch, Coins, Diamond } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function isWeekend(): boolean {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  return day === 0 || day === 6;
}

function getNextMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 7 - day + 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  return monday.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function useResetCountdown() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setUTCHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80",
  "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80",
  "https://images.unsplash.com/photo-1504615755583-2916b52192a3?w=400&q=80",
  "https://images.unsplash.com/photo-1633363994090-4587b69e7775?w=400&q=80",
];

function getImage(task: { imageUrl?: string | null; id: number }) {
  if (task.imageUrl && (task.imageUrl.startsWith("http") || task.imageUrl.startsWith("/"))) return task.imageUrl;
  return PROPERTY_IMAGES[task.id % PROPERTY_IMAGES.length];
}

type QuestCategory = "Diamond" | "Gold Jewelry" | "Gemstone" | "Luxury Watch" | "property";

function getQuestCategory(propertyType: string): QuestCategory {
  if (propertyType === "Diamond") return "Diamond";
  if (propertyType === "Gold Jewelry") return "Gold Jewelry";
  if (propertyType === "Gemstone") return "Gemstone";
  if (propertyType === "Luxury Watch") return "Luxury Watch";
  return "property";
}

const CATEGORY_META: Record<QuestCategory, {
  icon: React.ElementType;
  iconClass: string;
  badge: string;
  badgeClass: string;
  action: string;
}> = {
  "Diamond":      { icon: Diamond, iconClass: "text-blue-400",   badge: "Diamond",       badgeClass: "bg-blue-50 text-blue-600",    action: "PROMOTE NOW" },
  "Gold Jewelry": { icon: Coins,   iconClass: "text-yellow-500", badge: "Gold Jewelry",  badgeClass: "bg-yellow-50 text-yellow-700", action: "PROMOTE NOW" },
  "Gemstone":     { icon: Gem,     iconClass: "text-purple-400", badge: "Gemstone",      badgeClass: "bg-purple-50 text-purple-600", action: "PROMOTE NOW" },
  "Luxury Watch": { icon: Watch,   iconClass: "text-slate-500",  badge: "Luxury Watch",  badgeClass: "bg-slate-50 text-slate-600",  action: "PROMOTE NOW" },
  "property":     { icon: Home,    iconClass: "text-gray-400",   badge: "",              badgeClass: "",                             action: "PROMOTE NOW" },
};

export default function Tasks() {
  const { user } = useAuth();
  const today = getToday();
  const resetCountdown = useResetCountdown();

  const { data: tasks, isLoading: isLoadingTasks, isError: isErrorTasks } = useGetTasks({
    query: {
      queryKey: [...getGetTasksQueryKey(), today],
      enabled: !!user?.isActive,
      staleTime: 0,
      refetchOnWindowFocus: true,
    }
  });

  const { data: summary, isLoading: isLoadingSummary } = useGetTasksSummary({
    query: {
      queryKey: [...getGetTasksSummaryQueryKey(), today],
      enabled: !!user?.isActive,
      staleTime: 0,
      refetchOnWindowFocus: true,
    }
  });

  const completeTaskMutation = useCompleteTask();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  const handleComplete = (id: number) => {
    if (completeTaskMutation.isPending || animatingId !== null) return;
    setAnimatingId(id);
    completeTaskMutation.mutate({ id }, {
      onSuccess: (res) => {
        toast({
          title: "✅ Task Completed!",
          description: res.message || `You earned ₦${res.reward?.toLocaleString()} NGN!`,
          duration: 3000,
        });
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
        setTimeout(() => setAnimatingId(null), 600);
      },
      onError: (err: any) => {
        setAnimatingId(null);
        toast({
          title: "Error",
          description: err?.message || "Failed to complete task.",
          variant: "destructive",
        });
      },
    });
  };

  if (isWeekend()) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 flex flex-col items-center justify-center min-h-[75vh] text-center"
      >
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-5">
          <Coffee className="w-9 h-9 text-blue-400" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Weekend Rest Day</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
          Daily quests run <span className="font-semibold text-slate-700">Monday – Friday</span> only. Take a well-deserved break and come back on Monday!
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4 mb-6 w-full max-w-xs">
          <p className="text-[11px] text-blue-500 font-semibold uppercase tracking-wide mb-1">Next quests available</p>
          <p className="text-base font-bold text-blue-700">{getNextMonday()}</p>
        </div>
        <div className="w-full max-w-xs bg-amber-50 rounded-2xl p-4 border border-amber-100 text-left">
          <p className="text-xs font-bold text-amber-800 mb-2">While you wait…</p>
          <p className="text-xs text-slate-600 mb-1">• Check your earnings in the Wallet tab</p>
          <p className="text-xs text-slate-600 mb-1">• Invite friends to grow your team</p>
          <p className="text-xs text-slate-600">• Review the Learning Hub for tips</p>
        </div>
      </motion.div>
    );
  }

  if (!user?.isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 flex flex-col items-center justify-center min-h-[75vh] text-center"
      >
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-5">
          <Lock className="w-9 h-9 text-amber-500" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Tasks Locked</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
          Your account is pending activation. Complete your payment to unlock daily rental tasks and start earning commissions.
        </p>

        <div className="w-full max-w-xs space-y-3 mb-6">
          <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-4 text-left">
            <ShieldCheck className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 1 — Make Payment</p>
              <p className="text-xs text-slate-500 mt-0.5">Transfer your security deposit to the account details provided by support.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-4 text-left">
            <PhoneCall className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 2 — Contact Support</p>
              <p className="text-xs text-slate-500 mt-0.5">Send your payment proof via WhatsApp or Telegram so we can activate your account.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-green-50 rounded-2xl p-4 text-left">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 3 — Start Earning</p>
              <p className="text-xs text-slate-500 mt-0.5">Once activated, return here to complete daily tasks and earn commissions every day.</p>
            </div>
          </div>
        </div>

        <a
          href="/help"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white font-bold px-6 py-3 rounded-2xl shadow-sm active:scale-95 transition-transform text-sm"
        >
          <PhoneCall className="w-4 h-4" /> Contact Support
        </a>
      </motion.div>
    );
  }

  if (isLoadingTasks || isLoadingSummary) {
    return (
      <div className="p-4 space-y-4 pb-28">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
          <div className="h-5 bg-gray-100 rounded w-40 mb-4" />
          <div className="h-2.5 bg-gray-100 rounded-full w-full mb-3" />
          <div className="h-10 bg-gray-100 rounded-xl" />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-4 animate-pulse">
            <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
              <div className="flex justify-between items-center mt-3">
                <div className="h-4 bg-gray-100 rounded w-20" />
                <div className="h-8 bg-gray-100 rounded-lg w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isErrorTasks) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="w-14 h-14 text-red-300 mb-3" />
        <h3 className="font-bold text-slate-700 text-lg">Could not load tasks</h3>
        <p className="text-gray-400 text-sm mt-1">Please try logging in again</p>
      </div>
    );
  }

  const taskList = tasks ?? [];
  const completed = taskList.filter(t => t.status === "completed").length;
  const total = summary?.totalTasks ?? taskList.length;
  const remaining = summary?.remainingToday ?? Math.max(0, total - completed);
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const earnedToday = summary?.totalRewardToday ?? 0;

  const hasNoLevel = !user?.activatedLevels || user.activatedLevels.length === 0;

  if (hasNoLevel) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 flex flex-col items-center justify-center min-h-[75vh] text-center"
      >
        <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
          <Lock className="w-9 h-9 text-amber-500" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">No Active Rank Level</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
          You need to purchase a Rank Level to unlock your daily rental quests and start earning commissions.
        </p>

        <div className="w-full max-w-xs space-y-3 mb-6">
          <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-4 text-left">
            <ShieldCheck className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 1 — Choose a Rank Level</p>
              <p className="text-xs text-slate-500 mt-0.5">Visit the Position page to view available rank levels and their daily earning potential.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-4 text-left">
            <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 2 — Complete Payment</p>
              <p className="text-xs text-slate-500 mt-0.5">Pay for your chosen rank level via the secure Korapay checkout.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-green-50 rounded-2xl p-4 text-left">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 3 — Start Earning Daily</p>
              <p className="text-xs text-slate-500 mt-0.5">Return here after payment to complete your daily rental quests and earn commissions every working day.</p>
            </div>
          </div>
        </div>

        <a
          href="/position"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white font-bold px-6 py-3 rounded-2xl shadow-sm active:scale-95 transition-transform text-sm"
        >
          <TrendingUp className="w-4 h-4" /> View Rank Levels
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4 pb-28"
    >
      {/* Summary card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Today's Rental Quests</h1>
            {total > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{total} quest{total === 1 ? "" : "s"} assigned to your level</p>
            )}
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            {completed}/{total} done
          </span>
        </div>

        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden my-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-[#C9973B] to-[#9E7A20] rounded-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
            <div>
              <p className="text-[10px] text-green-700 font-medium">Earned Today</p>
              <p className="text-sm font-bold text-green-800">₦{Number(earnedToday).toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-[10px] text-orange-700 font-medium">Remaining</p>
              <p className="text-sm font-bold text-orange-800">{remaining} tasks</p>
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] text-amber-800 font-medium">Resets In</p>
              <p className="text-sm font-bold text-amber-900 tabular-nums">{resetCountdown}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {taskList.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-green-300" />
            <p className="font-semibold text-slate-600">All tasks complete!</p>
            <p className="text-sm mt-1">Come back tomorrow for new rental tasks.</p>
          </div>
        ) : (
          <AnimatePresence>
            {taskList.map((task, idx) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden relative ${
                  task.status === "completed" ? "border-green-100" : "border-gray-100"
                }`}
              >
                {task.status === "completed" && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-1.5 rounded-full font-bold text-sm flex items-center shadow-sm">
                      <CheckCircle2 className="w-4 h-4 mr-1.5" /> Completed
                    </div>
                  </div>
                )}

                {(() => {
                  const cat = getQuestCategory(task.propertyType ?? "");
                  const meta = CATEGORY_META[cat];
                  const TypeIcon = meta.icon;
                  return (
                    <div className="flex p-3 gap-3">
                      <div className="w-[88px] h-[88px] rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        <img
                          src={getImage(task)}
                          alt={task.propertyName}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {meta.badge && (
                              <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${meta.badgeClass}`}>
                                {meta.badge}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1">
                            {task.propertyName}
                          </h3>
                          <div className="flex items-center text-xs text-gray-400 mt-0.5 gap-1">
                            <TypeIcon className={`w-3 h-3 shrink-0 ${meta.iconClass}`} />
                            <span className="truncate">{task.propertyType}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-400 mt-0.5 gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{task.location}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-extrabold text-orange-500">
                            ₦{Number(task.reward).toLocaleString()}
                          </div>
                          <button
                            onClick={() => handleComplete(task.id)}
                            disabled={task.status === "completed" || animatingId !== null}
                            className="bg-gradient-to-r from-[#C9973B] to-[#8B5E10] hover:from-[#A07830] hover:to-[#7A4F0C] active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                          >
                            {animatingId === task.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Processing…</>
                            ) : (
                              meta.action
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
