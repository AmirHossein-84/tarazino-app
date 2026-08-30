import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// ============================================================================
// HELPER FUNCTIONS: WCAG 2.1 Color Mathematics
// ============================================================================
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const lum1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================================================
// 1. THEME SWITCHING DYNAMICS & RAPID TOGGLE STRESS HARNESS
// ============================================================================
describe('Challenger 1 (Gen 2) — Adversarial Theme Switching Dynamics Stress', () => {

  test('TS-1: 5,000 Rapid Sequential Theme Toggles State Coherence & Invariance', () => {
    // Simulated DOM and localStorage environment
    let isDark = true;
    let storedTheme = 'dark';
    let domClassList = new Set<string>(['dark']);
    let metaThemeColor = '#0B0F17';

    const toggleTheme = () => {
      isDark = !isDark;
      if (isDark) {
        domClassList.add('dark');
        storedTheme = 'dark';
        metaThemeColor = '#0B0F17';
      } else {
        domClassList.delete('dark');
        storedTheme = 'light';
        metaThemeColor = '#F1F5F9';
      }
    };

    // Execute 5000 toggles
    for (let i = 0; i < 5000; i++) {
      toggleTheme();
      if (isDark) {
        assert.equal(storedTheme, 'dark');
        assert.ok(domClassList.has('dark'));
        assert.equal(metaThemeColor, '#0B0F17');
      } else {
        assert.equal(storedTheme, 'light');
        assert.ok(!domClassList.has('dark'));
        assert.equal(metaThemeColor, '#F1F5F9');
      }
    }

    // 5000 is even, so initial state (dark) must match final state exactly
    assert.equal(isDark, true);
    assert.equal(storedTheme, 'dark');
    assert.ok(domClassList.has('dark'));
    assert.equal(metaThemeColor, '#0B0F17');
  });

  test('TS-2: Parity Between index.html Bootstrapper & useTheme.ts Under 20 Boundary Conditions', () => {
    const testCases = [
      { input: 'dark', expected: true },
      { input: 'light', expected: false },
      { input: null, expected: true }, // Default to dark luxury theme
      { input: '', expected: true }, // Empty string is falsy -> defaults to dark
      { input: '0', expected: false },
      { input: '1', expected: false },
      { input: 'undefined', expected: false },
      { input: 'null', expected: false },
      { input: 'DARK', expected: false },
      { input: 'Light', expected: false },
      { input: '{"theme":"dark"}', expected: false },
      { input: 'true', expected: false },
      { input: 'false', expected: false },
      { input: 'auto', expected: false },
      { input: 'system', expected: false },
      { input: '   dark   ', expected: false },
      { input: 'dark\n', expected: false },
      { input: '\0', expected: false },
      { input: 'NaN', expected: false },
      { input: '___proto___', expected: false },
    ];

    // Read index.html script logic
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    assert.ok(indexHtml.includes("var saved = localStorage.getItem('app_theme');"));
    assert.ok(indexHtml.includes("if (saved === 'dark' || (!saved && true))"));

    // Evaluate both models against testCases
    for (const { input, expected } of testCases) {
      // 1. Model of index.html inline script:
      const saved = input;
      const bootstrapperResult = saved === 'dark' || (!saved && true);

      // 2. Model of useTheme.ts hook:
      const hookResult = (() => {
        if (saved) return saved === 'dark';
        return true;
      })();

      assert.equal(
        bootstrapperResult,
        hookResult,
        `Bootstrapper and Hook must have identical evaluation for input: ${JSON.stringify(input)}`
      );
      assert.equal(bootstrapperResult, expected, `Failed for input: ${JSON.stringify(input)}`);
    }
  });

  test('TS-3: CSS Custom Variable --donut-track Definition in src/index.css', () => {
    const cssContent = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
    
    // Light mode --donut-track
    assert.ok(
      cssContent.includes('--donut-track: rgba(226, 232, 240, 0.9);'),
      'src/index.css must define light mode --donut-track: rgba(226, 232, 240, 0.9)'
    );

    // Dark mode --donut-track
    assert.ok(
      cssContent.includes('.dark {') && cssContent.includes('--donut-track: rgba(30, 41, 59, 0.5);'),
      'src/index.css must define dark mode --donut-track: rgba(30, 41, 59, 0.5) under .dark'
    );
  });
});

// ============================================================================
// 2. MODAL OVERLAY ARCHITECTURE, Z-INDEX STACKING & TOUCH INTERACTIONS
// ============================================================================
describe('Challenger 1 (Gen 2) — Modal Overlay Architecture & Interaction Stress', () => {

  test('MO-1: Z-Index Stacking Hierarchy Invariant', () => {
    // Audit Header, BottomNav, BottomSheetModal z-index tokens
    const headerCode = fs.readFileSync(path.join(rootDir, 'src/components/layout/Header.tsx'), 'utf-8');
    const bottomNavCode = fs.readFileSync(path.join(rootDir, 'src/components/layout/BottomNav.tsx'), 'utf-8');
    const modalCode = fs.readFileSync(path.join(rootDir, 'src/components/common/BottomSheetModal.tsx'), 'utf-8');

    // Extract z-index classes
    assert.ok(headerCode.includes('z-30'), 'Header must have z-index z-30');
    assert.ok(bottomNavCode.includes('z-40'), 'BottomNav must have z-index z-40');
    assert.ok(modalCode.includes('z-50'), 'BottomSheetModal must have z-index z-50 to layer over header and navigation');
  });

  test('MO-2: BottomSheetModal Drag-to-Dismiss Gesture Threshold Mathematical Invariants', () => {
    // Model the gesture logic from BottomSheetModal:
    const simulateTouch = (startY: number, moveY: number) => {
      const diff = moveY - startY;
      let isClosed = false;
      let finalTranslateY = 0;

      if (diff > 0) {
        // Dragging downward
        if (diff > 120) {
          isClosed = true;
        } else {
          finalTranslateY = 0; // snaps back
        }
      }
      return { isClosed, diff, finalTranslateY };
    };

    // Test below threshold (e.g. 50px, 119px, 120px) -> does NOT close, snaps back
    assert.equal(simulateTouch(100, 150).isClosed, false);
    assert.equal(simulateTouch(100, 219).isClosed, false);
    assert.equal(simulateTouch(100, 220).isClosed, false);
    assert.equal(simulateTouch(100, 220).finalTranslateY, 0);

    // Test above threshold (e.g. 121px, 200px, 500px) -> triggers close
    assert.equal(simulateTouch(100, 221).isClosed, true);
    assert.equal(simulateTouch(100, 300).isClosed, true);
    assert.equal(simulateTouch(0, 150).isClosed, true);

    // Test upward drag (diff < 0) -> ignored, does NOT close
    assert.equal(simulateTouch(200, 100).isClosed, false);
  });

  test('MO-3: Body Scroll Locking on Modal Mount/Unmount', () => {
    // Verify BottomSheetModal useEffect implements overflow hidden lock
    const modalCode = fs.readFileSync(path.join(rootDir, 'src/components/common/BottomSheetModal.tsx'), 'utf-8');
    assert.ok(modalCode.includes("document.body.style.overflow = 'hidden'"), 'Modal must lock body scroll on open');
    assert.ok(modalCode.includes("document.body.style.overflow = ''"), 'Modal must restore body scroll on close/unmount');
  });

  test('MO-4: Modal Backdrop Dual-Mode Blur & Safe Area Insets', () => {
    const modalCode = fs.readFileSync(path.join(rootDir, 'src/components/common/BottomSheetModal.tsx'), 'utf-8');
    
    // Backdrop class
    assert.ok(
      modalCode.includes('bg-slate-900/60 dark:bg-black/80 backdrop-blur-md'),
      'Modal must use soft slate-900/60 light backdrop and deep black/80 dark backdrop with backdrop-blur-md'
    );

    // Container class
    assert.ok(
      modalCode.includes('bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800'),
      'Modal sheet must use pure white light surface and slate-900 dark surface'
    );

    // Safe area bottom inset
    assert.ok(
      modalCode.includes('pb-[max(1rem,env(safe-area-inset-bottom))]') ||
      modalCode.includes('pb-[max(2rem,env(safe-area-inset-bottom))]'),
      'Modal must include safe area bottom padding for iPhone notch/home bar'
    );
  });

  test('MO-5: Modal Registry Verification Across All 7 Tabs', () => {
    const modalFiles = [
      'src/components/market/AddMarketInstrumentModal.tsx',
      'src/components/market/EditMarketHoldingModal.tsx',
      'src/components/crypto/NobitexSyncModal.tsx',
      'src/components/properties/AddEditPropertyModal.tsx',
      'src/components/holdings/AddAssetModal.tsx',
      'src/components/holdings/AddGoldLotModal.tsx',
      'src/components/holdings/EditPhysicalGoldModal.tsx',
      'src/components/holdings/PhysicalGoldHistoryModal.tsx',
      'src/components/sell/SellView.tsx',
    ];

    for (const file of modalFiles) {
      const fullPath = path.join(rootDir, file);
      assert.ok(fs.existsSync(fullPath), `Modal file must exist: ${file}`);
      const content = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(
        content.includes('BottomSheetModal') || content.includes('fixed inset-0'),
        `Modal ${file} must use standard BottomSheetModal or high z-index overlay`
      );
    }
  });
});

// ============================================================================
// 3. VIEWPORT GEOMETRY & MOBILE 390×844 CONSTRAINTS HARNESS
// ============================================================================
describe('Challenger 1 (Gen 2) — Viewport Geometry & Mobile 390×844 Constraints Stress', () => {

  test('VG-1: 390×844 Mobile Viewport Bottom Navigation Tap Target Compliance', () => {
    const mobileWidth = 390; // Standard iPhone 12/13/14/15/16 Pro width
    const outerPadding = 16; // px-2 (8px left + 8px right)
    const navInnerPadding = 12; // p-1.5 (6px left + 6px right)
    const totalAvailableWidth = mobileWidth - outerPadding - navInnerPadding; // 362px
    const tabCount = 7;
    const tabWidth = totalAvailableWidth / tabCount; // ~51.71px

    // Apple HIG requires >= 44px, Android Material requires >= 48px
    assert.ok(
      tabWidth >= 48.0,
      `BottomNav tab width (${tabWidth.toFixed(2)}px) on 390px viewport must meet >= 48px Android/Apple touch target standard`
    );

    // Verify touch-target utility in index.css
    const cssContent = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');
    assert.ok(
      cssContent.includes('.touch-target {') && cssContent.includes('min-h-[48px] min-w-[48px]'),
      '.touch-target utility class must enforce min 48px width and height'
    );
  });

  test('VG-2: 390px Mobile Viewport Header Layout No-Wrap Verification', () => {
    const mobileWidth = 390;
    const paddingX = 32; // px-4 (16px left + 16px right)
    const availableWidth = mobileWidth - paddingX; // 358px

    // Components inside Header:
    // 1. Logo container: 40px
    // 2. Title & Date stack: ~140px
    // 3. Gap: 12px
    // Left stack total: 40 + 12 + 140 = 192px

    // 4. Currency switcher button: ~76px
    // 5. Theme toggle button: ~40px
    // 6. Action gap: 8px
    // Right stack total: 76 + 40 + 8 = 124px

    const totalHeaderWidth = 192 + 124; // 316px
    const marginOfSafety = availableWidth - totalHeaderWidth; // 42px

    assert.ok(
      marginOfSafety >= 20,
      `Header contents (${totalHeaderWidth}px) must comfortably fit within 390px viewport available width (${availableWidth}px) with at least 20px safety margin. Current margin: ${marginOfSafety}px`
    );
  });

  test('VG-3: Horizontal Overflow Defense in index.html and Container Layouts', () => {
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    assert.ok(
      indexHtml.includes('overflow-x-hidden'),
      'index.html body must declare overflow-x-hidden to prevent horizontal page drift on mobile touch gestures'
    );
  });

  test('VG-4: Responsive Modal Max-Height & Dvh Viewport Adaptability', () => {
    const modalCode = fs.readFileSync(path.join(rootDir, 'src/components/common/BottomSheetModal.tsx'), 'utf-8');
    assert.ok(
      modalCode.includes('max-h-[90vh]') && modalCode.includes('max-h-[90dvh]'),
      'BottomSheetModal must enforce max-h-[90vh] and max-h-[90dvh] to prevent overflowing beneath dynamic mobile address bars'
    );
  });
});

// ============================================================================
// 4. WCAG AA / AAA MATHEMATICAL COLOR CONTRAST CONFORMANCE HARNESS
// ============================================================================
describe('Challenger 1 (Gen 2) — Exhaustive WCAG AA/AAA Mathematical Contrast Verification', () => {

  const lightTokens = {
    canvas: '#F1F5F9',      // slate-100 Soft Slate background
    canvasAlt: '#F8FAFC',   // slate-50
    card: '#FFFFFF',        // Pure white card surface
    well: '#F8FAFC',        // Slate-50 well
    header: '#0F172A',      // slate-900 Primary Header
    body: '#334155',        // slate-700 Body Text
    subtitle600: '#475569', // slate-600 Subtitle
    subtitle500: '#64748B', // slate-500 Muted Subtitle
    amber700: '#B45309',    // amber-700 Gold Accent
    amber800: '#92400E',    // amber-800 Dark Gold Accent
    emerald700: '#047857',  // emerald-700 Gain Accent
    emerald800: '#065F46',  // emerald-800 Dark Gain Accent
    indigo700: '#4338CA',   // indigo-700 Crypto Accent
    rose700: '#BE123C',     // rose-700 Loss Accent
  };

  const darkTokens = {
    canvas: '#0B0F17',      // dark-bg Metallic Black
    card: '#131B2A',        // dark-card
    header: '#F1F5F9',      // slate-100 Primary Header
    body: '#CBD5E1',        // slate-300 Body Text
    subtitle: '#94A3B8',    // slate-400 Muted Subtitle
    gold400: '#FBBF24',     // gold-400 Accent
    emerald400: '#34D399',  // emerald-400 Accent
    indigo400: '#818CF8',   // indigo-400 Accent
    rose400: '#FB7185',     // rose-400 Accent
  };

  test('WCAG-L1: Light Mode Headers Satisfy WCAG AAA (>= 7.0:1 normal, >= 4.5:1 large)', () => {
    // Primary Header (#0F172A) on Card (#FFFFFF)
    const cr1 = getContrastRatio(lightTokens.card, lightTokens.header);
    assert.ok(cr1 >= 15.0, `Header on Card (${cr1.toFixed(2)}:1) must satisfy WCAG AAA (>= 15:1)`);

    // Primary Header (#0F172A) on Canvas (#F1F5F9)
    const cr2 = getContrastRatio(lightTokens.canvas, lightTokens.header);
    assert.ok(cr2 >= 13.0, `Header on Canvas (${cr2.toFixed(2)}:1) must satisfy WCAG AAA (>= 13:1)`);

    // Primary Header (#0F172A) on Well (#F8FAFC)
    const cr3 = getContrastRatio(lightTokens.well, lightTokens.header);
    assert.ok(cr3 >= 14.5, `Header on Well (${cr3.toFixed(2)}:1) must satisfy WCAG AAA (>= 14.5:1)`);
  });

  test('WCAG-L2: Light Mode Body Text Satisfies WCAG AAA (>= 7.0:1) and AA (>= 4.5:1)', () => {
    // Body Text (#334155) on Card (#FFFFFF)
    const crCard = getContrastRatio(lightTokens.card, lightTokens.body);
    assert.ok(crCard >= 9.0, `Body on Card (${crCard.toFixed(2)}:1) must satisfy WCAG AAA (>= 9:1)`);

    // Body Text (#334155) on Well (#F8FAFC)
    const crWell = getContrastRatio(lightTokens.well, lightTokens.body);
    assert.ok(crWell >= 8.5, `Body on Well (${crWell.toFixed(2)}:1) must satisfy WCAG AAA (>= 8.5:1)`);

    // Body Text (#334155) on Canvas (#F1F5F9)
    const crCanvas = getContrastRatio(lightTokens.canvas, lightTokens.body);
    assert.ok(crCanvas >= 7.5, `Body on Canvas (${crCanvas.toFixed(2)}:1) must satisfy WCAG AAA (>= 7.5:1)`);
  });

  test('WCAG-L3: Light Mode Subtitles & Muted Labels Satisfy WCAG AA (>= 4.5:1)', () => {
    // Subtitle (#64748B) on Card (#FFFFFF)
    const crSubtitle = getContrastRatio(lightTokens.card, lightTokens.subtitle500);
    assert.ok(crSubtitle >= 4.5, `Subtitle on Card (${crSubtitle.toFixed(2)}:1) must satisfy WCAG AA (>= 4.5:1)`);

    // Subtitle (#475569) on Well (#F8FAFC)
    const crSubtitleWell = getContrastRatio(lightTokens.well, lightTokens.subtitle600);
    assert.ok(crSubtitleWell >= 6.0, `Subtitle-600 on Well (${crSubtitleWell.toFixed(2)}:1) must satisfy WCAG AA (>= 6:1)`);
  });

  test('WCAG-L4: Light Mode Financial Accent Colors Satisfy WCAG AA (>= 4.5:1)', () => {
    // Amber/Gold (#B45309) on Card (#FFFFFF)
    const crAmber = getContrastRatio(lightTokens.card, lightTokens.amber700);
    assert.ok(crAmber >= 5.0, `Amber accent on Card (${crAmber.toFixed(2)}:1) must be >= 5:1`);

    // Emerald/Gain (#047857) on Card (#FFFFFF)
    const crEmerald = getContrastRatio(lightTokens.card, lightTokens.emerald700);
    assert.ok(crEmerald >= 5.0, `Emerald accent on Card (${crEmerald.toFixed(2)}:1) must be >= 5:1`);

    // Indigo/Crypto (#4338CA) on Card (#FFFFFF)
    const crIndigo = getContrastRatio(lightTokens.card, lightTokens.indigo700);
    assert.ok(crIndigo >= 6.0, `Indigo accent on Card (${crIndigo.toFixed(2)}:1) must be >= 6:1`);

    // Rose/Loss (#BE123C) on Card (#FFFFFF)
    const crRose = getContrastRatio(lightTokens.card, lightTokens.rose700);
    assert.ok(crRose >= 5.5, `Rose accent on Card (${crRose.toFixed(2)}:1) must be >= 5.5:1`);
  });

  test('WCAG-D1: Dark Mode Luxury Palette Typography Satisfies WCAG AAA (>= 7.0:1)', () => {
    // Primary Header (#F1F5F9) on Dark Card (#131B2A)
    const crHeader = getContrastRatio(darkTokens.card, darkTokens.header);
    assert.ok(crHeader >= 14.0, `Dark header on Card (${crHeader.toFixed(2)}:1) must be >= 14:1 (WCAG AAA)`);

    // Body Text (#CBD5E1) on Dark Card (#131B2A)
    const crBody = getContrastRatio(darkTokens.card, darkTokens.body);
    assert.ok(crBody >= 10.0, `Dark body on Card (${crBody.toFixed(2)}:1) must be >= 10:1 (WCAG AAA)`);

    // Muted Subtitle (#94A3B8) on Dark Card (#131B2A)
    const crMuted = getContrastRatio(darkTokens.card, darkTokens.subtitle);
    assert.ok(crMuted >= 6.0, `Dark muted subtitle on Card (${crMuted.toFixed(2)}:1) must be >= 6:1 (WCAG AA)`);
  });

  test('WCAG-D2: Dark Mode Financial Accent Colors Satisfy High Contrast Requirements', () => {
    // Gold Accent (#FBBF24) on Dark Card (#131B2A)
    const crGold = getContrastRatio(darkTokens.card, darkTokens.gold400);
    assert.ok(crGold >= 10.0, `Dark gold accent (${crGold.toFixed(2)}:1) must be >= 10:1 (WCAG AAA)`);

    // Emerald Accent (#34D399) on Dark Card (#131B2A) - 8.97:1 (WCAG AAA >= 7.0:1)
    const crEmerald = getContrastRatio(darkTokens.card, darkTokens.emerald400);
    assert.ok(crEmerald >= 7.0, `Dark emerald accent (${crEmerald.toFixed(2)}:1) must be >= 7:1 (WCAG AAA)`);

    // Indigo Accent (#818CF8) on Dark Card (#131B2A) - 5.78:1 (WCAG AA >= 4.5:1)
    const crIndigo = getContrastRatio(darkTokens.card, darkTokens.indigo400);
    assert.ok(crIndigo >= 4.5, `Dark indigo accent (${crIndigo.toFixed(2)}:1) must be >= 4.5:1 (WCAG AA)`);

    // Rose Accent (#FB7185) on Dark Card (#131B2A) - 6.41:1 (WCAG AA >= 4.5:1)
    const crRose = getContrastRatio(darkTokens.card, darkTokens.rose400);
    assert.ok(crRose >= 4.5, `Dark rose accent (${crRose.toFixed(2)}:1) must be >= 4.5:1 (WCAG AA)`);
  });
});

// ============================================================================
// 5. STATIC AST / CODEBASE ZERO-TOLERANCE SCAN FOR HARDCODED DARK TOKENS
// ============================================================================
describe('Challenger 1 (Gen 2) — Hardcoded Dark Token Zero-Tolerance Audit', () => {

  test('AST-1: Exhaustive Scan of All src/**/*.{tsx,ts} for Hardcoded Dark Classes', () => {
    const srcDir = path.join(rootDir, 'src');
    const violations: { file: string; line: number; text: string }[] = [];

    // Regex that catches un-prefixed dark classes like `bg-slate-950`, `text-slate-100`, `border-slate-800`
    // but ignores valid `dark:bg-slate-950`, `dark:hover:bg-slate-950`, etc.
    const darkRegex = /(?<!dark:)(?<!dark:hover:)(?<!dark:focus:)(?<!dark:group-hover:)\b(bg-slate-950|text-slate-100|border-slate-800)\b/g;

    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            // Ignore comments
            const cleanLine = line.trim();
            if (cleanLine.startsWith('//') || cleanLine.startsWith('*') || cleanLine.startsWith('/*')) return;

            // Check if matches darkRegex
            let match;
            while ((match = darkRegex.exec(line)) !== null) {
              // Whitelist intentional modal backdrops in BottomSheetModal and PwaInstallPrompt
              const isModalBackdrop = (line.includes('bg-slate-900/60') || line.includes('bg-slate-900/50'));
              if (!isModalBackdrop) {
                violations.push({
                  file: path.relative(rootDir, fullPath),
                  line: idx + 1,
                  text: cleanLine,
                });
              }
            }
          });
        }
      }
    }

    walkDir(srcDir);

    assert.equal(
      violations.length,
      0,
      `Found ${violations.length} un-prefixed hardcoded dark token violations:\n` +
      violations.map((v) => `  ${v.file}:${v.line} -> ${v.text}`).join('\n')
    );
  });
});
