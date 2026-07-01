import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share, Download, Home, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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

const INSTALLED_KEY = "mf_app_installed";
const SESSION_SHOWN_KEY = "installPromptShown";

export function InstallPrompt() {
  const { user, isLoading } = useAuth();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Capture the native browser install event as early as possible
  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Also listen for the appinstalled event — fired when the OS installs the PWA
    const onAppInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "1");
      setVisible(false);
    };
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      sessionStorage.removeItem(SESSION_SHOWN_KEY);
      return;
    }

    // App is already installed on this device — never show
    if (localStorage.getItem(INSTALLED_KEY)) return;

    const p = detectPlatform();
    // Running as a standalone PWA — mark installed and never show
    if (p === "installed") {
      localStorage.setItem(INSTALLED_KEY, "1");
      return;
    }

    // Already shown during this login session — skip
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;

    // Mark as shown for this session immediately so re-renders don't re-trigger
    sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    setPlatform(p);

    // Small delay so the dashboard has a moment to settle first
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [user, isLoading]);

  async function handleInstall() {
    if (platform === "android" || platform === "desktop") {
      if (deferredPrompt) {
        setInstalling(true);
        try {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (outcome === "accepted") {
            // Permanently remember the user installed the app
            localStorage.setItem(INSTALLED_KEY, "1");
            setVisible(false);
            return;
          }
        } finally {
          setInstalling(false);
        }
      }
      // If no native prompt available, show manual guidance
      setPlatform("desktop");
    }
  }

  function handleLater() {
    // Close — will reappear next session if not yet installed
    setVisible(false);
  }

  if (!visible || !platform || platform === "installed") return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Sheet — no backdrop so page content (e.g. NO LEVEL YET) stays readable */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl bg-slate-900 border-t border-white/10 pb-safe shadow-2xl"
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
