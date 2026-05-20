# Cosmic Pixel - Apple-Style Serverless AI Chatbox

A serverless, high-privacy AI chat application designed in adherence to **Apple Human Interface Guidelines (HIG)** and utilizing a strict **BYOK (Bring Your Own Key)** architecture.

---

## ✨ Core Features

- ** Apple HIG Visual Design**: High-fidelity adaptation of iOS/macOS glassmorphism, 1px translucent borders, squircle corners, and native-feeling smooth physics transitions.
- **🔒 Privacy Obfuscation**: Keys are obfuscated locally via Base64 + XOR prior to serialization to mitigate plain text harvesting from malicious extensions or XSS.
- **⚡ Zero-Server Routing**: Stream parsing is executed entirely in client-side ES6 JS without middleware or proxy servers, guaranteeing zero API key or chat log storage/leakage.
- **📦 Off-grid Durability**: Employs IndexedDB for chat history, sessions, and configuration management, accompanied by memory fallback gracefully.
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

- `index.html`: Main viewport, chat inputs, settings overlay drawer, and Apple elements.
- `styles.css`: Pure responsive native CSS containing glassmorphism variables, dark/light themes, and custom animation curves.
- `db.js`: Promised-based IndexedDB storage manager supporting sessions, logs, and settings cascading deletes.
- `crypto.js`: Base64 and XOR dynamic obfuscator for client-side BYOK key sanitization.
- `renderer.js`: Minimal dependency-free markdown parser, HTML escaping, and code copying actions.
- `app.js`: Master event controller, state transitions, and serverless direct fetch stream decoder.
