import { env } from '../lib/env.ts';

/* Base URL for the backend API, configured via VITE_API_BASE_URL (see
   frontend/.env). Falls back to a relative path so the Vite dev proxy
   (vite.config.js) still works if the env var isn't set. */
export const API_BASE = env.VITE_API_BASE_URL || '';

const DEFAULT_TIMEOUT_MS = 30000;

export const apiUrl = (path) => `${API_BASE}${path}`;

/* Every authenticated request goes through this — always sends the
   httpOnly session cookie, even cross-origin (frontend :5173, backend
   on its own port), so the backend's requireAuth middleware sees it.

   Adds a request timeout (aborts after `timeoutMs`, default 30s) and
   accepts an optional external `signal` for caller-driven cancellation
   (e.g. TanStack Query unmounting a query) — both trigger the same
   AbortController so either one can cut the request short. Network/
   timeout failures are normalized to the same `{ message, status }`
   shape callers already get from a non-ok JSON response, so a caller
   doesn't need to distinguish "fetch threw" from "server said no". */
export const apiFetch = async (path, { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...opts } = {}) => {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort(signal.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onExternalAbort);
  }
  const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);

  try {
    return await fetch(apiUrl(path), { credentials: 'include', ...opts, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      const normalized = new Error(err.name === 'TimeoutError' ? 'Request timed out' : 'Request was cancelled');
      normalized.status = 0;
      normalized.cause = err;
      throw normalized;
    }
    const normalized = new Error('Network error — could not reach the API');
    normalized.status = 0;
    normalized.cause = err;
    throw normalized;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
};
