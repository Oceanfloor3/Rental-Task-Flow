import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Mars, Venus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  surname: z.string().min(1, "Surname is required"),
  gender: z.enum(["male", "female"], { required_error: "Please select your gender" }),
  whatsappNumber: z.string().min(1, "WhatsApp number is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  transactionPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  confirmPin: z.string().min(1, "Please confirm your PIN"),
  homeAddress: z.string().min(1, "Home address is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  referralCode: z.string().optional(),
}).refine(d => d.transactionPin === d.confirmPin, {
  message: "PINs do not match",
  path: ["confirmPin"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser, user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | null>(null);
  const [refFromUrl, setRefFromUrl] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      setLocation(user.role === "admin" ? "/admin" : "/");
    }
  }, [user, authLoading, setLocation]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Auto-fill referral code from ?ref= URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setRefFromUrl(ref);
      setValue("referralCode", ref, { shouldValidate: false });
    }
  }, [setValue]);

  const handleGenderSelect = (gender: "male" | "female") => {
    setSelectedGender(gender);
    setValue("gender", gender, { shouldValidate: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      const { confirmPin: _confirmPin, ...payload } = data;
      await registerUser(payload);
      toast({ title: "Registration successful!" });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.message || "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <img src="/logo.png" alt="MeridianFlow" className="w-36 h-36 mx-auto mb-3 object-contain drop-shadow-xl" />
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm">Join us and start earning</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Middle Name</Label>
              <Input id="middleName" {...register("middleName")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surname">Surname</Label>
            <Input id="surname" {...register("surname")} />
            {errors.surname && <p className="text-red-500 text-xs">{errors.surname.message as string}</p>}
          </div>

          {/* Gender selector */}
          <div className="space-y-2">
            <Label>Gender</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGenderSelect("male")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  selectedGender === "male"
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <Mars className={`w-4 h-4 ${selectedGender === "male" ? "text-blue-600" : "text-gray-400"}`} />
                Male
              </button>
              <button
                type="button"
                onClick={() => handleGenderSelect("female")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                  selectedGender === "female"
                    ? "border-pink-500 bg-pink-50 text-pink-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-pink-300 hover:bg-pink-50/50"
                }`}
              >
                <Venus className={`w-4 h-4 ${selectedGender === "female" ? "text-pink-600" : "text-gray-400"}`} />
                Female
              </button>
            </div>
            {errors.gender && <p className="text-red-500 text-xs">{errors.gender.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input id="whatsappNumber" {...register("whatsappNumber")} />
            {errors.whatsappNumber && <p className="text-red-500 text-xs">{errors.whatsappNumber.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-red-500 text-xs">{errors.email.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && <p className="text-red-500 text-xs">{errors.password.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionPin">Transaction PIN <span className="text-gray-400 font-normal text-xs">(4 digits)</span></Label>
            <Input
              id="transactionPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              {...register("transactionPin")}
            />
            {errors.transactionPin && <p className="text-red-500 text-xs">{errors.transactionPin.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirm Transaction PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              {...register("confirmPin")}
            />
            {errors.confirmPin && <p className="text-red-500 text-xs">{errors.confirmPin.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="homeAddress">Home Address</Label>
            <Input id="homeAddress" {...register("homeAddress")} />
            {errors.homeAddress && <p className="text-red-500 text-xs">{errors.homeAddress.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" {...register("bankName")} />
            {errors.bankName && <p className="text-red-500 text-xs">{errors.bankName.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input id="accountNumber" {...register("accountNumber")} />
            {errors.accountNumber && <p className="text-red-500 text-xs">{errors.accountNumber.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input id="accountHolderName" {...register("accountHolderName")} />
            {errors.accountHolderName && <p className="text-red-500 text-xs">{errors.accountHolderName.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip Code</Label>
            <Input id="zipCode" {...register("zipCode")} />
            {errors.zipCode && <p className="text-red-500 text-xs">{errors.zipCode.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode">
              Referral Code
              {refFromUrl ? (
                <span className="ml-2 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">Auto-filled</span>
              ) : (
                <span className="ml-1 text-gray-400 font-normal">(Optional)</span>
              )}
            </Label>
            <Input
              id="referralCode"
              {...register("referralCode")}
              readOnly={!!refFromUrl}
              className={refFromUrl ? "bg-green-50 border-green-200 text-green-800 font-semibold cursor-default" : ""}
            />
          </div>

          {/* Terms & Conditions checkbox */}
          <div className="flex items-start gap-3 mt-6 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTermsAccepted(v => !v)}
              className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${termsAccepted ? "bg-amber-600 border-amber-600" : "bg-white border-gray-300 hover:border-amber-400"}`}
              aria-checked={termsAccepted}
              role="checkbox"
            >
              {termsAccepted && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <p className="text-xs text-gray-600 leading-relaxed">
              I have read and agree to the{" "}
              <button
                type="button"
                onClick={() => setShowTerms(true)}
                className="text-amber-700 font-semibold underline underline-offset-2 hover:text-amber-900"
              >
                Terms &amp; Conditions
              </button>
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] hover:from-[#A07830] hover:to-[#7A4F0C] text-white rounded-xl py-6 h-auto font-semibold shadow-md mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !termsAccepted}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-500">Already have an account? </span>
          <Link href="/login" className="text-amber-700 font-semibold hover:underline">
            Login
          </Link>
        </div>
      </motion.div>
    </div>

      {/* Terms & Conditions Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowTerms(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            onClick={e => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-slate-800 text-base">Terms &amp; Conditions</h2>
              <button onClick={() => setShowTerms(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 text-sm text-gray-600 space-y-4 leading-relaxed">
              <p className="text-xs text-gray-400">Last updated: January 2025</p>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">1. Acceptance of Terms</h3>
                <p>By registering on MeridianFlow, you confirm that you are at least 18 years old and agree to be bound by these Terms &amp; Conditions. If you do not agree, please do not register.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">2. Platform Description</h3>
                <p>MeridianFlow is a virtual property investment platform where users complete daily rental quests to earn commissions. All property positions are virtual and do not represent ownership of real-world property.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">3. Account Responsibility</h3>
                <p>You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your login details or transaction PIN with any third party. MeridianFlow will never ask for your password.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">4. Earnings &amp; Commissions</h3>
                <p>Earnings are generated by completing daily rental quests within your active Rank Level. Commission rates are determined by your current rank. MeridianFlow reserves the right to adjust rates with prior notice.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">5. Activation Deposits</h3>
                <p>Activation deposits are required to unlock Rank Levels. These deposits are non-refundable once a level is activated. Each Rank Level is valid for 50 working days from the date of activation.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">6. Withdrawals</h3>
                <p>Withdrawal requests are processed within 24–48 hours subject to review. A processing fee may apply. MeridianFlow reserves the right to delay or decline withdrawals where fraudulent activity is suspected.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">7. Referrals</h3>
                <p>Referral bonuses are credited when a referred user successfully activates a Rank Level. Abuse of the referral system (including self-referrals or coordinated fake accounts) will result in account termination.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">8. Prohibited Conduct</h3>
                <p>You agree not to use the platform for any unlawful purpose, attempt to manipulate earnings, impersonate other users, or engage in any conduct that disrupts the platform's operation.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">9. Account Termination</h3>
                <p>MeridianFlow reserves the right to suspend or permanently terminate any account found to be in violation of these terms without prior notice.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">10. Limitation of Liability</h3>
                <p>MeridianFlow is not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Use the platform at your own risk.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">11. Changes to Terms</h3>
                <p>We may update these Terms &amp; Conditions from time to time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => { setTermsAccepted(true); setShowTerms(false); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C9973B] to-[#8B5E10] text-white font-bold text-sm hover:from-[#A07830] hover:to-[#7A4F0C] transition-all"
              >
                I Agree &amp; Accept
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
