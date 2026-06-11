/**
 * Light/dark theme handling. Persists the choice in localStorage.
 */

function initTheme() {
  document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "light");
}

function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}
