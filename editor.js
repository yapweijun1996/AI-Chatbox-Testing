/**
 * Editor & Regeneration Controller.
 */

window.editMessage = (btn, messageId) => {
  const item = btn.closest(".message-item");
  const bubble = item.querySelector(".message-bubble");

  bubble.innerHTML = `
    <div class="message-edit-form">
      <span class="message-edit-label">Editing message</span>
      <textarea class="message-edit-textarea" id="edit-area-${messageId}" rows="1"></textarea>
      <div class="message-edit-actions">
        <span class="message-edit-hint">Esc to cancel · ⌘↵ to save</span>
        <button class="message-edit-cancel" onclick="cancelEditMessage()">Cancel</button>
        <button class="message-edit-save" id="edit-save-${messageId}" onclick="saveEditMessage(${messageId})">Save &amp; Resubmit</button>
      </div>
    </div>
  `;

  const textarea = document.getElementById(`edit-area-${messageId}`);
  const saveBtn = document.getElementById(`edit-save-${messageId}`);

  function autoResize() {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 320) + "px";
    saveBtn.disabled = textarea.value.trim() === "";
  }

  textarea.addEventListener("input", autoResize);

  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); cancelEditMessage(); }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEditMessage(messageId); }
  });

  getStoreMessage(messageId).then(msg => {
    textarea.value = msg ? msg.content : "";
    autoResize();
    textarea.select();
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
