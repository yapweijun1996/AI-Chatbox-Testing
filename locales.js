const TRANSLATIONS = {
  en: {
    sidebarNewChat: "New Chat",
    sidebarHistoryLabel: "Recent Chats",
    headerConnected: "Connected (BYOK)",
    headerMissingKey: "Missing Secret Key",
    headerGenerating: "Generating...",
    welcomeTitle: "Welcome to Secure AI Chat",
    welcomeDesc: "All credentials are obfuscated and stored locally. Streams connect directly to providers with zero log retention.",
    welcomeStep1Title: "Step 1: Configure Keys",
    welcomeStep1Desc: "Click here or the settings button to enter your API Key and Base URL.",
    welcomeStep2Title: "Step 2: Start Chatting",
    welcomeStep2Desc: "Type any query in the input bar below to initiate real-time streaming.",
    inputPlaceholder: "Type a message to AI assistant...",
    footerNote: "Data is sent directly to your configured provider. Obfuscated keys protect your privacy.",
    modalTitle: "Keys & Provider Config (BYOK)",
    formBaseUrl: "API Base URL (Endpoint Base URL)",
    formApiKey: "API Key (API Secret Key)",
    formModel: "Default Model Name",
    formSystemPrompt: "System Prompt",
    systemPromptPlaceholder: "You are a helpful assistant.",
    formTemperature: "Temperature",
    formLanguage: "UI Language (界面语言)",
    formReasoningEffort: "Reasoning Effort (o-series)",
    reasoningLabel: "Reasoning",
    formSave: "Save Settings",
    privacyWarning: "XOR Obfuscated & Encrypted. Locally Persisted via IndexedDB.",
    actionCopy: "Copy",
    actionCopied: "Copied",
    actionCopyFailed: "Copy failed",
    actionEdit: "Edit",
    actionRegenerate: "Regenerate"
  },
  zh: {
    sidebarNewChat: "新建对话",
    sidebarHistoryLabel: "历史记录",
    headerConnected: "连接正常 (BYOK)",
    headerMissingKey: "缺少 API 密钥",
    headerGenerating: "正在生成回答...",
    welcomeTitle: "欢迎使用安全 AI 聊天",
    welcomeDesc: "所有凭据均已经过混淆并存储在本地。直连大模型，无任何云端日志保留。",
    welcomeStep1Title: "步骤 1：配置密钥",
    welcomeStep1Desc: "点击此处或设置按钮，输入您的 API 密钥和基准 Base URL。",
    welcomeStep2Title: "步骤 2：发起对话",
    welcomeStep2Desc: "在底部的输入框中输入您的任何问题即可发起流式输出。",
    inputPlaceholder: "输入任何问题开始与 AI 助手对话...",
    footerNote: "数据将直连您配置的接口商。本地混淆后的密钥可全面保障您的隐私。",
    modalTitle: "密钥与接口商配置 (BYOK)",
    formBaseUrl: "接口 Base URL 基准地址",
    formApiKey: "接口 API 密钥 Secret Key",
    formModel: "默认模型名称 (Model)",
    formLanguage: "UI Language (界面语言)",
    formReasoningEffort: "推理开销 (o系列模型)",
    reasoningLabel: "推理过程",
    formSave: "保存当前配置",
    privacyWarning: "XOR 混淆与加密保护。本地通过 IndexedDB 安全存储。",
    actionCopy: "\u590d\u5236",
    actionCopied: "\u5df2\u590d\u5236",
    actionCopyFailed: "\u590d\u5236\u5931\u8d25",
    actionEdit: "\u7f16\u8f91",
    actionRegenerate: "\u91cd\u65b0\u751f\u6210"
  },
  ms: {
    sidebarNewChat: "Sembang Baru",
    sidebarHistoryLabel: "Sembang Terkini",
    headerConnected: "Bersambung (BYOK)",
    headerMissingKey: "Kunci Rahsia Hilang",
    headerGenerating: "Menjana jawapan...",
    welcomeTitle: "Selamat Datang ke Sembang AI Selamat",
    welcomeDesc: "Semua kelayakan dikaburkan dan disimpan secara tempatan. Sambungan terus ke penyedia tanpa simpanan log.",
    welcomeStep1Title: "Langkah 1: Konfigurasi Kunci",
    welcomeStep1Desc: "Klik di sini atau butang tetapan untuk memasukkan API Key dan Base URL.",
    welcomeStep2Title: "Langkah 2: Mula Berbual",
    welcomeStep2Desc: "Taip sebarang pertanyaan dalam bar input di bawah untuk memulakan penstriman masa nyata.",
    inputPlaceholder: "Taip mesej kepada pembantu AI...",
    footerNote: "Data dihantar terus ke penyedia konfigurasi anda. Kunci yang dikaburkan melindungi privasi anda.",
    modalTitle: "Kunci & Konfigurasi Penyedia (BYOK)",
    formBaseUrl: "API Base URL (Endpoint Base URL)",
    formApiKey: "API Key (API Secret Key)",
    formModel: "Nama Model Lalai",
    formLanguage: "Bahasa UI (UI Language)",
    formReasoningEffort: "Usaha Penaakulan (o-series)",
    reasoningLabel: "Penaakulan",
    formSave: "Simpan Tetapan",
    privacyWarning: "XOR Dikaburkan & Disulitkan. Disimpan secara tempatan melalui IndexedDB.",
    actionCopy: "Salin",
    actionCopied: "Disalin",
    actionCopyFailed: "Gagal salin",
    actionEdit: "Edit",
    actionRegenerate: "Jana semula"
  },
  ja: {
    sidebarNewChat: "新規チャット",
    sidebarHistoryLabel: "最近のチャット",
    headerConnected: "接続完了 (BYOK)",
    headerMissingKey: "APIキーがありません",
    headerGenerating: "生成中...",
    welcomeTitle: "セキュアAIチャットへようこそ",
    welcomeDesc: "すべての認証情報は難読化され、ローカルに保存されます。ログ保存ゼロでプロバイダーに直接接続します。",
    welcomeStep1Title: "ステップ 1: キーの設定",
    welcomeStep1Desc: "ここまたは設定ボタンをクリックして、APIキーとベースURLを入力します。",
    welcomeStep2Title: "ステップ 2: チャット開始",
    welcomeStep2Desc: "リアルタイムのストリーミングを開始するには、下の入力バーに質問を入力します。",
    inputPlaceholder: "AIアシスタントにメッセージを入力...",
    footerNote: "データは設定されたプロバイダーに直接送信されます。難読化されたキーでプライバシーを保護します。",
    modalTitle: "キーとプロバイダー設定 (BYOK)",
    formBaseUrl: "APIベースURL (Endpoint Base URL)",
    formApiKey: "APIキー (API Secret Key)",
    formModel: "デフォルトモデル名",
    formLanguage: "UI言語 (UI Language)",
    formReasoningEffort: "推論の労力 (oシリーズ)",
    reasoningLabel: "推論",
    formSave: "設定を保存",
    privacyWarning: "XOR難読化＆暗号化。IndexedDBを介してローカルに保存されます。",
    actionCopy: "\u30b3\u30d4\u30fc",
    actionCopied: "\u30b3\u30d4\u30fc\u6e08\u307f",
    actionCopyFailed: "\u30b3\u30d4\u30fc\u5931\u6557",
    actionEdit: "\u7de8\u96c6",
    actionRegenerate: "\u518d\u751f\u6210"
  },
  vi: {
    sidebarNewChat: "Trò chuyện mới",
    sidebarHistoryLabel: "Trò chuyện gần đây",
    headerConnected: "Đã kết nối (BYOK)",
    headerMissingKey: "Thiếu khóa bảo mật",
    headerGenerating: "Đang tạo câu trả lời...",
    welcomeTitle: "Chào mừng đến với Trò chuyện AI bảo mật",
    welcomeDesc: "Tất cả thông tin đăng nhập được mã hóa và lưu trữ cục bộ. Kết nối trực tiếp đến nhà cung cấp và không lưu lại lịch sử.",
    welcomeStep1Title: "Bước 1: Cấu hình Khóa",
    welcomeStep1Desc: "Nhấp vào đây hoặc nút cài đặt để nhập Khóa API và URL cơ sở.",
    welcomeStep2Title: "Bước 2: Bắt đầu Trò chuyện",
    welcomeStep2Desc: "Nhập bất kỳ câu hỏi nào vào thanh nhập bên dưới để bắt đầu truyền trực tiếp thời gian thực.",
    inputPlaceholder: "Nhập tin nhắn cho trợ lý AI...",
    footerNote: "Dữ liệu được gửi trực tiếp đến nhà cung cấp đã định cấu hình của bạn. Khóa ẩn bảo vệ quyền riêng tư của bạn.",
    modalTitle: "Khóa & Cấu hình Nhà cung cấp (BYOK)",
    formBaseUrl: "URL cơ sở API (Endpoint Base URL)",
    formApiKey: "Khóa API (API Secret Key)",
    formModel: "Tên mô hình mặc định",
    formLanguage: "Ngôn ngữ giao diện (UI Language)",
    formReasoningEffort: "Nỗ lực tư duy (dòng o)",
    reasoningLabel: "Suy luận",
    formSave: "Lưu cài đặt",
    privacyWarning: "XOR Mã hóa & Ẩn danh. Lưu trữ cục bộ qua IndexedDB.",
    actionCopy: "Sao ch\u00e9p",
    actionCopied: "\u0110\u00e3 sao ch\u00e9p",
    actionCopyFailed: "Sao ch\u00e9p l\u1ed7i",
    actionEdit: "Ch\u1ec9nh s\u1eeda",
    actionRegenerate: "T\u1ea1o l\u1ea1i"
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
