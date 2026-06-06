import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Mars, Venus } from "lucide-react";
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
  homeAddress: z.string().min(1, "Home address is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  referralCode: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const { register: registerUser, user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      setLocation(user.role === "admin" ? "/admin" : "/");
    }
  }, [user, authLoading, setLocation]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const handleGenderSelect = (gender: "male" | "female") => {
    setSelectedGender(gender);
    setValue("gender", gender, { shouldValidate: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      await registerUser(data);
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
    <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-purple-200">
            RE
          </div>
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
            <Label htmlFor="referralCode">Referral Code (Optional)</Label>
            <Input id="referralCode" {...register("referralCode")} />
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl py-6 h-auto font-semibold shadow-md mt-6"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Register"}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-500">Already have an account? </span>
          <Link href="/login" className="text-purple-600 font-semibold hover:underline">
            Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
