import { Link, useLocation } from "wouter";
import { Home, FileText, Diamond, BarChart3, User, LogOut, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useOverlay } from "@/contexts/OverlayContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { NotificationPanel } from "@/components/NotificationPanel";
import { motion, AnimatePresence } from "framer-motion";

function NotificationPopup() {
  const { popup } = useNotifications();
  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          key={popup.id}
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed top-2 left-0 right-0 mx-auto z-[400] px-3"
          style={{ maxWidth: 430 }}
        >
          <div className="bg-slate-900 rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 border border-white/10">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight truncate">{popup.title}</p>
              <p className="text-white/60 text-xs mt-0.5 leading-relaxed line-clamp-2">{popup.message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { overlayOpen } = useOverlay();
  const { unreadCount, showPanel, setShowPanel } = useNotifications();

  const onDashboard = location === "/" && !overlayOpen;

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/tasks", label: "Quests", icon: FileText },
    { href: "/position", label: "Ranks", icon: Diamond },
    { href: "/earnings", label: "Income", icon: BarChart3 },
    { href: "/my", label: "Profile", icon: User },
  ];

  return (
    <div className="h-screen bg-[#EDD898] flex justify-center overflow-hidden">
      <div className="w-full max-w-[430px] bg-gradient-to-b from-[#F5E4B5] to-[#FFF8E7] shadow-2xl flex flex-col h-full relative">

        {/* Notification popup toast — fixed within app container */}
        <NotificationPopup />

        {/* Notification panel (slides down) */}
        <NotificationPanel />

        {/* Top bar */}
        <div className={`relative z-[200] shrink-0 flex items-center justify-between px-4 bg-[#F5E4B5]/95 backdrop-blur-sm transition-all duration-200 ${onDashboard ? "pt-4 pb-1" : "pt-2 pb-2"}`}>
          {/* Left: logo on dashboard, empty spacer elsewhere */}
          {onDashboard ? (
            <div className="flex items-center">
              <img src="/logo.png" alt="MeridianFlow" className="h-16 w-16 object-contain drop-shadow-sm" />
            </div>
          ) : (
            <div />
          )}

          {/* Right: bell + logout */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white/80 hover:bg-amber-50 border border-amber-200/70 shadow-sm transition-colors"
            >
              <Bell className="w-4 h-4 text-amber-800" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {/* Logout — dashboard only */}
            {onDashboard && (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 bg-white/80 hover:bg-red-50 hover:text-red-500 text-amber-900/70 transition-colors px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-amber-200/70 backdrop-blur-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
          {children}
        </main>

        {/* Bottom nav */}
        <nav className="shrink-0 w-full bg-white/95 backdrop-blur-sm border-t border-amber-100 flex justify-around items-center h-[70px] px-2 shadow-[0_-4px_24px_rgba(180,120,20,0.10)]">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all",
                  isActive ? "text-[#C9973B]" : "text-gray-400 hover:text-amber-500"
                )}
              >
                {isActive ? (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-10 h-10 rounded-full bg-amber-50" />
                    <item.icon className="relative w-5 h-5 fill-amber-400/30 stroke-[#C9973B]" strokeWidth={2} />
                  </div>
                ) : (
                  <item.icon className="w-5 h-5" strokeWidth={1.5} />
                )}
                <span className={cn("text-[10px] tracking-tight", isActive ? "font-bold text-[#C9973B]" : "font-medium")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
