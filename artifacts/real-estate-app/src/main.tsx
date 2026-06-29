import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA installability + offline shell caching.
// When a new SW takes control (after a deploy), reload the page once so the
// user always sees the latest version without manually clearing cache.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated" && navigator.serviceWorker.controller) {
              // A new SW just took over — reload to serve fresh files
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {/* SW registration is best-effort */});

    // Also reload if control shifts to a new SW while the page is open
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}
