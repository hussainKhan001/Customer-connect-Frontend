import { createContext, useContext, useEffect, useRef, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_COLOR = '#f97316';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDocument(t) {
  if (typeof document === 'undefined') return;
  const isDark = t === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export function ThemeProvider({ children }) {
  const applied = useRef(false);
  if (!applied.current && typeof document !== 'undefined') {
    applyThemeToDocument(getInitialTheme());
    applied.current = true;
  }

  const [theme, setTheme] = useState(getInitialTheme);

  /* Applying the <html class="dark"> swap here — in a useEffect that
     only fires after React commits and the browser paints — is what
     caused the flash: any component reading `theme` straight from
     this context (JS-driven colour logic) re-renders with the NEW
     value in the very same commit as the click, while every component
     that instead relies on Tailwind's `dark:` utility classes stays on
     the OLD styling until this effect finally runs and flips the
     class a tick later. Two update times for what should be one
     atomic switch. Fixed by applying the DOM class synchronously
     inside the click handler itself, before setState — see
     toggleTheme below — so both update paths land in the same paint. */
  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyThemeToDocument(next);
    setTheme(next);
  };

  const getThemeColor = () => THEME_COLOR;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, getThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
