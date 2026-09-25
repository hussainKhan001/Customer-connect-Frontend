import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice.js';
import authReducer from './slices/authSlice.js';

/* Global client state (auth session, UI theme) lives here — Redux
   Toolkit, the industry-standard choice over hand-rolled Context for
   state that's read/written from many unrelated places in the tree.
   Server data (customers, settings, master data) deliberately stays
   in AppContext for now: it's already reactive via Socket.IO push +
   React state, and migrating ~20 pages' useApp() consumption is a
   separate, larger piece of work than this store's initial scope. */
export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
  },
});
