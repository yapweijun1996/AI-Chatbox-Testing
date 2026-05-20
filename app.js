// Application State & DOM Cache
let activeSessionId = null;
let currentProvider = "openai";
let activeConfig = null;
let activeAbortController = null;

const getEl = id => document.getElementById(id);
const DOM = {
  themeBtn: getEl("theme-toggle-btn"), settingsBtn: getEl("settings-toggle-btn"), sidebarToggleBtn: getEl("sidebar-toggle-btn"), sidebar: getEl("sidebar"),
  newChatBtn: getEl("new-chat-btn"), closeSettingsBtn: getEl("close-settings-btn"), settingsDrawer: getEl("settings-drawer"),
  providerTabs: document.querySelectorAll(".tab-btn"), providerForm: getEl("provider-form"), baseUrlInput: getEl("setting-base-url"),
  apiKeyInput: getEl("setting-api-key"), modelInput: getEl("setting-model"), currentModelText: getEl("current-provider-model"),
  statusPill: getEl("status-pill"), statusText: getEl("status-text"), sessionsList: getEl("sessions-list"),
  chatViewport: getEl("chat-viewport"), welcomeView: getEl("welcome-view"), messagesList: getEl("messages-list"),
  chatInput: getEl("chat-input"), sendBtn: getEl("send-btn")
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
  initTooltips();
  registerServiceWorker();
});

function initTheme() {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "light");
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
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
  DOM.welcomeView.style.display = show ? "block" : "none";
  if (show) { DOM.messagesList.innerHTML = ""; activeSessionId = null; }
}

window.handleDeleteSession = async (sessionId) => {
  if (confirm("Are you sure you want to delete this session and all its message history?")) {
    await deleteSession(sessionId);
    if (activeSessionId === sessionId) showWelcomeState(true);
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

function setSendButtonState(isGenerating) {
  if (isGenerating) {
    DOM.sendBtn.disabled = false;
    DOM.sendBtn.innerHTML = `<span class="icon-stop" style="color: #FF453A; font-size: 10px; font-weight: bold;">■</span>`;
    DOM.sendBtn.style.backgroundColor = "rgba(255, 69, 58, 0.15)";
    DOM.sendBtn.classList.add("generating");
  } else {
    DOM.sendBtn.disabled = DOM.chatInput.value.trim() === "";
    DOM.sendBtn.innerHTML = `<span class="icon-arrow-up"></span>`;
    DOM.sendBtn.style.backgroundColor = "";
    DOM.sendBtn.classList.remove("generating");
  }
}

function initEventListeners() {
  DOM.themeBtn.addEventListener("click", toggleTheme);
  DOM.settingsBtn.addEventListener("click", () => DOM.settingsDrawer.classList.add("open"));
  DOM.closeSettingsBtn.addEventListener("click", () => DOM.settingsDrawer.classList.remove("open"));
  DOM.sidebarToggleBtn.addEventListener("click", () => DOM.sidebar.classList.toggle("collapsed"));
  
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
    if (!DOM.sendBtn.classList.contains("generating")) {
      DOM.sendBtn.disabled = !activeConfig || DOM.chatInput.value.trim() === "";
    }
  });

  DOM.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!DOM.sendBtn.classList.contains("generating")) handleSend();
    }
  });

  DOM.sendBtn.addEventListener("click", () => {
    if (DOM.sendBtn.classList.contains("generating")) {
      if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
      }
    } else {
      handleSend();
    }
  });
  
  getEl("card-setup-keys").addEventListener("click", () => DOM.settingsDrawer.classList.add("open"));
  getEl("card-start-chat").addEventListener("click", () => DOM.newChatBtn.click());
}

function renderMessages(messages) {
  DOM.messagesList.innerHTML = "";
  messages.forEach(msg => appendMessageToDOM(msg.role, msg.content, msg.performance));
  scrollToBottomSmart(true);
}

function appendMessageToDOM(role, content, performanceData = null) {
  const item = document.createElement("div");
  item.className = `message-item ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  
  if (content === "Thinking...") {
    bubble.innerHTML = `
      <div class="thinking-dots">
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
        <span class="thinking-dot"></span>
      </div>
    `;
  } else {
    bubble.innerHTML = parseMarkdown(content);
  }
  
  if (role === "assistant" && performanceData) {
    bubble.innerHTML += renderPerformanceBadge(performanceData);
  }
  item.appendChild(bubble);
  DOM.messagesList.appendChild(item);
  return bubble;
}

function shouldScroll() {
  const distanceToBottom = DOM.chatViewport.scrollHeight - DOM.chatViewport.scrollTop - DOM.chatViewport.clientHeight;
  return distanceToBottom <= 80;
}

function scrollToBottomSmart(force = false) {
  if (force || shouldScroll()) {
    DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
  }
}

async function handleSend() {
  const content = DOM.chatInput.value.trim();
  if (!content || !activeConfig) return;

  DOM.chatInput.value = "";
  DOM.chatInput.style.height = "auto";
  activeAbortController = new AbortController();
  setSendButtonState(true);

  if (!activeSessionId) {
    const session = await createSession(content.slice(0, 20) + (content.length > 20 ? "..." : ""));
    activeSessionId = session.id;
    await loadSessions();
    showWelcomeState(false);
  }

  await addMessage(activeSessionId, "user", content);
  appendMessageToDOM("user", content);
  scrollToBottomSmart(true);

  const aiBubble = appendMessageToDOM("assistant", "Thinking...");
  scrollToBottomSmart(true);

  const dot = DOM.statusPill.querySelector(".status-dot");
  dot.className = "status-dot yellow";
  DOM.statusText.textContent = "Generating...";

  try {
    const messages = await getMessages(activeSessionId);
    const perfData = await streamChatCompletion(activeConfig, messages, ({ fullText }) => {
      aiBubble.innerHTML = parseMarkdown(fullText);
      scrollToBottomSmart();
    }, activeAbortController.signal);

    aiBubble.innerHTML += renderPerformanceBadge(perfData);
    scrollToBottomSmart();

    await addMessage(activeSessionId, "assistant", perfData.fullText, perfData);
    await loadSessions();
  } catch (err) {
    if (err.name === "AbortError") {
      aiBubble.innerHTML += `<br><span style="color: #FF9500; font-size: 11px;">⚠️ Stream connection aborted by user.</span>`;
      scrollToBottomSmart(true);
    } else {
      console.error("Direct API Streaming failed: ", err);
      aiBubble.innerHTML = `<span style="color: #FF453A;">Error: Unable to fetch response. Please verify your API Key, Base URL, and connection.</span><br><small>${escapeHTML(err.message)}</small>`;
    }
  } finally {
    activeAbortController = null;
    setSendButtonState(false);
    updateStatus(true);
  }
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
