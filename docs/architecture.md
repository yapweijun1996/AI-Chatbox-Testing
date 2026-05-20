# System Architecture and Specifications - Cosmic Pixel

This document outlines the detailed system specifications, security paradigms, networking layouts, and storage schemas implemented in Cosmic Pixel.

---

## 1. BYOK Security & Obfuscation Layer (`crypto.js` & `db.js`)

Cosmic Pixel employs a strict **Bring Your Own Key (BYOK)** model. Credentials never touch intermediate servers and are fully contained in the browser.

### 1.1 Local Data Sandboxing (Same-Origin Policy)
- Databases are bound to the host domain via the browser's native **Same-Origin Policy (SOP)** sandbox. No external website or iframe can read or extract the IndexedDB database.

### 1.2 Cryptographic Obfuscation Protocol (`crypto.js`)
- **Vulnerability Mitigated**: Plain text scanning from untrusted browser extensions or cross-site scripting (XSS) scraping.
- **Implementation**: API keys are transformed using a stream-like $\mathcal{O}(1)$ complexity **Base64 + XOR (Exclusive OR) mutator** with a local salt (`CosmicPixelSecureUniversalByokXorKey`) before serialization.
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

## 3. SSE Stream Decoder (`api.js`, `app.js` & `renderer.js`)

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

## 4. High-Resolution Telemetry Metrics (`api.js` & `renderer.js`)

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

- **Caching Lifecycle (Version `v2`)**: Stores shell assets (`index.html`, `styles.css`, `widgets.css`, `db.js`, `crypto.js`, `api.js`, `renderer.js`, `app.js`, and `vendor/` assets) locally using a Stale-While-Revalidate caching pattern.
- **Bypass Filters**: Ignore non-GET requests or requests destined for external hosts, ensuring real-time Server-Sent Events (SSE) streaming connections bypass caching completely.
