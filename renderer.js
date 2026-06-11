/**
 * Simple, dependency-free Markdown Parser and HTML Escape Utility.
 * Extended with high-performance telemetry rendering widgets.
 */

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[m]));
}

// Restrict URLs to safe schemes — blocks javascript:, data:, vbscript:, file:
function sanitizeUrl(url) {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (/^(?:javascript|data|vbscript|file):/i.test(trimmed)) return "#";
  return trimmed;
}

// Set up custom Marked.js renderer for our specialized components
if (window.marked) {
  const renderer = {
    code({ text, lang }) {
      const language = (lang || "plaintext").replace(/[^a-z0-9+#.-]/gi, "");
      const label = lang ? escapeHTML(lang) : "code";
      const languageClass = `language-${language}`;
      // Header sits OUTSIDE <pre> so its indentation is never rendered as code.
      // `text` is already HTML-escaped by parseMarkdown(), so it is inserted as-is.
      const body = text.replace(/\n+$/, "");
      return `<div class="code-block"><div class="code-block-header"><span>${label}</span>` +
        `<button class="copy-btn" onclick="copyCode(this)">Copy</button></div>` +
        `<pre class="${languageClass}"><code class="${languageClass}">${body}</code></pre></div>`;
    },
    link({ href, title, text }) {
      const safeHref = sanitizeUrl(href);
      const titleAttr = title ? ` title="${title}"` : "";
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="chat-link"${titleAttr}>${text}</a>`;
    }
  };
  marked.use({ renderer, gfm: true, breaks: true });
}

function parseMarkdown(text) {
  if (!text) return "";
  
  // 1. Escaping first to prevent DOM XSS
  let escaped = escapeHTML(text);
  
  // 2. Marked.js parsing
  if (window.marked) {
    return marked.parse(escaped);
  }
  
  // Simple fallback if marked failed to load
  return `<p>${escaped.replace(/\n/g, "<br>")}</p>`;
}

function renderPerformanceBadge(perf) {
  if (!perf) return "";
  
  const fblStr = perf.fbl < 1000 ? `${Math.round(perf.fbl)}ms` : `${(perf.fbl / 1000).toFixed(2)}s`;
  const ttftStr = perf.ttft < 1000 ? `${Math.round(perf.ttft)}ms` : `${(perf.ttft / 1000).toFixed(2)}s`;
  const tpsStr = perf.tps > 0 && isFinite(perf.tps) ? perf.tps.toFixed(1) : "0.0";
  const itlStr = perf.itl > 0 && isFinite(perf.itl) ? `${Math.round(perf.itl)}ms` : "N/A";
  const e2eStr = perf.e2e < 1000 ? `${Math.round(perf.e2e)}ms` : `${(perf.e2e / 1000).toFixed(2)}s`;
  const modelStr = perf.model || "Unknown";
  
  return `
    <div class="message-meta">
      <span data-tooltip="🤖 [Model Name] The model that generated this response.">🤖 ${modelStr}</span>
      <span data-tooltip="⏱️ [Connection Latency] The time elapsed from sending the request to establishing the connection and receiving the first byte. Lower means faster network response.">⏱️ Connection: ${fblStr}</span>
      <span data-tooltip="⏳ [Time to First Token] The duration from initiating the request until the model generates its first character token. Measures model prefill and thinking time.">⏳ TTFT: ${ttftStr}</span>
      <span data-tooltip="🏃 [Generation Speed] The average number of token units generated per second. Measures raw model inference and decoding throughput.">🏃 Speed: ${tpsStr} tps</span>
      <span data-tooltip="💎 [Inter-Token Latency] The average duration between generating consecutive tokens. Lower values indicate a smoother and more fluid reading pace.">💎 ITL: ${itlStr}</span>
      <span data-tooltip="⏱️ [End-to-End Duration] The total round-trip time from clicking send until the stream is completely closed.">⏱️ Total: ${e2eStr}</span>
    </div>
  `;
}

// Clipboard copier helper
window.copyCode = (btn) => {
  const codeEl = btn.closest(".code-block").querySelector("code");
  navigator.clipboard.writeText(codeEl.textContent).then(() => {
    btn.textContent = "Copied";
    btn.style.color = "#34C759";
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.style.color = "";
    }, 1500);
  });
};

// UI Presentation & Theme helpers (Refactored from app.js)
function initTheme() {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "light");
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

function initTooltips() {
  const tooltipEl = document.createElement("div");
  tooltipEl.id = "global-tooltip";
  tooltipEl.className = "custom-tooltip";
  document.body.appendChild(tooltipEl);

  document.body.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      tooltipEl.textContent = target.getAttribute("data-tooltip");
      tooltipEl.style.display = "block";
      setTimeout(() => tooltipEl.classList.add("visible"), 10);
    }
  });

  document.body.addEventListener("mousemove", (e) => {
    if (tooltipEl.style.display === "block") {
      const offsetX = 12, offsetY = 12;
      let left = e.pageX + offsetX, top = e.pageY + offsetY;
      const tooltipRect = tooltipEl.getBoundingClientRect();
      if (left + tooltipRect.width > window.innerWidth) left = e.pageX - tooltipRect.width - offsetX;
      if (top + tooltipRect.height > window.innerHeight) top = e.pageY - tooltipRect.height - offsetY;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.style.top = `${top}px`;
    }
  });

  document.body.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-tooltip]");
    if (target) {
      tooltipEl.classList.remove("visible");
      tooltipEl.style.display = "none";
    }
  });
}

function showUpdateToast(waitingSW) {
  if (document.getElementById("sw-update-toast")) return;

  const toast = document.createElement("div");
  toast.id = "sw-update-toast";
  toast.textContent = "New version available — tap to update";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "max(24px, calc(24px + env(safe-area-inset-bottom, 0px)))",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    borderRadius: "24px",
    padding: "12px 20px",
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: "500",
    cursor: "pointer",
    zIndex: "99999",
    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "opacity 0.3s ease"
  });

  const dismiss = () => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 350);
  };
  toast.addEventListener("click", () => {
    if (waitingSW) waitingSW.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
    dismiss();
  });

  document.body.appendChild(toast);
  setTimeout(dismiss, 30000);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Auto-reload open tabs once a new service worker takes control (i.e. a new deploy).
  // Guarded so it never fires on the first-ever install, never loops, and never
  // interrupts an in-flight response (not persisted until the stream completes).
  let hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) { hadController = true; return; }
    if (window.activeAbortController) return; // streaming — reload on a later update check instead
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        // A worker installed on a prior visit is already waiting — offer to update.
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
        // A new worker starts installing while this page is open.
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateToast(newSW);
            }
          });
        });
      })
      .catch((err) => console.warn("ServiceWorker registration failed: ", err));
  });
}
