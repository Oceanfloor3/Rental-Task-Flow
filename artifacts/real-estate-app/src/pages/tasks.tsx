import { useState, useEffect } from "react";
import { useGetTasks, useGetTasksSummary, useCompleteTask, getGetTasksQueryKey, getGetTasksSummaryQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Home, MapPin, TrendingUp, AlertCircle, Loader2, Lock, ShieldCheck, PhoneCall, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

function getToday() {
  return new Date().toISOString().split("T")[0];
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
  if (task.imageUrl && task.imageUrl.startsWith("http")) return task.imageUrl;
  return PROPERTY_IMAGES[task.id % PROPERTY_IMAGES.length];
}

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

  if (!user?.isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 flex flex-col items-center justify-center min-h-[75vh] text-center"
      >
        <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-5">
          <Lock className="w-9 h-9 text-purple-500" />
        </div>

        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Tasks Locked</h2>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-6">
          Your account is pending activation. Complete your payment to unlock daily rental tasks and start earning commissions.
        </p>

        <div className="w-full max-w-xs space-y-3 mb-6">
          <div className="flex items-start gap-3 bg-purple-50 rounded-2xl p-4 text-left">
            <ShieldCheck className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-700">Step 1 — Make Payment</p>
              <p className="text-xs text-slate-500 mt-0.5">Transfer your security deposit to the account details provided by support.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-indigo-50 rounded-2xl p-4 text-left">
            <PhoneCall className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
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
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow-sm active:scale-95 transition-transform text-sm"
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
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const earnedToday = summary?.totalRewardToday ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-4 pb-28"
    >
      {/* Summary card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-slate-800">Today's Rental Tasks</h1>
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
            {completed}/{total} done
          </span>
        </div>

        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden my-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
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
              <p className="text-sm font-bold text-orange-800">{summary?.remainingToday ?? 0} tasks</p>
            </div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <p className="text-[10px] text-indigo-700 font-medium">Resets In</p>
              <p className="text-sm font-bold text-indigo-800 tabular-nums">{resetCountdown}</p>
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
                      <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1">
                        {task.propertyName}
                      </h3>
                      <div className="flex items-center text-xs text-gray-400 mt-1 gap-1">
                        <Home className="w-3 h-3 shrink-0" />
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
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                      >
                        {animatingId === task.id ? (
                          <><Loader2 className="w-3 h-3 animate-spin" /> Processing…</>
                        ) : (
                          "PROMOTE NOW"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
