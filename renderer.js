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
  let html = [];

  for (let line of lines) {
    let trimmed = line.trim();

    // Skip if line is inside pre-rendered block
    if (trimmed.startsWith("<pre") || trimmed.startsWith("<div") || trimmed.startsWith("</pre") || trimmed.startsWith("<code") || trimmed.startsWith("</code")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(line);
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith("&gt; ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<blockquote>${parseInline(trimmed.slice(5))}</blockquote>`);
      continue;
    }

    // Unordered List: - text or * text
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${parseInline(trimmed.slice(2))}</li>`);
      continue;
    }

    // If list ends
    if (inList && !trimmed.startsWith("- ") && !trimmed.startsWith("* ") && trimmed !== "") {
      html.push("</ul>");
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

  if (inList) html.push("</ul>");

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
      <span data-tooltip="⏱️ [连接延迟] 从发送请求到建立连接并返回第一个字节的时间。数值越低表示网络响应越快。">⏱️ Connection: ${fblStr}</span>
      <span data-tooltip="⚡ [首字延迟] 大模型输出第一个字符的时间。体现模型的启动与思考速度。">⏳ TTFT: ${ttftStr}</span>
      <span data-tooltip="🚀 [生成速度] 大模型平均每秒吐出的字符单元 (Token) 数量。代表推理运行速度。">🏃 Speed: ${tpsStr} tps</span>
      <span data-tooltip="⏳ [字间延迟] 平均每两个字符输出之间的微秒间隔。数值越低阅读感越流畅。">💎 ITL: ${itlStr}</span>
      <span data-tooltip="⏱️ [端到端总时] 本次对话从点击发送到完全返回并接收完毕的总用时。">⏱️ Total: ${e2eStr}</span>
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
