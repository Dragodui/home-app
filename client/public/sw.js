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

  const origin = new URL(self.location.href).origin;

  const shouldCacheResponse = (request, response) => {
    try {
      const reqUrl = new URL(request.url);
      // Only cache http(s) and same-origin static assets
      if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') return false;
      if (reqUrl.origin !== origin) return false;
      if (!response || !response.ok) return false;
      // only cache files with known static extensions or root
      if (reqUrl.pathname === '/') return true;
      return /\.(js|css|png|jpg|svg|ico|woff2?)$/.test(reqUrl.pathname);
    } catch (e) {
      return false;
    }
  };

  // App shell & static assets: cache-first, fallback to network
  event.respondWith(
    caches
      .match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request).then((response) => {
          if (shouldCacheResponse(event.request, response)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch((err) => {
                // Ignore cache put errors (e.g., unsupported schemes)
                console.warn('[SW] cache.put failed, skipping:', err);
              });
            });
          }
          return response;
        });
      })
      .catch(() => caches.match("/")) // Offline fallback to cached index
  );
});

// Web Push support (when server sends Push API events)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "Notification", body: "", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (new URL(client.url).pathname === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
