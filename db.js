const DB_NAME = "CosmicPixelDB";
const DB_VERSION = 1;

let dbInstance = null;
let useFallback = false;
const fallbackStore = {
  sessions: {},
  messages: {},
  settings: {}
};

function initDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      console.warn("IndexedDB unavailable, falling back to in-memory store.");
      useFallback = true;
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.warn("IndexedDB failed to open, falling back to in-memory.", event.target.error);
      useFallback = true;
      resolve(null);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store 1: sessions (chats)
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionStore = db.createObjectStore("sessions", { keyPath: "id", autoIncrement: true });
        sessionStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // Store 2: messages
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", { keyPath: "id", autoIncrement: true });
        messageStore.createIndex("sessionId", "sessionId", { unique: false });
        messageStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Store 3: settings
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "provider" });
      }
    };
  });
}

function getStore(storeName, mode = "readonly") {
  if (useFallback || !dbInstance) return null;
  const transaction = dbInstance.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// Settings management (BYOK keys and configurations)
function saveSetting(provider, config) {
  return new Promise((resolve, reject) => {
    if (useFallback) {
      fallbackStore.settings[provider] = config;
      resolve();
      return;
    }
    const store = getStore("settings", "readwrite");
    const req = store.put({ provider, ...config });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getSetting(provider) {
  return new Promise((resolve) => {
    if (useFallback) {
      resolve(fallbackStore.settings[provider] || null);
      return;
    }
    const store = getStore("settings", "readonly");
    const req = store.get(provider);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

// Session (Conversations) management
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

// Messages management
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
