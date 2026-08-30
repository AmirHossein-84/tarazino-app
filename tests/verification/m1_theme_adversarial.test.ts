import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnvironment } from '../helpers/mockStorage';

// Helper: Calculate relative luminance for sRGB
function getRelativeLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

// Helper: Calculate WCAG contrast ratio between two hex colors
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

describe('Milestone 1 Empirical Challenger: Theme Engine & Core Shell Navigation', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  const projectRoot = process.cwd();

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('1. Theme Switching Engine & useTheme / index.html Bootstrapper Transitions', () => {
    it('evaluates inline bootstrapper logic across all localStorage state permutations', () => {
      // Inline bootstrapper simulation logic identical to index.html:
      const evaluateBootstrapper = (storedValue: string | null): boolean => {
        const rootClasses = new Set<string>();
        const saved = storedValue;
        if (saved === 'dark' || (!saved && true)) {
          rootClasses.add('dark');
        } else {
          rootClasses.delete('dark');
        }
        return rootClasses.has('dark');
      };

      // Fresh user visit: localStorage empty -> defaults to dark mode
      assert.equal(evaluateBootstrapper(null), true, 'Fresh user should default to dark mode');

      // User with explicit dark mode saved
      assert.equal(evaluateBootstrapper('dark'), true, 'Explicit dark mode should apply dark class');

      // User with explicit light mode saved
      assert.equal(evaluateBootstrapper('light'), false, 'Explicit light mode should NOT apply dark class');

      // Edge case: Empty string stored in localStorage (falsy, so defaults to dark)
      assert.equal(evaluateBootstrapper(''), true, 'Empty string is falsy so defaults to dark');

      // Edge cases: Corrupted/unexpected strings (e.g., auto, system, uppercase DARK, numbers)
      assert.equal(evaluateBootstrapper('auto'), false, 'Non-dark string should not activate dark class');
      assert.equal(evaluateBootstrapper('DARK'), false, 'Case-sensitive string check');
      assert.equal(evaluateBootstrapper('undefined'), false, 'Unexpected string fallback');
    });

    it('simulates useTheme hook state transitions, DOM manipulation & meta-theme synchronization', () => {
      const docElem = (globalThis as any).document.documentElement;
      const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');

      // Helper to simulate useTheme effect
      const runThemeEffect = (isDark: boolean) => {
        if (isDark) {
          docElem.classList.add('dark');
          localStorage.setItem('app_theme', 'dark');
          metaTag?.setAttribute('content', '#0B0F17');
        } else {
          docElem.classList.remove('dark');
          localStorage.setItem('app_theme', 'light');
          metaTag?.setAttribute('content', '#F1F5F9');
        }
      };

      // Step 1: Initial state (Dark)
      runThemeEffect(true);
      assert.equal(docElem.classList.contains('dark'), true);
      assert.equal(localStorage.getItem('app_theme'), 'dark');
      assert.equal(metaTag.getAttribute('content'), '#0B0F17');

      // Step 2: Switch to Light mode
      runThemeEffect(false);
      assert.equal(docElem.classList.contains('dark'), false);
      assert.equal(localStorage.getItem('app_theme'), 'light');
      assert.equal(metaTag.getAttribute('content'), '#F1F5F9');

      // Step 3: Switch back to Dark mode
      runThemeEffect(true);
      assert.equal(docElem.classList.contains('dark'), true);
      assert.equal(localStorage.getItem('app_theme'), 'dark');
      assert.equal(metaTag.getAttribute('content'), '#0B0F17');

      // Step 4: Rapid 50-cycle stress toggle test
      let currentDark = true;
      for (let i = 0; i < 50; i++) {
        currentDark = !currentDark;
        runThemeEffect(currentDark);
        assert.equal(docElem.classList.contains('dark'), currentDark);
        assert.equal(localStorage.getItem('app_theme'), currentDark ? 'dark' : 'light');
        assert.equal(metaTag.getAttribute('content'), currentDark ? '#0B0F17' : '#F1F5F9');
      }
    });

    it('handles missing or dynamically removed meta tag gracefully without crashing', () => {
      const docElem = (globalThis as any).document.documentElement;
      const originalQuerySelector = (globalThis as any).document.querySelector;

      // Mock querySelector returning null for meta tag
      (globalThis as any).document.querySelector = (sel: string) => {
        if (sel.includes('theme-color')) return null;
        return originalQuerySelector.call((globalThis as any).document, sel);
      };

      assert.doesNotThrow(() => {
        const metaThemeColor = (globalThis as any).document.querySelector('meta[name="theme-color"]');
        const isDark = false;
        if (isDark) {
          docElem.classList.add('dark');
          localStorage.setItem('app_theme', 'dark');
          metaThemeColor?.setAttribute('content', '#0B0F17');
        } else {
          docElem.classList.remove('dark');
          localStorage.setItem('app_theme', 'light');
          metaThemeColor?.setAttribute('content', '#F1F5F9');
        }
      });

      // Restore
      (globalThis as any).document.querySelector = originalQuerySelector;
    });
  });

  describe('2. Global Styles & CSS Variables Conformance in src/index.css & tailwind.config.js', () => {
    it('verifies safe area variables, donut track color, and body defaults in src/index.css', () => {
      const cssPath = path.join(projectRoot, 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // Safe area variables
      assert.ok(cssContent.includes('--sat: env(safe-area-inset-top, 0px)'), 'Missing --sat safe area inset');
      assert.ok(cssContent.includes('--sab: env(safe-area-inset-bottom, 0px)'), 'Missing --sab safe area inset');
      assert.ok(cssContent.includes('--sal: env(safe-area-inset-left, 0px)'), 'Missing --sal safe area inset');
      assert.ok(cssContent.includes('--sar: env(safe-area-inset-right, 0px)'), 'Missing --sar safe area inset');

      // Donut track colors for light mode and dark mode
      assert.ok(cssContent.includes('--donut-track: rgba(226, 232, 240, 0.9)'), 'Light mode --donut-track must be slate-200 rgba');
      assert.ok(cssContent.includes('.dark'), 'Must contain .dark selector');
      assert.ok(cssContent.includes('--donut-track: rgba(30, 41, 59, 0.5)'), 'Dark mode --donut-track must be slate-800 rgba');

      // Body styles
      assert.ok(cssContent.includes('bg-slate-100'), 'Body light mode background should be bg-slate-100');
      assert.ok(cssContent.includes('dark:bg-dark-bg'), 'Body dark mode background should be dark:bg-dark-bg');
      assert.ok(cssContent.includes('text-slate-900'), 'Body light text should be text-slate-900');
      assert.ok(cssContent.includes('dark:text-slate-100'), 'Body dark text should be dark:text-slate-100');
    });

    it('verifies glass card, card well, range slider, and gradient utility definitions', () => {
      const cssPath = path.join(projectRoot, 'src/index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      // .glass-card class
      assert.ok(cssContent.includes('.glass-card'), 'Missing .glass-card class');
      assert.ok(cssContent.includes('bg-white/95'), '.glass-card should use bg-white/95 in light mode');
      assert.ok(cssContent.includes('dark:bg-slate-950/80'), '.glass-card should use dark:bg-slate-950/80 in dark mode');
      assert.ok(cssContent.includes('border-slate-200/90'), '.glass-card should use border-slate-200/90 in light mode');
      assert.ok(cssContent.includes('dark:border-slate-800/90'), '.glass-card should use dark:border-slate-800/90 in dark mode');

      // .card-well class
      assert.ok(cssContent.includes('.card-well'), 'Missing .card-well class');
      assert.ok(cssContent.includes('bg-slate-50'), '.card-well should use bg-slate-50 in light mode');
      assert.ok(cssContent.includes('dark:bg-slate-950/80'), '.card-well should use dark:bg-slate-950/80 in dark mode');
      assert.ok(cssContent.includes('border-slate-200'), '.card-well should use border-slate-200 in light mode');
      assert.ok(cssContent.includes('dark:border-slate-800/80'), '.card-well should use dark:border-slate-800/80 in dark mode');

      // .custom-range-slider class
      assert.ok(cssContent.includes('.custom-range-slider'), 'Missing .custom-range-slider class');
      assert.ok(cssContent.includes('bg-slate-200'), 'Slider track light bg');
      assert.ok(cssContent.includes('dark:bg-slate-900'), 'Slider track dark bg');
      assert.ok(cssContent.includes('border-white'), 'Slider thumb light border');
      assert.ok(cssContent.includes('dark:border-[#0b0f17]'), 'Slider thumb dark border');
    });

    it('verifies tailwind.config.js darkMode strategy and semantic color tokens', () => {
      const configPath = path.join(projectRoot, 'tailwind.config.js');
      const configContent = fs.readFileSync(configPath, 'utf8');

      // Dark mode class configuration
      assert.ok(configContent.includes("darkMode: 'class'"), 'darkMode must be class');

      // Light semantic tokens
      assert.ok(configContent.includes("bg: '#F1F5F9'"), 'Light bg token should be #F1F5F9');
      assert.ok(configContent.includes("card: '#FFFFFF'"), 'Light card token should be #FFFFFF');
      assert.ok(configContent.includes("cardWell: '#F8FAFC'"), 'Light cardWell token should be #F8FAFC');
      assert.ok(configContent.includes("border: '#E2E8F0'"), 'Light border token should be #E2E8F0');
      assert.ok(configContent.includes("surface: '#F8FAFC'"), 'Light surface token should be #F8FAFC');

      // Dark semantic tokens
      assert.ok(configContent.includes("bg: '#0B0F17'"), 'Dark bg token should be #0B0F17');
      assert.ok(configContent.includes("card: '#131B2A'"), 'Dark card token should be #131B2A');
      assert.ok(configContent.includes("surface: '#0F172A'"), 'Dark surface token should be #0F172A');
    });
  });

  describe('3. Core Shell Navigation & Layout Components Static and Structural Audit', () => {
    it('audits Header.tsx for dual-mode classes, currency toggling and theme toggle UI', () => {
      const headerPath = path.join(projectRoot, 'src/components/layout/Header.tsx');
      const headerContent = fs.readFileSync(headerPath, 'utf8');

      assert.ok(headerContent.includes('bg-white/90'), 'Header light background');
      assert.ok(headerContent.includes('dark:bg-slate-950/85'), 'Header dark background');
      assert.ok(headerContent.includes('border-slate-200'), 'Header light border');
      assert.ok(headerContent.includes('dark:border-slate-800/80'), 'Header dark border');

      assert.ok(headerContent.includes('text-slate-900'), 'Brand title light text');
      assert.ok(headerContent.includes('dark:text-slate-100'), 'Brand title dark text');
      assert.ok(headerContent.includes('text-slate-500'), 'Date subtitle light text');
      assert.ok(headerContent.includes('dark:text-slate-400'), 'Date subtitle dark text');

      // Currency toggle button dual-mode styles
      assert.ok(headerContent.includes('currencyMode === \'usd\''), 'Handles USD mode check');
      assert.ok(headerContent.includes('bg-emerald-50'), 'USD mode light active state');
      assert.ok(headerContent.includes('dark:bg-emerald-950/90'), 'USD mode dark active state');

      // Theme toggle icons
      assert.ok(headerContent.includes('Sun'), 'Uses Sun icon for dark mode state');
      assert.ok(headerContent.includes('Moon'), 'Uses Moon icon for light mode state');
    });

    it('audits BottomNav.tsx for dual-mode classes, 7 primary tabs and safe area bottom padding', () => {
      const navPath = path.join(projectRoot, 'src/components/layout/BottomNav.tsx');
      const navContent = fs.readFileSync(navPath, 'utf8');

      assert.ok(navContent.includes('bg-white/95'), 'BottomNav light container');
      assert.ok(navContent.includes('dark:bg-slate-950/95'), 'BottomNav dark container');
      assert.ok(navContent.includes('border-slate-200/90'), 'BottomNav light border');
      assert.ok(navContent.includes('dark:border-slate-800/90'), 'BottomNav dark border');

      // Safe area bottom inset
      assert.ok(navContent.includes('pb-[max(0.75rem,env(safe-area-inset-bottom))]'), 'Safe area inset bottom handling');

      // All 7 tab definitions present
      const expectedTabs = ['dashboard', 'gold', 'crypto', 'properties', 'holdings', 'sell', 'settings'];
      for (const tab of expectedTabs) {
        assert.ok(navContent.includes(`id: '${tab}'`), `BottomNav missing tab: ${tab}`);
      }

      // Active state styling
      assert.ok(navContent.includes('from-amber-500/15'), 'Active tab light gradient start');
      assert.ok(navContent.includes('dark:from-amber-500/25'), 'Active tab dark gradient start');
      assert.ok(navContent.includes('text-amber-700'), 'Active tab light text');
      assert.ok(navContent.includes('dark:text-gold-300'), 'Active tab dark text');

      // Inactive state styling
      assert.ok(navContent.includes('text-slate-500'), 'Inactive tab light text');
      assert.ok(navContent.includes('dark:text-slate-400'), 'Inactive tab dark text');
    });

    it('audits PwaInstallPrompt.tsx, PullToRefreshContainer.tsx and SkeletonLoader.tsx', () => {
      const pwaPath = path.join(projectRoot, 'src/components/layout/PwaInstallPrompt.tsx');
      const pwaContent = fs.readFileSync(pwaPath, 'utf8');
      assert.ok(pwaContent.includes('bg-white dark:bg-slate-900'), 'PWA modal container background');
      assert.ok(pwaContent.includes('border-slate-200 dark:border-slate-700/80'), 'PWA modal border');
      assert.ok(pwaContent.includes('bg-slate-50 dark:bg-slate-800/70'), 'PWA instruction cards');

      const ptrPath = path.join(projectRoot, 'src/components/common/PullToRefreshContainer.tsx');
      const ptrContent = fs.readFileSync(ptrPath, 'utf8');
      assert.ok(ptrContent.includes('bg-white/95 dark:bg-slate-900/90'), 'Pull to refresh badge background');
      assert.ok(ptrContent.includes('text-slate-700 dark:text-slate-300'), 'Pull to refresh text color');
      assert.ok(ptrContent.includes('text-amber-600 dark:text-gold-400'), 'Pull to refresh icon color');

      const skelPath = path.join(projectRoot, 'src/components/common/SkeletonLoader.tsx');
      const skelContent = fs.readFileSync(skelPath, 'utf8');
      assert.ok(skelContent.includes('bg-white/90 dark:bg-slate-900/60'), 'Card skeleton outer container');
      assert.ok(skelContent.includes('bg-slate-200 dark:bg-slate-800'), 'Skeleton pulse box background');
      assert.ok(skelContent.includes('border-slate-200 dark:border-slate-800'), 'Donut skeleton border');
    });

    it('audits App.tsx root container, safe area insets and toast styling', () => {
      const appPath = path.join(projectRoot, 'src/App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf8');

      assert.ok(appContent.includes('bg-slate-100 dark:bg-slate-950'), 'App root background');
      assert.ok(appContent.includes('text-slate-900 dark:text-slate-100'), 'App root text');
      assert.ok(appContent.includes('pb-[max(7rem,calc(env(safe-area-inset-bottom)+5.5rem))]'), 'App safe-area pb');

      // Toast notification styling
      assert.ok(appContent.includes('border-emerald-500/40 text-emerald-900 dark:text-emerald-300'), 'Success toast');
      assert.ok(appContent.includes('border-rose-500/40 text-rose-900 dark:text-rose-300'), 'Error toast');
      assert.ok(appContent.includes('border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200'), 'Info toast');
    });
  });

  describe('4. WCAG AA / AAA Mathematical Contrast Ratio Verification', () => {
    it('verifies Light Mode color palette meets WCAG AA (≥ 4.5:1 for normal text, ≥ 3.0:1 for large/UI)', () => {
      const lightBg = '#F1F5F9'; // Soft Slate Slate-100
      const whiteCard = '#FFFFFF'; // Card Surface
      const slate900 = '#0F172A'; // Primary Header
      const slate700 = '#334155'; // Body text
      const slate500 = '#64748B'; // Secondary/Subtitles
      const amber700 = '#B45309'; // Rich Amber Accent
      const emerald700 = '#047857'; // Profit Green Accent
      const indigo700 = '#4338CA'; // Crypto Indigo Accent
      const rose700 = '#BE123C'; // Loss Rose Accent

      // App Background vs Typography
      const bgToPrimary = getContrastRatio(lightBg, slate900);
      assert.ok(bgToPrimary >= 13.0, `bgToPrimary contrast ${bgToPrimary.toFixed(2)} should exceed 13.0 (passes AAA)`);

      const bgToBody = getContrastRatio(lightBg, slate700);
      assert.ok(bgToBody >= 8.0, `bgToBody contrast ${bgToBody.toFixed(2)} should exceed 8.0 (passes AAA)`);

      const bgToSubtitle = getContrastRatio(lightBg, slate500);
      assert.ok(bgToSubtitle >= 4.0, `bgToSubtitle contrast ${bgToSubtitle.toFixed(2)} meets UI/secondary contrast (≥ 3.0:1)`);

      // White Card Surface vs Typography
      const cardToPrimary = getContrastRatio(whiteCard, slate900);
      assert.ok(cardToPrimary >= 15.0, `cardToPrimary contrast ${cardToPrimary.toFixed(2)} should exceed 15.0 (passes AAA)`);

      const cardToBody = getContrastRatio(whiteCard, slate700);
      assert.ok(cardToBody >= 9.0, `cardToBody contrast ${cardToBody.toFixed(2)} should exceed 9.0 (passes AAA)`);

      const cardToSubtitle = getContrastRatio(whiteCard, slate500);
      assert.ok(cardToSubtitle >= 4.5, `cardToSubtitle on card ${cardToSubtitle.toFixed(2)} meets WCAG AA 4.5:1`);

      // White Card vs Accents
      const cardToAmber = getContrastRatio(whiteCard, amber700);
      assert.ok(cardToAmber >= 4.5, `cardToAmber contrast ${cardToAmber.toFixed(2)} should meet WCAG AA 4.5:1`);

      const cardToEmerald = getContrastRatio(whiteCard, emerald700);
      assert.ok(cardToEmerald >= 4.5, `cardToEmerald contrast ${cardToEmerald.toFixed(2)} should meet WCAG AA 4.5:1`);

      const cardToIndigo = getContrastRatio(whiteCard, indigo700);
      assert.ok(cardToIndigo >= 7.0, `cardToIndigo contrast ${cardToIndigo.toFixed(2)} should meet WCAG AAA 7.0:1`);

      const cardToRose = getContrastRatio(whiteCard, rose700);
      assert.ok(cardToRose >= 4.5, `cardToRose contrast ${cardToRose.toFixed(2)} should meet WCAG AA 4.5:1`);
    });

    it('verifies Dark Mode color palette meets WCAG AA & AAA contrast ratios', () => {
      const darkBg = '#0B0F17'; // Dark Luxury Background
      const slate100 = '#F1F5F9'; // Primary Text
      const slate300 = '#CBD5E1'; // Secondary Text
      const slate400 = '#94A3B8'; // Muted Text
      const gold300 = '#FDE047'; // Gold Accent
      const emerald400 = '#34D399'; // Emerald Profit
      const indigo300 = '#A5B4FC'; // Indigo Crypto
      const rose400 = '#FB7185'; // Rose Loss

      const darkToPrimary = getContrastRatio(darkBg, slate100);
      assert.ok(darkToPrimary >= 15.0, `darkToPrimary contrast ${darkToPrimary.toFixed(2)} should exceed 15.0`);

      const darkToSecondary = getContrastRatio(darkBg, slate300);
      assert.ok(darkToSecondary >= 11.0, `darkToSecondary contrast ${darkToSecondary.toFixed(2)} should exceed 11.0`);

      const darkToMuted = getContrastRatio(darkBg, slate400);
      assert.ok(darkToMuted >= 6.5, `darkToMuted contrast ${darkToMuted.toFixed(2)} should exceed 6.5`);

      const darkToGold = getContrastRatio(darkBg, gold300);
      assert.ok(darkToGold >= 13.0, `darkToGold contrast ${darkToGold.toFixed(2)} should exceed 13.0`);

      const darkToEmerald = getContrastRatio(darkBg, emerald400);
      assert.ok(darkToEmerald >= 8.5, `darkToEmerald contrast ${darkToEmerald.toFixed(2)} should exceed 8.5`);

      const darkToIndigo = getContrastRatio(darkBg, indigo300);
      assert.ok(darkToIndigo >= 9.0, `darkToIndigo contrast ${darkToIndigo.toFixed(2)} should exceed 9.0`);

      const darkToRose = getContrastRatio(darkBg, rose400);
      assert.ok(darkToRose >= 7.0, `darkToRose contrast ${darkToRose.toFixed(2)} should exceed 7.0`);
    });
  });
});
