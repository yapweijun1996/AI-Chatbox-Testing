// Settings management (BYOK keys and configurations)
// Depends on globals from db-init.js: useFallback, fallbackStore, getStore.
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
