import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const { login, user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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

  if (authLoading) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E4B5] via-[#FFF1CC] to-[#FFF8E7] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="MeridianFlow" className="w-24 h-24 mx-auto mb-4 rounded-3xl shadow-xl shadow-amber-300/40" />
          <h1 className="text-2xl font-black text-[#5C3A0A]">Welcome Back</h1>
          <p className="text-amber-800/60 text-sm mt-1">Sign in to your investment account</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-amber-200/50 border border-amber-100/80 p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-amber-900/70 font-semibold text-xs uppercase tracking-wide">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} className="border-amber-200 rounded-xl h-12 bg-amber-50/50" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message as string}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-amber-900/70 font-semibold text-xs uppercase tracking-wide">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} className="border-amber-200 rounded-xl h-12 bg-amber-50/50" />
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
  );
}