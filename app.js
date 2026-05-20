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
  statusText: document.getElementById("status-text"),
  sessionsList: document.getElementById("sessions-list"),
  chatViewport: document.getElementById("chat-viewport"),
  welcomeView: document.getElementById("welcome-view"),
  messagesList: document.getElementById("messages-list"),
  chatInput: document.getElementById("chat-input"),
  sendBtn: document.getElementById("send-btn")
};

const DEFAULT_URLS = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  anthropic: "https://api.anthropic.com/v1",
  lmstudio: "http://localhost:1234/v1"
};

const DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  anthropic: "claude-3-5-sonnet-20241022",
  lmstudio: "meta-llama-3-8b-instruct"
};

window.addEventListener("DOMContentLoaded", async () => {
  await initDB();
  initTheme();
  await loadSessions();
  await switchProviderTab(currentProvider);
  initEventListeners();
});

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

window.handleDeleteSession = async (sessionId) => {
  if (confirm("Are you sure you want to delete this session and all its message history?")) {
    await deleteSession(sessionId);
    if (activeSessionId === sessionId) {
      showWelcomeState(true);
    }
    await loadSessions();
  }
};

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
  DOM.currentModelText.textContent = `${provider.toUpperCase()} / ${DOM.modelInput.value || "Not Configured"}`;
}

function updateStatus(connected) {
  const dot = DOM.statusPill.querySelector(".status-dot");
  if (connected) {
    dot.className = "status-dot green";
    DOM.statusText.textContent = "Connected (BYOK)";
    DOM.sendBtn.disabled = DOM.chatInput.value.trim() === "";
  } else {
    dot.className = "status-dot yellow";
    DOM.statusText.textContent = "Missing Secret Key";
    DOM.sendBtn.disabled = true;
  }
}

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

async function handleSend() {
  const content = DOM.chatInput.value.trim();
  if (!content || !activeConfig) return;

  DOM.chatInput.value = "";
  DOM.chatInput.style.height = "auto";
  DOM.sendBtn.disabled = true;

  if (!activeSessionId) {
    const session = await createSession(content.slice(0, 20) + (content.length > 20 ? "..." : ""));
    activeSessionId = session.id;
    await loadSessions();
    showWelcomeState(false);
  }

  await addMessage(activeSessionId, "user", content);
  appendMessageToDOM("user", content);
  scrollToBottom();

  const aiBubble = appendMessageToDOM("assistant", "Thinking...");
  scrollToBottom();

  const dot = DOM.statusPill.querySelector(".status-dot");
  dot.className = "status-dot yellow";
  DOM.statusText.textContent = "Generating...";

  try {
    const messages = await getMessages(activeSessionId);
    const apiPayload = {
      model: activeConfig.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: true
    };

    const response = await fetch(`${activeConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deobfuscate(activeConfig.apiKey)}`
      },
      body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
      throw new Error(`API Error (${response.status}): ${await response.text()}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";
    aiBubble.innerHTML = "";

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
            aiResponse += parsed.choices?.[0]?.delta?.content || "";
            aiBubble.innerHTML = parseMarkdown(aiResponse);
            scrollToBottom();
          } catch (err) {}
        }
      }
    }

    await addMessage(activeSessionId, "assistant", aiResponse);
    await loadSessions();
  } catch (err) {
    console.error("Direct API Streaming failed: ", err);
    aiBubble.innerHTML = `<span style="color: #FF453A;">Error: Unable to fetch response. Please verify your API Key, Base URL, and connection.</span><br><small>${escapeHTML(err.message)}</small>`;
  } finally {
    updateStatus(true);
  }
}
