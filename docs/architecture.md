# System Architecture and Specifications - Cosmic Pixel

This document outlines the detailed system specifications, security paradigms, networking layouts, and storage schemas implemented in Cosmic Pixel.

---

## 1. BYOK Security & Obfuscation Layer (`crypto.js` & `db.js`)

Cosmic Pixel employs a strict **Bring Your Own Key (BYOK)** model. Credentials never touch intermediate servers and are fully contained in the browser.

### 1.1 Local Data Sandboxing (Same-Origin Policy)
- Databases are bound to the host domain via the browser's native **Same-Origin Policy (SOP)** sandbox. No external website or iframe can read or extract the IndexedDB database.

### 1.2 Cryptographic Obfuscation Protocol (`crypto.js`)
- **Vulnerability Mitigated**: Plain text scanning from untrusted browser extensions or cross-site scripting (XSS) scraping.
- **Implementation**: API keys are transformed using a stream-like $\mathcal{O}(1)$ complexity **Base64 + XOR (Exclusive OR) mutator** with a local salt before serialization.
- **Persistence Boundary**: Key data exists on the physical disk (IndexedDB) purely as un-scannable ciphertexts. De-obfuscation occurs in-memory only during `fetch` stream initialization and is instantly garbage collected.

---

## 2. IndexedDB Schema Architecture (`db.js`)

The client persistence layer leverages standard asynchronous IndexedDB object stores.

### 2.1 Schema Definition
- **Database Name**: `CosmicPixelDB` (Version `1`)
- **Object Stores**:
  - `settings`: Keyed by `provider` (e.g. `openai`, `gemini`). Stores `baseUrl`, `apiKey` (obfuscated), and `model` name.
  - `sessions`: Keyed by auto-incrementing `id`. Stores `title`, `createdAt`, and `updatedAt`. Contains `updatedAt` index for descending sorting.
  - `messages`: Keyed by auto-incrementing `id`. Stores `sessionId`, `role`, `content`, `timestamp`, and `performance` (optional metadata object). Contains `sessionId` index for rapid retrieval.

### 2.2 Memory Fallback (Graceful Degradation)
- If IndexedDB is blocked (e.g. strict Private browsing or sandboxed environments), `db.js` dynamically falls back to an **in-memory object store** wrapped in sessionStorage to maintain UI execution.

---

## 3. SSE Stream Decoder (`app.js` & `renderer.js`)

We stream text generation in real-time utilizing **Server-Sent Events (SSE)**.

### 3.1 Fetch Streams vs. HTML5 `EventSource`
Cosmic Pixel intentionally rejects the default HTML5 `EventSource` API in favor of raw asynchronous Fetch stream readers.
- **GET constraint bypass**: `EventSource` is strictly restricted to GET requests, which cannot carry deep historical conversation payloads.
- **Custom Header Injection**: `EventSource` forbids Custom Headers, making secure, serverless Bearer key injection impossible without placing keys inside visible URL queries.
- **Fetch Solution**: Using `fetch` with `ReadableStream` enables sending standard POST requests with deep nested chat history JSON bodies while safely binding Keys inside standard request header scopes.

### 3.2 Resilience & Buffering
- **Chunk splitting**: Handles partial JSON chunks in stream packets using high-resiliency try-catch string validation blocks, guaranteeing that raw network packet cuts never crash the UI render loop.

---

## 4. OTel-Style Telemetry Metrics (`app.js` & `renderer.js`)

A standard OpenTelemetry (OTel)-compliant performance tracking engine measures real-time inference latency.

### 4.1 Telemetry Metrics Definition
- **TTFT (Time to First Token)**: Span delta from network fetch trigger to the arrival of the first non-empty text character. Represents the LLM prefill execution.
- **TPS (Tokens Per Second)**: Generated tokens divided by decode duration (E2E Latency minus TTFT). Measures pure LLM decode speed.
- **ITL (Inter-Token Latency)**: Generation duration (E2E Latency minus TTFT) divided by generated tokens. Reflects word-by-word fluid pace.
- **Token Estimation**: Estimated using an optimal heuristic ratio ($\text{Length} / 3.2$), ensuring accurate stats across mixed multilingual streams without introducing bloated node tokenizers.

### 4.2 Visual Badge Render
- Badge components are integrated at the foot of each assistant bubble, displaying performance on hover to maintain design purity.

---

## 5. PWA & Caching Lifecycle (`sw.js` & `manifest.json`)

Compliant with W3C 2026 progressive web standards.

- **Window Controls Overlay (WCO)**: Enables clean macOS/Windows custom title-bar rendering when running in standalone mode.
- **Stale-While-Revalidate Caching**: Caches static shell files (`index.html`, `styles.css`, `app.js`, etc.) locally. Injected with a critical bypass that ignores POST or external API streams, protecting SSE streaming from packet buffering loops.
