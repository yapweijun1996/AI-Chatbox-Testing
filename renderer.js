/**
 * Simple, dependency-free Markdown Parser and HTML Escape Utility.
 * Keeps app.js focused on core flow and within the strict line limits.
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
  
  let formatted = text;
  
  // Code block matching: ```[lang]\n[code]\n```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  formatted = formatted.replace(codeBlockRegex, (match, lang, code) => {
    const escapedCode = escapeHTML(code.trim());
    return `
      <pre>
        <div class="code-block-header">
          <span>${lang || "code"}</span>
          <button class="copy-btn" onclick="copyCode(this)">Copy</button>
        </div>
        <code>${escapedCode}</code>
      </pre>
    `;
  });

  // Inline code matching: `[code]`
  formatted = formatted.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHTML(code)}</code>`);

  // Basic paragraphs and line breaks
  formatted = formatted.split("\n\n").map(p => {
    if (p.trim().startsWith("<pre") || p.trim().startsWith("<code")) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");

  return formatted;
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
