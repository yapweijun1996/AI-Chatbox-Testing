/**
 * Central SVG icon library (Feather-style, 24x24 viewBox, stroke = currentColor).
 * Single source of truth — replaces all emoji icons across the app.
 *
 * Usage:
 *   svgIcon("edit")            -> default 16px inline SVG string
 *   svgIcon("regenerate", 14)  -> 14px
 *   svgIcon("lock", 13, "icon-lock") -> custom wrapper-less size + extra class
 */

const ICON_PATHS = {
  // Pencil — edit a message
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
  // Copy - copy a full message bubble
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
  // Refresh — regenerate an assistant reply
  regenerate: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
  // Alert triangle — warnings
  warning: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  // Zap — brand/welcome logo
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  // Key — configure API keys
  key: '<path d="m21 2-2 2m-3.5 3.5a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L19 4l3 3-3.5 3.5"></path>',
  // Message circle — start chatting
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
  // Lock — privacy / encryption
  lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
  // CPU — model name
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>',
  // Activity — connection latency
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
  // Clock — time to first token
  clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  // Fast-forward — generation speed
  speed: '<polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon>',
  // Git-commit — inter-token latency (gap between tokens)
  itl: '<circle cx="12" cy="12" r="4"></circle><line x1="1.05" y1="12" x2="7" y2="12"></line><line x1="17.01" y1="12" x2="22.96" y2="12"></line>',
  // Timer — end-to-end total duration
  timer: '<line x1="10" y1="2" x2="14" y2="2"></line><line x1="12" y1="14" x2="15" y2="11"></line><circle cx="12" cy="14" r="8"></circle>',
};

function svgIcon(name, size = 16, extraClass = "") {
  const path = ICON_PATHS[name];
  if (!path) return "";
  const cls = extraClass ? `icon-svg ${extraClass}` : "icon-svg";
  return `<svg class="${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

window.svgIcon = svgIcon;
window.ICON_PATHS = ICON_PATHS;
