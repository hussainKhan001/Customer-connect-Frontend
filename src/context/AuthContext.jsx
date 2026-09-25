/* =====================================================================
   AUTH STATE — thin compatibility layer over the Redux auth slice
   (store/slices/authSlice.js). Session is backed by an httpOnly cookie
   the backend sets on login; GET /api/auth/me restores it on load so a
   refresh doesn't bounce back to the login screen. Every existing
   consumer still just calls useAuth() and gets the same shape back
   ({ user, realUser, authLoading, login, logout, impersonate,
   revertImpersonation, can }); only the storage underneath moved from
   Context+useState to the Redux store.
   ===================================================================== */
import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchMe, login as loginThunk, logout as logoutThunk,
  impersonate as impersonateThunk, revertImpersonation as revertImpersonationThunk,
} from '../store/slices/authSlice.js';

export function AuthProvider({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return children;
}

export function useAuth() {
  const user = useSelector((s) => s.auth.user);
  const realUser = useSelector((s) => s.auth.realUser);
  const authLoading = useSelector((s) => s.auth.authLoading);
  const dispatch = useDispatch();

  const login = useCallback(
    (email, password) => dispatch(loginThunk({ email, password })).unwrap(),
    [dispatch]
  );

  const logout = useCallback(() => dispatch(logoutThunk()).unwrap(), [dispatch]);

  const impersonate = useCallback((userId) => dispatch(impersonateThunk(userId)).unwrap(), [dispatch]);

  const revertImpersonation = useCallback(
    () => dispatch(revertImpersonationThunk()).unwrap(),
    [dispatch]
  );

  /* Convenience/UX layer only — every mutating route re-checks
     requirePermission() itself server-side regardless of what this
     returns, so a stale/tampered client value here can hide a button
     it shouldn't but can never actually grant the action. `user` is
     null on the very first render (before /me resolves) and possibly
     stale mid-session (role changed elsewhere) — false-until-proven is
     the safe default in both cases, not "show it and let the 403
     surprise them". */
  const can = useCallback((capability) => !!user?.permissions?.[capability], [user]);

  return { user, realUser, authLoading, login, logout, impersonate, revertImpersonation, can };
}
