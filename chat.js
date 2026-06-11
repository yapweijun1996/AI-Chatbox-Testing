// Chat rendering & send/stream pipeline.
// Depends on state.js, providers.js (updateStatus/getLocaleString), markdown.js,
// telemetry.js, db-sessions.js, db-messages.js, sessions.js, api.js, editor.js.

function setSendButtonState(isGen) {
  DOM.sendBtn.disabled = isGen ? false : DOM.chatInput.value.trim() === "";
  DOM.sendBtn.innerHTML = isGen ? `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="#FF453A" stroke-width="2" fill="#FF453A" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>` : `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  DOM.sendBtn.style.backgroundColor = isGen ? "rgba(255, 69, 58, 0.15)" : "";
  DOM.sendBtn.classList.toggle("generating", isGen);
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
      actions.innerHTML = `<button class="action-btn" onclick="editMessage(this, ${messageId})">${svgIcon("edit", 13)} Edit</button>`;
    } else if (role === "assistant") {
      actions.innerHTML = `<button class="action-btn" onclick="regenerateMessage(this, ${messageId})">${svgIcon("regenerate", 13)} Regenerate</button>`;
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
      aiBubble.innerHTML += `<br><span style="color: #FF9500; font-size: 11px;">${svgIcon("warning", 12)} Stream connection aborted by user.</span>`;
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
