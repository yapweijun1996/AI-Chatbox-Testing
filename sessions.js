/**
 * Session Controller & UI management.
 */

async function loadSessions() {
  const sessions = await getSessions();
  DOM.sessionsList.innerHTML = "";
  if (sessions.length === 0) { showWelcomeState(true); return; }
  sessions.forEach(session => {
    const activeClass = activeSessionId === session.id ? "active" : "";
    const item = document.createElement("div");
    item.className = `session-item ${activeClass}`;
    item.dataset.id = session.id;
    item.innerHTML = `
      <span class="session-title">${escapeHTML(session.title)}</span>
      <button class="session-delete" onclick="event.stopPropagation(); handleDeleteSession(${session.id})">&times;</button>
    `;
    item.addEventListener("click", () => selectSession(session.id));
    
    const titleEl = item.querySelector(".session-title");
    titleEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const input = document.createElement("input");
      input.type = "text";
      input.className = "session-rename-input";
      input.value = session.title;
      titleEl.replaceWith(input);
      input.focus();
      
      let saved = false;
      const saveRename = async () => {
        if (saved) return;
        saved = true;
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== session.title) {
          await updateSessionTitle(session.id, newTitle);
          session.title = newTitle;
        }
        await loadSessions();
      };
      input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" && !evt.shiftKey) saveRename();
        if (evt.key === "Escape") loadSessions();
      });
      input.addEventListener("blur", saveRename);
    });
    DOM.sessionsList.appendChild(item);
  });
}

async function selectSession(sessionId) {
  activeSessionId = sessionId;
  showWelcomeState(false);
  document.querySelectorAll(".session-item").forEach(item => {
    item.classList.toggle("active", Number(item.dataset.id) === sessionId);
  });
  renderMessages(await getMessages(sessionId));
}

function showWelcomeState(show) {
  DOM.welcomeView.style.display = show ? "block" : "none";
  if (show) { DOM.messagesList.innerHTML = ""; activeSessionId = null; }
}

window.handleDeleteSession = async (sessionId) => {
  if (confirm("Are you sure you want to delete this session and all its message history?")) {
    await deleteSession(sessionId);
    if (activeSessionId === sessionId) showWelcomeState(true);
    await loadSessions();
  }
};
