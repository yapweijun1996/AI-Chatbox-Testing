/**
 * Editor & Regeneration Controller.
 */

window.editMessage = (btn, messageId) => {
  const item = btn.closest(".message-item");
  const bubble = item.querySelector(".message-bubble");
  const originalText = bubble.querySelector("p") ? bubble.innerText : bubble.textContent;
  
  bubble.innerHTML = `
    <textarea class="session-rename-input" style="width: 100%; height: 80px; resize: vertical; padding: 8px;" id="edit-area-${messageId}"></textarea>
    <div style="margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end;">
      <button class="btn" style="padding: 4px 8px; font-size: 11px; font-weight: 500;" onclick="cancelEditMessage()">Cancel</button>
      <button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="saveEditMessage(${messageId})">Save & Resubmit</button>
    </div>
  `;
  
  const textarea = document.getElementById(`edit-area-${messageId}`);
  getStoreMessage(messageId).then(msg => {
    textarea.value = msg ? msg.content : originalText;
    textarea.focus();
  });
};

window.cancelEditMessage = async () => {
  renderMessages(await getMessages(activeSessionId));
};

window.saveEditMessage = async (messageId) => {
  const textarea = document.getElementById(`edit-area-${messageId}`);
  if (!textarea) return;
  const newContent = textarea.value.trim();
  if (!newContent) return;
  await deleteMessagesFrom(activeSessionId, messageId + 1);
  await updateMessageContent(messageId, newContent);
  await triggerCompletionStream();
};

window.regenerateMessage = async (btn, messageId) => {
  await deleteMessagesFrom(activeSessionId, messageId);
  await triggerCompletionStream();
};

async function triggerCompletionStream() {
  if (!activeSessionId || !activeConfig) return;
  const messages = await getMessages(activeSessionId);
  renderMessages(messages);
  activeAbortController = new AbortController();
  setSendButtonState(true);
  
  const aiBubble = appendMessageToDOM("assistant", "Thinking...");
  scrollToBottomSmart(true);
  const dot = DOM.statusPill.querySelector(".status-dot");
  dot.className = "status-dot yellow";
  DOM.statusText.textContent = getLocaleString("headerGenerating");
  
  try {
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
