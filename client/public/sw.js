const CACHE_NAME = "household-manager-v1";
const SHELL_URLS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for shell/static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip WebSocket upgrade requests
  if (event.request.headers.get("upgrade") === "websocket") return;

  // API requests: network-only, do not cache
  if (url.pathname.startsWith("/api/") || url.pathname === "/ws") return;

  // App shell & static assets: cache-first, fallback to network
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          // Cache successful responses for static assets
          if (
            response.ok &&
            (url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/) ||
              url.pathname === "/")
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => caches.match("/")) // Offline fallback to cached index
  );
});
