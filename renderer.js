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

// Set up custom Marked.js renderer for our specialized components
if (window.marked) {
  const renderer = {
    code({ text, lang }) {
      const languageClass = `language-${lang || 'plaintext'}`;
      return `
        <pre class="${languageClass}">
          <div class="code-block-header">
            <span>${lang || "code"}</span>
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <code class="${languageClass}">${text.trim()}</code>
        </pre>
      `;
    },
    link({ href, title, text }) {
      return `<a href="${href}" target="_blank" class="chat-link"${title ? ` title="${title}"` : ""}>${text}</a>`;
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
  const codeEl = btn.closest("pre").querySelector("code");
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

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then((reg) => console.log("ServiceWorker registered successfully with scope: ", reg.scope))
        .catch((err) => console.warn("ServiceWorker registration failed: ", err));
    });
  }
}
