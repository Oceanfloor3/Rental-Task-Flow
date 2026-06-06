import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Settings, Shield, Bell, HelpCircle, LogOut, ChevronLeft, ChevronRight,
  Copy, Check, Phone, Mail, MapPin, Building2, CreditCard, Hash, Smile, CheckCircle2,
} from "lucide-react";
import {
  useGetUserProfile,
  useGetNotifications,
  useMarkNotificationRead,
  useGetHelpCenter,
  useChangePassword,
  useUpdateAvatar,
  getGetUserProfileQueryKey,
  getGetNotificationsQueryKey,
  getGetHelpCenterQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type ProfileView = "main" | "personal" | "security" | "notifications" | "help" | "avatar";

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-700 mt-0.5 break-all">{value || "—"}</p>
      </div>
    </div>
  );
}

const MALE_AVATAR_SEEDS = ["Felix", "Max", "James", "Alex", "Ryan", "Chris", "David", "Mike"];
const FEMALE_AVATAR_SEEDS = ["Lily", "Emma", "Sofia", "Anna", "Mia", "Sara", "Luna", "Zoe"];

function getAvatarUrl(gender: string | undefined, seed: string): string {
  if (gender === "female") {
    return `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffd5dc,c0aede,b6e3f4`;
  }
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function isAvatarUrl(avatar: string | undefined): boolean {
  return !!avatar && (avatar.startsWith("http") || avatar.startsWith("data:"));
}

export default function Profile() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ProfileView>("main");
  const [copied, setCopied] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile } = useGetUserProfile({ query: { queryKey: getGetUserProfileQueryKey() } });
  const { data: notifications } = useGetNotifications({ query: { queryKey: getGetNotificationsQueryKey() } });
  const { data: helpCenter } = useGetHelpCenter({ query: { queryKey: getGetHelpCenterQueryKey() } });

  const changePasswordMutation = useChangePassword();
  const markReadMutation = useMarkNotificationRead();
  const updateAvatarMutation = useUpdateAvatar();

  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead).length || 0;

  const handleCopyReferral = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password must be at least 6 characters" });
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({ data: { currentPassword, newPassword } });
      toast({ title: "Password updated successfully" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch {
      toast({ variant: "destructive", title: "Failed to update password. Check your current password." });
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markReadMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
    } catch {
      // ignore
    }
  };

  const handleSaveAvatar = async () => {
    const urlToSave = selectedAvatarUrl ?? profile?.avatar;
    if (!urlToSave) return;
    setSavingAvatar(true);
    try {
      await updateAvatarMutation.mutateAsync({ data: { avatarUrl: urlToSave } });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey() });
      toast({ title: "Avatar updated! 🎉" });
      setView("main");
      setSelectedAvatarUrl(null);
    } catch {
      toast({ variant: "destructive", title: "Failed to update avatar" });
    } finally {
      setSavingAvatar(false);
    }
  };

  const initials = profile ? `${profile.firstName?.[0] || ''}${profile.surname?.[0] || ''}`.toUpperCase() : "??";
  const fullName = profile ? `${profile.firstName || ''} ${profile.middleName ? profile.middleName + ' ' : ''}${profile.surname || ''}`.trim() : "";
  const avatarSeeds = profile?.gender === "female" ? FEMALE_AVATAR_SEEDS : MALE_AVATAR_SEEDS;

  const slideVariants = {
    enter: { x: "100%", opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  };

  const renderSubView = (content: React.ReactNode, title: string) => (
    <motion.div
      key={title}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "tween", duration: 0.2 }}
      className="min-h-screen bg-gray-50"
    >
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-4 py-4 flex items-center gap-3 text-white">
        <button onClick={() => setView("main")} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
      <div className="p-4">{content}</div>
    </motion.div>
  );

  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait">
        {view === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-gray-50 min-h-screen"
          >
            {/* Header */}
            <div className="bg-gradient-to-b from-purple-600 to-indigo-700 pt-10 pb-20 px-6 text-center text-white relative">
              <div className="absolute top-4 right-4">
                <Settings className="w-5 h-5 text-white/60" />
              </div>

              {/* Avatar with edit button */}
              <div className="relative inline-block mb-3">
                <div className="w-24 h-24 mx-auto rounded-full bg-white/20 border-4 border-white/30 backdrop-blur-sm flex items-center justify-center text-3xl font-extrabold overflow-hidden">
                  {isAvatarUrl(profile?.avatar) ? (
                    <img src={profile!.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover bg-white" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => setView("avatar")}
                  className="absolute -bottom-1 -right-1 bg-white text-purple-600 rounded-full p-1.5 shadow-md hover:bg-purple-50 transition-colors border-2 border-purple-200"
                  title="Change avatar"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              <h1 className="text-xl font-extrabold">{fullName || profile?.phone}</h1>
              <p className="text-white/70 text-sm mt-1">{profile?.phone}</p>
              <div className="flex justify-center gap-2 mt-2">
                {profile?.position && (
                  <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-semibold backdrop-blur-sm">
                    {profile.position}
                  </span>
                )}
                {profile?.level && (
                  <span className="bg-amber-400/80 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    {profile.level}
                  </span>
                )}
              </div>
            </div>

            <div className="-mt-12 px-4 space-y-4 pb-8">
              {/* Balance + Deposit */}
              <div className="bg-white rounded-2xl shadow-sm p-5 flex justify-around text-center divide-x border border-gray-100">
                <div className="px-2 w-1/2">
                  <div className="text-xs text-gray-400 font-medium mb-1">Balance (NGN)</div>
                  <div className="font-extrabold text-slate-800 text-xl">
                    {parseFloat(profile?.balance?.toString() || "0").toFixed(2)}
                  </div>
                </div>
                <div className="px-2 w-1/2">
                  <div className="text-xs text-gray-400 font-medium mb-1">Security Deposit</div>
                  <div className="font-extrabold text-slate-800 text-xl">{profile?.securityDeposit || "0.00"}</div>
                </div>
              </div>

              {/* Referral Code */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Your Referral Code</p>
                  <p className="font-bold text-purple-700 text-lg tracking-widest mt-0.5">{profile?.referralCode || "—"}</p>
                </div>
                <button
                  onClick={handleCopyReferral}
                  className="p-2.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {/* Menu */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {[
                  { id: "avatar", label: "Change Avatar", icon: Smile, color: "bg-purple-50 text-purple-600" },
                  { id: "personal", label: "Personal Information", icon: User, color: "bg-blue-50 text-blue-600" },
                  { id: "security", label: "Account Security", icon: Shield, color: "bg-green-50 text-green-600" },
                  {
                    id: "notifications", label: "Notifications", icon: Bell, color: "bg-purple-50 text-purple-600",
                    badge: unreadCount > 0 ? unreadCount : undefined
                  },
                  { id: "help", label: "Help Center", icon: HelpCircle, color: "bg-orange-50 text-orange-600" },
                ].map(({ id, label, icon: Icon, color, badge }, idx, arr) => (
                  <button
                    key={id}
                    onClick={() => setView(id as ProfileView)}
                    className={`w-full flex items-center px-4 py-4 active:bg-gray-50 transition-colors text-left ${idx < arr.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center mr-3`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 font-medium text-slate-700">{label}</div>
                    {badge !== undefined && (
                      <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold mr-2">
                        {badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                ))}
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-center text-red-500 font-bold active:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" /> Log Out
              </button>
            </div>
          </motion.div>
        )}

        {/* Change Avatar */}
        {view === "avatar" && renderSubView(
          <div className="space-y-5">
            {/* Current avatar preview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Preview</p>
              <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-50 border-4 border-purple-100">
                {(selectedAvatarUrl || (isAvatarUrl(profile?.avatar) ? profile!.avatar : null)) ? (
                  <img
                    src={selectedAvatarUrl ?? profile!.avatar}
                    alt="Selected avatar"
                    className="w-full h-full object-cover bg-white"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-purple-400">
                    {initials}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {selectedAvatarUrl ? "New selection" : "Your current avatar"}
              </p>
            </div>

            {/* Avatar grid */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">
                {profile?.gender === "female" ? "Female" : "Male"} Avatars
              </p>
              <div className="grid grid-cols-4 gap-3">
                {avatarSeeds.map((seed) => {
                  const url = getAvatarUrl(profile?.gender, seed);
                  const isSelected = (selectedAvatarUrl ?? profile?.avatar) === url;
                  return (
                    <button
                      key={seed}
                      onClick={() => setSelectedAvatarUrl(url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden bg-white border-2 transition-all ${
                        isSelected
                          ? "border-purple-500 ring-2 ring-purple-300 shadow-md scale-105"
                          : "border-gray-100 hover:border-purple-200 hover:shadow-sm"
                      }`}
                    >
                      <img src={url} alt={seed} className="w-full h-full object-cover bg-white p-1" loading="lazy" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-purple-500 rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleSaveAvatar}
              disabled={savingAvatar || (!selectedAvatarUrl)}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6 h-auto rounded-xl font-semibold disabled:opacity-50"
            >
              {savingAvatar ? "Saving…" : "Save Avatar"}
            </Button>
          </div>,
          "Change Avatar"
        )}

        {/* Personal Information */}
        {view === "personal" && renderSubView(
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 divide-y divide-gray-50">
            <InfoRow icon={User} label="First Name" value={profile?.firstName} />
            <InfoRow icon={User} label="Middle Name" value={profile?.middleName} />
            <InfoRow icon={User} label="Surname" value={profile?.surname} />
            <InfoRow icon={Phone} label="WhatsApp Number" value={profile?.whatsappNumber} />
            <InfoRow icon={Mail} label="Email Address" value={profile?.email} />
            <InfoRow icon={MapPin} label="Home Address" value={profile?.homeAddress} />
            <InfoRow icon={Building2} label="Bank Name" value={profile?.bankName} />
            <InfoRow icon={CreditCard} label="Account Number" value={profile?.accountNumber} />
            <InfoRow icon={User} label="Account Holder" value={profile?.accountHolderName} />
            <InfoRow icon={Hash} label="Zip Code" value={profile?.zipCode} />
          </div>,
          "Personal Information"
        )}

        {/* Account Security */}
        {view === "security" && renderSubView(
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Change Password</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Current Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6 h-auto rounded-xl font-semibold"
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>,
          "Account Security"
        )}

        {/* Notifications */}
        {view === "notifications" && renderSubView(
          <div className="space-y-3">
            {!(notifications as any[])?.length ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100 shadow-sm">
                No notifications yet.
              </div>
            ) : (notifications as any[])?.map((n: any) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left flex items-start gap-3 active:bg-gray-50 transition-colors"
              >
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-blue-500" : "bg-gray-200"}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${!n.isRead ? "text-slate-800" : "text-slate-600"}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>,
          "Notifications"
        )}

        {/* Help Center */}
        {view === "help" && renderSubView(
          <div className="space-y-3">
            {!(helpCenter as any[])?.length ? (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100 shadow-sm">
                No help contacts available.
              </div>
            ) : (helpCenter as any[])?.map((h: any) => {
              const platformColors: Record<string, string> = {
                whatsapp: "bg-green-50 text-green-600",
                telegram: "bg-blue-50 text-blue-600",
                instagram: "bg-pink-50 text-pink-600",
                email: "bg-gray-50 text-gray-600",
              };
              const platformEmoji: Record<string, string> = {
                whatsapp: "📱",
                telegram: "✈️",
                instagram: "📸",
                email: "✉️",
              };
              const colorClass = platformColors[h.platform?.toLowerCase()] || "bg-purple-50 text-purple-600";
              const emoji = platformEmoji[h.platform?.toLowerCase()] || "💬";
              return (
                <a
                  key={h.id}
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${colorClass} flex items-center justify-center text-xl`}>
                      {emoji}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 capitalize">{h.platform}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{h.handle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </a>
              );
            })}
          </div>,
          "Help Center"
        )}
      </AnimatePresence>
    </div>
  );
}
