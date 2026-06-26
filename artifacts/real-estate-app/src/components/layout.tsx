import { Link, useLocation } from "wouter";
import { Home, FileText, Diamond, BarChart3, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/tasks", label: "Quests", icon: FileText },
    { href: "/position", label: "Ranks", icon: Diamond },
    { href: "/earnings", label: "Income", icon: BarChart3 },
    { href: "/my", label: "Profile", icon: User },
  ];

  return (
    <div className="h-screen bg-[#EDD898] flex justify-center overflow-hidden">
      <div className="w-full max-w-[430px] bg-gradient-to-b from-[#F5E4B5] to-[#FFF8E7] shadow-2xl flex flex-col h-full">
        
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-1 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9973B] to-[#8B5E10] flex items-center justify-center shadow-sm">
              <Diamond className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-black text-[#8B5E10] tracking-widest uppercase">RE Invest</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-white/80 hover:bg-red-50 hover:text-red-500 text-amber-900/70 transition-colors px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-amber-200/70 backdrop-blur-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
          {children}
        </main>
        
        {/* Bottom nav — always in normal flow, never overlaid */}
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
