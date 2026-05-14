/**
 * BarTalk v8.2.4 — ThemeContext
 * Tema dark/light con persistenza localStorage.
 * Applica data-theme="dark"|"light" su <html> per CSS variable override.
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'bartalk-theme';

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* noop */ }
  // Default: dark (design originale BarTalk)
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Applica data-theme su <html> per CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* noop */ }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext deve essere usato dentro ThemeProvider');
  return ctx;
}
