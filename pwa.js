/**
 * PWA service-worker registration & update flow.
 * Single source of truth: registers ./sw.js, auto-reloads on a new deploy
 * (guarded against first-install and in-flight streaming), and surfaces an
 * "update available" toast that triggers SKIP_WAITING.
 */

function showUpdateToast(waitingSW) {
  if (document.getElementById("sw-update-toast")) return;

  const toast = document.createElement("div");
  toast.id = "sw-update-toast";
  toast.textContent = "New version available — tap to update";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "max(24px, calc(24px + env(safe-area-inset-bottom, 0px)))",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    borderRadius: "24px",
    padding: "12px 20px",
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: "500",
    cursor: "pointer",
    zIndex: "99999",
    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
    whiteSpace: "nowrap",
    userSelect: "none",
    transition: "opacity 0.3s ease"
  });

  const dismiss = () => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 350);
  };
  toast.addEventListener("click", () => {
    if (waitingSW) waitingSW.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
    dismiss();
  });

  document.body.appendChild(toast);
  setTimeout(dismiss, 30000);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Auto-reload open tabs once a new service worker takes control (i.e. a new deploy).
  // Guarded so it never fires on the first-ever install, never loops, and never
  // interrupts an in-flight response (not persisted until the stream completes).
  let hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) { hadController = true; return; }
    if (window.activeAbortController) return; // streaming — reload on a later update check instead
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        // A worker installed on a prior visit is already waiting — offer to update.
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
        // A new worker starts installing while this page is open.
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateToast(newSW);
            }
          });
        });
      })
      .catch((err) => console.warn("ServiceWorker registration failed: ", err));
  });
}
