import { createSlice } from '@reduxjs/toolkit';

const THEME_COLOR = '#f97316';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/* Applying <html class="dark"> is a DOM side effect, deliberately kept
   OUT of this reducer (reducers must stay pure) — see useTheme() in
   context/ThemeContext.jsx, which calls this synchronously in the same
   click handler that dispatches the toggle, before the store update,
   to avoid the two-paints flash documented there. */
export function applyThemeToDocument(t) {
  if (typeof document === 'undefined') return;
  const isDark = t === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/* applied once, at module load — before the store's first subscriber
   ever renders — so the very first paint already has the right class,
   the same "no flash" guarantee the old Context version's mount-time
   ref check gave. */
const initialTheme = getInitialTheme();
applyThemeToDocument(initialTheme);

const themeSlice = createSlice({
  name: 'theme',
  initialState: { value: initialTheme, color: THEME_COLOR },
  reducers: {
    setTheme: (state, action) => { state.value = action.payload; },
    toggleTheme: (state) => { state.value = state.value === 'dark' ? 'light' : 'dark'; },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
