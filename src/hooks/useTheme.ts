import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark luxury theme
  });

  useEffect(() => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
      metaThemeColor?.setAttribute('content', '#0B0F17');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
      metaThemeColor?.setAttribute('content', '#F1F5F9');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return { isDark, toggleTheme };
}
