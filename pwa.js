/**
 * PWA service-worker registration & update flow.
 * Registers ./sw.js and shows an explicit update prompt. The new service
 * worker activates only after the user chooses to update.
 */

function showUpdateToast(waitingSW) {
  if (!waitingSW || document.getElementById("sw-update-toast")) return;

  const toast = document.createElement("div");
  toast.id = "sw-update-toast";
  toast.innerHTML = `
    <span id="sw-update-message">New version detected.</span>
    <button type="button" id="sw-update-now">Update now</button>
    <button type="button" id="sw-update-later">Later</button>
  `;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "max(24px, env(safe-area-inset-bottom, 0px))",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    borderRadius: "14px",
    padding: "10px 12px",
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: "500",
    zIndex: "99999",
    boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    maxWidth: "calc(100vw - 32px)",
    userSelect: "none",
    transition: "opacity 0.3s ease"
  });

  toast.querySelectorAll("button").forEach((btn) => {
    Object.assign(btn.style, {
      border: "1px solid rgba(255,255,255,0.25)",
      borderRadius: "8px",
      background: btn.id === "sw-update-now" ? "#fff" : "transparent",
      color: btn.id === "sw-update-now" ? "#111" : "#fff",
      cursor: "pointer",
      font: "inherit",
      fontSize: "12px",
      padding: "6px 9px",
      whiteSpace: "nowrap"
    });
  });

  const dismiss = () => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 350);
  };

  toast.querySelector("#sw-update-now").addEventListener("click", () => {
    if (window.activeAbortController) {
      toast.querySelector("#sw-update-message").textContent = "Finish the current response before updating.";
      return;
    }
    window.__swUpdateRequested = true;
    waitingSW.postMessage({ type: "SKIP_WAITING" });
    dismiss();
  });
  toast.querySelector("#sw-update-later").addEventListener("click", dismiss);

  document.body.appendChild(toast);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  let hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  window.__swUpdateRequested = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !hadController) {
      hadController = true;
      return;
    }
    if (!window.__swUpdateRequested || window.activeAbortController) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateToast(newSW);
            }
          });
        });

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update();
        });
      })
      .catch((err) => console.warn("ServiceWorker registration failed: ", err));
  });
}
