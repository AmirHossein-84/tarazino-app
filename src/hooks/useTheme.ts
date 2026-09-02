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
      metaThemeColor?.setAttribute('content', '#0B0F17');
    } else {
      root.classList.remove('dark');
      metaThemeColor?.setAttribute('content', '#F1F5F9');
    }
  }, [isDark]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    // Temporarily suppress transitions across the entire DOM
    root.classList.add('disable-transitions');
    
    const nextDark = !isDark;
    if (nextDark) {
      root.classList.add('dark');
      metaThemeColor?.setAttribute('content', '#0B0F17');
      localStorage.setItem('app_theme', 'dark');
    } else {
      root.classList.remove('dark');
      metaThemeColor?.setAttribute('content', '#F1F5F9');
      localStorage.setItem('app_theme', 'light');
    }
    
    setIsDark(nextDark);

    // Re-enable transitions on next animation frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('disable-transitions');
      });
    });
  };

  return { isDark, toggleTheme };
}
