// Application State & DOM Cache (Global Scope Shared)
// Loaded before providers.js / chat.js / main.js, which read from DOM and these globals.
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
  systemPromptInput: getEl("setting-system-prompt"), temperatureInput: getEl("setting-temperature"),
  statusPill: getEl("status-pill"), statusText: getEl("status-text"), sessionsList: getEl("sessions-list"),
  chatViewport: getEl("chat-viewport"), welcomeView: getEl("welcome-view"), messagesList: getEl("messages-list"),
  chatInput: getEl("chat-input"), sendBtn: getEl("send-btn"),
  reasoningEffort: getEl("setting-reasoning-effort"), reasoningGroup: getEl("group-reasoning-effort")
};

const DEFAULT_URLS = { openai: "https://api.openai.com/v1", gemini: "https://generativelanguage.googleapis.com/v1beta/openai", anthropic: "https://api.anthropic.com/v1", lmstudio: "http://localhost:1234/v1" };
const DEFAULT_MODELS = { openai: "gpt-4o-mini", gemini: "gemini-1.5-flash", anthropic: "claude-3-5-sonnet-20241022", lmstudio: "meta-llama-3-8b-instruct" };
