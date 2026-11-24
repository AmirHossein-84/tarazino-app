import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';

type ToggleThemeOrigin =
  | { clientX?: number; clientY?: number }
  | undefined;

function getInitialIsDark(): boolean {
  try {
    const saved = localStorage.getItem('app_theme');
    if (saved) return saved === 'dark';
  } catch {
    // Ignore storage errors
  }
  return true; // Default to dark theme
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch {
    return false;
  }
}

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(getInitialIsDark);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyDomTheme = useCallback((nextDark: boolean) => {
    const root = document.documentElement;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (nextDark) {
      root.classList.add('dark');
      metaThemeColor?.setAttribute('content', '#0B0F17');
      try {
        localStorage.setItem('app_theme', 'dark');
      } catch {
        // Ignore storage errors
      }
    } else {
      root.classList.remove('dark');
      metaThemeColor?.setAttribute('content', '#F1F5F9');
      try {
        localStorage.setItem('app_theme', 'light');
      } catch {
        // Ignore storage errors
      }
    }

    root.style.colorScheme = nextDark ? 'dark' : 'light';

    // Sync Capacitor StatusBar style dynamically if present in native shell
    try {
      const statusBar = (
        window as unknown as {
          Capacitor?: {
            Plugins?: { StatusBar?: { setStyle?: (opts: { style: string }) => void } };
          };
        }
      )?.Capacitor?.Plugins?.StatusBar;
      statusBar?.setStyle?.({ style: nextDark ? 'DARK' : 'LIGHT' });
    } catch {
      // Optional native plugin
    }
  }, []);

  useEffect(() => {
    applyDomTheme(isDark);
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [applyDomTheme, isDark]);

  const toggleTheme = useCallback(
    (origin?: ToggleThemeOrigin) => {
      const root = document.documentElement;
      const nextDark = !isDark;
      const reduced = prefersReducedMotion();

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
        transitionTimerRef.current = null;
      }

      const docWithViewTransition = document as Document & {
        startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
      };

      if (typeof docWithViewTransition.startViewTransition === 'function' && !reduced) {
        const x =
          typeof origin?.clientX === 'number' && origin.clientX > 0
            ? `${Math.round(origin.clientX)}px`
            : '50%';
        const y =
          typeof origin?.clientY === 'number' && origin.clientY > 0
            ? `${Math.round(origin.clientY)}px`
            : '32px';

        root.style.setProperty('--theme-origin-x', x);
        root.style.setProperty('--theme-origin-y', y);

        docWithViewTransition.startViewTransition(() => {
          flushSync(() => {
            setIsDark(nextDark);
          });
          applyDomTheme(nextDark);
        });
        return;
      }

      // Scoped fallback transition on color/background/border tokens only, then remove class
      if (!reduced) {
        root.classList.add('theme-transitioning');
      }
      applyDomTheme(nextDark);
      setIsDark(nextDark);

      if (!reduced) {
        transitionTimerRef.current = setTimeout(() => {
          root.classList.remove('theme-transitioning');
          transitionTimerRef.current = null;
        }, 270);
      }
    },
    [applyDomTheme, isDark]
  );

  return { isDark, toggleTheme };
}
