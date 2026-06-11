# System Architecture and Specifications - Cosmic Pixel

This document outlines the detailed system specifications, security paradigms, networking layouts, and storage schemas implemented in Cosmic Pixel.

---

## 1. BYOK Security & Obfuscation Layer (`crypto.js`, `db-init.js` & `db-settings.js`)

Cosmic Pixel employs a strict **Bring Your Own Key (BYOK)** model. Credentials never touch intermediate servers and are fully contained in the browser.

### 1.1 Local Data Sandboxing (Same-Origin Policy)
- Databases are bound to the host domain via the browser's native **Same-Origin Policy (SOP)** sandbox. No external website or iframe can read or extract the IndexedDB database.

### 1.2 Cryptographic Obfuscation Protocol (`crypto.js`)
- **Vulnerability Mitigated**: Plain text scanning from untrusted browser extensions or cross-site scripting (XSS) scraping.
- **Implementation**: API keys are transformed using a stream-like $\mathcal{O}(1)$ complexity **Base64 + XOR (Exclusive OR) mutator** with a local salt (`CosmicPixelSecureUniversalByokXorKey`) before serialization.
- **Persistence Boundary**: Key data is written to disk (IndexedDB) only as obfuscated (non-plain-text) values. De-obfuscation happens in memory — when initializing a `fetch` stream and when populating the settings form for editing — and the plain-text key is never persisted.

---

## 2. IndexedDB Schema Architecture (`db-init.js`, `db-settings.js`, `db-sessions.js` & `db-messages.js`)

The client persistence layer leverages standard asynchronous IndexedDB object stores.

### 2.1 Schema Definition
- **Database Name**: `CosmicPixelDB` (Version `1`)
- **Object Stores**:
  - `settings`: Keyed by `provider` (e.g. `openai`, `gemini`). Stores `baseUrl`, `apiKey` (obfuscated), and `model` name.
  - `sessions`: Keyed by auto-incrementing `id`. Stores `title`, `createdAt`, and `updatedAt`. Contains `updatedAt` index for descending sorting.
  - `messages`: Keyed by auto-incrementing `id`. Stores `sessionId`, `role`, `content`, `timestamp`, and `performance` (optional metadata object). Contains `sessionId` and `timestamp` indexes for rapid retrieval and ordering.

### 2.2 Memory Fallback (Graceful Degradation)
- If IndexedDB is blocked (e.g. strict Private browsing or sandboxed environments), `db-init.js` dynamically falls back to a plain **in-memory object store** to keep the UI working. This fallback is not persisted — data lives only for the current page session and is lost on reload.

---

## 3. SSE Stream Decoder (`api.js`, `chat.js` & `markdown.js`)

We stream text generation in real-time utilizing **Server-Sent Events (SSE)**.

### 3.1 Fetch Streams vs. HTML5 `EventSource`
Cosmic Pixel intentionally rejects the default HTML5 `EventSource` API in favor of raw asynchronous Fetch stream readers.
- **GET constraint bypass**: `EventSource` is strictly restricted to GET requests, which cannot carry deep historical conversation payloads.
- **Custom Header Injection**: `EventSource` forbids Custom Headers, making secure, serverless Bearer key injection impossible without placing keys inside visible URL queries.
- **Fetch Solution**: Using `fetch` with `ReadableStream` enables sending standard POST requests with deep nested chat history JSON bodies while safely binding Keys inside standard request header scopes.

### 3.2 Cancelable Streams via `AbortController`
- Integrated an standard `AbortController` signal pipeline. Users can abort the fetch stream midway (via an interactive "■" stop button), safely halting active connections and conserving API tokens on the model provider side.

### 3.3 Resilience & Buffering
- **Chunk splitting**: Handles partial JSON chunks in stream packets using high-resiliency try-catch string validation blocks, guaranteeing that raw network packet cuts never crash the UI render loop.

---

## 4. High-Resolution Telemetry Metrics (`api.js` & `telemetry.js`)

A custom telemetry engine measures millisecond-level network connection latency and model inference performance.

### 4.1 Telemetry Metrics Definition
- **Connection Latency / FBL (First Byte Latency)**: Span delta from network fetch initiation to response headers received. Reflects DNS, TCP handshake, and TLS negotiation duration.
- **TTFT (Time to First Token)**: Span delta from fetch trigger to the arrival of the first non-empty text token. Represents model prefill/thinking time.
- **Speed (Tokens Per Second - TPS)**: Generated tokens divided by decode duration (total generation duration minus TTFT). Measures pure LLM token generation throughput.
- **ITL (Inter-Token Latency)**: Generation duration (total generation duration minus TTFT) divided by generated tokens. Reflects word-by-word fluidity.
- **Total Duration (E2E)**: Total roundtrip time from clicking "Send" to stream termination.
- **Token Estimation**: Estimated using an optimal heuristic ratio ($\text{Length} / 3.2$), ensuring accurate stats across mixed multilingual streams without introducing bloated node tokenizers.

### 4.2 Interactive Tooltips
- Metric Badges are fully interactive. Hovering over a metric displays a mouse-following custom tooltip (`.custom-tooltip`) explaining the definition and meaning of the metric in plain language.

---

## 5. PWA & Caching Lifecycle (`sw.js` & `manifest.json`)

Compliant with W3C 2026 progressive web standards.

- **Caching Lifecycle (SHA-versioned)**: Pre-caches the static shell (`index.html`, `styles.css`, `widgets.css`, the crypto/IndexedDB layer — `crypto.js`, `db-init.js`, `db-settings.js`, `db-sessions.js`, `db-messages.js` — the i18n/feature scripts `locales.js`, `sessions.js`, `editor.js`, `api.js`, the rendering/UI helpers `markdown.js`, `telemetry.js`, `theme.js`, `tooltips.js`, `pwa.js`, the app scripts `state.js`, `providers.js`, `chat.js`, `main.js`, plus `manifest.json`, `icon.svg`, and the `vendor/` assets — Prism and Marked) using a Stale-While-Revalidate pattern. The cache name (`cosmic-chat-<commit-sha>`) is stamped from the git commit SHA at deploy time, so every deploy invalidates the previous cache; on activation the worker deletes stale caches, claims open clients, and the page auto-reloads onto the new build.
- **Bypass Filters**: Ignore non-GET requests or requests destined for external hosts, ensuring real-time Server-Sent Events (SSE) streaming connections bypass caching completely.

---

## 6. Mobile & PWA Platform Compatibility

Cosmic Pixel is designed to behave as a native-quality experience on both iOS and Android devices.

### 6.1 iOS Safe Area Support
- The viewport meta tag sets `viewport-fit=cover`, allowing the app shell to extend into the device's hardware notch and home indicator regions.
- CSS `env(safe-area-inset-*)` variables are applied at the layout level:
  - `chat-header` receives `padding-top: env(safe-area-inset-top)` so content clears the status bar and Dynamic Island.
  - `chat-footer` receives `padding-bottom: env(safe-area-inset-bottom)` so the input bar clears the home indicator swipe zone.
  - The sidebar receives `padding-top: env(safe-area-inset-top)` on mobile viewports to align its top edge with the safe content area.

### 6.2 iOS Viewport Height Stability
- Layout heights use `100dvh` (dynamic viewport height), which automatically accounts for the Safari address bar shrinking and expanding.
- A `100vh` declaration is provided as a fallback for browsers that do not yet support `dvh` units.
- `-webkit-fill-available` is additionally applied as a tertiary fallback targeting iOS 11–14 (Safari versions predating `dvh`), preventing the classic layout-jump bug when the address bar appears or hides during scroll.

### 6.3 iOS Zoom Prevention
- The viewport meta tag includes `user-scalable=no` and `maximum-scale=1.0` to suppress the iOS double-tap and pinch-zoom behaviors that can disrupt fixed-position UI elements.
- All `<textarea>` and `<input>` elements are styled with `font-size: 16px` or larger on mobile. iOS Safari automatically zooms the viewport when a focused input has a font size below 16 px; enforcing this threshold eliminates that behavior without relying solely on `user-scalable=no`.

### 6.4 Android Compatibility
- `<meta name="HandheldFriendly" content="true">` and `<meta name="MobileOptimized" content="320">` are included for compatibility with legacy Android WebView environments and older AOSP browsers.
- The sidebar uses an off-canvas pattern: it is positioned outside the visible viewport by default and slides in via CSS transform. A semi-transparent `.sidebar-mask` overlay is rendered behind the open sidebar to capture tap-outside-to-close interactions.

### 6.5 Touch Interaction Performance
- Scrollable regions (message list, session list) apply `-webkit-overflow-scrolling: touch` to enable momentum-based (kinetic) scrolling on iOS.
- Scroll containers also set `touch-action: pan-y` to give the browser a hint that only vertical panning should be handled natively, improving scroll frame rate and preventing accidental horizontal gesture interference.
- All interactive buttons have a minimum tap target of 44×44 px per Apple HIG guidelines.

---

## 7. PWA Update & Force-Reload Flow (`sw.js` & `pwa.js`)

Cosmic Pixel uses an active update notification pattern so users always run the latest deployed build without needing to manually clear their browser cache.

### 7.1 Service Worker Install Phase
- On install, the service worker pre-caches all listed `ASSETS` (static shell files) in a single `cache.addAll()` call.
- `self.skipWaiting()` is called immediately inside the `install` handler so the new worker takes control of all open clients as fast as possible, without waiting for existing tabs to close.

### 7.2 Service Worker Activate Phase
- On activation, the worker iterates over all existing cache keys and deletes any cache whose name does not match the current `CACHE_NAME` (derived from the build SHA). This purges assets from previous deploys.
- `self.clients.claim()` is called so the newly activated worker immediately controls all open tabs, including those that were already loaded under the previous worker.
- After claiming clients, the worker broadcasts a `{ type: 'SW_UPDATED' }` `postMessage` to all connected clients, signaling that a new build is live.

### 7.3 Update Detection in `pwa.js`
- On page load, `pwa.js` registers the service worker and attaches a `updatefound` event listener to the `ServiceWorkerRegistration` object.
- When `updatefound` fires, the app obtains a reference to the `installing` worker and listens for its `statechange` event.
- Once the installing worker transitions to the `installed` state (meaning it is waiting and ready), the app displays a non-blocking **update toast** notification to the user.

### 7.4 Update Toast & Reload Sequence
- The update toast contains a user-facing "tap to update" action.
- Clicking it posts a `{ type: 'SKIP_WAITING' }` message to the waiting service worker, which causes it to call `self.skipWaiting()` programmatically and take control.
- The app listens for the `controllerchange` event on `navigator.serviceWorker`. When fired (confirming the new worker is now in control), the app calls `window.location.reload()`, loading the freshly cached assets.
- This two-step handshake (SKIP_WAITING → controllerchange → reload) guarantees that the hard reload always occurs after the new cache is active, preventing a race condition where the page could reload before the new worker has claimed the client.

### 7.5 Service Worker Self-Exclusion
- `sw.js` itself is explicitly excluded from the fetch cache handler. Requests for the service worker script always go to the network, ensuring the browser can detect updates on every navigation without the old script being served from cache.

---

## 8. CI/CD Deploy Pipeline (`.github/workflows/deploy.yml`)

Cosmic Pixel uses GitHub Actions for fully automated, zero-downtime deployments to GitHub Pages on every push to `main`.

### 8.1 Trigger Conditions
- The workflow runs automatically on every `push` to the `main` branch.
- A manual `workflow_dispatch` trigger is also configured, allowing on-demand deploys from the GitHub Actions UI without requiring a code push.

### 8.2 Concurrency Control
- The workflow uses `concurrency: cancel-in-progress: true` scoped to the deploy group. If a new push arrives while a previous deploy is still running, the in-progress job is cancelled and replaced by the newer one. This is safe for a static site deployment and avoids wasting CI minutes on superseded builds during rapid iteration.

### 8.3 Asset Verification Step
- Before uploading to GitHub Pages, a dedicated verify step checks that all critical asset files exist in the repository (`index.html`, `sw.js`, `manifest.json`, `styles.css`, `state.js`, `main.js`). If any file is missing the workflow fails fast with a clear error, preventing a broken shell from being deployed.

### 8.4 Build SHA Stamp
- The workflow performs a string replacement in `sw.js`, substituting the `__BUILD_SHA__` placeholder token with the value of `$GITHUB_SHA` (the full 40-character commit SHA of the triggering push).
- This produces a unique `CACHE_NAME` value (e.g. `cosmic-chat-a3f9c2d...`) for every deploy. Because the cache name changes on every push, the service worker's activate phase automatically discards the previous build's cached assets, ensuring users always receive the latest files.

### 8.5 HTML Validation Step
- A lightweight structural validation step inspects `index.html` using pattern checks to confirm that essential `<meta>` tags (viewport, manifest link) are present. Deployment is blocked if the validation fails, guarding against accidental deletion of critical PWA metadata.

### 8.6 Deploy Summary
- After a successful deploy, the workflow posts a formatted Markdown summary to the GitHub Actions job summary panel. The summary includes the live GitHub Pages URL, full and short commit SHA, actor, branch, and UTC timestamp — providing an at-a-glance audit trail for each release.

### 8.7 GitHub Pages Deployment
- Artifact upload and Pages deployment use the official `actions/upload-pages-artifact` and `actions/deploy-pages@v4` actions. The deployment job depends on the verify and build jobs completing successfully, enforcing a strict sequential gate before any files go live.
