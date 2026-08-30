import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPersianFormattedDate } from '../../src/utils/formatters.js';

describe('Challenger 2 — Milestone 1 Empirical Layout & Shell Verification', () => {

  const rootDir = path.resolve('.');

  test('E1: Header Layout, Navigation Controls & Theme Switcher Ergonomics', () => {
    const headerPath = path.join(rootDir, 'src/components/layout/Header.tsx');
    assert.ok(fs.existsSync(headerPath), 'Header.tsx must exist');
    const headerSrc = fs.readFileSync(headerPath, 'utf8');

    // 1. Sticky positioning and blur backdrop
    assert.match(headerSrc, /sticky top-0 z-30 w-full/, 'Header must be sticky at top with z-30');
    assert.match(headerSrc, /backdrop-blur-2xl/, 'Header must apply backdrop blur');
    assert.match(headerSrc, /bg-white\/90 dark:bg-slate-950\/85/, 'Header must have dual-mode background');
    assert.match(headerSrc, /border-b border-slate-200 dark:border-slate-800\/80/, 'Header must have dual-mode border');

    // 2. Logo & Brand Presentation
    assert.match(headerSrc, /img[^>]+src="\/favicon\.png"/, 'Header must render app favicon');
    assert.match(headerSrc, /ترازینو/, 'Header must render Tarazino brand name');

    // 3. Persian Date Badge
    assert.match(headerSrc, /getPersianFormattedDate\(new Date\(\)\)\.split\('ساعت'\)\[0\]/, 'Date badge must format Persian date and strip time');
    assert.match(headerSrc, /text-\[11px\] text-slate-500 dark:text-slate-400/, 'Date badge must use high-contrast muted text token');
    const formattedDate = getPersianFormattedDate(new Date()).split('ساعت')[0].trim();
    assert.ok(formattedDate.length > 5, 'Persian date string must be non-empty and well formatted');

    // 4. Currency Switcher (USD <-> Toman)
    assert.match(headerSrc, /currencyMode === 'usd'/, 'Header must support currencyMode check');
    assert.match(headerSrc, /bg-emerald-50 text-emerald-800 border-emerald-300.+dark:bg-emerald-950\/90 dark:text-emerald-300 dark:border-emerald-500\/50/, 'USD mode must have high contrast emerald badge');
    assert.match(headerSrc, /bg-slate-100 hover:bg-slate-200 dark:bg-slate-900\/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300/, 'Toman mode must have crisp dual-mode slate badge');
    assert.match(headerSrc, /touch-target/, 'Currency button must include touch-target class for mobile ergonomics');
    assert.match(headerSrc, /interactive-tap/, 'Currency button must include interactive-tap feedback');

    // 5. Theme Toggle Button
    assert.match(headerSrc, /handleToggleTheme/, 'Theme button must have dedicated toggle handler');
    assert.match(headerSrc, /triggerHaptic\('medium'\)/, 'Theme button must trigger haptic feedback');
    assert.match(headerSrc, /aria-label="تغییر تم"/, 'Theme button must have proper accessible aria-label');
    assert.match(headerSrc, /<Sun className="w-4 h-4 text-amber-400/, 'Dark mode must render amber Sun icon');
    assert.match(headerSrc, /<Moon className="w-4 h-4 text-indigo-600/, 'Light mode must render indigo Moon icon');
  });

  test('E2: Bottom Navigation Bar 7 Tabs & Glowing Indicator Ergonomics', () => {
    const bottomNavPath = path.join(rootDir, 'src/components/layout/BottomNav.tsx');
    assert.ok(fs.existsSync(bottomNavPath), 'BottomNav.tsx must exist');
    const bottomNavSrc = fs.readFileSync(bottomNavPath, 'utf8');

    // 1. Exactly 7 tabs defined with proper IDs
    const expectedTabs = ['dashboard', 'gold', 'crypto', 'properties', 'holdings', 'sell', 'settings'];
    expectedTabs.forEach((tabId) => {
      assert.ok(bottomNavSrc.includes(`id: '${tabId}'`), `BottomNav must contain tab id '${tabId}'`);
    });

    // 2. Fixed bottom dock positioning & safe-area handling
    assert.match(bottomNavSrc, /fixed bottom-0 left-0 right-0 z-40/, 'BottomNav container must be fixed bottom with z-40');
    assert.match(bottomNavSrc, /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/, 'BottomNav container must respect safe-area-inset-bottom');
    assert.match(bottomNavSrc, /pointer-events-none/, 'Outer container must be pointer-events-none to prevent blocking edge clicks');
    assert.match(bottomNavSrc, /pointer-events-auto/, 'Inner nav dock must restore pointer-events-auto');

    // 3. Floating glass dock styling
    assert.match(bottomNavSrc, /bg-white\/95 dark:bg-slate-950\/95/, 'BottomNav must have high-opacity dual-mode surface');
    assert.match(bottomNavSrc, /border border-slate-200\/90 dark:border-slate-800\/90/, 'BottomNav must have crisp dual-mode border');
    assert.match(bottomNavSrc, /shadow-xl dark:shadow-2xl/, 'BottomNav must have deep elevation shadow');
    assert.match(bottomNavSrc, /rounded-3xl/, 'BottomNav must have rounded-3xl corners');

    // 4. Active tab indicator glow
    assert.match(bottomNavSrc, /from-amber-500\/15 to-gold-500\/5 dark:from-amber-500\/25 dark:to-gold-500\/10/, 'Active tab must have amber-gold glow gradient');
    assert.match(bottomNavSrc, /text-amber-700 dark:text-gold-300 font-bold/, 'Active tab must have high-contrast gold text');
    assert.match(bottomNavSrc, /border border-gold-400\/40 dark:border-gold-500\/40/, 'Active tab must have gold border accent');

    // 5. Inactive tab states
    assert.match(bottomNavSrc, /text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200/, 'Inactive tabs must have high-contrast muted text transitioning to solid');

    // 6. Touch targets & responsiveness
    assert.match(bottomNavSrc, /touch-target/, 'Tab buttons must include touch-target class');
    assert.match(bottomNavSrc, /interactive-tap/, 'Tab buttons must include interactive-tap feedback');
    assert.match(bottomNavSrc, /text-\[9px\] xs:text-\[10px\] sm:text-\[11px\]/, 'Tab labels must be responsive across narrow viewports');
    assert.match(bottomNavSrc, /w-4 h-4 sm:w-5 sm:h-5/, 'Tab icons must scale responsively');

    // 7. Backward compatibility aliases
    assert.match(bottomNavSrc, /tab\.id === 'gold' && \(activeTab as string\) === 'market'/, 'Gold tab must activate on legacy market alias');
    assert.match(bottomNavSrc, /tab\.id === 'dashboard' && \(activeTab as string\) === 'calculator'/, 'Dashboard tab must activate on legacy calculator alias');
  });

  test('E3: Pull-To-Refresh Spinner Container & Dynamic Physics', () => {
    const ptrPath = path.join(rootDir, 'src/components/common/PullToRefreshContainer.tsx');
    assert.ok(fs.existsSync(ptrPath), 'PullToRefreshContainer.tsx must exist');
    const ptrSrc = fs.readFileSync(ptrPath, 'utf8');

    // 1. Damped pull curve and threshold mechanics
    assert.match(ptrSrc, /Math\.min\(diff \* 0\.45, 90\)/, 'PTR must use 0.45 damping coefficient capped at 90px');
    assert.match(ptrSrc, /pullThreshold = 65/, 'PTR default threshold must be 65px');
    assert.match(ptrSrc, /window\.scrollY <= 2/, 'PTR must only engage when scrolled to the top');

    // 2. Dual-mode visual spinner pill
    assert.match(ptrSrc, /bg-white\/95 dark:bg-slate-900\/90/, 'PTR pill must have dual-mode background');
    assert.match(ptrSrc, /border border-slate-200 dark:border-slate-700\/80/, 'PTR pill must have dual-mode border');
    assert.match(ptrSrc, /text-slate-700 dark:text-slate-300/, 'PTR text must have high contrast');
    assert.match(ptrSrc, /text-amber-600 dark:text-gold-400/, 'Refresh icon must have gold accent');

    // 3. Dynamic rotation and spin animation
    assert.match(ptrSrc, /rotate\(\$\{pullDistance \* 4\}deg\)/, 'Icon must rotate smoothly proportional to pull distance');
    assert.match(ptrSrc, /animate-spin/, 'Icon must spin continuously during active refresh');

    // 4. Persian status messages
    assert.match(ptrSrc, /در حال به‌روزرسانی اطلاعات\.\.\./, 'PTR must show loading text during refresh');
    assert.match(ptrSrc, /رها کنید تا به‌روزرسانی شود/, 'PTR must show release prompt when past threshold');
    assert.match(ptrSrc, /به پایین بکشید/, 'PTR must show pull prompt initially');

    // 5. Haptic feedback
    assert.match(ptrSrc, /triggerHaptic\('light'\)/, 'PTR must trigger light haptic on crossing threshold');
    assert.match(ptrSrc, /triggerHaptic\('medium'\)/, 'PTR must trigger medium haptic on release refresh');
  });

  test('E4: Skeleton Loaders in Light and Dark Modes', () => {
    const skeletonPath = path.join(rootDir, 'src/components/common/SkeletonLoader.tsx');
    assert.ok(fs.existsSync(skeletonPath), 'SkeletonLoader.tsx must exist');
    const skeletonSrc = fs.readFileSync(skeletonPath, 'utf8');

    // 1. CardSkeleton dual-mode classes
    assert.match(skeletonSrc, /bg-white\/90 dark:bg-slate-900\/60/, 'CardSkeleton must use dual-mode card background');
    assert.match(skeletonSrc, /border-slate-200\/90 dark:border-slate-800\/80/, 'CardSkeleton must use dual-mode border');
    assert.match(skeletonSrc, /bg-slate-50 dark:bg-slate-950\/60/, 'CardSkeleton inner well must use dual-mode well background');
    assert.match(skeletonSrc, /bg-slate-200 dark:bg-slate-800/, 'CardSkeleton placeholder bars must use dual-mode slate tokens');
    assert.match(skeletonSrc, /animate-pulse/, 'CardSkeleton must have pulse animation');

    // 2. DonutSkeleton dual-mode classes
    assert.match(skeletonSrc, /border-slate-200 dark:border-slate-800/, 'DonutSkeleton ring must adapt between light and dark modes');
  });

  test('E5: App Shell Layout, Viewport Padding & Z-Index Layering', () => {
    const appPath = path.join(rootDir, 'src/App.tsx');
    assert.ok(fs.existsSync(appPath), 'App.tsx must exist');
    const appSrc = fs.readFileSync(appPath, 'utf8');

    // 1. Root container background and bottom clearance
    assert.match(appSrc, /bg-slate-100 dark:bg-slate-950/, 'App root must use Soft Slate in light mode and near-black in dark mode');
    assert.match(appSrc, /pb-\[max\(7rem,calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\)\]/, 'App root must have sufficient bottom padding so content is never covered by BottomNav');

    // 2. Main content container width and padding
    assert.match(appSrc, /max-w-4xl mx-auto px-4 py-5 space-y-5/, 'Main content container must be centered with max-w-4xl and px-4');

    // 3. Toast notification snackbar z-index and positioning
    assert.match(appSrc, /fixed bottom-\[max\(5\.25rem,calc\(env\(safe-area-inset-bottom\)\+4\.5rem\)\)\] left-4 right-4 z-50/, 'Toast must be fixed above BottomNav with z-50');
    assert.match(appSrc, /border-emerald-500\/40 text-emerald-900 dark:text-emerald-300/, 'Success toast must be high contrast emerald');
    assert.match(appSrc, /border-rose-500\/40 text-rose-900 dark:text-rose-300/, 'Error toast must be high contrast rose');
  });

  test('E6: CSS Design Tokens, Safe Area Variables & Utility Rules', () => {
    const cssPath = path.join(rootDir, 'src/index.css');
    assert.ok(fs.existsSync(cssPath), 'index.css must exist');
    const cssSrc = fs.readFileSync(cssPath, 'utf8');

    // 1. Safe area CSS variables
    assert.match(cssSrc, /--sat: env\(safe-area-inset-top, 0px\);/, 'Must define --sat variable');
    assert.match(cssSrc, /--sab: env\(safe-area-inset-bottom, 0px\);/, 'Must define --sab variable');

    // 2. Donut track CSS variable
    assert.match(cssSrc, /--donut-track: rgba\(226, 232, 240, 0\.9\);/, 'Light mode --donut-track must be soft slate rgba(226, 232, 240, 0.9)');
    assert.match(cssSrc, /\.dark\s*\{\s*--donut-track: rgba\(30, 41, 59, 0\.5\);/, 'Dark mode --donut-track must be slate-800 rgba(30, 41, 59, 0.5)');

    // 3. Touch target and tap utility classes
    assert.match(cssSrc, /\.touch-target\s*\{\s*@apply min-h-\[48px\] min-w-\[48px\]/, 'Touch target must guarantee 48px minimum dimension for WCAG mobile accessibility');
    assert.match(cssSrc, /\.interactive-tap\s*\{\s*@apply transition-all duration-100 active:scale-\[0\.97\] cursor-pointer;/, 'Interactive tap must provide smooth micro-interaction');

    // 4. Body theme transition
    assert.match(cssSrc, /body\s*\{\s*@apply transition-colors duration-200 bg-slate-100 dark:bg-dark-bg text-slate-900 dark:text-slate-100;/, 'Body must have smooth theme transition');

    // 5. Custom Range Slider
    assert.match(cssSrc, /\.custom-range-slider/, 'Must style custom-range-slider');
    assert.match(cssSrc, /border-2 border-white dark:border-\[#0b0f17\]/, 'Slider thumb must have white border in light mode and dark border in dark mode');
  });

  test('E7: Theme Bootstrapper & FOUC Prevention in index.html', () => {
    const htmlPath = path.join(rootDir, 'index.html');
    assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
    const htmlSrc = fs.readFileSync(htmlPath, 'utf8');

    // 1. Head inline bootstrapper script
    assert.match(htmlSrc, /localStorage\.getItem\('app_theme'\)/, 'index.html must check localStorage before render');
    assert.match(htmlSrc, /document\.documentElement\.classList\.add\('dark'\)/, 'index.html must add dark class synchronously');
    assert.match(htmlSrc, /document\.documentElement\.classList\.remove\('dark'\)/, 'index.html must remove dark class when light mode');

    // 2. Viewport meta tag with cover fit
    assert.match(htmlSrc, /viewport-fit=cover/, 'index.html viewport must specify viewport-fit=cover for notched devices');
    assert.match(htmlSrc, /user-scalable=no/, 'index.html viewport must prevent accidental pinch zoom distortion');

    // 3. Meta theme-color initial tag
    assert.match(htmlSrc, /<meta name="theme-color" content="#0B0F17"/, 'index.html must contain initial theme-color meta tag');
  });

  test('E8: useTheme Hook Dynamic State & Meta Sync', () => {
    const themeHookPath = path.join(rootDir, 'src/hooks/useTheme.ts');
    assert.ok(fs.existsSync(themeHookPath), 'useTheme.ts must exist');
    const themeHookSrc = fs.readFileSync(themeHookPath, 'utf8');

    // 1. Dynamic meta theme-color sync
    assert.match(themeHookSrc, /metaThemeColor\?\.setAttribute\('content', '#0B0F17'\)/, 'useTheme must set meta theme-color to #0B0F17 in dark mode');
    assert.match(themeHookSrc, /metaThemeColor\?\.setAttribute\('content', '#F1F5F9'\)/, 'useTheme must set meta theme-color to #F1F5F9 in light mode');

    // 2. Synchronize html class and localStorage
    assert.match(themeHookSrc, /root\.classList\.add\('dark'\)/, 'useTheme must add dark class');
    assert.match(themeHookSrc, /root\.classList\.remove\('dark'\)/, 'useTheme must remove dark class');
    assert.match(themeHookSrc, /localStorage\.setItem\('app_theme', 'dark'\)/, 'useTheme must save dark setting');
    assert.match(themeHookSrc, /localStorage\.setItem\('app_theme', 'light'\)/, 'useTheme must save light setting');
  });

  test('E9: Tailwind Semantic Palette Configuration', () => {
    const twConfigPath = path.join(rootDir, 'tailwind.config.js');
    assert.ok(fs.existsSync(twConfigPath), 'tailwind.config.js must exist');
    const twConfigSrc = fs.readFileSync(twConfigPath, 'utf8');

    // 1. Class-based dark mode
    assert.match(twConfigSrc, /darkMode:\s*'class'/, 'Tailwind config must use darkMode class');

    // 2. Light semantic color tokens
    assert.match(twConfigSrc, /light:\s*\{/, 'Tailwind config must define semantic light palette');
    assert.match(twConfigSrc, /bg:\s*'#F1F5F9'/, 'Light bg must be #F1F5F9');
    assert.match(twConfigSrc, /card:\s*'#FFFFFF'/, 'Light card must be #FFFFFF');
    assert.match(twConfigSrc, /cardWell:\s*'#F8FAFC'/, 'Light cardWell must be #F8FAFC');
    assert.match(twConfigSrc, /border:\s*'#E2E8F0'/, 'Light border must be #E2E8F0');

    // 3. Dark semantic color tokens
    assert.match(twConfigSrc, /dark:\s*\{/, 'Tailwind config must define semantic dark palette');
    assert.match(twConfigSrc, /bg:\s*'#0B0F17'/, 'Dark bg must be #0B0F17');
    assert.match(twConfigSrc, /card:\s*'#131B2A'/, 'Dark card must be #131B2A');
  });
});
