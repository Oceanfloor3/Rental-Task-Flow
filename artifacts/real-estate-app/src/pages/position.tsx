import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Diamond, Shield, Award, Star, Crown, Zap, Lock, CheckCircle2, X, ShoppingCart, Upload, ImageIcon, Loader2, PlusCircle, Wallet } from "lucide-react";
import { useGetUserProfile, getGetUserProfileQueryKey, useRechargeWallet, useSubmitPaymentProof } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getGetUserEarningsQueryKey } from "@workspace/api-client-react";

const POSITIONS = [
  {
    key: "V1",
    label: "V1 Junior",
    fullLabel: "Junior Position (V1)",
    icon: Shield,
    color: "bg-blue-100 text-blue-600",
    activeColor: "from-blue-500 to-indigo-600",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-600",
    securityDeposit: "2,450,000",
    depositRaw: 2450000,
    dailyTasks: 50,
    dailyIncome: "12,500",
    description: "Entry level position",
  },
  {
    key: "V2",
    label: "V2 Senior",
    fullLabel: "Senior Manager (V2)",
    icon: Award,
    color: "bg-indigo-100 text-indigo-600",
    activeColor: "from-indigo-500 to-purple-600",
    borderColor: "border-indigo-200",
    badgeColor: "bg-indigo-600",
    securityDeposit: "5,000,000",
    depositRaw: 5000000,
    dailyTasks: 100,
    dailyIncome: "25,000",
    description: "Senior management level",
  },
  {
    key: "V3",
    label: "V3 Director",
    fullLabel: "Director (V3)",
    icon: Star,
    color: "bg-purple-100 text-purple-600",
    activeColor: "from-purple-500 to-pink-600",
    borderColor: "border-purple-200",
    badgeColor: "bg-purple-600",
    securityDeposit: "10,000,000",
    depositRaw: 10000000,
    dailyTasks: 150,
    dailyIncome: "50,000",
    description: "Director level position",
  },
  {
    key: "V4",
    label: "V4 Executive",
    fullLabel: "Executive (V4)",
    icon: Zap,
    color: "bg-amber-100 text-amber-600",
    activeColor: "from-amber-500 to-orange-600",
    borderColor: "border-amber-200",
    badgeColor: "bg-amber-600",
    securityDeposit: "20,000,000",
    depositRaw: 20000000,
    dailyTasks: 200,
    dailyIncome: "100,000",
    description: "Executive level position",
  },
  {
    key: "V5",
    label: "V5 Chairman",
    fullLabel: "Chairman (V5)",
    icon: Crown,
    color: "bg-rose-100 text-rose-600",
    activeColor: "from-rose-500 to-red-600",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-600",
    securityDeposit: "50,000,000",
    depositRaw: 50000000,
    dailyTasks: 300,
    dailyIncome: "250,000",
    description: "Highest level position",
  },
];

function detectUserLevel(position?: string | null): string {
  if (!position) return "V1";
  const upper = position.toUpperCase();
  if (upper.includes("V5")) return "V5";
  if (upper.includes("V4")) return "V4";
  if (upper.includes("V3")) return "V3";
  if (upper.includes("V2")) return "V2";
  return "V1";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const rechargeWallet = useRechargeWallet();
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

  const handleRecharge = async () => {
    const num = parseFloat(rechargeAmount);
    if (!num || num <= 0) {
      toast({ variant: "destructive", title: "Enter a valid amount" });
      return;
    }
    try {
      const res = await rechargeWallet.mutateAsync({ data: { amount: num } });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetUserEarningsQueryKey() });
      toast({ title: "Wallet Recharged! 🎉", description: `New balance: ₦${res.newBalance.toLocaleString()}` });
      setTab("proof");
    } catch (e: any) {
      toast({ variant: "destructive", title: e?.message || "Failed to recharge" });
    }
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
          fileData,
          fileName,
          fileType,
        },
      });
      toast({
        title: "Proof Submitted! ✅",
        description: "Admin will review your payment and activate your account shortly.",
        duration: 5000,
      });
      onClose();
    } catch (e: any) {
      toast({ variant: "destructive", title: e?.message || "Failed to submit proof" });
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-w-[430px] shadow-2xl overflow-hidden"
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
              <div className="text-white/70 text-[10px]">Daily Tasks</div>
              <div className="text-white font-bold text-xs">{pos.dailyTasks}</div>
            </div>
            <div className="bg-white/15 rounded-xl p-2.5 text-center">
              <div className="text-white/70 text-[10px]">Daily Income</div>
              <div className="text-white font-bold text-xs">₦{pos.dailyIncome}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("recharge")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              tab === "recharge" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Recharge Wallet
          </button>
          <button
            onClick={() => setTab("proof")}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              tab === "proof" ? "border-purple-600 text-purple-600" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Upload className="w-4 h-4" /> Upload Proof
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {tab === "recharge" && (
            <>
              <div className="bg-green-50 rounded-2xl p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">Current Balance</span>
                <span className="font-bold text-green-700 text-base">
                  ₦{parseFloat(profile?.balance || "0").toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-700 font-medium leading-relaxed">
                💡 Transfer <strong>₦{pos.securityDeposit}</strong> to activate <strong>{pos.fullLabel}</strong>.
                After transferring, go to the <em>Upload Proof</em> tab to submit your payment screenshot.
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Amount (NGN)</label>
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
                        rechargeAmount === String(q) ? "bg-purple-600 text-white border-purple-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      ₦{q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleRecharge}
                disabled={rechargeWallet.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md"
              >
                {rechargeWallet.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                ) : (
                  <><Wallet className="w-4 h-4 mr-2" /> Recharge Now</>
                )}
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
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-200">
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
                    className="w-full border-2 border-dashed border-gray-200 hover:border-purple-400 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors group"
                  >
                    <div className="w-16 h-16 bg-purple-50 group-hover:bg-purple-100 rounded-full flex items-center justify-center transition-colors">
                      <ImageIcon className="w-8 h-8 text-purple-400" />
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
                  className="w-full text-xs text-purple-600 font-semibold py-2 border border-purple-200 rounded-xl hover:bg-purple-50"
                >
                  Change Screenshot
                </button>
              )}

              <Button
                onClick={handleSubmitProof}
                disabled={submittingProof || !fileData}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl py-6 h-auto font-semibold text-base shadow-md disabled:opacity-50"
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
    </motion.div>
  );
}

export default function Position() {
  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const [selectedPos, setSelectedPos] = useState<SelectedPos | null>(null);

  const userLevel = detectUserLevel(profile?.position);
  const currentPos = POSITIONS.find(p => p.key === userLevel) || POSITIONS[0];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 space-y-5 pb-28"
      >
        <div className="text-center pt-4">
          <h1 className="text-2xl font-bold text-slate-800">Your Position</h1>
          <p className="text-gray-500 text-sm mt-1">Upgrade your position to earn higher daily rewards</p>
        </div>

        {/* Current position card */}
        <div className={`bg-gradient-to-br ${currentPos.activeColor} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-8 -mb-8 blur-xl" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <div className="text-white/80 text-xs font-semibold uppercase tracking-widest">Current Level</div>
              <div className="text-3xl font-black mt-1">{currentPos.label}</div>
              <div className="mt-2 inline-flex items-center bg-white/20 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                {profile?.position || currentPos.fullLabel}
              </div>
            </div>
            <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
              <Diamond className="w-10 h-10 text-white fill-white/20" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5 relative z-10">
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-white/70 text-xs">Security Deposit</div>
              <div className="text-white font-bold text-sm mt-0.5">₦{currentPos.securityDeposit}</div>
            </div>
            <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-white/70 text-xs">Daily Tasks</div>
              <div className="text-white font-bold text-sm mt-0.5">{currentPos.dailyTasks} tasks</div>
            </div>
          </div>
        </div>

        {/* All positions list */}
        <div>
          <h2 className="font-bold text-slate-800 px-1 mb-3">All Position Levels</h2>
          <div className="space-y-3">
            {POSITIONS.map((pos, idx) => {
              const Icon = pos.icon;
              const isActive = pos.key === userLevel;
              const isUnlocked = POSITIONS.indexOf(currentPos) >= idx;

              return (
                <motion.div
                  key={pos.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={`bg-white rounded-xl shadow-sm border-2 relative overflow-hidden ${
                    isActive ? pos.borderColor : "border-gray-100"
                  } ${!isUnlocked ? "opacity-70" : ""}`}
                >
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-40" />
                  )}
                  <div className="p-4">
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
                      {isActive ? (
                        <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                        </div>
                      ) : !isUnlocked ? (
                        <Lock className="w-4 h-4 text-gray-300" />
                      ) : (
                        <div className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
                          Unlocked
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <div className="text-xs text-gray-400 mb-0.5">Deposit</div>
                        <div className="text-xs font-bold text-slate-700">₦{pos.securityDeposit}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <div className="text-xs text-gray-400 mb-0.5">Daily Tasks</div>
                        <div className="text-xs font-bold text-slate-700">{pos.dailyTasks}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                        <div className="text-xs text-gray-400 mb-0.5">Daily Income</div>
                        <div className="text-xs font-bold text-green-600">₦{pos.dailyIncome}</div>
                      </div>
                    </div>

                    {/* Buy Now + Upload Proof row */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPos(pos)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm bg-gradient-to-r ${pos.activeColor}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {isActive ? "Recharge / Upgrade" : "Buy Now"}
                      </button>
                      <button
                        onClick={() => setSelectedPos(pos)}
                        title="Upload Payment Screenshot"
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border-2 border-dashed border-gray-200 hover:border-purple-400 text-gray-500 hover:text-purple-600 transition-all"
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
