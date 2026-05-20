// Application State & DOM Cache (Global Scope Shared)
var activeSessionId = null;
var currentProvider = localStorage.getItem("lastProvider") || "openai";
const supportedLocales = ["en", "zh", "ms", "ja", "vi"];
const getSystemLocale = () => {
  const sysLang = navigator.language.slice(0, 2);
  return supportedLocales.includes(sysLang) ? sysLang : "en";
};
var currentLocale = localStorage.getItem("lastLocale") || getSystemLocale();
var activeConfig = null;
var activeAbortController = null;

const getEl = id => document.getElementById(id);
var DOM = {
  themeBtn: getEl("theme-toggle-btn"), settingsBtn: getEl("settings-toggle-btn"), sidebarToggleBtn: getEl("sidebar-toggle-btn"), sidebar: getEl("sidebar"),
  newChatBtn: getEl("new-chat-btn"), closeSettingsBtn: getEl("close-settings-btn"), settingsDrawer: getEl("settings-drawer"),
  providerTabs: document.querySelectorAll(".tab-btn"), providerForm: getEl("provider-form"), baseUrlInput: getEl("setting-base-url"),
  apiKeyInput: getEl("setting-api-key"), modelInput: getEl("setting-model"), currentModelText: getEl("current-provider-model"),
  statusPill: getEl("status-pill"), statusText: getEl("status-text"), sessionsList: getEl("sessions-list"),
  chatViewport: getEl("chat-viewport"), welcomeView: getEl("welcome-view"), messagesList: getEl("messages-list"),
  chatInput: getEl("chat-input"), sendBtn: getEl("send-btn"),
  reasoningEffort: getEl("setting-reasoning-effort"), reasoningGroup: getEl("group-reasoning-effort")
};

const DEFAULT_URLS = { openai: "https://api.openai.com/v1", gemini: "https://generativelanguage.googleapis.com/v1beta/openai", anthropic: "https://api.anthropic.com/v1", lmstudio: "http://localhost:1234/v1" };
const DEFAULT_MODELS = { openai: "gpt-4o-mini", gemini: "gemini-1.5-flash", anthropic: "claude-3-5-sonnet-20241022", lmstudio: "meta-llama-3-8b-instruct" };

window.addEventListener("DOMContentLoaded", async () => {
  await initDB();
  initTheme();
  await loadSessions();
  await switchProviderTab(currentProvider);
  applyLanguage(currentLocale);
  getEl("setting-locale").value = currentLocale;
  
  // Restore sidebar state from localStorage
  const sidebarState = localStorage.getItem("sidebarCollapsed");
  if (sidebarState === "true" || (sidebarState === null && window.innerWidth <= 768)) {
    DOM.sidebar.classList.add("collapsed");
  } else {
    DOM.sidebar.classList.remove("collapsed");
  }
  
  initEventListeners();
  initTooltips();
  registerServiceWorker();
});

async function switchProviderTab(provider) {
  currentProvider = provider;
  localStorage.setItem("lastProvider", provider);
  DOM.providerTabs.forEach(t => t.classList.toggle("active", t.dataset.provider === provider));
  
  DOM.reasoningGroup.style.display = provider === "openai" ? "flex" : "none";

  const savedConfig = await getSetting(provider);
  activeConfig = savedConfig;
  if (savedConfig) {
    DOM.baseUrlInput.value = savedConfig.baseUrl;
    DOM.apiKeyInput.value = deobfuscate(savedConfig.apiKey);
    DOM.modelInput.value = savedConfig.model;
    if (provider === "openai") DOM.reasoningEffort.value = savedConfig.reasoningEffort || "none";
    updateStatus(true);
  } else {
    DOM.baseUrlInput.value = DEFAULT_URLS[provider] || "";
    DOM.apiKeyInput.value = "";
    DOM.modelInput.value = DEFAULT_MODELS[provider] || "";
    if (provider === "openai") DOM.reasoningEffort.value = "none";
    updateStatus(false);
  }
  DOM.currentModelText.textContent = `${provider.toUpperCase()} / ${DOM.modelInput.value || "Not Configured"}`;
}

function getLocaleString(key) {
  const locale = localStorage.getItem("lastLocale") || getSystemLocale();
  return (TRANSLATIONS[locale] || TRANSLATIONS.en)[key];
}

function updateStatus(connected) {
  const dot = DOM.statusPill.querySelector(".status-dot");
  dot.className = connected ? "status-dot green" : "status-dot yellow";
  DOM.statusText.textContent = getLocaleString(connected ? "headerConnected" : "headerMissingKey");
  if (!DOM.sendBtn.classList.contains("generating")) DOM.sendBtn.disabled = !connected || DOM.chatInput.value.trim() === "";
}

async function refreshTabIndicators() {
  DOM.providerTabs.forEach(async tab => {
    const config = await getSetting(tab.dataset.provider);
    tab.classList.toggle("configured", !!(config && config.apiKey));
  });
}

DOM.providerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const config = { baseUrl: DOM.baseUrlInput.value.trim(), apiKey: obfuscate(DOM.apiKeyInput.value.trim()), model: DOM.modelInput.value.trim() };
  if (currentProvider === "openai") {
    config.reasoningEffort = DOM.reasoningEffort.value;
  }
  await saveSetting(currentProvider, config);
  activeConfig = config;
  const newLocale = getEl("setting-locale").value;
  localStorage.setItem("lastLocale", newLocale);
  applyLanguage(newLocale);
  await refreshTabIndicators();
  updateStatus(true);
  DOM.currentModelText.textContent = `${currentProvider.toUpperCase()} / ${config.model}`;
  DOM.settingsDrawer.classList.remove("open");
});

function setSendButtonState(isGen) {
  DOM.sendBtn.disabled = isGen ? false : DOM.chatInput.value.trim() === "";
  DOM.sendBtn.innerHTML = isGen ? `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="#FF453A" stroke-width="2" fill="#FF453A" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>` : `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  DOM.sendBtn.style.backgroundColor = isGen ? "rgba(255, 69, 58, 0.15)" : "";
  DOM.sendBtn.classList.toggle("generating", isGen);
}

function initEventListeners() {
  DOM.themeBtn.addEventListener("click", toggleTheme);
  DOM.settingsBtn.addEventListener("click", () => { DOM.settingsDrawer.classList.add("open"); refreshTabIndicators(); });
  DOM.closeSettingsBtn.addEventListener("click", () => DOM.settingsDrawer.classList.remove("open"));
  DOM.sidebarToggleBtn.addEventListener("click", () => {
    DOM.sidebar.classList.toggle("collapsed");
    localStorage.setItem("sidebarCollapsed", DOM.sidebar.classList.contains("collapsed"));
  });
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
    if (!DOM.sendBtn.classList.contains("generating")) DOM.sendBtn.disabled = !activeConfig || DOM.chatInput.value.trim() === "";
  });
  DOM.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!DOM.sendBtn.classList.contains("generating")) handleSend(); }
  });
  DOM.sendBtn.addEventListener("click", () => {
    if (DOM.sendBtn.classList.contains("generating")) {
      if (activeAbortController) { activeAbortController.abort(); activeAbortController = null; }
    } else {
      handleSend();
    }
  });
  getEl("card-setup-keys").addEventListener("click", () => DOM.settingsDrawer.classList.add("open"));
  getEl("card-start-chat").addEventListener("click", () => DOM.newChatBtn.click());
  getEl("sidebar-mask").addEventListener("click", () => DOM.sidebar.classList.add("collapsed"));
}

function renderMessages(messages) {
  DOM.messagesList.innerHTML = "";
  messages.forEach(msg => appendMessageToDOM(msg.role, msg.content, msg.performance, msg.id));
  scrollToBottomSmart(true);
}

function appendMessageToDOM(role, content, performanceData = null, messageId = null) {
  const item = document.createElement("div");
  item.className = `message-item ${role}`;
  item.dataset.id = messageId;
  
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (content === "Thinking...") {
    bubble.innerHTML = `<div class="thinking-dots"><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span></div>`;
  } else {
    bubble.innerHTML = parseMarkdown(content);
    if (window.Prism) Prism.highlightAllUnder(bubble);
  }
  if (role === "assistant" && performanceData) {
    bubble.innerHTML += renderPerformanceBadge(performanceData);
  }
  item.appendChild(bubble);
  
  if (messageId && content !== "Thinking...") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    if (role === "user") {
      actions.innerHTML = `<button class="action-btn" onclick="editMessage(this, ${messageId})">✏️ Edit</button>`;
    } else if (role === "assistant") {
      actions.innerHTML = `<button class="action-btn" onclick="regenerateMessage(this, ${messageId})">🔄 Regenerate</button>`;
    }
    item.appendChild(actions);
  }
  
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
  const userMsg = await addMessage(activeSessionId, "user", content);
  appendMessageToDOM("user", content, null, userMsg.id);
  scrollToBottomSmart(true);
  const aiBubble = appendMessageToDOM("assistant", "Thinking...");
  scrollToBottomSmart(true);
  const dot = DOM.statusPill.querySelector(".status-dot");
  dot.className = "status-dot yellow";
  DOM.statusText.textContent = getLocaleString("headerGenerating");
  try {
    const messages = await getMessages(activeSessionId);
    const perfData = await streamChatCompletion(activeConfig, messages, ({ fullText }) => {
      aiBubble.innerHTML = parseMarkdown(fullText);
      scrollToBottomSmart();
    }, activeAbortController.signal);
    perfData.model = activeConfig.model;
    aiBubble.innerHTML += renderPerformanceBadge(perfData);
    if (window.Prism) Prism.highlightAllUnder(aiBubble);
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
