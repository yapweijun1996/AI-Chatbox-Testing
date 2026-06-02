# Cosmic Pixel - Secure Serverless AI Chatbox

A serverless, high-privacy AI chat application designed with a premium modern minimalist layout, advanced telemetry dashboards, and a strict **BYOK (Bring Your Own Key)** architecture.

---

## ✨ Core Features

- **🎨 Premium Minimalist Visual Design**: High-fidelity adaptation of modern desktop/mobile layouts, translucent glassmorphism variables, squircle corners, dark/light themes, and smooth CSS transitions.
- **🔒 Commercial-Grade Privacy & Obfuscation**: Keys are obfuscated locally via a lightweight Base64 + XOR mutator prior to serialization to mitigate plain text harvesting from malicious extensions or XSS.
- **⚡ Zero-Server Routing**: Stream parsing is executed entirely on the client side in ES6 JS without middleware or proxy servers, guaranteeing zero API key or chat log storage/leakage.
- **🛑 Instant Generation Aborting**: Features an interactive stop button ("■") utilizing standard `AbortController` signals to immediately cut off network streaming, saving user API tokens.
- **🧠 Smart Scroll-Locking**: Intelligent viewport logic tracks the user's reading position during streaming. If you scroll up to inspect history, auto-scrolling is locked immediately, and returns smoothly once you scroll back down.
- **🌟 High-Fidelity Local Syntax Highlighting**: Pre-packaged with **Prism.js (Okaidia Theme)** in a standalone vendor folder, providing instant, beautiful code highlighting without any external CDNs or privacy leakage.
- **📦 Off-grid Durability**: Employs IndexedDB for chat history, sessions, and configuration management, accompanied by a robust memory fallback mechanism.
- **🌐 Provider Compatibility**: Works with any provider that exposes an OpenAI-compatible `/chat/completions` streaming endpoint. Ships with presets for **OpenAI**, **Google Gemini** (via its OpenAI-compatible endpoint), **Anthropic**, and **local LM Studio**; other OpenAI-compatible services (e.g. DeepSeek) work by entering their base URL. *Note: Anthropic's native API is not OpenAI-compatible — point its preset at an OpenAI-compatible endpoint or proxy.*

---

## 🚀 Run & Local Testing

As this is a **100% Client-side Static App (No Frameworks, No Bundlers, No CDNs)**, you do not need `npm run dev` to preview or run:

### Method 1: Desktop Double Click
Simply double-click `index.html` in your file explorer to open it in any modern browser.

### Method 2: Local Server (Recommended)
For testing serverless stream connections without browser file protocol limitations, run a local web server:
- **Python**: Run `python -m http.server 8000` in the root folder, and navigate to `http://localhost:8000`.
- **Node.js**: Run `npx serve .` and open the returned local address.
- **VS Code**: Install the `Live Server` extension and click "Go Live" at the bottom-right corner.

---

## ☁️ Continuous Auto-Deployment with GitHub Pages

This repo ships a GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that builds and deploys to GitHub Pages on every push to `main`:

1. Push this repository to your GitHub account.
2. Go to your repository's **Settings** tab.
3. Click on **Pages** in the left sidebar menu.
4. Under **Build and deployment -> Source**, select **GitHub Actions** (not "Deploy from a branch").
5. Push to `main` — or trigger it manually via **Actions -> Deploy to GitHub Pages -> Run workflow**. Within minutes your live app is generated at `https://<your-username>.github.io/<your-repo-name>/`.

On each deploy the workflow stamps the service worker's cache name with the commit SHA, so the installed PWA detects the new build, drops the stale cache, and reloads open tabs onto the latest code automatically.

---

## 📁 File Structure

- `index.html`: Main viewport, chat inputs, settings overlay drawer, and structured layout scripts.
- `styles.css`: Pure responsive native CSS containing variables, dark/light themes, and custom animation curves.
- `widgets.css`: Consolidated micro-telemetry performance metrics, pulsing thinking indicator dots, custom mouse-following tooltips, and settings overlay modals.
- `db-init.js`: Opens the `CosmicPixelDB` IndexedDB database, defines the `sessions`/`messages`/`settings` object stores, and provides the in-memory fallback used when IndexedDB is unavailable.
- `db-operations.js`: Promise-based CRUD for sessions, messages, and settings, including cascading session deletes.
- `crypto.js`: Base64 and XOR dynamic obfuscator for client-side BYOK key sanitization.
- `api.js`: Decoupled Server-Sent Events (SSE) stream client with full `AbortSignal` cancellation support.
- `renderer.js`: Markdown rendering via the bundled **Marked.js** (custom code-block and link renderers, GFM), HTML escaping, telemetry badge builders, and theme/tooltip/service-worker helpers.
- `sw.js`: PWA service worker that pre-caches the static shell; its cache name is stamped with the deploy commit SHA, so a new deploy busts the cache and auto-refreshes open tabs.
- `app.js`: Application bootstrap and orchestration — global state, DOM wiring, provider-tab switching, the send/stream loop, and message rendering.
- `sessions.js`: Sidebar session list — rendering, selection, delete (with confirm), and double-click rename.
- `editor.js`: In-place editing of a sent message ("Save & Resubmit") and regeneration of an assistant reply.
- `locales.js`: UI translation strings for English, Mandarin, Malay, Japanese, and Vietnamese.
- `manifest.json`: PWA manifest — installable-app metadata, icons, and theme colors.
- `icon.svg`: App icon used by the manifest and as the favicon.
- `vendor/`: Self-hosted, MIT-licensed third-party libraries — Prism.js + Prism.css (Okaidia syntax theme) and Marked.js (Markdown parser). No external CDNs.
