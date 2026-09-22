/* =====================================================================
   AUTH STATE — session backed by an httpOnly cookie the backend sets
   on login. Restores the session on load via GET /api/auth/me so a
   refresh doesn't bounce you back to the login screen.
   ===================================================================== */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  /* who's REALLY signed in, while `user` is someone else — set only
     while impersonating, straight off /me's own `realUser` field so a
     page refresh mid-impersonation still knows this without the
     frontend having to remember anything across the reload itself. */
  const [realUser, setRealUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => { setUser(body?.user ?? null); setRealUser(body?.realUser ?? null); })
      .catch(() => { setUser(null); setRealUser(null); })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Sign-in failed');
    setUser(body.user);
    setRealUser(null);
    return body.user;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setRealUser(null);
  }, []);

  /* Switches the session into another real account with no password —
     see the backend route's own comment (routes/users.js) for why that
     capability is deliberately its own, separate from user management
     in general. A full reload (not just setUser) afterward, same as
     reverting below — every page's already-fetched data and every
     component's already-resolved `can()` check was computed for the
     PREVIOUS account, and there is no reliable way to invalidate all
     of that piecemeal across the whole app from here. */
  const impersonate = useCallback(async (userId) => {
    const res = await apiFetch(`/api/users/${userId}/impersonate`, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Could not switch user');
    /* a full navigation, not just a reload of wherever the admin
       happened to be sitting — landing on Trigger Calendar or Master
       Data as someone who might not even hold that capability reads
       as broken, even though the page itself would correctly show the
       access-denied state a beat later. */
    window.location.href = '/command';
    return body.user;
  }, []);

  /* Ends impersonation and switches back to whoever it was started
     from — see backend routes/auth.js's revert-impersonation route,
     which is the actual source of truth for who that is (never trust
     a client-held `realUser` alone across a switch). */
  const revertImpersonation = useCallback(async () => {
    const res = await apiFetch('/api/auth/revert-impersonation', { method: 'POST' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Could not switch back');
    window.location.href = '/command';
    return body.user;
  }, []);

  /* Convenience/UX layer only — every mutating route re-checks
     requirePermission() itself server-side regardless of what this
     returns, so a stale/tampered client value here can hide a button
     it shouldn't but can never actually grant the action. `user` is
     null on the very first render (before /me resolves) and possibly
     stale mid-session (role changed elsewhere) — false-until-proven is
     the safe default in both cases, not "show it and let the 403
     surprise them". */
  const can = useCallback((capability) => !!user?.permissions?.[capability], [user]);

  return (
    <AuthContext.Provider value={{ user, realUser, authLoading, login, logout, impersonate, revertImpersonation, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
