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
              <p className="font-bold text-slate-800 text-center text-base">MERIDIANFLOW TERMS OF SERVICE</p>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">1. Introduction and Acceptance</h3>
                <p>These Terms of Service ("Terms") form a legally binding contract between you ("User", "You", or "Member") and Meridianflow (the "Company") regarding your use of the Platform.</p>
                <p className="mt-2">By creating an account, purchasing a package, or using the Platform in any way, you confirm that you have read, understood, and agree to these Terms. If you do not agree, do not register or make any purchase.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">2. Eligibility</h3>
                <p>You must be at least 18 years of age (or the legal age of majority in your jurisdiction) and have the legal capacity to enter into contracts. You represent and warrant that all information you provide is accurate and complete.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">3. Services and Packages</h3>
                <p>The Platform operated by Meridianflow enables users to purchase subscription packages that grant access to a limited number of daily quests (primarily clicking on real estate listings). These quests help generate advertising traffic and visibility for our real estate partners.</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Packages are non-transferable and valid only for the purchased duration or quest limit.</li>
                  <li>Purchasing a package does not guarantee any minimum earnings or returns.</li>
                  <li>Earnings are performance-based, calculated at Meridianflow's sole discretion, and depend on verified quest completion and payments received from real estate partners.</li>
                  <li>We reserve the right to modify, pause, or discontinue any package or quest availability at any time.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">4. Purchases, Payments, and Refunds</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>All package purchases are final and non-refundable except as required by applicable law.</li>
                  <li>You authorize Meridianflow to charge the payment method you provide for the selected package and any recurring fees (if applicable).</li>
                  <li>Prices are subject to change. Any applicable taxes are your responsibility.</li>
                  <li>Earnings from quests may be withdrawn subject to minimum thresholds, identity verification, and compliance with our anti-fraud policies.</li>
                  <li>You are solely responsible for all taxes on any earnings or commissions received.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">5. User Accounts and Responsibilities</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>You are responsible for maintaining the security of your account credentials.</li>
                  <li>You may not create multiple accounts, use bots, scripts, VPNs to mask activity, or employ any artificial means to complete quests.</li>
                  <li>All quest completions must be done manually and in good faith.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">6. Prohibited Activities</h3>
                <p className="mb-2">You agree not to engage in any of the following:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Click fraud, quest manipulation, or any artificial inflation of activity.</li>
                  <li>Using automated tools, emulators, or third-party services to perform quests.</li>
                  <li>Sharing your account or selling access to your package.</li>
                  <li>Any activity that violates advertising laws, consumer protection regulations, or constitutes spam.</li>
                  <li>Attempting to reverse engineer, interfere with, or disrupt the Platform.</li>
                  <li>Any conduct that could expose Meridianflow to legal, regulatory, or reputational risk.</li>
                </ul>
                <p className="mt-2">Violation of these rules will result in immediate account suspension or termination, forfeiture of all remaining package value and unpaid earnings, and potential legal action.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">7. Earnings and Commissions</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Earnings are credited only for legitimately completed quests, as verified by Meridianflow.</li>
                  <li>Meridianflow may withhold, deduct, or forfeit earnings if fraud, abuse, or breach of these Terms is suspected.</li>
                  <li>No earnings are guaranteed. The Platform is an advertising support service, not an investment or employment opportunity.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">8. Intellectual Property</h3>
                <p>All content, designs, logos, and technology on the Platform belong to Meridianflow or its licensors.</p>
                <p className="mt-2">Your purchase grants you only a limited, revocable license to use the Platform for the duration of your active package(s). You may not copy, distribute, or commercially exploit any part of the Platform.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">9. Privacy</h3>
                <p>Your personal data is processed in accordance with our Privacy Policy. By using the Platform, you consent to such processing.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">10. Limitation of Liability and Disclaimer</h3>
                <p className="uppercase font-semibold text-xs text-slate-500 mb-1">THE PLATFORM AND SERVICES ARE PROVIDED "AS IS" WITHOUT ANY WARRANTIES.</p>
                <p>To the maximum extent permitted by law, Meridianflow, its directors, employees, and affiliates shall not be liable for any indirect, consequential, or punitive damages, including lost profits or lost earnings. Our total liability shall not exceed the total amount you paid for packages in the twelve (12) months preceding the claim.</p>
                <p className="mt-2">We are not responsible for the actions of real estate partners or the outcome of any property sales.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">11. Indemnification</h3>
                <p>You agree to indemnify and hold Meridianflow, its directors, employees, officers, and partners harmless from any claims, damages, losses, or legal fees arising from your use of the Platform, breach of these Terms, or violation of any law.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">12. Termination</h3>
                <p>Meridianflow may suspend or terminate your account at any time, with or without notice, for any reason (including suspected violation of these Terms).</p>
                <p className="mt-2">Upon termination, you lose access to your active package(s) and any unpaid earnings may be forfeited.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">13. Governing Law and Dispute Resolution</h3>
                <p>These Terms are governed by the laws of land. Any disputes shall be resolved exclusively in the court.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">14. Changes to Terms</h3>
                <p>Meridianflow may update these Terms from time to time. Continued use of the Platform after changes constitutes your acceptance of the revised Terms.</p>
              </div>

              <div>
                <h3 className="font-bold text-slate-700 mb-1">15. Miscellaneous</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>These Terms represent the entire agreement between you and Meridianflow.</li>
                  <li>If any provision is invalid, the remainder shall continue in effect.</li>
                  <li>No waiver of any breach shall constitute a waiver of any other breach.</li>
                </ul>
              </div>

              <p className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-2">By clicking "I Agree", completing your purchase, or using the Meridianflow Platform, you confirm your acceptance of these Terms.</p>
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
