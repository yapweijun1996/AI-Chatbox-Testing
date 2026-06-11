// ─── Cache Configuration ───────────────────────────────────────────────────
// CACHE_VERSION is stamped by CI with the build SHA so every new deploy
// produces a unique cache name, guaranteeing old caches are purged on activate.
const CACHE_VERSION = "__BUILD_SHA__";
const CACHE_NAME = `cosmic-chat-${CACHE_VERSION}`;

// All static assets that should be pre-cached on install.
const ASSETS = [
  "./","./index.html","./styles.css","./widgets.css","./vendor/prism.css",
  "./crypto.js","./db-init.js","./db-settings.js","./db-sessions.js","./db-messages.js",
  "./vendor/prism.js","./locales.js","./sessions.js","./editor.js","./api.js",
  "./vendor/marked.js","./markdown.js","./telemetry.js","./theme.js","./tooltips.js",
  "./pwa.js","./state.js","./providers.js","./chat.js","./main.js",
  "./manifest.json","./icon.svg"
];

// ─── Install ────────────────────────────────────────────────────────────────
// Pre-cache all known assets, then immediately take over any open pages
// (skipWaiting) so the new SW becomes active without waiting for tabs to close.
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────
// 1. Delete every cache that does not match the current CACHE_NAME (old versions).
// 2. Claim all open clients so this SW controls them immediately.
// 3. Broadcast SW_UPDATED to every client so the app can show an update toast
//    or trigger an automatic reload.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) return caches.delete(key);
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() =>
        // Notify all open clients that a new SW version is now in control.
        self.clients.matchAll({ includeUncontrolled: true, type: "window" })
          .then((clients) => {
            clients.forEach((client) =>
              client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION })
            );
          })
      )
  );
});

// ─── Message Handler ────────────────────────────────────────────────────────
// Allow any client to trigger a manual SW takeover by posting
// { type: 'SKIP_WAITING' }. Useful for an "Update now" button in the UI.
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Fetch Handler ──────────────────────────────────────────────────────────
// Strategy: stale-while-revalidate for GET requests to our own origin.
//   - Serve from cache immediately (fast), then fetch from network in the
//     background and update the cache for the next visit.
//   - If the resource is not in cache yet, fetch from network and cache it.
// Bypasses:
//   - Non-GET requests (POST, PUT, DELETE …) — never intercept API calls.
//   - Cross-origin requests — only handle our own origin.
//   - The service worker file itself — never cache sw.js to avoid serving a
//     stale SW that would block future updates.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Bypass: only handle same-origin GET requests.
  if (
    e.request.method !== "GET" ||
    !url.origin.startsWith(self.location.origin)
  ) {
    return;
  }

  // Bypass: never cache the service worker script itself.
  // Caching sw.js would prevent the browser from detecting new versions.
  if (url.pathname.endsWith("sw.js")) {
    return;
  }

  // Stale-while-revalidate for everything else.
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve stale response immediately; refresh cache in the background.
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(e.request, networkResponse)
              );
            }
          })
          .catch(() => {
            // Network unavailable — silently keep the stale cache.
          });
        return cachedResponse;
      }

      // Not in cache: fetch from network and cache the response.
      return fetch(e.request).then((response) => {
        if (
          !response ||
          response.status !== 200 ||
          response.type !== "basic"
        ) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) =>
          cache.put(e.request, responseToCache)
        );
        return response;
      });
    })
  );
});
