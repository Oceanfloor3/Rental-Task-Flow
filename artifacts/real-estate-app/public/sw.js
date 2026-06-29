const CACHE = "meridianflow-v5";

const STATIC_ICONS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(STATIC_ICONS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => {
        // Force every open tab to reload so they pick up the freshly deployed JS
        clients.forEach((client) => client.navigate(client.url));
      })
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always use network for API calls
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Skip WebSocket upgrades
  if (e.request.headers.get("upgrade") === "websocket") {
    return;
  }

  // Network-first for everything — always serve the latest deployed version.
  // Fall back to cache only when offline.
  if (e.request.method === "GET") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached ?? new Response("Offline", { status: 503 }))
        )
    );
  }
});
