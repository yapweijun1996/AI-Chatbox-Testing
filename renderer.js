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

function parseMarkdown(text) {
  if (!text) return "";
  
  // 1. Escaping first to prevent DOM XSS
  let escaped = escapeHTML(text);
  
  // 2. Multi-line code block: ```lang\ncode\n```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  escaped = escaped.replace(codeBlockRegex, (match, lang, code) => {
    const languageClass = `language-${lang || 'plaintext'}`;
    return `
      <pre class="${languageClass}">
        <div class="code-block-header">
          <span>${lang || "code"}</span>
          <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        </div>
        <code class="${languageClass}">${code.trim()}</code>
      </pre>
    `;
  });

  // 3. Inline code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);

  // 4. Split into lines for block-level parsing
  const lines = escaped.split("\n");
  let inList = false;
  let inTable = false;
  let html = [];

  for (let line of lines) {
    let trimmed = line.trim();

    // Skip if line is inside pre-rendered block
    if (trimmed.startsWith("<pre") || trimmed.startsWith("<div") || trimmed.startsWith("</pre") || trimmed.startsWith("<code") || trimmed.startsWith("</code")) {
      if (inList) { html.push(inList === "ol" ? "</ol>" : "</ul>"); inList = false; }
      if (inTable) { html.push("</tbody></table></div>"); inTable = false; }
      html.push(line);
      continue;
    }

    // Markdown Table parsing: | Header | Header |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (inList) { html.push(inList === "ol" ? "</ol>" : "</ul>"); inList = false; }
      const cells = trimmed.split("|").slice(1, -1).map(c => c.trim());
      const isDivider = cells.every(c => /^:?-+:?$/.test(c));
      if (isDivider) continue; // Skip divider row, browser handles layout
      
      if (!inTable) {
        html.push("<div class='table-responsive'><table><thead>");
        html.push("<tr>" + cells.map(c => `<th>${parseInline(c)}</th>`).join("") + "</tr>");
        html.push("</thead><tbody>");
        inTable = true;
      } else {
        html.push("<tr>" + cells.map(c => `<td>${parseInline(c)}</td>`).join("") + "</tr>");
      }
      continue;
    }

    // Close Table if line is not a table row
    if (inTable && (!trimmed.startsWith("|") || !trimmed.endsWith("|"))) {
      html.push("</tbody></table></div>");
      inTable = false;
    }

    // Blockquote: > text
    if (trimmed.startsWith("&gt; ")) {
      if (inList) { html.push(inList === "ol" ? "</ol>" : "</ul>"); inList = false; }
      html.push(`<blockquote>${parseInline(trimmed.slice(5))}</blockquote>`);
      continue;
    }

    // Unordered List: - text or * text
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (inList !== "ul") {
        if (inList) html.push("</ol>");
        html.push("<ul>");
        inList = "ul";
      }
      html.push(`<li>${parseInline(trimmed.slice(2))}</li>`);
      continue;
    }

    // Ordered List: 1. text
    let olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== "ol") {
        if (inList) html.push("</ul>");
        html.push("<ol>");
        inList = "ol";
      }
      html.push(`<li>${parseInline(olMatch[2])}</li>`);
      continue;
    }

    // If list ends
    if (inList && !trimmed.startsWith("- ") && !trimmed.startsWith("* ") && !trimmed.match(/^\d+\.\s+/) && trimmed !== "") {
      html.push(inList === "ol" ? "</ol>" : "</ul>");
      inList = false;
    }

    // Headings: # h1, ## h2, ### h3, #### h4, ##### h5, ###### h6
    let headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      let level = headingMatch[1].length;
      html.push(`<h${level}>${parseInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Empty line
    if (trimmed === "") {
      html.push("<br>");
      continue;
    }

    // Normal paragraph line
    html.push(`<p>${parseInline(line)}</p>`);
  }

  if (inList) html.push(inList === "ol" ? "</ol>" : "</ul>");
  if (inTable) html.push("</tbody></table></div>");

  return html.join("");
}

function parseInline(text) {
  let res = text;
  // Bold: **text**
  res = res.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  res = res.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Links: [text](url)
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="chat-link">$1</a>');
  return res;
}

function renderPerformanceBadge(perf) {
  if (!perf) return "";
  
  const fblStr = perf.fbl < 1000 ? `${Math.round(perf.fbl)}ms` : `${(perf.fbl / 1000).toFixed(2)}s`;
  const ttftStr = perf.ttft < 1000 ? `${Math.round(perf.ttft)}ms` : `${(perf.ttft / 1000).toFixed(2)}s`;
  const tpsStr = perf.tps > 0 && isFinite(perf.tps) ? perf.tps.toFixed(1) : "0.0";
  const itlStr = perf.itl > 0 && isFinite(perf.itl) ? `${Math.round(perf.itl)}ms` : "N/A";
  const e2eStr = perf.e2e < 1000 ? `${Math.round(perf.e2e)}ms` : `${(perf.e2e / 1000).toFixed(2)}s`;
  
  return `
    <div class="message-meta">
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
