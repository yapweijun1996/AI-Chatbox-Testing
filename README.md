# Cosmic Pixel - Apple-Style Serverless AI Chatbox

这是一个遵循 **Apple 人机交互指南 (HIG)** 并且完全基于 **BYOK (Bring Your Own Key)** 模式构建的无服务器、高隐私安全 AI 聊天网页。

---

## ✨ 核心特色 (Core Features)

- ** Apple HIG 视觉设计**: 完美适配 iOS/macOS 磨砂玻璃拟态 (Glassmorphism)、1px 极细微半透明边框、超椭圆圆角比例及物理弹簧动效。
- **🔒 隐私安全与混淆**: API 密钥在存入浏览器数据库前通过 Base64 + XOR 动态混淆，防止被恶意的 XSS 脚本明文搜寻窃取。
- **⚡ 零中转流式对话**: 完全采用前端原生 fetch stream 获取大模型数据。不经过任何中转服务器，零日志留存，无中间商窃取密钥。
- **📦 离线持久化存储**: 采用 IndexedDB 保存您的最近对话、历史消息和配置状态，并支持优雅的内存级存储降级 fallback。
- **🌐 支持多大模型商**: 兼容 OpenAI、Google Gemini、Anthropic 和本地 LM Studio 等支持标准 OpenAI API 格式的所有服务。

---

## 🚀 运行与测试方法 (How to Run & Test)

由于本项目是 **100% 纯前端静态应用 (No Frameworks, No Bundlers, No CDNs)**，您**不需要**执行 `npm run dev` 即可运行测试：

### 方法 1：直接双击运行
1. 直接在浏览器中双击打开 `index.html`。

### 方法 2：使用本地静态服务器 (推荐)
如果您希望更稳定地测试流式传输，可以使用任何简单的本地 HTTP 服务器：
- **Python**: 在项目根目录下运行 `python -m http.server 8000`，然后在浏览器访问 `http://localhost:8000`。
- **Node.js (Npx)**: 运行 `npx serve .`，在浏览器访问输出的本地端口。
- **VS Code**: 安装 `Live Server` 插件并点击右下角 "Go Live"。

---

## ☁️ GitHub Pages 自动化部署 (Auto-Deploy)

当您将代码推送 (Push) 到 GitHub 后，可以按照以下步骤**零成本**启用 GitHub Pages 托管，实现自动构建与访问：

1. 打开 GitHub 仓库页面，点击右上角的 **Settings** (设置)。
2. 在左侧边栏找到并点击 **Pages**。
3. 在 **Build and deployment** 下方的 **Source** 选择 `Deploy from a branch`。
4. 将 Branch 设置为 `main`，目录选择 `/ (root)`，然后点击 **Save**。
5. 几分钟后，您的专属 Demo 链接就会生成（格式为 `https://<your-username>.github.io/<your-repo-name>/`）。后续每次 `git push` 到 `main` 分支都会触发 GitHub Actions 自动更新部署！

---

## 📁 项目结构 (Directory Layout)

- `index.html`: 入口网页结构，内置 Apple HIG 主体布局、服务商配置抽屉和消息流 viewport。
- `styles.css`: 纯 Native CSS 变量，提供深色/浅色自适应、高饱和毛玻璃、物理弹簧曲线动效。
- `db.js`: IndexedDB 的封装模块，含会话、消息和设置的管理与升级迁移，提供 Promise 接口。
- `crypto.js`: 客户端 XOR 异或混淆算法，用于防止明文 API 密钥扫描。
- `app.js`: 流式处理、事件绑定及 Markdown 渲染逻辑。
- `README.md`: 本说明文档。
