// Application State & DOM Cache
let activeSessionId = null;
let currentProvider = localStorage.getItem("lastProvider") || "openai";
const supportedLocales = ["en", "zh", "ms", "ja", "vi"];
const getSystemLocale = () => {
  const sysLang = navigator.language.slice(0, 2);
  return supportedLocales.includes(sysLang) ? sysLang : "en";
};
let currentLocale = localStorage.getItem("lastLocale") || getSystemLocale();
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
  if (window.innerWidth <= 768) DOM.sidebar.classList.add("collapsed");
  initEventListeners();
  initTooltips();
  registerServiceWorker();
});

async function loadSessions() {
  const sessions = await getSessions();
  DOM.sessionsList.innerHTML = "";
  if (sessions.length === 0) { showWelcomeState(true); return; }
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
    
    const titleEl = item.querySelector(".session-title");
    titleEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const input = document.createElement("input");
      input.type = "text";
      input.className = "session-rename-input";
      input.value = session.title;
      titleEl.replaceWith(input);
      input.focus();
      
      let saved = false;
      const saveRename = async () => {
        if (saved) return;
        saved = true;
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== session.title) {
          await updateSessionTitle(session.id, newTitle);
          session.title = newTitle;
        }
        await loadSessions();
      };
      input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" && !evt.shiftKey) saveRename();
        if (evt.key === "Escape") loadSessions();
      });
      input.addEventListener("blur", saveRename);
    });
    DOM.sessionsList.appendChild(item);
  });
}

async function selectSession(sessionId) {
  activeSessionId = sessionId;
  showWelcomeState(false);
  document.querySelectorAll(".session-item").forEach(item => {
    item.classList.toggle("active", Number(item.dataset.id) === sessionId);
  });
  renderMessages(await getMessages(sessionId));
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
  DOM.sendBtn.innerHTML = isGen ? `<span class="icon-stop" style="color: #FF453A; font-size: 10px; font-weight: bold;">■</span>` : `<span class="icon-arrow-up"></span>`;
  DOM.sendBtn.style.backgroundColor = isGen ? "rgba(255, 69, 58, 0.15)" : "";
  DOM.sendBtn.classList.toggle("generating", isGen);
}

function initEventListeners() {
  DOM.themeBtn.addEventListener("click", toggleTheme);
  DOM.settingsBtn.addEventListener("click", () => { DOM.settingsDrawer.classList.add("open"); refreshTabIndicators(); });
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
    if (window.Prism) Prism.highlightAllUnder(bubble);
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
