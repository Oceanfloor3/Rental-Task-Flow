import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, TrendingUp, Shield, Users, ChevronDown, X, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const NAV_LINKS = ["Home", "About", "FAQ"] as const;
type NavLink = typeof NAV_LINKS[number];

const ABOUT_CONTENT = {
  title: "About MeridianFlow",
  body: "MeridianFlow is a next-generation real estate investment platform that lets everyday investors access premium property assets. Our click-to-earn model lets you earn daily commissions by renting virtual properties — no expertise required. Built on transparency, trust, and consistent returns.",
};

const FAQ_ITEMS = [
  { q: "How do I start earning?", a: "Register an account, choose a property tier, and complete your daily rental tasks to unlock your commission for the day." },
  { q: "When are commissions paid?", a: "Commissions are credited to your wallet daily after you complete your rental tasks. Withdrawals can be requested at any time." },
  { q: "Is my investment secure?", a: "Yes. All funds are held in secured accounts and our platform uses bank-grade encryption. We are transparent about all earnings and payouts." },
  { q: "What is the minimum investment?", a: "You can start with our entry-level plan and scale up as you grow confidence in the platform." },
];

function NavModal({ active, onClose }: { active: NavLink | null; onClose: () => void }) {
  if (!active || active === "Home") return null;
  const content = active === "About" ? ABOUT_CONTENT : null;
  const faqItems = active === "FAQ" ? FAQ_ITEMS : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", damping: 26 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-amber-50 hover:bg-amber-100 transition-colors">
            <X className="w-5 h-5 text-amber-700" />
          </button>

          {content && (
            <>
              <h2 className="text-2xl font-black text-[#5C3A0A] mb-4">{content.title}</h2>
              <p className="text-gray-600 leading-relaxed">{content.body}</p>
            </>
          )}

          {faqItems && (
            <>
              <h2 className="text-2xl font-black text-[#5C3A0A] mb-5">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqItems.map((item, i) => (
                  <div key={i} className="bg-amber-50 rounded-2xl p-4">
                    <p className="font-bold text-amber-900 text-sm mb-1">{item.q}</p>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Login() {
  const { login, user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<NavLink | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      setLocation(user.role === "admin" ? "/admin" : "/");
    }
  }, [user, authLoading, setLocation]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const result = await login(data);
      toast({ title: "Welcome back!" });
      setLocation((result as any)?.role === "admin" ? "/admin" : "/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavClick = (link: NavLink) => {
    setMobileMenuOpen(false);
    if (link === "Home") return;
    setActiveModal(link);
  };

  if (authLoading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E4B5] via-[#FFF1CC] to-[#FFF8E7] flex flex-col">

      {/* ── NAVBAR ── */}
      <header className="w-full px-6 md:px-12 py-4 flex items-center justify-between shrink-0 relative z-30">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MeridianFlow" className="h-12 w-12 object-contain drop-shadow" />
          <span className="font-black text-[#5C3A0A] text-lg tracking-tight hidden sm:block">MeridianFlow</span>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              onClick={() => handleNavClick(link)}
              className="px-5 py-2 rounded-full text-sm font-semibold text-amber-900/80 hover:text-amber-900 hover:bg-white/60 transition-all"
            >
              {link}
            </button>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/register">
            <span className="px-5 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white shadow-md shadow-amber-300/40 hover:opacity-90 transition-opacity cursor-pointer">
              Register
            </span>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="md:hidden p-2 rounded-xl bg-white/60 text-amber-900"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile nav dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden absolute top-[72px] inset-x-4 z-20 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-100 p-4 flex flex-col gap-1"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => handleNavClick(link)}
                className="text-left px-4 py-3 rounded-xl text-sm font-semibold text-amber-900/80 hover:bg-amber-50 transition-colors"
              >
                {link}
              </button>
            ))}
            <div className="border-t border-amber-100 mt-2 pt-3">
              <Link href="/register">
                <span className="block text-center px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white cursor-pointer">
                  Register
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col md:flex-row items-center md:items-stretch px-6 md:px-12 py-8 gap-10 md:gap-16 max-w-7xl mx-auto w-full">

        {/* LEFT — Hero */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55 }}
          className="flex-1 flex flex-col justify-center"
        >
          <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-3">Real Estate · Click-to-Earn</p>
          <h1 className="text-4xl md:text-5xl font-black text-[#5C3A0A] leading-tight mb-5">
            Earn Daily from<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9973B] to-[#8B5E10]">
              Virtual Properties
            </span>
          </h1>
          <p className="text-amber-900/60 text-base md:text-lg leading-relaxed mb-8 max-w-md">
            Complete simple daily rental tasks, earn commissions, and grow your portfolio — no experience needed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md">
            {[
              { icon: TrendingUp, label: "Daily Earnings", desc: "Earn every day you show up" },
              { icon: Shield,     label: "Secure Platform", desc: "Bank-grade encryption" },
              { icon: Users,      label: "Growing Community", desc: "Thousands of active investors" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-amber-100/80">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center mb-2">
                  <Icon className="w-4.5 h-4.5 text-amber-700 w-[18px] h-[18px]" />
                </div>
                <p className="text-xs font-bold text-amber-900">{label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT — Login card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="w-full md:w-[420px] shrink-0 flex flex-col justify-center"
        >
          {/* Logo above form (mobile already in header; show on desktop too for context) */}
          <div className="text-center mb-6 md:block">
            <h2 className="text-2xl font-black text-[#5C3A0A]">Welcome Back</h2>
            <p className="text-amber-800/60 text-sm mt-1">Sign in to your investment account</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-amber-200/50 border border-amber-100/80 p-8 space-y-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-amber-900/70 font-semibold text-xs uppercase tracking-wide">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="border-amber-200 rounded-xl h-12 bg-amber-50/50"
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email.message as string}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-amber-900/70 font-semibold text-xs uppercase tracking-wide">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="border-amber-200 rounded-xl h-12 bg-amber-50/50"
                />
                {errors.password && <p className="text-red-500 text-xs">{errors.password.message as string}</p>}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] hover:from-[#A07830] hover:to-[#7A4F0C] text-white rounded-xl py-6 h-auto font-bold text-base shadow-lg shadow-amber-300/40 mt-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </Button>
            </form>

            <div className="text-center text-sm pt-2 border-t border-amber-100">
              <span className="text-gray-500">Don't have an account? </span>
              <Link href="/register" className="text-amber-700 font-bold hover:underline">
                Register Now
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* About / FAQ modal */}
      <NavModal active={activeModal} onClose={() => setActiveModal(null)} />
    </div>
  );
}
