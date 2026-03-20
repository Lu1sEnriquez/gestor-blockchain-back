'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ui-theme';
type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Inicializar tema desde localStorage o preferencia del sistema
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const resolvedTheme: Theme = stored === 'dark' || stored === 'light' ? stored : getSystemTheme();
    applyTheme(resolvedTheme);
    setMounted(true);
  }, []);

  // Evitar flash de tema incorrecto (return null mientras se monta)
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

// Hook para usar tema en cualquier componente
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const resolvedTheme: Theme = stored === 'dark' || stored === 'light' ? stored : getSystemTheme();
    setTheme(resolvedTheme);
    setIsDark(resolvedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setIsDark(nextTheme === 'dark');
    applyTheme(nextTheme);
  };

  return {
    theme,
    isDark,
    toggleTheme,
    mounted,
  };
}
