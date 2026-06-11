/**
 * Markdown rendering & HTML safety.
 * Escapes input, configures Marked.js custom renderers (code blocks + links),
 * exposes parseMarkdown(), and the copy-to-clipboard helper for code blocks.
 * Must load AFTER vendor/marked.js.
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
