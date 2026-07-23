import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type ThemePreference = Theme | 'system';

function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(themePreference: ThemePreference, systemTheme: Theme): Theme {
  return themePreference === 'system' ? systemTheme : themePreference;
}

function getInitialThemePreference(): ThemePreference {
  const storedTheme = localStorage.getItem('ml-path-theme');

  if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
    return storedTheme;
  }

  return 'system';
}

export function useTheme() {
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(getInitialThemePreference);
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const theme = resolveTheme(themePreference, systemTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ml-path-theme', themePreference);
  }, [theme, themePreference]);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');

    if (!query) {
      return undefined;
    }

    function handleChange() {
      setSystemTheme(query.matches ? 'dark' : 'light');
    }

    query.addEventListener('change', handleChange);

    return () => query.removeEventListener('change', handleChange);
  }, []);

  return {
    theme,
    themePreference,
    setThemePreference,
    toggleTheme: () =>
      setThemePreference((currentThemePreference) =>
        resolveTheme(currentThemePreference, getSystemTheme()) === 'dark' ? 'light' : 'dark',
      ),
  };
}
