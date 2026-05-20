const CACHE_NAME = "cosmic-chat-v4";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./widgets.css",
  "./vendor/prism.css",
  "./db.js",
  "./crypto.js",
  "./vendor/prism.js",
  "./vendor/marked.js",
  "./locales.js",
  "./api.js",
  "./renderer.js",
  "./app.js",
  "./manifest.json",
  "./icon.svg"
];

// Install Event: cache static resources
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: clear old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Serve cached assets first, fetch from network if missing
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // CRITICAL BYPASS: Only cache GET requests destined for our local origin.
  // Bypass all POST requests, external API chat stream endpoints (e.g., chat/completions).
  if (e.request.method !== "GET" || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return from cache, but update cache in the background (stale-while-revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {
          // Ignore network errors in background revalidation
        });
        return cachedResponse;
      }

      // If missing from cache, fetch from network
      return fetch(e.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        return response;
      });
    })
  );
});
