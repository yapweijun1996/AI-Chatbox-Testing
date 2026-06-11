// Session (Conversations) management
// Depends on globals from db-init.js: useFallback, fallbackStore, getStore.
function createSession(title = "Untitled Session") {
  return new Promise((resolve, reject) => {
    const session = {
      title,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (useFallback) {
      const id = Date.now();
      session.id = id;
      fallbackStore.sessions[id] = session;
      fallbackStore.messages[id] = [];
      resolve(session);
      return;
    }
    const store = getStore("sessions", "readwrite");
    const req = store.add(session);
    req.onsuccess = (e) => {
      session.id = e.target.result;
      resolve(session);
    };
    req.onerror = () => reject(req.error);
  });
}

function getSessions() {
  return new Promise((resolve) => {
    if (useFallback) {
      const list = Object.values(fallbackStore.sessions).sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
      return;
    }
    const store = getStore("sessions", "readonly");
    const index = store.index("updatedAt");
    const req = index.openCursor(null, "prev");
    const results = [];
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => resolve([]);
  });
}

function deleteSession(sessionId) {
  return new Promise((resolve, reject) => {
    if (useFallback) {
      delete fallbackStore.sessions[sessionId];
      delete fallbackStore.messages[sessionId];
      resolve();
      return;
    }
    const sessStore = getStore("sessions", "readwrite");
    const delSessReq = sessStore.delete(Number(sessionId));

    delSessReq.onsuccess = () => {
      // Cascade delete messages for this session
      const msgStore = getStore("messages", "readwrite");
      const index = msgStore.index("sessionId");
      const range = IDBKeyRange.only(Number(sessionId));
      const cursorReq = index.openCursor(range);

      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => resolve(); // Non-fatal if message cascading has some hiccups
    };
    delSessReq.onerror = () => reject(delSessReq.error);
  });
}

function updateSessionTitle(sessionId, title) {
  return new Promise((resolve, reject) => {
    if (useFallback) {
      if (fallbackStore.sessions[sessionId]) {
        fallbackStore.sessions[sessionId].title = title;
        fallbackStore.sessions[sessionId].updatedAt = Date.now();
      }
      resolve();
      return;
    }
    const store = getStore("sessions", "readwrite");
    const getReq = store.get(Number(sessionId));
    getReq.onsuccess = () => {
      const session = getReq.result;
      if (session) {
        session.title = title;
        session.updatedAt = Date.now();
        const putReq = store.put(session);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
