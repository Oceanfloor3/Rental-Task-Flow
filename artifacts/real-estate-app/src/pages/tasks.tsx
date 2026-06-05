import { useState } from "react";
import { useGetTasks, useGetTasksSummary, useCompleteTask, getGetTasksQueryKey, getGetTasksSummaryQueryKey } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Home, MapPin, TrendingUp, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Tasks() {
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    query: { queryKey: getGetTasksQueryKey() }
  });
  
  const { data: summary, isLoading: isLoadingSummary } = useGetTasksSummary({
    query: { queryKey: getGetTasksSummaryQueryKey() }
  });

  const completeTaskMutation = useCompleteTask();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [animatingId, setAnimatingId] = useState<number | null>(null);

  const handleComplete = (id: number) => {
    if (completeTaskMutation.isPending) return;
    setAnimatingId(id);
    completeTaskMutation.mutate({ id }, {
      onSuccess: (res) => {
        toast({
          title: "Task Completed!",
          description: res.message || `You earned ${res.reward} NGN!`,
          duration: 3000,
        });
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTasksSummaryQueryKey() });
        setTimeout(() => setAnimatingId(null), 1000);
      },
      onError: (err: any) => {
        setAnimatingId(null);
        toast({
          title: "Error",
          description: err?.message || "Failed to complete task.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoadingTasks || isLoadingSummary || !tasks || !summary) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const progress = summary.totalTasks > 0 ? (summary.completedToday / summary.totalTasks) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 space-y-6"
    >
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Today's Rental Tasks</h1>
        <div className="flex justify-between text-sm mb-2 text-slate-600">
          <span>Progress</span>
          <span className="font-semibold text-blue-600">{summary.completedToday} / {summary.totalTasks}</span>
        </div>
        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-blue-500 rounded-full"
          />
        </div>
        <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-xl">
          <div className="flex items-center text-blue-800">
            <TrendingUp className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">Estimated Reward</span>
          </div>
          <span className="font-bold text-blue-700">{summary.totalRewardToday} NGN</span>
        </div>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div 
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative"
            >
              {task.status === 'completed' && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
                  <div className="bg-green-50 text-green-600 px-4 py-2 rounded-full font-bold flex items-center shadow-sm">
                    <CheckCircle className="w-5 h-5 mr-2" /> Completed
                  </div>
                </div>
              )}
              
              <div className="flex p-4">
                <div className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  <img src={task.imageUrl || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"} alt={task.propertyName} className="w-full h-full object-cover" />
                </div>
                <div className="ml-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 leading-tight">{task.propertyName}</h3>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Home className="w-3 h-3 mr-1" /> {task.propertyType}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 mr-1" /> {task.location}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm font-bold text-orange-500">{task.reward} NGN</div>
                    <button 
                      onClick={() => handleComplete(task.id)}
                      disabled={task.status === 'completed' || animatingId === task.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {animatingId === task.id ? 'Processing...' : 'Rent Now'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {tasks.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No tasks available today.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
