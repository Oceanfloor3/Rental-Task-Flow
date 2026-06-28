import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, Download, Home, TrendingUp, Wallet } from "lucide-react";

type Platform = "android" | "ios" | "desktop" | "installed";

function detectPlatform(): Platform {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
  if (standalone) return "installed";

  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

let deferredPrompt: any = null;

export function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const promptCapturedRef = useRef(false);

  useEffect(() => {
    const p = detectPlatform();
    if (p === "installed") return;

    setPlatform(p);

    // Capture the native Chrome/Android install prompt before it auto-fires
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
      promptCapturedRef.current = true;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Show our overlay immediately — "byforce"
    const timer = setTimeout(() => setVisible(true), 600);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  async function handleInstall() {
    if (platform === "android" || platform === "desktop") {
      if (deferredPrompt) {
        setInstalling(true);
        try {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (outcome === "accepted") {
            setVisible(false);
            return;
          }
        } finally {
          setInstalling(false);
        }
      }
      // If no prompt available yet (e.g. refreshed too soon), show guidance
      setPlatform("desktop");
    }
  }

  function handleLater() {
    // Close but will reappear next session (no permanent dismiss)
    setVisible(false);
  }

  if (!visible || !platform || platform === "installed") return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl bg-slate-900 border-t border-white/10 pb-safe"
            style={{ maxWidth: 430, margin: "0 auto" }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pt-4 pb-8">
              {/* App identity */}
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="/logo.png"
                  alt="MeridianFlow"
                  className="w-16 h-16 rounded-2xl shadow-lg object-cover"
                />
                <div>
                  <h2 className="text-white font-bold text-xl leading-tight">MeridianFlow</h2>
                  <p className="text-amber-400 text-sm font-medium">Investment Platform</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} className="text-amber-400 text-xs">★</span>
                    ))}
                    <span className="text-white/40 text-xs ml-1">Free</span>
                  </div>
                </div>
              </div>

              {/* Feature pills */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: Home, label: "Property Tasks" },
                  { icon: TrendingUp, label: "Daily Earnings" },
                  { icon: Wallet, label: "Withdrawals" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex flex-col items-center gap-1.5 bg-white/5 rounded-2xl py-3 px-2"
                  >
                    <Icon className="w-5 h-5 text-amber-400" />
                    <span className="text-white/70 text-xs text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>

              {/* iOS instructions */}
              {platform === "ios" && (
                <div className="mb-5 bg-white/5 rounded-2xl p-4">
                  <p className="text-white font-semibold text-sm mb-3">Add to your Home Screen:</p>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { step: "1", text: "Tap the Share button", icon: "📤" },
                      { step: "2", text: 'Scroll down and tap "Add to Home Screen"', icon: "➕" },
                      { step: "3", text: 'Tap "Add" to confirm', icon: "✅" },
                    ].map(({ step, text, icon }) => (
                      <div key={step} className="flex items-start gap-3">
                        <span className="text-lg leading-none">{icon}</span>
                        <span className="text-white/70 text-sm leading-tight">{text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-2 text-white/50 text-xs">
                    <Share className="w-3.5 h-3.5" />
                    <span>Tap the share icon in your Safari toolbar</span>
                  </div>
                </div>
              )}

              {/* Android/Desktop install button */}
              {(platform === "android" || platform === "desktop") && (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 mb-3 text-base shadow-lg shadow-amber-900/40"
                >
                  <Download className="w-5 h-5" />
                  {installing ? "Opening installer…" : "Install App"}
                </button>
              )}

              <button
                onClick={handleLater}
                className="w-full text-white/40 text-sm py-2 hover:text-white/60 transition-colors"
              >
                Continue in browser
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
