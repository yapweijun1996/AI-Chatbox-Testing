const TRANSLATIONS = {
  en: {
    sidebarNewChat: "New Chat",
    sidebarHistoryLabel: "Recent Chats",
    headerConnected: "Connected (BYOK)",
    headerMissingKey: "Missing Secret Key",
    headerGenerating: "Generating...",
    welcomeTitle: "Welcome to Secure AI Chat",
    welcomeDesc: "All credentials are obfuscated and stored locally. Streams connect directly to providers with zero log retention.",
    welcomeStep1Title: "🔑 Step 1: Configure Keys",
    welcomeStep1Desc: "Click here or the settings button to enter your API Key and Base URL.",
    welcomeStep2Title: "💬 Step 2: Start Chatting",
    welcomeStep2Desc: "Type any query in the input bar below to initiate real-time streaming.",
    inputPlaceholder: "Type a message to AI assistant...",
    footerNote: "Data is sent directly to your configured provider. Obfuscated keys protect your privacy.",
    modalTitle: "Keys & Provider Config (BYOK)",
    formBaseUrl: "API Base URL (Endpoint Base URL)",
    formApiKey: "API Key (API Secret Key)",
    formModel: "Default Model Name",
    formLanguage: "UI Language (界面语言)",
    formSave: "Save Settings",
    privacyWarning: "🔒 XOR Obfuscated & Encrypted. Locally Persisted via IndexedDB."
  },
  zh: {
    sidebarNewChat: "新建对话",
    sidebarHistoryLabel: "历史记录",
    headerConnected: "连接正常 (BYOK)",
    headerMissingKey: "缺少 API 密钥",
    headerGenerating: "正在生成回答...",
    welcomeTitle: "欢迎使用安全 AI 聊天",
    welcomeDesc: "所有凭据均已经过混淆并存储在本地。直连大模型，无任何云端日志保留。",
    welcomeStep1Title: "🔑 步骤 1：配置密钥",
    welcomeStep1Desc: "点击此处或设置按钮，输入您的 API 密钥和基准 Base URL。",
    welcomeStep2Title: "💬 步骤 2：发起对话",
    welcomeStep2Desc: "在底部的输入框中输入您的任何问题即可发起流式输出。",
    inputPlaceholder: "输入任何问题开始与 AI 助手对话...",
    footerNote: "数据将直连您配置的接口商。本地混淆后的密钥可全面保障您的隐私。",
    modalTitle: "密钥与接口商配置 (BYOK)",
    formBaseUrl: "接口 Base URL 基准地址",
    formApiKey: "接口 API 密钥 Secret Key",
    formModel: "默认模型名称 (Model)",
    formLanguage: "UI Language (界面语言)",
    formSave: "保存当前配置",
    privacyWarning: "🔒 XOR 混淆与加密保护。本地通过 IndexedDB 安全存储。"
  }
};

function applyLanguage(locale) {
  const strings = TRANSLATIONS[locale] || TRANSLATIONS.en;
  
  // 1. Update text nodes preserving child icons
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (strings[key]) {
      const icon = el.querySelector("span[class^='icon-']");
      if (icon) {
        // Keep icon, update text nodes
        Array.from(el.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = strings[key];
          }
        });
        // If there's no text node, create and append one with space
        const hasTextNode = Array.from(el.childNodes).some(node => node.nodeType === Node.TEXT_NODE);
        if (!hasTextNode) {
          el.appendChild(document.createTextNode(" " + strings[key]));
        }
      } else {
        el.textContent = strings[key];
      }
    }
  });

  // 2. Update placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (strings[key]) {
      el.placeholder = strings[key];
    }
  });

  document.documentElement.lang = locale;
}
