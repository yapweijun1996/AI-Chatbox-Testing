const DB_NAME = "CosmicPixelDB";
const DB_VERSION = 1;

let dbInstance = null;
let useFallback = false;
const fallbackStore = {
  sessions: {},
  messages: {},
  settings: {}
};

/**
 * Initializes IndexedDB or triggers in-memory fallback.
 */
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

/**
 * Shared helper to get standard Object Store interface.
 */
function getStore(storeName, mode = "readonly") {
  if (useFallback || !dbInstance) return null;
  const transaction = dbInstance.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}
