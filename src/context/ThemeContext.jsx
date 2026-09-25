/* =====================================================================
   THEME — thin compatibility layer over the Redux theme slice
   (store/slices/themeSlice.js). Every existing consumer still just
   calls useTheme() and gets back the same { theme, toggleTheme,
   getThemeColor } shape as before; only the storage underneath moved
   from Context+useState to the Redux store. Kept as its own module
   (not inlined into components) so nothing else in the app had to
   change import paths during the migration.
   ===================================================================== */
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleTheme as toggleThemeAction, applyThemeToDocument } from '../store/slices/themeSlice.js';

export function ThemeProvider({ children }) {
  const theme = useSelector((s) => s.theme.value);

  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return children;
}

export function useTheme() {
  const theme = useSelector((s) => s.theme.value);
  const color = useSelector((s) => s.theme.color);
  const dispatch = useDispatch();

  /* Applying the <html class="dark"> swap synchronously here, before
     dispatch, is what avoids the flash: any component reading `theme`
     straight from the store re-renders with the new value in the same
     commit as the click, while `dark:` Tailwind classes would otherwise
     lag a tick behind if this only happened in a useEffect reacting to
     the state change. Two update times for what should be one atomic
     switch — same reasoning as the pre-Redux version of this file. */
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyThemeToDocument(next);
    dispatch(toggleThemeAction());
  };

  const getThemeColor = () => color;

  return { theme, toggleTheme, getThemeColor };
}
