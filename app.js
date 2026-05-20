// Application State
let activeSessionId = null;
let currentProvider = "openai";
let activeConfig = null;

// DOM Elements cache
const DOM = {
  themeBtn: document.getElementById("theme-toggle-btn"),
  settingsBtn: document.getElementById("settings-toggle-btn"),
  newChatBtn: document.getElementById("new-chat-btn"),
  closeSettingsBtn: document.getElementById("close-settings-btn"),
  settingsDrawer: document.getElementById("settings-drawer"),
  providerTabs: document.querySelectorAll(".tab-btn"),
  providerForm: document.getElementById("provider-form"),
  baseUrlInput: document.getElementById("setting-base-url"),
  apiKeyInput: document.getElementById("setting-api-key"),
  modelInput: document.getElementById("setting-model"),
  currentModelText: document.getElementById("current-provider-model"),
  statusPill: document.getElementById("status-pill"),
  statusDot: DOMnode("status-pill", ".status-dot"), // inline fetch helper
  statusText: document.getElementById("status-text"),
  sessionsList: document.getElementById("sessions-list"),
  chatViewport: document.getElementById("chat-viewport"),
  welcomeView: document.getElementById("welcome-view"),
  messagesList: document.getElementById("messages-list"),
  chatInput: document.getElementById("chat-input"),
  sendBtn: document.getElementById("send-btn")
};

function DOMnode(id, selector) {
  return document.getElementById(id)?.querySelector(selector);
}

// Default provider configurations
const DEFAULT_URLS = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  anthropic: "https://api.anthropic.com/v1", // Note: will utilize direct-BYOK format or proxies
  lmstudio: "http://localhost:1234/v1"
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  anthropic: "claude-3-5-sonnet-20241022",
  lmstudio: "meta-llama-3-8b-instruct"
};

// Start application
window.addEventListener("DOMContentLoaded", async () => {
  await initDB();
  initTheme();
  await loadSessions();
  await switchProviderTab(currentProvider);
  initEventListeners();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

// Session Lists loading
async function loadSessions() {
  const sessions = await getSessions();
  DOM.sessionsList.innerHTML = "";
  if (sessions.length === 0) {
    showWelcomeState(true);
    return;
  }
  sessions.forEach(session => {
    const activeClass = activeSessionId === session.id ? "active" : "";
    const item = document.createElement("div");
    item.className = `session-item ${activeClass}`;
    item.dataset.id = session.id;
    item.innerHTML = `
      <span class="session-title">${escapeHTML(session.title)}</span>
      <button class="session-delete" onclick="event.stopPropagation(); handleDeleteSession(${session.id})">&times;</button>
    `;
    item.addEventListener("click", () => selectSession(session.id));
    DOM.sessionsList.appendChild(item);
  });
}

// Select session
async function selectSession(sessionId) {
  activeSessionId = sessionId;
  showWelcomeState(false);
  document.querySelectorAll(".session-item").forEach(item => {
    item.classList.toggle("active", Number(item.dataset.id) === sessionId);
  });
  const messages = await getMessages(sessionId);
  renderMessages(messages);
}

function showWelcomeState(show) {
  if (show) {
    DOM.welcomeView.style.display = "block";
    DOM.messagesList.innerHTML = "";
    activeSessionId = null;
  } else {
    DOM.welcomeView.style.display = "none";
  }
}

// Delete session helper
window.handleDeleteSession = async (sessionId) => {
  if (confirm("确定要删除此对话及所有聊天记录吗？")) {
    await deleteSession(sessionId);
    if (activeSessionId === sessionId) {
      showWelcomeState(true);
    }
    await loadSessions();
  }
};

// Initialize Settings Drawer and Provider Tabs
async function switchProviderTab(provider) {
  currentProvider = provider;
  DOM.providerTabs.forEach(t => t.classList.toggle("active", t.dataset.provider === provider));
  
  const savedConfig = await getSetting(provider);
  activeConfig = savedConfig;

  if (savedConfig) {
    DOM.baseUrlInput.value = savedConfig.baseUrl;
    DOM.apiKeyInput.value = deobfuscate(savedConfig.apiKey);
    DOM.modelInput.value = savedConfig.model;
    updateStatus(true);
  } else {
    DOM.baseUrlInput.value = DEFAULT_URLS[provider] || "";
    DOM.apiKeyInput.value = "";
    DOM.modelInput.value = DEFAULT_MODELS[provider] || "";
    updateStatus(false);
  }
  DOM.currentModelText.textContent = `${provider.toUpperCase()} / ${DOM.modelInput.value || "未配置"}`;
}

function updateStatus(connected) {
  const dot = DOM.statusPill.querySelector(".status-dot");
  if (connected) {
    dot.className = "status-dot green";
    DOM.statusText.textContent = "已连接 (BYOK)";
    DOM.sendBtn.disabled = DOM.chatInput.value.trim() === "";
  } else {
    dot.className = "status-dot yellow";
    DOM.statusText.textContent = "未配置密钥";
    DOM.sendBtn.disabled = true;
  }
}

// Form Submission & Save Keys
DOM.providerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const config = {
    baseUrl: DOM.baseUrlInput.value.trim(),
    apiKey: obfuscate(DOM.apiKeyInput.value.trim()),
    model: DOM.modelInput.value.trim()
  };
  await saveSetting(currentProvider, config);
  activeConfig = config;
  updateStatus(true);
  DOM.currentModelText.textContent = `${currentProvider.toUpperCase()} / ${config.model}`;
  DOM.settingsDrawer.classList.remove("open");
});

// Event Listeners setup
function initEventListeners() {
  DOM.themeBtn.addEventListener("click", toggleTheme);
  DOM.settingsBtn.addEventListener("click", () => DOM.settingsDrawer.classList.add("open"));
  DOM.closeSettingsBtn.addEventListener("click", () => DOM.settingsDrawer.classList.remove("open"));
  
  DOM.newChatBtn.addEventListener("click", async () => {
    const session = await createSession();
    activeSessionId = session.id;
    await loadSessions();
    await selectSession(session.id);
  });

  DOM.providerTabs.forEach(tab => {
    tab.addEventListener("click", () => switchProviderTab(tab.dataset.provider));
  });

  DOM.chatInput.addEventListener("input", () => {
    DOM.chatInput.style.height = "auto";
    DOM.chatInput.style.height = `${DOM.chatInput.scrollHeight}px`;
    DOM.sendBtn.disabled = !activeConfig || DOM.chatInput.value.trim() === "";
  });

  DOM.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  DOM.sendBtn.addEventListener("click", handleSend);
  document.getElementById("card-setup-keys").addEventListener("click", () => DOM.settingsDrawer.classList.add("open"));
  document.getElementById("card-start-chat").addEventListener("click", () => DOM.newChatBtn.click());
}

// Message Rendering
function renderMessages(messages) {
  DOM.messagesList.innerHTML = "";
  messages.forEach(msg => appendMessageToDOM(msg.role, msg.content));
  scrollToBottom();
}

function appendMessageToDOM(role, content) {
  const item = document.createElement("div");
  item.className = `message-item ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = parseMarkdown(content);
  item.appendChild(bubble);
  DOM.messagesList.appendChild(item);
  return bubble;
}

function scrollToBottom() {
  DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
}

// Direct Streaming over BYOK Endpoint
async function handleSend() {
  const content = DOM.chatInput.value.trim();
  if (!content || !activeConfig) return;

  // Clear input
  DOM.chatInput.value = "";
  DOM.chatInput.style.height = "auto";
  DOM.sendBtn.disabled = true;

  if (!activeSessionId) {
    const session = await createSession(content.slice(0, 20) + (content.length > 20 ? "..." : ""));
    activeSessionId = session.id;
    await loadSessions();
    showWelcomeState(false);
  }

  // Save and append user message
  await addMessage(activeSessionId, "user", content);
  appendMessageToDOM("user", content);
  scrollToBottom();

  // Create temporary AI container
  const aiBubble = appendMessageToDOM("assistant", "正在思考...");
  scrollToBottom();

  // Set status pill to Generating
  const dot = DOM.statusPill.querySelector(".status-dot");
  dot.className = "status-dot yellow";
  DOM.statusText.textContent = "生成中...";

  try {
    const messages = await getMessages(activeSessionId);
    const apiPayload = {
      model: activeConfig.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true
    };

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${deobfuscate(activeConfig.apiKey)}`
    };

    // Edge check for custom headers / LM Studio / Gemini OpenAI Compatible wrapper
    const response = await fetch(`${activeConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error (${response.status}): ${errText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";
    aiBubble.innerHTML = ""; // Clear loader

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        const cleaned = line.trim();
        if (cleaned === "data: [DONE]") continue;
        if (cleaned.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(cleaned.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || "";
            aiResponse += delta;
            aiBubble.innerHTML = parseMarkdown(aiResponse);
            scrollToBottom();
          } catch (err) {
            // Partial chunk or non-json line
          }
        }
      }
    }

    await addMessage(activeSessionId, "assistant", aiResponse);
    await loadSessions(); // Refresh lists and timestamps
  } catch (err) {
    console.error("Direct API Streaming failed: ", err);
    aiBubble.innerHTML = `<span style="color: #FF453A;">错误: 无法获取响应。请检查您的 API Key、Base URL 以及网络连接。</span><br><small>${escapeHTML(err.message)}</small>`;
  } finally {
    updateStatus(true);
  }
}

// Super simple, dependency-free escape and Markdown code parser
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[m]));
}

function parseMarkdown(text) {
  if (!text) return "";
  
  // Code block matching: ```[lang]\n[code]\n```
  let formatted = text;
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  formatted = formatted.replace(codeBlockRegex, (match, lang, code) => {
    const escapedCode = escapeHTML(code.trim());
    return `
      <pre>
        <div class="code-block-header">
          <span>${lang || "code"}</span>
          <button class="copy-btn" onclick="copyCode(this)">复制</button>
        </div>
        <code>${escapedCode}</code>
      </pre>
    `;
  });

  // Inline code matching: `[code]`
  formatted = formatted.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHTML(code)}</code>`);

  // Basic paragraphs/line breaks
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
    btn.textContent = "已复制";
    btn.style.color = "#34C759";
    setTimeout(() => {
      btn.textContent = "复制";
      btn.style.color = "";
    }, 1500);
  });
};
