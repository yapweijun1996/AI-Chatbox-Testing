// Chat rendering & send/stream pipeline.
// Depends on state.js, providers.js (updateStatus/getLocaleString), markdown.js,
// telemetry.js, db-sessions.js, db-messages.js, sessions.js, api.js, editor.js.

function setSendButtonState(isGen) {
  DOM.sendBtn.disabled = isGen ? false : DOM.chatInput.value.trim() === "";
  DOM.sendBtn.innerHTML = isGen ? `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="#FF453A" stroke-width="2" fill="#FF453A" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect></svg>` : `<svg class="icon-svg" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  DOM.sendBtn.style.backgroundColor = isGen ? "rgba(255, 69, 58, 0.15)" : "";
  DOM.sendBtn.classList.toggle("generating", isGen);
}

function extractThinkBlocks(text) {
  const source = text || "";
  const lower = source.toLowerCase();
  const answerParts = [];
  const reasoningParts = [];
  let cursor = 0;

  while (cursor < source.length) {
    const openIndex = lower.indexOf("<think", cursor);
    if (openIndex === -1) {
      answerParts.push(source.slice(cursor));
      break;
    }

    const openEnd = source.indexOf(">", openIndex);
    if (openEnd === -1) {
      answerParts.push(source.slice(cursor, openIndex));
      break;
    }

    answerParts.push(source.slice(cursor, openIndex));
    const closeIndex = lower.indexOf("</think>", openEnd + 1);
    if (closeIndex === -1) {
      reasoningParts.push(source.slice(openEnd + 1));
      break;
    }

    reasoningParts.push(source.slice(openEnd + 1, closeIndex));
    cursor = closeIndex + "</think>".length;
  }

  return {
    content: answerParts.join(""),
    reasoning: reasoningParts.join("\n\n").trim()
  };
}

function getAssistantDisplayParts(content, reasoning = "") {
  const extracted = extractThinkBlocks(content);
  const reasoningParts = [reasoning, extracted.reasoning].filter(part => part && part.trim());
  return {
    content: extracted.content,
    reasoning: reasoningParts.join("\n\n").trim()
  };
}

function renderReasoningBlock(reasoning) {
  if (!reasoning || !reasoning.trim()) return "";
  const label = escapeHTML(getLocaleString("reasoningLabel"));
  return `<details class="reasoning-block" open><summary>${svgIcon("cpu", 13)} ${label}</summary><div class="reasoning-content">${parseMarkdown(reasoning)}</div></details>`;
}

function renderAssistantBubble(bubble, content, performanceData = null, reasoning = "") {
  const parts = getAssistantDisplayParts(content, reasoning);
  bubble.innerHTML = `${renderReasoningBlock(parts.reasoning)}${parseMarkdown(parts.content)}`;
  if (performanceData) {
    bubble.innerHTML += renderPerformanceBadge(performanceData);
  }
  if (window.Prism) Prism.highlightAllUnder(bubble);
  return parts;
}

function renderMessages(messages) {
  DOM.messagesList.innerHTML = "";
  messages.forEach(msg => appendMessageToDOM(msg.role, msg.content, msg.performance, msg.id, msg.reasoning));
  scrollToBottomSmart(true);
}

function renderActionButton(icon, labelKey, onClick) {
  const label = getLocaleString(labelKey);
  const safeLabel = escapeHTML(label);
  return `<button class="action-btn" onclick="${onClick}" title="${safeLabel}" data-tooltip="${safeLabel}">${svgIcon(icon, 13)} ${safeLabel}</button>`;
}

function renderMessageActions(role, messageId) {
  const actions = document.createElement("div");
  actions.className = "message-actions";

  const copyButton = renderActionButton("copy", "actionCopy", `copyBubbleContent(this, ${messageId})`);
  if (role === "user") {
    actions.innerHTML = `${copyButton}${renderActionButton("edit", "actionEdit", `editMessage(this, ${messageId})`)}`;
  } else if (role === "assistant") {
    actions.innerHTML = `${copyButton}${renderActionButton("regenerate", "actionRegenerate", `regenerateMessage(this, ${messageId})`)}`;
  } else {
    actions.innerHTML = copyButton;
  }

  return actions;
}

function attachMessageActions(item, role, messageId) {
  if (!messageId || item.querySelector(".message-actions")) return;
  item.appendChild(renderMessageActions(role, messageId));
}

function appendMessageToDOM(role, content, performanceData = null, messageId = null, reasoning = "") {
  const item = document.createElement("div");
  item.className = `message-item ${role}`;
  item.dataset.id = messageId;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (content === "Thinking...") {
    bubble.innerHTML = `<div class="thinking-dots"><span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span></div>`;
  } else if (role === "assistant") {
    renderAssistantBubble(bubble, content, performanceData, reasoning);
  } else {
    bubble.innerHTML = parseMarkdown(content);
    if (window.Prism) Prism.highlightAllUnder(bubble);
  }
  item.appendChild(bubble);

  if (messageId && content !== "Thinking...") {
    attachMessageActions(item, role, messageId);
  }

  DOM.messagesList.appendChild(item);
  return bubble;
}

async function writeClipboardText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!copied) throw new Error("Copy command failed");
}

window.copyBubbleContent = async (btn, messageId) => {
  const msg = await getStoreMessage(messageId);
  if (!msg) return;

  const originalHTML = btn.innerHTML;
  const originalTitle = btn.getAttribute("data-tooltip") || "";
  try {
    await writeClipboardText(msg.content);
    const copiedLabel = escapeHTML(getLocaleString("actionCopied"));
    btn.innerHTML = `${svgIcon("copy", 13)} ${copiedLabel}`;
    btn.title = copiedLabel;
    btn.dataset.tooltip = copiedLabel;
    btn.style.color = "#34C759";
  } catch (err) {
    console.error("Unable to copy message: ", err);
    const failedLabel = escapeHTML(getLocaleString("actionCopyFailed"));
    btn.innerHTML = `${svgIcon("warning", 13)} ${failedLabel}`;
    btn.title = failedLabel;
    btn.dataset.tooltip = failedLabel;
    btn.style.color = "#FF453A";
  } finally {
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.title = originalTitle;
      btn.dataset.tooltip = originalTitle;
      btn.style.color = "";
    }, 1500);
  }
};

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
    const perfData = await streamChatCompletion(activeConfig, messages, ({ fullText, fullReasoning }) => {
      renderAssistantBubble(aiBubble, fullText, null, fullReasoning);
      scrollToBottomSmart();
    }, activeAbortController.signal);
    perfData.model = activeConfig.model;
    const finalParts = renderAssistantBubble(aiBubble, perfData.fullText, perfData, perfData.reasoning);
    perfData.fullText = finalParts.content;
    perfData.reasoning = finalParts.reasoning;
    scrollToBottomSmart();
    const assistantMsg = await addMessage(activeSessionId, "assistant", perfData.fullText, perfData, perfData.reasoning);
    attachMessageActions(aiBubble.closest(".message-item"), "assistant", assistantMsg.id);
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
