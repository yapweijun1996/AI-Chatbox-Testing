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
- **🌐 Provider Compatibility**: Directly compatible with OpenAI, Gemini, Anthropic, DeepSeek, and local LM Studio instances using standard OpenAI-compatible `/chat/completions` API interfaces.

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

You can host your personal, secure AI chat client for free with automatic updates:

1. Push this repository to your GitHub account.
2. Go to your repository settings -> **Settings** tab.
3. Click on **Pages** in the left sidebar menu.
4. Under **Build and deployment -> Source**, select `Deploy from a branch`.
5. Select `main` branch and folder `/ (root)`, then click **Save**.
6. Within minutes, your live demo is generated at `https://<your-username>.github.io/<your-repo-name>/`. Every subsequent `git push main` automatically builds and deploys updates instantly.

---

## 📁 File Structure

- `index.html`: Main viewport, chat inputs, settings overlay drawer, and structured layout scripts.
- `styles.css`: Pure responsive native CSS containing variables, dark/light themes, and custom animation curves.
- `widgets.css`: Consolidated micro-telemetry performance metrics, pulsing thinking indicator dots, custom mouse-following tooltips, and settings overlay modals.
- `db.js`: Promised-based IndexedDB storage manager supporting sessions, logs, and settings cascading deletes.
- `crypto.js`: Base64 and XOR dynamic obfuscator for client-side BYOK key sanitization.
- `api.js`: Decoupled Server-Sent Events (SSE) stream client with full `AbortSignal` cancellation support.
- `renderer.js`: Minimal dependency-free Markdown parser (supporting headings, lists, bold, italics, quote blocks), HTML escaping, and telemetry badge builders.
- `sw.js`: PWA service worker caching static shell files with versioning (`v2`) for smooth offline caching.
- `vendor/`: Directory for self-hosted, MIT-licensed commercial-safe Prism.js and Prism.css files.
