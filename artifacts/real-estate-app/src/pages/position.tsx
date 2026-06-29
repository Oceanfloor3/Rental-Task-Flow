import { useRef, useState } from "react";

function stripVPrefix(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\bV\d{1,2}\s*[-–]?\s*/gi, "").trim() || text;
}
import { motion, AnimatePresence } from "framer-motion";
import { Diamond, Shield, Award, Star, Crown, Zap, Lock, CheckCircle2, X, ShoppingCart, Upload, ImageIcon, Loader2, Wallet, Gem, Trophy, Flame, Rocket, Globe, Sparkles } from "lucide-react";
import { useGetUserProfile, getGetUserProfileQueryKey, useSubmitPaymentProof } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const POSITIONS = [
  {
    key: "V0",
    label: "Premier",
    fullLabel: "PREMIER",
    icon: Diamond,
    color: "bg-teal-100 text-teal-600",
    activeColor: "from-teal-500 to-cyan-600",
    borderColor: "border-teal-200",
    badgeColor: "bg-teal-600",
    securityDeposit: "30,000",
    depositRaw: 30000,
    dailyTasks: 5,
    dailyIncome: "1,200",
    monthlyTransferLimit: "2,500",
    description: "Premier — your first step to wealth",
  },
  {
    key: "V1",
    label: "Foundation",
    fullLabel: "FOUNDATION",
    icon: Shield,
    color: "bg-blue-100 text-blue-600",
    activeColor: "from-[#4A90D9] to-[#3B75B4]",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-600",
    securityDeposit: "50,000",
    depositRaw: 50000,
    dailyTasks: 10,
    dailyIncome: "2,000",
    monthlyTransferLimit: "5,000",
    description: "Foundation level — begin your journey",
  },
  {
    key: "V2",
    label: "Cornerstone",
    fullLabel: "CORNERSTONE",
    icon: Award,
    color: "bg-amber-100 text-amber-700",
    activeColor: "from-[#C9973B] to-[#A07020]",
    borderColor: "border-amber-200",
    badgeColor: "bg-[#C9973B]",
    securityDeposit: "100,000",
    depositRaw: 100000,
    dailyTasks: 15,
    dailyIncome: "4,000",
    monthlyTransferLimit: "10,000",
    description: "Cornerstone — build your base",
  },
  {
    key: "V3",
    label: "Horizon",
    fullLabel: "HORIZON",
    icon: Star,
    color: "bg-amber-100 text-amber-700",
    activeColor: "from-[#C9973B] to-[#D4864A]",
    borderColor: "border-amber-200",
    badgeColor: "bg-[#C9973B]",
    securityDeposit: "150,000",
    depositRaw: 150000,
    dailyTasks: 20,
    dailyIncome: "6,000",
    monthlyTransferLimit: "15,000",
    description: "Horizon — expand your reach",
  },
  {
    key: "V4",
    label: "Landmark",
    fullLabel: "LANDMARK",
    icon: Zap,
    color: "bg-amber-100 text-amber-600",
    activeColor: "from-amber-500 to-orange-600",
    borderColor: "border-amber-200",
    badgeColor: "bg-amber-600",
    securityDeposit: "250,000",
    depositRaw: 250000,
    dailyTasks: 25,
    dailyIncome: "10,000",
    monthlyTransferLimit: "25,000",
    description: "Landmark — make your mark",
  },
  {
    key: "V5",
    label: "Pinnacle",
    fullLabel: "PINNACLE",
    icon: Crown,
    color: "bg-rose-100 text-rose-600",
    activeColor: "from-rose-500 to-red-600",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-600",
    securityDeposit: "500,000",
    depositRaw: 500000,
    dailyTasks: 30,
    dailyIncome: "20,000",
    monthlyTransferLimit: "50,000",
    description: "Pinnacle — reach new heights",
  },
  {
    key: "V6",
    label: "Prestige",
    fullLabel: "PRESTIGE",
    icon: Gem,
    color: "bg-amber-100 text-amber-700",
    activeColor: "from-[#7B5EAB] to-[#5A3D8A]",
    borderColor: "border-amber-200",
    badgeColor: "bg-[#C9973B]",
    securityDeposit: "1,000,000",
    depositRaw: 1000000,
    dailyTasks: 35,
    dailyIncome: "40,000",
    monthlyTransferLimit: "75,000",
    description: "Prestige — command respect",
  },
  {
    key: "V7",
    label: "Elite",
    fullLabel: "ELITE",
    icon: Trophy,
    color: "bg-yellow-100 text-yellow-600",
    activeColor: "from-yellow-500 to-amber-600",
    borderColor: "border-yellow-200",
    badgeColor: "bg-yellow-600",
    securityDeposit: "1,500,000",
    depositRaw: 1500000,
    dailyTasks: 40,
    dailyIncome: "60,000",
    monthlyTransferLimit: "100,000",
    description: "Elite — join the top tier",
  },
  {
    key: "V8",
    label: "Legacy",
    fullLabel: "LEGACY",
    icon: Flame,
    color: "bg-orange-100 text-orange-600",
    activeColor: "from-orange-500 to-red-600",
    borderColor: "border-orange-200",
    badgeColor: "bg-orange-600",
    securityDeposit: "2,450,000",
    depositRaw: 2450000,
    dailyTasks: 50,
    dailyIncome: "98,000",
    monthlyTransferLimit: "125,000",
    description: "Legacy — leave a lasting impact",
  },
  {
    key: "V9",
    label: "Empire",
    fullLabel: "EMPIRE",
    icon: Rocket,
    color: "bg-cyan-100 text-cyan-600",
    activeColor: "from-cyan-500 to-teal-600",
    borderColor: "border-cyan-200",
    badgeColor: "bg-cyan-600",
    securityDeposit: "5,000,000",
    depositRaw: 5000000,
    dailyTasks: 100,
    dailyIncome: "200,000",
    monthlyTransferLimit: "175,000",
    description: "Empire — build your kingdom",
  },
  {
    key: "V10",
    label: "Sovereign",
    fullLabel: "SOVEREIGN",
    icon: Globe,
    color: "bg-emerald-100 text-emerald-600",
    activeColor: "from-emerald-500 to-green-700",
    borderColor: "border-emerald-200",
    badgeColor: "bg-emerald-600",
    securityDeposit: "10,000,000",
    depositRaw: 10000000,
    dailyTasks: 150,
    dailyIncome: "400,000",
    monthlyTransferLimit: "250,000",
    description: "Sovereign — rule with authority",
  },
  {
    key: "V11",
    label: "Crown Collective",
    fullLabel: "CROWN COLLECTIVE",
    icon: Sparkles,
    color: "bg-pink-100 text-pink-600",
    activeColor: "from-pink-500 to-rose-700",
    borderColor: "border-pink-200",
    badgeColor: "bg-pink-600",
    securityDeposit: "15,000,000",
    depositRaw: 15000000,
    dailyTasks: 200,
    dailyIncome: "600,000",
    monthlyTransferLimit: "500,000",
    description: "Crown Collective — the pinnacle of achievement",
  },
];

const ALL_LEVEL_KEYS = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11"];

function detectUserLevel(position?: string | null): string | null {
  if (!position) return null;
  const upper = position.toUpperCase();
  if (upper.includes("V11")) return "V11";
  if (upper.includes("V10")) return "V10";
  if (upper.includes("V9"))  return "V9";
  if (upper.includes("V8"))  return "V8";
  if (upper.includes("V7"))  return "V7";
  if (upper.includes("V6"))  return "V6";
  if (upper.includes("V5"))  return "V5";
  if (upper.includes("V4"))  return "V4";
  if (upper.includes("V3"))  return "V3";
  if (upper.includes("V2"))  return "V2";
  if (upper.includes("V1"))  return "V1";
  if (upper.includes("V0"))  return "V0";
  return null;
}

type SelectedPos = typeof POSITIONS[0];

function BuyModal({ pos, profile, onClose }: { pos: SelectedPos; profile: any; onClose: () => void }) {
  const [rechargeAmount, setRechargeAmount] = useState(String(pos.depositRaw));
  const [tab, setTab] = useState<"recharge" | "proof">("recharge");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const submitProof = useSubmitPaymentProof();

  const Icon = pos.icon;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max size is 5MB" });
      return;
    }
    setFileName(file.name);
    setFileType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setFileData(dataUrl);
      setFilePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    if (!fileData) {
      toast({ variant: "destructive", title: "Please upload your payment screenshot" });
      return;
    }
    setSubmittingProof(true);
    try {
      await submitProof.mutateAsync({
        data: {
          positionKey: pos.key,
          positionLabel: pos.fullLabel,
          amount: parseFloat(rechargeAmount) || pos.depositRaw,
          fileData,
          fileName,
          fileType,
        },
      });
      setSubmitted(true);
    } catch (e: any) {
      toast({ variant: "destructive", title: e?.message || "Failed to submit proof" });
    } finally {
      setSubmittingProof(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col items-center justify-center p-8 gap-5 text-center"
      >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 mb-1">SUCCESSFULLY SUBMITTED</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your payment proof for <span className="font-bold text-amber-700">{pos.fullLabel}</span> has been submitted.
              The admin will review and activate your level within 24 hours.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 w-full text-left">
            <p className="text-amber-700 text-xs font-semibold">What happens next?</p>
            <ul className="text-amber-600 text-xs mt-1 space-y-0.5 list-disc list-inside">
              <li>Admin reviews your payment screenshot</li>
              <li>Your Activation Deposit is updated upon approval</li>
              <li>Your position level is activated</li>
              <li>Daily quests become available</li>
            </ul>
          </div>
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-base bg-gradient-to-r ${pos.activeColor} shadow-md active:scale-95 transition-all`}
          >
            Got it!
          </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bottom-[70px] z-50 bg-white flex flex-col overflow-hidden"
    >
        {/* Header */}
        <div className={`bg-gradient-to-r ${pos.activeColor} p-5 text-white`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-black text-lg leading-none">{pos.label}</div>
                <div className="text-white/75 text-xs">{pos.description}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <div className="text-white/70 text-[10px]">Deposit</div>
              <div className="text-white font-bold text-xs">₦{pos.securityDeposit}</div>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <div className="text-white/70 text-[10px]">Daily Quests</div>
              <div className="text-white font-bold text-xs">{pos.dailyTasks}</div>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <div className="text-white/70 text-[10px]">Daily Earnings</div>
              <div className="text-white font-bold text-xs">₦{pos.dailyIncome}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("recharge")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              tab === "recharge" ? "border-[#C9973B] text-amber-700" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Wallet className="w-4 h-4" /> Payment Info
          </button>
          <button
            onClick={() => setTab("proof")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              tab === "proof" ? "border-[#C9973B] text-amber-700" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Upload className="w-4 h-4" /> Upload Proof
          </button>
        </div>

        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {tab === "recharge" && (
            <>
              {/* How it works */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <p className="text-amber-800 font-bold text-sm flex items-center gap-1.5">
                  <span className="text-base">ℹ️</span> How to activate this level
                </p>
                <ol className="text-amber-700 text-xs space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Transfer the required amount below to our bank account</li>
                  <li>Take a screenshot of your payment receipt</li>
                  <li>Tap <strong>"Upload Proof"</strong> tab and submit the screenshot</li>
                  <li>Admin reviews and activates your level — your Balance &amp; Activation Deposit update automatically</li>
                </ol>
              </div>

              {/* Amount to pay */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amount to Transfer (NGN)</label>
                <Input
                  type="number"
                  value={rechargeAmount}
                  onChange={e => setRechargeAmount(e.target.value)}
                  className="text-lg font-bold h-12 rounded-xl"
                  placeholder="0.00"
                />
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2 font-medium">Quick amounts</p>
                <div className="grid grid-cols-3 gap-2">
                  {[pos.depositRaw / 2, pos.depositRaw, pos.depositRaw * 2].map(q => (
                    <button
                      key={q}
                      onClick={() => setRechargeAmount(String(q))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        rechargeAmount === String(q) ? "bg-[#C9973B] text-white border-[#C9973B]" : "bg-gray-50 text-gray-700 border-gray-200 hover:border-amber-300"
                      }`}
                    >
                      ₦{q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notice — no immediate balance change */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2">
                <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-slate-500 text-xs leading-relaxed">
                  Your <strong>Balance</strong> and <strong>Activation Deposit</strong> will only be updated after the admin confirms your payment. Do <em>not</em> wait for an instant change.
                </p>
              </div>

              <Button
                onClick={() => setTab("proof")}
                className={`w-full bg-gradient-to-r ${pos.activeColor} text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md`}
              >
                <Upload className="w-4 h-4 mr-2" /> Proceed to Upload Proof
              </Button>
            </>
          )}

          {tab === "proof" && (
            <>
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-medium leading-relaxed">
                📸 After making your bank transfer, upload a screenshot of your payment receipt here. Admin will verify and activate your position within 24 hours.
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {filePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-amber-200">
                    <img src={filePreview} alt="Payment proof" className="w-full max-h-64 object-contain bg-gray-50" />
                    <button
                      onClick={() => { setFilePreview(null); setFileData(null); setFileName(""); }}
                      className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-md"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 p-2 text-white text-xs font-medium truncate">
                      {fileName}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 hover:border-amber-400 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors group"
                  >
                    <div className="w-16 h-16 bg-amber-50 group-hover:bg-amber-100 rounded-full flex items-center justify-center transition-colors">
                      <ImageIcon className="w-8 h-8 text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-slate-700 text-sm">Tap to upload screenshot</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </button>
                )}
              </div>

              {filePreview && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs text-amber-700 font-semibold py-2 border border-amber-200 rounded-xl hover:bg-amber-50"
                >
                  Change Screenshot
                </button>
              )}

              <Button
                onClick={handleSubmitProof}
                disabled={submittingProof || !fileData}
                className="w-full bg-gradient-to-r from-[#C9973B] to-[#8B5E10] hover:from-[#A07830] hover:to-[#7A4F0C] text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md disabled:opacity-50"
              >
                {submittingProof ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" /> Submit Payment Proof</>
                )}
              </Button>
            </>
          )}
        </div>
    </motion.div>
  );
}

export default function Position() {
  const { data: profile, isLoading: profileLoading } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const [selectedPos, setSelectedPos] = useState<SelectedPos | null>(null);

  const activatedLevels: string[] = (() => {
    try { return (profile as any)?.activatedLevels ?? []; } catch { return []; }
  })();
  const levelActivationDates: Record<string, string> = (() => {
    try {
      const raw = (profile as any)?.levelActivationDates;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  })();
  const today = new Date().toISOString().split("T")[0]!;

  function countWorkingDays(startIso: string, endIso: string): number {
    const start = new Date(startIso + "T00:00:00Z");
    const end = new Date(endIso + "T00:00:00Z");
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const d = cur.getUTCDay();
      if (d !== 0 && d !== 6) count++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return count;
  }

  function addWorkingDays(startIso: string, days: number): Date {
    const cur = new Date(startIso + "T00:00:00Z");
    let added = 0;
    while (added < days) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      const d = cur.getUTCDay();
      if (d !== 0 && d !== 6) added++;
    }
    return cur;
  }

  function isLevelExpired(key: string): boolean {
    const startDate = levelActivationDates[key];
    if (!startDate) return false;
    return countWorkingDays(startDate, today) >= 50;
  }

  // Only show a level if it has been activated by admin (in activatedLevels) AND is not expired.
  // The position field alone is NOT sufficient — it may be set on accounts that never paid.
  const userLevel = (() => {
    const fromPosition = detectUserLevel(profile?.position);
    if (fromPosition && activatedLevels.includes(fromPosition) && !isLevelExpired(fromPosition)) {
      return fromPosition;
    }
    // Fallback: highest activated, non-expired level
    return [...ALL_LEVEL_KEYS].reverse().find(k => activatedLevels.includes(k) && !isLevelExpired(k)) ?? null;
  })();
  const currentPos = userLevel ? POSITIONS.find(p => p.key === userLevel) ?? null : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 space-y-5 pb-28"
      >
        <div className="text-center pt-4">
          <h1 className="text-2xl font-bold text-slate-800">Your Ranks</h1>
          <p className="text-gray-500 text-sm mt-1">Upgrade your ranks to earn higher daily rewards</p>
        </div>

        {/* Current position card */}
        {profileLoading ? (
          /* Skeleton — prevents "NO LEVEL YET" from flashing before real data arrives */
          <div className="bg-slate-100 rounded-2xl p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-3 w-24 bg-slate-200 rounded-full" />
                <div className="h-7 w-36 bg-slate-200 rounded-full" />
                <div className="h-3 w-48 bg-slate-200 rounded-full" />
              </div>
              <div className="w-20 h-20 bg-slate-200 rounded-full shrink-0 ml-4" />
            </div>
          </div>
        ) : currentPos ? (
          <div className={`bg-gradient-to-br ${currentPos.activeColor} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-8 -mb-8 blur-xl" />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <div className="text-white/80 text-xs font-semibold uppercase tracking-widest">Current Level</div>
                <div className="text-3xl font-black mt-1">{currentPos.label}</div>
                <div className="mt-2 inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                  {stripVPrefix(profile?.position) || currentPos.fullLabel}
                </div>
              </div>
              <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                <Diamond className="w-10 h-10 text-white fill-white/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5 relative z-10">
              <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-white/70 text-xs">Activation Deposit</div>
                <div className="text-white font-bold text-sm mt-0.5">₦{currentPos.securityDeposit}</div>
              </div>
              <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-white/70 text-xs">Daily Quests</div>
                <div className="text-white font-bold text-sm mt-0.5">{currentPos.dailyTasks} tasks</div>
              </div>
            </div>
          </div>
        ) : (
          /* No level — shown only after data has loaded and user has no active level */
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 shadow-sm relative overflow-hidden border-2 border-dashed border-amber-300">
            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-200/30 rounded-full -mr-10 -mt-10 blur-xl" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex-1">
                <div className="text-amber-500 text-xs font-semibold uppercase tracking-widest">Current Level</div>
                <div className="text-2xl font-black mt-1 text-amber-800 leading-tight">NO LEVEL YET</div>
                <div className="mt-2 text-xs font-bold text-amber-700 leading-relaxed">
                  CHOOSE FROM THE LEVEL RANKS BELOW TO GET ACTIVATED
                </div>
              </div>
              <div className="w-20 h-20 bg-amber-200/50 rounded-full flex items-center justify-center border-2 border-dashed border-amber-400/60 shrink-0 ml-4">
                <Lock className="w-9 h-9 text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {/* Notice banner if no levels activated */}
        {activatedLevels.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 text-xs font-bold">All levels are locked</p>
              <p className="text-amber-700 text-xs mt-0.5">Submit your payment proof below. Admin will review and activate your level.</p>
            </div>
          </div>
        )}

        {/* All positions list */}
        <div>
          <h2 className="font-bold text-slate-800 px-1 mb-3">All Rank Levels</h2>
          <div className="space-y-3">
            {POSITIONS.map((pos, idx) => {
              const Icon = pos.icon;
              const isActivated = activatedLevels.includes(pos.key);
              const isExpired = isLevelExpired(pos.key);
              const isEffectivelyActive = isActivated && !isExpired;
              const isCurrentActive = pos.key === userLevel && isEffectivelyActive;
              const activationDate = isEffectivelyActive ? levelActivationDates[pos.key] : undefined;
              const expiryDate = activationDate ? addWorkingDays(activationDate, 50) : undefined;
              const workingDaysUsed = activationDate ? countWorkingDays(activationDate, today) : 0;
              const workingDaysLeft = expiryDate ? Math.max(0, 50 - workingDaysUsed) : null;

              return (
                <motion.div
                  key={pos.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`bg-white rounded-xl shadow-sm border-2 relative overflow-hidden ${
                    isCurrentActive ? pos.borderColor : isEffectivelyActive ? "border-green-200" : "border-gray-100"
                  }`}
                >
                  <div className="p-4">
                    {/* Top info — dimmed when locked or expired */}
                    <div className={!isEffectivelyActive ? "opacity-50" : ""}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${pos.color} flex items-center justify-center`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">{pos.label}</h3>
                            <p className="text-xs text-gray-500">{pos.description}</p>
                          </div>
                        </div>
                        {isEffectivelyActive ? (
                          <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVATED
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-bold px-2.5 py-1 rounded-lg">
                            <Lock className="w-3 h-3" /> Locked
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-gray-400 mb-0.5">Deposit</div>
                          <div className="text-xs font-bold text-slate-700">₦{pos.securityDeposit}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-gray-400 mb-0.5">Daily Quests</div>
                          <div className="text-xs font-bold text-slate-700">{pos.dailyTasks}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                          <div className="text-xs text-gray-400 mb-0.5">Daily Earnings</div>
                          <div className="text-xs font-bold text-green-600">₦{pos.dailyIncome}</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-2 py-1.5 text-center col-span-2 flex items-center justify-between">
                          <div className="text-[9px] text-gray-400 leading-tight">Monthly<br/>Send &amp; Receive</div>
                          <div className="text-[10px] font-bold text-amber-600">₦{pos.monthlyTransferLimit}</div>
                        </div>
                      </div>

                      {isEffectivelyActive && expiryDate && workingDaysLeft !== null && (
                        <div className={`flex items-center gap-2 text-[11px] rounded-lg px-2.5 py-1.5 mb-1 ${workingDaysLeft <= 5 ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                          <span className="font-bold">⏳ {workingDaysLeft} working day{workingDaysLeft === 1 ? "" : "s"} left</span>
                          <span className="text-[10px] opacity-70">Expires {expiryDate.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                      )}
                    </div>

                    {/* Fund Now + Upload Proof */}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => { if (!isEffectivelyActive) setSelectedPos(pos); }}
                        disabled={isEffectivelyActive}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-extrabold text-white transition-all shadow-md bg-gradient-to-r ${pos.activeColor} ${!isEffectivelyActive ? "ring-2 ring-offset-1 ring-amber-400 active:scale-95" : "opacity-60 cursor-not-allowed"}`}
                      >
                        {isEffectivelyActive ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Activated</>
                        ) : (
                          <><ShoppingCart className="w-3.5 h-3.5" /> Fund Now</>
                        )}
                      </button>
                      <button
                        onClick={() => { setSelectedPos(pos); }}
                        title="Upload Payment Screenshot"
                        className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-md ${
                          !isEffectivelyActive
                            ? "bg-[#C9973B] text-white border-2 border-[#C9973B] hover:bg-[#A07830]"
                            : "border-2 border-dashed border-gray-300 hover:border-amber-400 text-gray-600 hover:text-amber-700"
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Proof</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedPos && (
          <BuyModal
            pos={selectedPos}
            profile={profile}
            onClose={() => setSelectedPos(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
