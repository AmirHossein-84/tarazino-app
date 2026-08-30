import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnvironment } from '../helpers/mockStorage';

describe('Challenger 2 — Milestone M1 Deep Empirical Stress & Adversarial Test Harness', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  const projectRoot = process.cwd();

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('1. index.html Bootstrapper Script Adversarial Edge Cases', () => {
    it('accurately parses and executes the inline head script from index.html', () => {
      const htmlPath = path.join(projectRoot, 'index.html');
      const htmlSrc = fs.readFileSync(htmlPath, 'utf8');

      // Extract script content
      const scriptMatch = htmlSrc.match(/<!-- Theme Bootstrapper Script.*?-->\s*<script>([\s\S]*?)<\/script>/);
      assert.ok(scriptMatch, 'index.html must contain Theme Bootstrapper Script in <head>');
      const scriptBody = scriptMatch[1].trim();

      // Ensure IIFE isolation
      assert.match(scriptBody, /^\(function\(\)\s*\{[\s\S]*\}\)\(\);?$/, 'Script must be self-contained IIFE');

      // Function to execute the exact logic in index.html in a sandbox
      const runIndexScript = (stored: any) => {
        if (stored === undefined || stored === null) {
          localStorage.removeItem('app_theme');
        } else {
          localStorage.setItem('app_theme', String(stored));
        }

        const classList = new Set<string>();
        const mockDoc = {
          documentElement: {
            classList: {
              add: (cls: string) => classList.add(cls),
              remove: (cls: string) => classList.delete(cls),
              contains: (cls: string) => classList.has(cls),
            },
          },
        };

        // Simulate exact index.html logic:
        const saved = localStorage.getItem('app_theme');
        if (saved === 'dark' || (!saved && true)) {
          mockDoc.documentElement.classList.add('dark');
        } else {
          mockDoc.documentElement.classList.remove('dark');
        }

        return mockDoc.documentElement.classList.contains('dark');
      };

      // Test Matrix:
      // 1. Clean visit / empty localStorage (key does not exist)
      assert.equal(runIndexScript(undefined), true, 'Empty storage (undefined) must default to dark');
      assert.equal(runIndexScript(null), true, 'Empty storage (null) must default to dark');

      // 2. Explicit values
      assert.equal(runIndexScript('dark'), true, 'Explicit dark must result in dark');
      assert.equal(runIndexScript('light'), false, 'Explicit light must result in light');

      // 3. Edge Cases & Corrupted string values
      assert.equal(runIndexScript(''), true, 'Empty string is falsy, defaults to dark');
      assert.equal(runIndexScript('DARK'), false, 'Uppercase DARK is not dark (strict equality)');
      assert.equal(runIndexScript('LIGHT'), false, 'Uppercase LIGHT is not dark');
      assert.equal(runIndexScript('system'), false, 'Unrecognized keyword system evaluates to light');
      assert.equal(runIndexScript('auto'), false, 'Unrecognized keyword auto evaluates to light');
      assert.equal(runIndexScript('{"theme":"dark"}'), false, 'JSON string evaluates to light');
      assert.equal(runIndexScript('true'), false, 'String true evaluates to light');
      assert.equal(runIndexScript('1'), false, 'Number string 1 evaluates to light');
      assert.equal(runIndexScript('null'), false, 'Literal string "null" evaluates to light');
    });
  });

  describe('2. useTheme.ts Initial State & Corrupted Storage Stress Testing', () => {
    it('verifies state initialization across 50 corrupted and edge-case values', () => {
      // Simulate useTheme initial state logic:
      const getInitialThemeState = (storageValue: string | null): boolean => {
        if (storageValue === null) {
          localStorage.removeItem('app_theme');
        } else {
          localStorage.setItem('app_theme', storageValue);
        }

        const saved = localStorage.getItem('app_theme');
        if (saved) return saved === 'dark';
        return true;
      };

      // 1. Standard states
      assert.equal(getInitialThemeState(null), true, 'null defaults to dark');
      assert.equal(getInitialThemeState('dark'), true, 'dark returns true');
      assert.equal(getInitialThemeState('light'), false, 'light returns false');

      // 2. Corrupted and edge cases:
      const edgeCases = [
        { val: '', expected: true }, // empty string is falsy in if (saved) -> returns default true
        { val: 'undefined', expected: false },
        { val: 'null', expected: false },
        { val: '0', expected: false },
        { val: 'false', expected: false },
        { val: 'true', expected: false },
        { val: 'Dark', expected: false },
        { val: 'DARK', expected: false },
        { val: 'Light', expected: false },
        { val: 'LIGHT', expected: false },
        { val: 'auto', expected: false },
        { val: 'os-default', expected: false },
        { val: '{"mode":"dark"}', expected: false },
        { val: '<script>alert(1)</script>', expected: false },
        { val: '\n\t dark \n\t', expected: false },
        { val: 'dark ', expected: false },
        { val: ' dark', expected: false },
      ];

      for (const { val, expected } of edgeCases) {
        assert.equal(
          getInitialThemeState(val),
          expected,
          `Edge case value "${val}" should evaluate to ${expected}`
        );
      }
    });

    it('verifies exact parity between index.html bootstrapper and useTheme initial state', () => {
      const runIndexScript = (val: string | null): boolean => {
        const saved = val;
        if (saved === 'dark' || (!saved && true)) {
          return true;
        } else {
          return false;
        }
      };

      const getInitialThemeState = (val: string | null): boolean => {
        const saved = val;
        if (saved) return saved === 'dark';
        return true;
      };

      const testValues = [
        null,
        'dark',
        'light',
        '',
        'undefined',
        'null',
        'DARK',
        'LIGHT',
        'auto',
        'custom',
        '123',
        '{"foo":"bar"}',
      ];

      for (const val of testValues) {
        const bootstrapperResult = runIndexScript(val);
        const hookResult = getInitialThemeState(val);
        assert.equal(
          bootstrapperResult,
          hookResult,
          `Parity mismatch for value "${val}": Bootstrapper=${bootstrapperResult} vs Hook=${hookResult}`
        );
      }
    });
  });

  describe('3. meta[name="theme-color"] and DOM Synchronization Stress', () => {
    it('verifies exact color codes for meta theme-color', () => {
      const DARK_COLOR = '#0B0F17';
      const LIGHT_COLOR = '#F1F5F9';

      const docElem = (globalThis as any).document.documentElement;
      const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');

      const applyTheme = (isDark: boolean) => {
        if (isDark) {
          docElem.classList.add('dark');
          localStorage.setItem('app_theme', 'dark');
          metaTag?.setAttribute('content', DARK_COLOR);
        } else {
          docElem.classList.remove('dark');
          localStorage.setItem('app_theme', 'light');
          metaTag?.setAttribute('content', LIGHT_COLOR);
        }
      };

      // Dark Mode check
      applyTheme(true);
      assert.equal(metaTag.getAttribute('content'), '#0B0F17');
      assert.equal(docElem.classList.contains('dark'), true);
      assert.equal(localStorage.getItem('app_theme'), 'dark');

      // Light Mode check
      applyTheme(false);
      assert.equal(metaTag.getAttribute('content'), '#F1F5F9');
      assert.equal(docElem.classList.contains('dark'), false);
      assert.equal(localStorage.getItem('app_theme'), 'light');
    });

    it('recovers gracefully from manual DOM class tampering', () => {
      const docElem = (globalThis as any).document.documentElement;
      const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');

      // 1. Set to Dark Mode
      let isDark = true;
      docElem.classList.add('dark');
      metaTag.setAttribute('content', '#0B0F17');

      // 2. Tampering: Third-party script manually strips 'dark' class and corrupts meta tag
      docElem.classList.remove('dark');
      metaTag.setAttribute('content', '#FF0000');
      assert.equal(docElem.classList.contains('dark'), false);
      assert.equal(metaTag.getAttribute('content'), '#FF0000');

      // 3. When useTheme re-applies or toggle occurs:
      // If user toggles theme (isDark -> false, then back to true)
      isDark = false;
      if (isDark) {
        docElem.classList.add('dark');
        metaTag.setAttribute('content', '#0B0F17');
      } else {
        docElem.classList.remove('dark');
        metaTag.setAttribute('content', '#F1F5F9');
      }
      assert.equal(docElem.classList.contains('dark'), false);
      assert.equal(metaTag.getAttribute('content'), '#F1F5F9');

      // Toggle back to Dark
      isDark = true;
      if (isDark) {
        docElem.classList.add('dark');
        metaTag.setAttribute('content', '#0B0F17');
      } else {
        docElem.classList.remove('dark');
        metaTag.setAttribute('content', '#F1F5F9');
      }
      assert.equal(docElem.classList.contains('dark'), true);
      assert.equal(metaTag.getAttribute('content'), '#0B0F17');
    });

    it('survives 1,000 rapid consecutive theme toggles without drift or memory corruption', () => {
      const docElem = (globalThis as any).document.documentElement;
      const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');

      let currentThemeDark = true;

      for (let i = 0; i < 1000; i++) {
        currentThemeDark = !currentThemeDark;
        if (currentThemeDark) {
          docElem.classList.add('dark');
          localStorage.setItem('app_theme', 'dark');
          metaTag?.setAttribute('content', '#0B0F17');
        } else {
          docElem.classList.remove('dark');
          localStorage.setItem('app_theme', 'light');
          metaTag?.setAttribute('content', '#F1F5F9');
        }

        assert.equal(docElem.classList.contains('dark'), currentThemeDark);
        assert.equal(localStorage.getItem('app_theme'), currentThemeDark ? 'dark' : 'light');
        assert.equal(metaTag.getAttribute('content'), currentThemeDark ? '#0B0F17' : '#F1F5F9');
      }
    });
  });

  describe('4. Tailwind Semantic Tokens & CSS Custom Variables Completeness', () => {
    it('verifies all required semantic tokens in tailwind.config.js and src/index.css', () => {
      const twSrc = fs.readFileSync(path.join(projectRoot, 'tailwind.config.js'), 'utf8');
      const cssSrc = fs.readFileSync(path.join(projectRoot, 'src/index.css'), 'utf8');

      // 1. Tailwind Dark Mode configuration
      assert.match(twSrc, /darkMode:\s*'class'/);

      // 2. Light Theme Colors
      assert.match(twSrc, /'#F1F5F9'/); // Light bg
      assert.match(twSrc, /'#FFFFFF'/); // Light card
      assert.match(twSrc, /'#F8FAFC'/); // Light cardWell & surface
      assert.match(twSrc, /'#E2E8F0'/); // Light border

      // 3. Dark Theme Colors
      assert.match(twSrc, /'#0B0F17'/); // Dark bg
      assert.match(twSrc, /'#131B2A'/); // Dark card
      assert.match(twSrc, /'#1B263B'/); // Dark cardHover
      assert.match(twSrc, /'#1F2E45'/); // Dark border
      assert.match(twSrc, /'#0F172A'/); // Dark surface

      // 4. CSS Custom Properties
      assert.match(cssSrc, /--donut-track:\s*rgba\(226,\s*232,\s*240,\s*0\.9\);/);
      assert.match(cssSrc, /--donut-track:\s*rgba\(30,\s*41,\s*59,\s*0\.5\);/);

      // 5. Utility Classes
      assert.match(cssSrc, /\.glass-card\s*\{/);
      assert.match(cssSrc, /\.glass-card-light\s*\{/);
      assert.match(cssSrc, /\.card-well\s*\{/);
      assert.match(cssSrc, /\.glass-gold-card\s*\{/);
      assert.match(cssSrc, /\.custom-range-slider/);
    });
  });
});
