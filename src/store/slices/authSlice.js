import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../utils/api.js';

/* Session restore on load — GET /api/auth/me so a refresh doesn't
   bounce back to the login screen. Same shape as the old Context
   version's mount effect, just as a thunk so it's dispatchable once
   from the store's own bootstrap instead of a component effect. */
export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  const r = await apiFetch('/api/auth/me');
  const body = r.ok ? await r.json() : null;
  return { user: body?.user ?? null, realUser: body?.realUser ?? null };
});

export const login = createAsyncThunk('auth/login', async ({ email, password }) => {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  /* a response with no/malformed JSON body (a Render free-tier cold
     start returning an incomplete response while the instance spins
     back up, a proxy timeout, ...) must not surface as res.json()'s
     own raw "Unexpected end of JSON input" — confusing for someone
     just trying to sign in. */
  const body = await res.json().catch(() => null);
  if (!body) throw new Error('Could not reach the server — it may be waking up after being idle. Please try again in a few seconds.');
  if (!res.ok) throw new Error(body.error || 'Sign-in failed');
  return body.user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
});

/* Switches the session into another real account with no password —
   see the backend route's own comment (routes/users.js) for why that
   capability is deliberately its own, separate from user management in
   general. A full navigation afterward (not a Redux state update) —
   every page's already-fetched data and every already-resolved can()
   check was computed for the PREVIOUS account, and there's no reliable
   way to invalidate all of that piecemeal from here. */
export const impersonate = createAsyncThunk('auth/impersonate', async (userId) => {
  const res = await apiFetch(`/api/users/${userId}/impersonate`, { method: 'POST' });
  const body = await res.json().catch(() => null);
  if (!body) throw new Error('Could not reach the server. Please try again.');
  if (!res.ok) throw new Error(body.error || 'Could not switch user');
  window.location.href = '/command';
  return body.user;
});

/* Ends impersonation and switches back to whoever it was started from
   — see backend routes/auth.js's revert-impersonation route, the
   actual source of truth for who that is (never trust a client-held
   realUser alone across a switch). */
export const revertImpersonation = createAsyncThunk('auth/revertImpersonation', async () => {
  const res = await apiFetch('/api/auth/revert-impersonation', { method: 'POST' });
  const body = await res.json().catch(() => null);
  if (!body) throw new Error('Could not reach the server. Please try again.');
  if (!res.ok) throw new Error(body.error || 'Could not switch back');
  window.location.href = '/command';
  return body.user;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, realUser: null, authLoading: true },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.realUser = action.payload.realUser;
        state.authLoading = false;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.realUser = null;
        state.authLoading = false;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.realUser = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.realUser = null;
      });
  },
});

export default authSlice.reducer;
