import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) setTokenError(true);
  }, [token]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reset password");
      }
      setDone(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reset failed", description: err.message });
      if (err.message?.toLowerCase().includes("expired") || err.message?.toLowerCase().includes("invalid")) {
        setTokenError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5E4B5] via-[#FFF1CC] to-[#FFF8E7] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="MeridianFlow" className="h-14 w-14 object-contain drop-shadow mx-auto mb-3" />
          <h1 className="text-2xl font-black text-[#5C3A0A]">MeridianFlow</h1>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-amber-200/50 border border-amber-100/80 p-8">
          {tokenError ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-[#5C3A0A]">Link Expired or Invalid</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-xl py-6 h-auto font-bold"
              >
                Back to Login
              </Button>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-[#5C3A0A]">Password Reset!</h2>
              <p className="text-sm text-gray-500">Your password has been changed. You can now log in with your new password.</p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white rounded-xl py-6 h-auto font-bold"
              >
                Go to Login
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-[#5C3A0A]">Set New Password</h2>
                <p className="text-amber-800/60 text-sm mt-1">Enter your new password below</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-amber-900/70 font-semibold text-xs uppercase tracking-wide">New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      className="border-amber-200 rounded-xl h-12 bg-amber-50/50 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600/60 hover:text-amber-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs">{errors.password.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-900/70 font-semibold text-xs uppercase tracking-wide">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("confirm")}
                      className="border-amber-200 rounded-xl h-12 bg-amber-50/50 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600/60 hover:text-amber-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-red-500 text-xs">{errors.confirm.message as string}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] hover:from-[#A07830] hover:to-[#7A4F0C] text-white rounded-xl py-6 h-auto font-bold text-base shadow-lg shadow-amber-300/40 mt-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-amber-900/40 mt-6">
          &copy; 2026 Meridian Flow, Inc.
        </p>
      </div>
    </div>
  );
}
