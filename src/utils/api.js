/* Base URL for the backend API, configured via VITE_API_URL (see
   frontend/.env). Falls back to a relative path so the Vite dev proxy
   (vite.config.js) still works if the env var isn't set. */
export const API_BASE = import.meta.env.VITE_API_URL || '';

export const apiUrl = (path) => `${API_BASE}${path}`;

/* Every authenticated request goes through this — always sends the
   httpOnly session cookie, even cross-origin (frontend :5173, backend
   on its own port), so the backend's requireAuth middleware sees it. */
export const apiFetch = (path, opts = {}) =>
  fetch(apiUrl(path), { credentials: 'include', ...opts });
