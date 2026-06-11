// App bootstrap & global event wiring. Loaded last.
// Orchestrates init across all modules on DOMContentLoaded.

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
  initViewportHeightSync();
  initTooltips();
  registerServiceWorker();
});

function initViewportHeightSync() {
  const viewport = window.visualViewport;
  const getHeight = () => viewport ? viewport.height : window.innerHeight;
  const syncHeight = () => {
    document.documentElement.style.setProperty("--app-height", `${Math.round(getHeight())}px`);
  };
  const syncAndKeepComposerVisible = () => {
    syncHeight();
    if (document.activeElement === DOM.chatInput) {
      requestAnimationFrame(() => scrollToBottomSmart(true));
    }
  };

  syncHeight();
  window.addEventListener("resize", syncAndKeepComposerVisible);
  window.addEventListener("orientationchange", syncAndKeepComposerVisible);
  if (viewport) {
    viewport.addEventListener("resize", syncAndKeepComposerVisible);
    viewport.addEventListener("scroll", syncAndKeepComposerVisible);
  }
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
    // Ignore Enter while an IME candidate window is open (CJK input). Otherwise
    // confirming a Chinese/Japanese candidate with Enter would send prematurely.
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      if (!DOM.sendBtn.classList.contains("generating")) handleSend();
    }
  });
  DOM.chatInput.addEventListener("focus", () => {
    requestAnimationFrame(() => scrollToBottomSmart(true));
  });
  DOM.chatInput.addEventListener("blur", () => {
    requestAnimationFrame(() => scrollToBottomSmart());
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
  // Topbar New Chat (reaches the sidebar action even when it's off-canvas on mobile)
  getEl("header-new-chat-btn").addEventListener("click", () => DOM.newChatBtn.click());
  // Tapping the model chip opens provider/model settings
  DOM.currentModelText.addEventListener("click", () => { DOM.settingsDrawer.classList.add("open"); refreshTabIndicators(); });
}
