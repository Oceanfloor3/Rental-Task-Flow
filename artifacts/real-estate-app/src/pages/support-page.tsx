import { useLocation } from "wouter";
import {
  useGetHelpCenter,
  getGetHelpCenterQueryKey,
} from "@workspace/api-client-react";
import { ArrowLeft, Headphones, ChevronRight, MessageCircle } from "lucide-react";

export default function SupportPage() {
  const [, navigate] = useLocation();

  const { data: helpCenter, isLoading } = useGetHelpCenter({ query: { queryKey: getGetHelpCenterQueryKey() } });
  const contacts = (helpCenter as any[]) ?? [];

  const platformEmoji: Record<string, string> = {
    whatsapp: "📱",
    telegram: "✈️",
    instagram: "📸",
    email: "✉️",
    facebook: "📘",
    twitter: "🐦",
  };
  const platformColor: Record<string, string> = {
    whatsapp: "bg-green-50 text-green-800 border-green-200",
    telegram: "bg-blue-50 text-blue-800 border-blue-200",
    instagram: "bg-pink-50 text-pink-800 border-pink-200",
    email: "bg-[#0d1829] text-white border-white/15",
    facebook: "bg-[#111e35] text-white border-white/15",
    twitter: "bg-sky-50 text-sky-800 border-sky-200",
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#111e35] to-[#0d1829]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-white/80"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-green-600" />
          <h1 className="text-lg font-bold text-slate-800">Support</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">
        {/* Hero */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Headphones className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black">We're Here to Help</h2>
          <p className="text-white/80 text-xs mt-1 leading-relaxed">
            Reach out to our support team via any of the channels below.
          </p>
        </div>

        <h2 className="text-sm font-bold text-slate-700">Contact Channels</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-white/10 p-4 h-16 animate-pulse" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center text-white/40">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No support contacts available</p>
            <p className="text-xs mt-1 opacity-60">Please check back later</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((h: any) => {
              const key = h.platform?.toLowerCase() ?? "";
              const colorClass = platformColor[key] ?? "bg-[#111e35] text-white border-white/15";
              const emoji = platformEmoji[key] ?? "💬";
              return (
                <a
                  key={h.id}
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-4 p-4 rounded-2xl border ${colorClass} active:opacity-80 transition-all shadow-sm hover:shadow-md`}
                >
                  <span className="text-2xl w-10 text-center">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm capitalize">{h.platform}</p>
                    {h.handle && <p className="text-xs opacity-70 mt-0.5 truncate">{h.handle}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 opacity-40 shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-1 mt-2">
          <p className="text-xs font-bold text-blue-800">Response Times</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Our team typically responds within <strong>1–24 hours</strong> depending on the channel. WhatsApp & Telegram are usually fastest.
          </p>
        </div>
      </div>
    </div>
  );
}
