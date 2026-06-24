import { Link, useLocation } from "wouter";
import { Home, FileText, Diamond, BarChart3, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/tasks", label: "Tasks", icon: FileText },
    { href: "/position", label: "Position", icon: Diamond },
    { href: "/earnings", label: "Earnings", icon: BarChart3 },
    { href: "/my", label: "My", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center overflow-hidden">
      <div className="w-full max-w-[600px] bg-gradient-to-b from-[#e1dff3] to-[#f3f4fa] relative min-h-screen shadow-2xl flex flex-col">
        
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1 z-20">
          <span className="text-xs font-bold text-purple-700 tracking-wide uppercase opacity-70">RE Invest</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-white/70 hover:bg-red-50 hover:text-red-500 text-gray-500 transition-colors px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-white/80 backdrop-blur-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar relative z-10 pb-[70px]">
          {children}
        </main>
        
        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-[70px] px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors", isActive ? "text-blue-500" : "text-gray-400 hover:text-gray-600")}>
                <item.icon className={cn("w-6 h-6", isActive && "fill-blue-500/20 stroke-blue-500 stroke-2")} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
