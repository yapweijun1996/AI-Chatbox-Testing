// Provider/config management: tab switching, connection status, and the save form.
// Depends on state.js (globals/DOM), db-settings.js, crypto.js, locales.js.

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
  const strings = TRANSLATIONS[locale] || TRANSLATIONS.en;
  return strings[key] || TRANSLATIONS.en[key] || key;
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
