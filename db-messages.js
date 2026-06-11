// Messages management
// Depends on globals from db-init.js: useFallback, fallbackStore, getStore.
function deleteMessagesFrom(sessionId, fromMessageId) {
  return new Promise((resolve, reject) => {
    if (useFallback) {
      const msgs = fallbackStore.messages[sessionId] || [];
      const idx = msgs.findIndex(m => m.id === Number(fromMessageId));
      if (idx !== -1) fallbackStore.messages[sessionId] = msgs.slice(0, idx);
      resolve(); return;
    }
    const index = getStore("messages", "readwrite").index("sessionId");
    const req = index.openCursor(IDBKeyRange.only(Number(sessionId)));
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.id >= Number(fromMessageId)) cursor.delete();
        cursor.continue();
      } else resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

function getStoreMessage(msgId) {
  return new Promise((resolve) => {
    if (useFallback) {
      for (const sessId in fallbackStore.messages) {
        const found = fallbackStore.messages[sessId].find(m => m.id === Number(msgId));
        if (found) { resolve(found); return; }
      }
      resolve(null); return;
    }
    const req = getStore("messages", "readonly").get(Number(msgId));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

function updateMessageContent(msgId, newContent) {
  return new Promise((resolve, reject) => {
    if (useFallback) {
      for (const sessId in fallbackStore.messages) {
        const found = fallbackStore.messages[sessId].find(m => m.id === Number(msgId));
        if (found) { found.content = newContent; found.timestamp = Date.now(); resolve(); return; }
      }
      resolve(); return;
    }
    const store = getStore("messages", "readwrite");
    const getReq = store.get(Number(msgId));
    getReq.onsuccess = () => {
      const msg = getReq.result;
      if (msg) {
        msg.content = newContent; msg.timestamp = Date.now();
        const putReq = store.put(msg);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

function addMessage(sessionId, role, content, performance = null) {
  return new Promise((resolve, reject) => {
    const msg = {
      sessionId: Number(sessionId),
      role,
      content,
      timestamp: Date.now(),
      performance
    };
    if (useFallback) {
      msg.id = Date.now() + Math.random();
      fallbackStore.messages[sessionId] = fallbackStore.messages[sessionId] || [];
      fallbackStore.messages[sessionId].push(msg);
      fallbackStore.sessions[sessionId].updatedAt = Date.now();
      resolve(msg);
      return;
    }
    const store = getStore("messages", "readwrite");
    const req = store.add(msg);
    req.onsuccess = (e) => {
      msg.id = e.target.result;
      // Update session's updatedAt time
      const sessStore = getStore("sessions", "readwrite");
      const getSess = sessStore.get(Number(sessionId));
      getSess.onsuccess = () => {
        if (getSess.result) {
          getSess.result.updatedAt = Date.now();
          sessStore.put(getSess.result);
        }
      };
      resolve(msg);
    };
    req.onerror = () => reject(req.error);
  });
}

function getMessages(sessionId) {
  return new Promise((resolve) => {
    if (useFallback) {
      resolve(fallbackStore.messages[sessionId] || []);
      return;
    }
    const store = getStore("messages", "readonly");
    const index = store.index("sessionId");
    const range = IDBKeyRange.only(Number(sessionId));
    const req = index.openCursor(range);
    const results = [];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        // Sort by timestamp just in case
        results.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      }
    };
    req.onerror = () => resolve([]);
  });
}
