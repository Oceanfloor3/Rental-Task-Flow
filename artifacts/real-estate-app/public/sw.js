const CACHE = "meridianflow-v1";

const APP_SHELL = [
  "/",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always use network for API calls — never serve stale data
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // For WebSocket upgrades, skip the service worker entirely
  if (e.request.headers.get("upgrade") === "websocket") {
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    e.request.method === "GET" &&
    (url.pathname.match(/\.(js|css|png|svg|jpg|jpeg|webp|woff2?|ico)$/) ||
      url.pathname.startsWith("/icons/"))
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
        return cached ?? networkFetch;
      })
    );
    return;
  }

  // Network-first for HTML navigation (always get the latest app shell)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match("/").then((cached) => cached ?? new Response("Offline", { status: 503 }))
      )
    );
    return;
  }
});
