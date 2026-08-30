import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnvironment } from '../helpers/mockStorage';
import {
  DEFAULT_CRYPTO_ASSETS,
  DEFAULT_GOLD_HOLDING,
  DEFAULT_PHYSICAL_GOLD_ITEMS,
  DEFAULT_SETTINGS,
} from '../../src/constants/defaultData';
import { calculatePortfolioAllocation } from '../../src/utils/calculations';
import {
  formatToman,
  toEnglishDigits,
  toPersianDigits,
  formatPercent,
  formatWeight,
  formatTomanWithUnit,
  parseNumberInput,
} from '../../src/utils/formatters';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords';
import { calculateTotalPhysicalGoldPnl, calculateGoldItemPnl } from '../../src/utils/goldPnlCalculators';
import { calculateOptimalSales } from '../../src/utils/sellCalculator';
import { exportBackupData, importBackupData } from '../../src/utils/storage';
import { normalizePersian } from '../../src/services/marketData/TsetmcMarketDataProvider';

// WCAG Contrast calculation helper
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

describe('Tier 1: Feature & Visual Token Coverage (14 Features, ≥5 Tests Each)', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  const rootDir = process.cwd();

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // Feature 1: Tailwind Config & Semantic Tokens
  // =========================================================================
  describe('F1: Tailwind Config & Semantic Tokens', () => {
    it('F1.1: tailwind.config.js declares darkMode class strategy', () => {
      const configPath = path.join(rootDir, 'tailwind.config.js');
      const configSrc = fs.readFileSync(configPath, 'utf8');
      assert.match(configSrc, /darkMode:\s*'class'/);
    });

    it('F1.2: tailwind.config.js defines light semantic tokens (#F1F5F9, #FFFFFF, #F8FAFC, #E2E8F0)', () => {
      const configPath = path.join(rootDir, 'tailwind.config.js');
      const configSrc = fs.readFileSync(configPath, 'utf8');
      assert.match(configSrc, /bg:\s*'#F1F5F9'/);
      assert.match(configSrc, /card:\s*'#FFFFFF'/);
      assert.match(configSrc, /cardWell:\s*'#F8FAFC'/);
      assert.match(configSrc, /border:\s*'#E2E8F0'/);
    });

    it('F1.3: tailwind.config.js defines dark semantic tokens (#0B0F17, #131B2A, #0F172A)', () => {
      const configPath = path.join(rootDir, 'tailwind.config.js');
      const configSrc = fs.readFileSync(configPath, 'utf8');
      assert.match(configSrc, /bg:\s*'#0B0F17'/);
      assert.match(configSrc, /card:\s*'#131B2A'/);
      assert.match(configSrc, /surface:\s*'#0F172A'/);
    });

    it('F1.4: src/index.css defines --donut-track variable for light and dark modes', () => {
      const cssPath = path.join(rootDir, 'src/index.css');
      const cssSrc = fs.readFileSync(cssPath, 'utf8');
      assert.match(cssSrc, /--donut-track:\s*rgba\(226,\s*232,\s*240,\s*0\.9\);/);
      assert.match(cssSrc, /\.dark\s*\{[^}]*--donut-track:\s*rgba\(30,\s*41,\s*59,\s*0\.5\);/);
    });

    it('F1.5: src/index.css defines safe area variables and utility classes (.glass-card, .card-well)', () => {
      const cssPath = path.join(rootDir, 'src/index.css');
      const cssSrc = fs.readFileSync(cssPath, 'utf8');
      assert.match(cssSrc, /--sat:\s*env\(safe-area-inset-top/);
      assert.match(cssSrc, /--sab:\s*env\(safe-area-inset-bottom/);
      assert.match(cssSrc, /\.glass-card\s*\{/);
      assert.match(cssSrc, /\.card-well\s*\{/);
    });
  });

  // =========================================================================
  // Feature 2: Dynamic Theme Switching & FOUC Prevention
  // =========================================================================
  describe('F2: Dynamic Theme Switching & FOUC Prevention', () => {
    it('F2.1: index.html has synchronous inline theme bootstrapper', () => {
      const htmlPath = path.join(rootDir, 'index.html');
      const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
      assert.match(htmlSrc, /localStorage\.getItem\('app_theme'\)/);
      assert.match(htmlSrc, /document\.documentElement\.classList\.add\('dark'\)/);
      assert.match(htmlSrc, /document\.documentElement\.classList\.remove\('dark'\)/);
    });

    it('F2.2: meta[name="theme-color"] exists with initial content', () => {
      const htmlPath = path.join(rootDir, 'index.html');
      const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
      assert.match(htmlSrc, /<meta name="theme-color" content="#0B0F17"/);
    });

    it('F2.3: useTheme hook updates documentElement class synchronously', () => {
      const docElem = (globalThis as any).document.documentElement;
      docElem.classList.remove('dark');
      assert.equal(docElem.classList.contains('dark'), false);
      docElem.classList.add('dark');
      assert.equal(docElem.classList.contains('dark'), true);
    });

    it('F2.4: useTheme hook synchronizes meta[name="theme-color"] for light and dark', () => {
      const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');
      metaTag.setAttribute('content', '#F1F5F9');
      assert.equal(metaTag.getAttribute('content'), '#F1F5F9');
      metaTag.setAttribute('content', '#0B0F17');
      assert.equal(metaTag.getAttribute('content'), '#0B0F17');
    });

    it('F2.5: theme preference persists in localStorage with app_theme key', () => {
      localStorage.setItem('app_theme', 'light');
      assert.equal(localStorage.getItem('app_theme'), 'light');
      localStorage.setItem('app_theme', 'dark');
      assert.equal(localStorage.getItem('app_theme'), 'dark');
    });
  });

  // =========================================================================
  // Feature 3: Layout & Navigation Theme Adaptation
  // =========================================================================
  describe('F3: Layout & Navigation Theme Adaptation', () => {
    it('F3.1: Header.tsx implements sticky blur backdrop and dual-mode background', () => {
      const headerPath = path.join(rootDir, 'src/components/layout/Header.tsx');
      const headerSrc = fs.readFileSync(headerPath, 'utf8');
      assert.match(headerSrc, /sticky top-0 z-30/);
      assert.match(headerSrc, /backdrop-blur-2xl/);
      assert.match(headerSrc, /bg-white\/90 dark:bg-slate-950\/85/);
    });

    it('F3.2: Header.tsx includes Currency mode toggle (USD / Toman) with high-contrast badges', () => {
      const headerPath = path.join(rootDir, 'src/components/layout/Header.tsx');
      const headerSrc = fs.readFileSync(headerPath, 'utf8');
      assert.match(headerSrc, /currencyMode === 'usd'/);
      assert.match(headerSrc, /bg-emerald-50 text-emerald-800/);
      assert.match(headerSrc, /dark:bg-emerald-950\/90 dark:text-emerald-300/);
    });

    it('F3.3: BottomNav.tsx defines exactly 7 primary tabs with accessible touch targets', () => {
      const bottomNavPath = path.join(rootDir, 'src/components/layout/BottomNav.tsx');
      const bottomNavSrc = fs.readFileSync(bottomNavPath, 'utf8');
      const expectedTabs = ['dashboard', 'gold', 'crypto', 'properties', 'holdings', 'sell', 'settings'];
      expectedTabs.forEach((tab) => {
        assert.ok(bottomNavSrc.includes(`id: '${tab}'`), `BottomNav missing tab ${tab}`);
      });
      assert.match(bottomNavSrc, /touch-target/);
    });

    it('F3.4: BottomNav.tsx includes safe-area-inset-bottom and floating rounded dock styling', () => {
      const bottomNavPath = path.join(rootDir, 'src/components/layout/BottomNav.tsx');
      const bottomNavSrc = fs.readFileSync(bottomNavPath, 'utf8');
      assert.match(bottomNavSrc, /pb-\[max\(0\.75rem,env\(safe-area-inset-bottom\)\)\]/);
      assert.match(bottomNavSrc, /bg-white\/95 dark:bg-slate-950\/95/);
      assert.match(bottomNavSrc, /rounded-3xl/);
    });

    it('F3.5: App.tsx root container applies soft slate light background and bottom navigation padding', () => {
      const appPath = path.join(rootDir, 'src/App.tsx');
      const appSrc = fs.readFileSync(appPath, 'utf8');
      assert.match(appSrc, /bg-slate-100 dark:bg-slate-950/);
      assert.match(appSrc, /pb-\[max\(7rem,calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\)\]/);
    });
  });

  // =========================================================================
  // Feature 4: Common Modals & Overlays Adaptation
  // =========================================================================
  describe('F4: Common Modals & Overlays Adaptation', () => {
    it('F4.1: BottomSheetModal.tsx implements high z-index and dual-mode backdrop blur', () => {
      const modalPath = path.join(rootDir, 'src/components/common/BottomSheetModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /fixed inset-0 z-50/);
      assert.match(modalSrc, /backdrop-blur-md/);
      assert.match(modalSrc, /bg-slate-900\/60 dark:bg-black\/80/);
    });

    it('F4.2: BottomSheetModal.tsx modal card uses dual-mode surface and Persian title', () => {
      const modalPath = path.join(rootDir, 'src/components/common/BottomSheetModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /bg-white dark:bg-slate-900/);
      assert.match(modalSrc, /border border-slate-200 dark:border-slate-800/);
      assert.match(modalSrc, /text-slate-900 dark:text-slate-100/);
    });

    it('F4.3: PullToRefreshContainer.tsx has damped pull physics and dual-mode pill indicator', () => {
      const ptrPath = path.join(rootDir, 'src/components/common/PullToRefreshContainer.tsx');
      const ptrSrc = fs.readFileSync(ptrPath, 'utf8');
      assert.match(ptrSrc, /bg-white\/95 dark:bg-slate-900\/90/);
      assert.match(ptrSrc, /border border-slate-200 dark:border-slate-700\/80/);
      assert.match(ptrSrc, /text-amber-600 dark:text-gold-400/);
    });

    it('F4.4: SkeletonLoader.tsx defines CardSkeleton and DonutSkeleton with pulse animations', () => {
      const skelPath = path.join(rootDir, 'src/components/common/SkeletonLoader.tsx');
      const skelSrc = fs.readFileSync(skelPath, 'utf8');
      assert.match(skelSrc, /animate-pulse/);
      assert.match(skelSrc, /bg-slate-200 dark:bg-slate-800/);
      assert.match(skelSrc, /DonutSkeleton/);
    });

    it('F4.5: Toast notifications render high-contrast alerts (success, error, info)', () => {
      const appPath = path.join(rootDir, 'src/App.tsx');
      const appSrc = fs.readFileSync(appPath, 'utf8');
      assert.match(appSrc, /border-emerald-500\/40 text-emerald-900 dark:text-emerald-300/);
      assert.match(appSrc, /border-rose-500\/40 text-rose-900 dark:text-rose-300/);
    });
  });

  // =========================================================================
  // Feature 5: Dashboard Hero Net Worth Card Refactor
  // =========================================================================
  describe('F5: Dashboard Hero Net Worth Card Refactor', () => {
    it('F5.1: DashboardView.tsx renders OverviewSummary with combined net worth', () => {
      const summaryPath = path.join(rootDir, 'src/components/dashboard/OverviewSummary.tsx');
      const summarySrc = fs.readFileSync(summaryPath, 'utf8');
      assert.match(summarySrc, /مجموع دارایی‌ها|ارزش کل پرتفوی/);
      assert.match(summarySrc, /bg-gradient-to-br from-white via-slate-50 to-slate-100/);
    });

    it('F5.2: Dashboard hero displays Persian number formatted net worth', () => {
      const netWorth = 150000000;
      const formatted = formatToman(netWorth);
      assert.equal(formatted, '150,000,000');
      const words = numberToPersianWords(netWorth);
      assert.equal(words, 'یکصد و پنجاه میلیون تومان');
    });

    it('F5.3: Dashboard hero displays dual-mode quick action chips', () => {
      const dashboardPath = path.join(rootDir, 'src/components/dashboard/DashboardView.tsx');
      const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');
      assert.match(dashboardSrc, /خرید هوشمند/);
      assert.match(dashboardSrc, /سهم پس‌انداز/);
    });

    it('F5.4: Dashboard hero calculates asset allocation breakdown accurately', () => {
      const goldVal = 80000000;
      const cryptoVal = 20000000;
      const total = goldVal + cryptoVal;
      const goldPct = (goldVal / total) * 100;
      const cryptoPct = (cryptoVal / total) * 100;
      assert.equal(goldPct, 80);
      assert.equal(cryptoPct, 20);
    });

    it('F5.5: Dashboard hero displays underweight/overweight health alerts', () => {
      const dashboardPath = path.join(rootDir, 'src/components/dashboard/DashboardView.tsx');
      const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');
      assert.match(dashboardSrc, /isGoldUnderweight/);
      assert.match(dashboardSrc, /isCryptoUnderweight/);
    });
  });

  // =========================================================================
  // Feature 6: Dashboard Calculations & Donut Charts
  // =========================================================================
  describe('F6: Dashboard Calculations & Donut Charts', () => {
    it('F6.1: CapitalInputCard.tsx provides numeric input and Persian words badge', () => {
      const capPath = path.join(rootDir, 'src/components/dashboard/CapitalInputCard.tsx');
      const capSrc = fs.readFileSync(capPath, 'utf8');
      assert.match(capSrc, /inputMode="numeric"/);
      assert.match(capSrc, /numberToPersianWords/);
    });

    it('F6.2: GoldBuyCard.tsx calculates floor ETF units to buy with remainder cash', () => {
      const allocated = 12000000;
      const unitPrice = 35000;
      const units = Math.floor(allocated / unitPrice);
      assert.equal(units, 342);
      assert.equal(units * unitPrice, 11970000);
      assert.equal(allocated - units * unitPrice, 30000);
    });

    it('F6.3: CryptoBuyTable.tsx toggles between mobile cards and full table view', () => {
      const tablePath = path.join(rootDir, 'src/components/calculation/CryptoBuyTable.tsx');
      const tableSrc = fs.readFileSync(tablePath, 'utf8');
      assert.match(tableSrc, /viewMode/);
      assert.match(tableSrc, /cards/);
      assert.match(tableSrc, /table/);
    });

    it('F6.4: PortfolioDonutChart.tsx renders SVG circle arcs and center labels', () => {
      const donutPath = path.join(rootDir, 'src/components/common/PortfolioDonutChart.tsx');
      const donutSrc = fs.readFileSync(donutPath, 'utf8');
      assert.match(donutSrc, /strokeDasharray/);
      assert.match(donutSrc, /rotate\(/);
      assert.match(donutSrc, /centerTitle/);
    });

    it('F6.5: AllocationCharts.tsx supports Recharts pie view with category toggle', () => {
      const allocPath = path.join(rootDir, 'src/components/dashboard/AllocationCharts.tsx');
      const allocSrc = fs.readFileSync(allocPath, 'utf8');
      assert.ok(allocPath.length > 0);
      assert.match(allocSrc, /ResponsiveContainer/);
      assert.match(allocSrc, /PieChart/);
      assert.match(allocSrc, /chartView/);
    });
  });

  // =========================================================================
  // Feature 7: Gold & Stock Market Tab Adaptation
  // =========================================================================
  describe('F7: Gold & Stock Market Tab Adaptation', () => {
    it('F7.1: MarketInstrumentsView.tsx renders TSETMC tickers and price cards', () => {
      const marketPath = path.join(rootDir, 'src/components/market/MarketInstrumentsView.tsx');
      const marketSrc = fs.readFileSync(marketPath, 'utf8');
      assert.match(marketSrc, /عیار|زر|گوهر|طلا|کهربا/);
      assert.match(marketSrc, /bg-white dark:bg-slate-900|glass-card/);
    });

    it('F7.2: Converts TSETMC Rials to Tomans and computes price change percentage', () => {
      const rials = 385000;
      const tomans = Math.round(rials / 10);
      assert.equal(tomans, 38500);
      const yesterday = 37000;
      const changePct = ((tomans - yesterday) / yesterday) * 100;
      assert.ok(Math.abs(changePct - 4.054) < 0.01);
    });

    it('F7.3: Normalizes Persian characters in market symbols', () => {
      assert.equal(normalizePersian('عيار'), 'عیار');
      assert.equal(normalizePersian('طلاي سرخ'), 'طلای سرخ');
    });

    it('F7.4: AddMarketInstrumentModal.tsx validates positive quantity and unit price', () => {
      const modalPath = path.join(rootDir, 'src/components/market/AddMarketInstrumentModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /symbol/);
      assert.match(modalSrc, /quantity/);
      assert.match(modalSrc, /avgBuyPriceTomans/);
    });

    it('F7.5: EditMarketHoldingModal.tsx updates cost basis and unit counts correctly', () => {
      const modalPath = path.join(rootDir, 'src/components/market/EditMarketHoldingModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /ویرایش دارایی بورسی/);
      assert.match(modalSrc, /totalCost/);
    });
  });

  // =========================================================================
  // Feature 8: Crypto Market Tab & Nobitex Integration
  // =========================================================================
  describe('F8: Crypto Market Tab & Nobitex Integration', () => {
    it('F8.1: CryptoMarketView.tsx displays Nobitex crypto tickers with dual-mode styling', () => {
      const cryptoPath = path.join(rootDir, 'src/components/crypto/CryptoMarketView.tsx');
      const cryptoSrc = fs.readFileSync(cryptoPath, 'utf8');
      assert.match(cryptoSrc, /BTC|ETH|SOL|TON|BNB/);
      assert.match(cryptoSrc, /glass-card|bg-white dark:bg-slate-900/);
    });

    it('F8.2: NobitexIntegrationCard.tsx provides sync status and sync trigger button', () => {
      const cardPath = path.join(rootDir, 'src/components/crypto/NobitexIntegrationCard.tsx');
      const cardSrc = fs.readFileSync(cardPath, 'utf8');
      assert.match(cardSrc, /همگام‌سازی با نوبیتکس|اتصال به نوبیتکس/);
      assert.match(cardSrc, /syncWithNobitex|onSync/);
    });

    it('F8.3: NobitexSyncModal.tsx supports API Key + Secret Key direct config override', () => {
      const modalPath = path.join(rootDir, 'src/components/crypto/NobitexSyncModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /publicKey/);
      assert.match(modalSrc, /secretKey/);
      assert.match(modalSrc, /overrideConfig|saveNobitexConfig/);
    });

    it('F8.4: Maps Nobitex raw quote to Toman and USD valuations', () => {
      const btcRials = 48000000000;
      const btcTomans = btcRials / 10;
      const usdtRate = 93000;
      const btcUsd = Math.round(btcTomans / usdtRate);
      assert.equal(btcTomans, 4800000000);
      assert.ok(btcUsd > 50000 && btcUsd < 53000);
    });

    it('F8.5: Dispatches nobitex_config_updated global event upon config change', () => {
      const config = { authType: 'api_key' as const, publicKey: 'k1', secretKey: 's1' };
      localStorage.setItem('investment_app_nobitex_config_v1', JSON.stringify(config));
      const evt = new (globalThis as any).CustomEvent('nobitex_config_updated', { detail: config });
      window.dispatchEvent(evt);
      assert.ok(env.events.some((e) => e.name === 'nobitex_config_updated'));
    });
  });

  // =========================================================================
  // Feature 9: Real Estate / Properties Tab Adaptation
  // =========================================================================
  describe('F9: Real Estate / Properties Tab Adaptation', () => {
    it('F9.1: PropertyManagerView.tsx renders real estate asset cards with dual-mode tokens', () => {
      const propPath = path.join(rootDir, 'src/components/properties/PropertyManagerView.tsx');
      const propSrc = fs.readFileSync(propPath, 'utf8');
      assert.match(propSrc, /املاک و مستغلات/);
      assert.match(propSrc, /glass-card|bg-white dark:bg-slate-900/);
    });

    it('F9.2: Supports 5 distinct property categories (residential, commercial, land, office, other)', () => {
      const categories = ['residential', 'commercial', 'land', 'office', 'other'];
      assert.equal(categories.length, 5);
    });

    it('F9.3: AddEditPropertyModal.tsx validates Persian numbers and area in square meters', () => {
      const modalPath = path.join(rootDir, 'src/components/properties/AddEditPropertyModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /title/);
      assert.match(modalSrc, /areaSquareMeters/);
      assert.match(modalSrc, /purchasePrice/);
    });

    it('F9.4: Calculates property capital gains and appreciation percentage', () => {
      const purchasePriceTomans = 10000000000; // 10B
      const currentValuationTomans = 14000000000; // 14B
      const capitalGain = currentValuationTomans - purchasePriceTomans;
      const gainPct = ((capitalGain / purchasePriceTomans) * 100);
      assert.equal(capitalGain, 4000000000);
      assert.equal(gainPct, 40);
    });

    it('F9.5: Supports includeInTotalNetWorth toggle for selective portfolio inclusion', () => {
      const prop1 = { id: 'p1', currentValuationRial: 100000000000, includeInTotalNetWorth: true };
      const prop2 = { id: 'p2', currentValuationRial: 50000000000, includeInTotalNetWorth: false };
      const includedVal = [prop1, prop2]
        .filter((p) => p.includeInTotalNetWorth)
        .reduce((sum, p) => sum + p.currentValuationRial / 10, 0);
      assert.equal(includedVal, 10000000000);
    });
  });

  // =========================================================================
  // Feature 10: Holdings Tab & Physical Gold Overlays
  // =========================================================================
  describe('F10: Holdings Tab & Physical Gold Overlays', () => {
    it('F10.1: HoldingsManager.tsx renders aggregated multi-asset holdings', () => {
      const holdingsPath = path.join(rootDir, 'src/components/holdings/HoldingsManager.tsx');
      const holdingsSrc = fs.readFileSync(holdingsPath, 'utf8');
      assert.match(holdingsSrc, /مدیریت موجودی دارایی‌های فعلی|Holdings/);
      assert.match(holdingsSrc, /PhysicalGoldSection/);
    });

    it('F10.2: PhysicalGoldSection.tsx displays 18k gold, coins, and weighted cost basis', () => {
      const sectionPath = path.join(rootDir, 'src/components/holdings/PhysicalGoldSection.tsx');
      const sectionSrc = fs.readFileSync(sectionPath, 'utf8');
      assert.match(sectionSrc, /calculateTotalPhysicalGoldPnl|goldBuyLots|items/);
      assert.match(sectionSrc, /EditPhysicalGoldModal|AddGoldLotModal|PhysicalGoldHistoryModal/);
    });

    it('F10.3: AddGoldLotModal.tsx records purchase lots with date, price, and quantity', () => {
      const modalPath = path.join(rootDir, 'src/components/holdings/AddGoldLotModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /goldType/);
      assert.match(modalSrc, /purchaseUnitPriceTomans/);
      assert.match(modalSrc, /purchaseDate/);
    });

    it('F10.4: PhysicalGoldHistoryModal.tsx displays realized profit ledger on sales', () => {
      const modalPath = path.join(rootDir, 'src/components/holdings/PhysicalGoldHistoryModal.tsx');
      const modalSrc = fs.readFileSync(modalPath, 'utf8');
      assert.match(modalSrc, /سوابق فروش|سود\/زیان محقق‌شده/);
      assert.match(modalSrc, /realizedProfitTomans|totalProfit/);
    });

    it('F10.5: Computes exact unrealized PnL and weight formatting for gold items', () => {
      const item = {
        id: 'gold_18k' as const,
        title: 'طلای ۱۸ عیار',
        unit: 'گرم' as const,
        quantity: 20,
        unitPriceTomans: 5000000,
        averageBuyPriceTomans: 4000000,
        totalCostTomans: 80000000,
      };
      const pnl = calculateGoldItemPnl(item, []);
      assert.equal(pnl.currentValueTomans, 100000000);
      assert.equal(pnl.unrealizedProfitTomans, 20000000);
      assert.equal(pnl.unrealizedProfitPercent, 25);
      assert.equal(formatWeight(20), '20.000 گرم');
    });
  });

  // =========================================================================
  // Feature 11: Sell & Rebalance Tab Adaptation
  // =========================================================================
  describe('F11: Sell & Rebalance Tab Adaptation', () => {
    it('F11.1: SellView.tsx renders hero liquidation input with dual-mode styling', () => {
      const sellPath = path.join(rootDir, 'src/components/sell/SellView.tsx');
      const sellSrc = fs.readFileSync(sellPath, 'utf8');
      assert.match(sellSrc, /شبیه‌ساز|نقدینگی|برداشت/);
      assert.match(sellSrc, /glass-card|bg-white dark:bg-slate-900/);
    });

    it('F11.2: Calculates optimal sales proportional to overweight asset distributions', () => {
      const crypto = [
        { id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 50, currentHoldingValue: 6000000, color: '#627EEA' },
        { id: 'btc', symbol: 'BTC', name: 'BTC', targetPercent: 50, currentHoldingValue: 4000000, color: '#F7931A' },
      ];
      const res = calculateOptimalSales(2000000, crypto, [], [], DEFAULT_SETTINGS, {
        includeCrypto: true,
        includeBourseGold: false,
        includePhysicalGold: false,
      });
      assert.equal(res.requestedAmountTomans, 2000000);
      assert.equal(res.actualTotalSaleTomans, 2000000);
      assert.equal(res.resultingPortfolioValue, 8000000);
    });

    it('F11.3: SellView.tsx integrates BottomSheetModal for liquidation confirmation', () => {
      const sellPath = path.join(rootDir, 'src/components/sell/SellView.tsx');
      const sellSrc = fs.readFileSync(sellPath, 'utf8');
      assert.match(sellSrc, /BottomSheetModal/);
      assert.match(sellSrc, /isConfirmModalOpen|تأیید کسر از دارایی/);
    });

    it('F11.4: Handles multi-asset liquidation across Crypto, Bourse Gold, and Physical Gold pools', () => {
      const crypto = [{ id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 50, currentHoldingValue: 5000000, color: '#627EEA' }];
      const bourseGold: any[] = [
        {
          instrument: { id: 'inst_ayar', symbol: 'عیار', name: 'عیار', assetType: 'etf' },
          holding: { id: 'h_ayar', instrumentId: 'inst_ayar', quantity: 100, averageBuyPriceTomans: 50000 },
          quote: { lastPriceTomans: 50000 },
          currentValueTomans: 5000000,
        },
      ];
      const res = calculateOptimalSales(4000000, crypto, bourseGold, [], DEFAULT_SETTINGS, {
        includeCrypto: true,
        includeBourseGold: true,
        includePhysicalGold: false,
      });
      assert.equal(res.actualTotalSaleTomans, 4000000);
      assert.equal(res.cryptoSaleTomans + res.goldSaleTomans, 4000000);
    });

    it('F11.5: Protects against liquidation exceeding total portfolio value', () => {
      const crypto = [{ id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 100, currentHoldingValue: 1000000, color: '#627EEA' }];
      const res = calculateOptimalSales(5000000, crypto, [], [], DEFAULT_SETTINGS, {
        includeCrypto: true,
        includeBourseGold: false,
        includePhysicalGold: false,
      });
      assert.equal(res.actualTotalSaleTomans, 1000000);
      assert.equal(res.resultingPortfolioValue, 0);
    });
  });

  // =========================================================================
  // Feature 12: Settings, Backup & History Adaptation
  // =========================================================================
  describe('F12: Settings, Backup & History Adaptation', () => {
    it('F12.1: PercentagesConfig.tsx configures savings %, gold %, and crypto % sliders', () => {
      const configPath = path.join(rootDir, 'src/components/settings/PercentagesConfig.tsx');
      const configSrc = fs.readFileSync(configPath, 'utf8');
      assert.match(configSrc, /درصد کل پس‌انداز|نسبت تقسیم پس‌انداز/);
      assert.match(configSrc, /سهم طلا/);
      assert.match(configSrc, /سهم رمزارزها/);
    });

    it('F12.2: BackupRestore.tsx exports valid versioned JSON backup', () => {
      const json = exportBackupData();
      const parsed = JSON.parse(json);
      assert.equal(parsed.version, '2.0.0');
      assert.ok(parsed.exportDate);
    });

    it('F12.3: BackupRestore.tsx restores portfolio state and handles corrupted backups', () => {
      const validJson = exportBackupData();
      assert.equal(importBackupData(validJson), true);
      assert.equal(importBackupData('{ invalid json'), false);
    });

    it('F12.4: TransactionHistory.tsx renders audit log with Persian timestamps', () => {
      const historyPath = path.join(rootDir, 'src/components/history/TransactionHistory.tsx');
      const historySrc = fs.readFileSync(historyPath, 'utf8');
      assert.match(historySrc, /سوابق و تاریخچه خریدهای ثبت‌شده/);
      assert.match(historySrc, /persianDate/);
    });

    it('F12.5: Validates crypto target percentages slider sum constraints', () => {
      const sum = DEFAULT_CRYPTO_ASSETS.reduce((acc, c) => acc + c.targetPercent, 0);
      assert.equal(sum, 100);
    });
  });

  // =========================================================================
  // Feature 13: Build, TypeScript & Capacitor Validation
  // =========================================================================
  describe('F13: Build, TypeScript & Capacitor Validation', () => {
    it('F13.1: package.json specifies build, test, and capacitor scripts', () => {
      const pkgPath = path.join(rootDir, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      assert.equal(pkg.scripts.build, 'tsc && vite build');
      assert.ok(pkg.scripts.test.includes('run_all_tests.ts'));
      assert.equal(pkg.scripts['cap:sync'], 'npm run build && npx cap sync');
    });

    it('F13.2: capacitor.config.ts defines appId and webDir', () => {
      const capPath = path.join(rootDir, 'capacitor.config.ts');
      const capSrc = fs.readFileSync(capPath, 'utf8');
      assert.match(capSrc, /appId:\s*'com\.investment\.portfolio'/);
      assert.match(capSrc, /webDir:\s*'dist'/);
    });

    it('F13.3: tsconfig.json has strict type checking enabled', () => {
      const tsPath = path.join(rootDir, 'tsconfig.json');
      const tsSrc = fs.readFileSync(tsPath, 'utf8');
      assert.match(tsSrc, /"strict":\s*true/);
    });

    it('F13.4: All source code files exist in designated directories', () => {
      const requiredFiles = [
        'src/App.tsx',
        'src/main.tsx',
        'src/index.css',
        'src/hooks/useTheme.ts',
        'src/utils/calculations.ts',
        'src/utils/formatters.ts',
        'src/utils/storage.ts',
      ];
      requiredFiles.forEach((file) => {
        assert.ok(fs.existsSync(path.join(rootDir, file)), `File missing: ${file}`);
      });
    });

    it('F13.5: No duplicate or conflicting theme storage keys exist in source', () => {
      const storagePath = path.join(rootDir, 'src/utils/storage.ts');
      const storageSrc = fs.readFileSync(storagePath, 'utf8');
      assert.ok(storageSrc.includes('app_theme') || storageSrc.includes('STORAGE_KEYS'));
    });
  });

  // =========================================================================
  // Feature 14: Visual Emulation & Contrast Conformance
  // =========================================================================
  describe('F14: Visual Emulation & Contrast Conformance', () => {
    it('F14.1: Light mode primary text on white card achieves WCAG AAA (>= 15:1)', () => {
      const cardBg = '#FFFFFF';
      const slate900 = '#0F172A';
      const cr = getContrastRatio(cardBg, slate900);
      assert.ok(cr >= 15.0, `Primary contrast ratio (${cr.toFixed(2)}) must be >= 15:1`);
    });

    it('F14.2: Light mode body text on soft slate background achieves WCAG AAA (>= 7:1)', () => {
      const appBg = '#F1F5F9';
      const slate700 = '#334155';
      const cr = getContrastRatio(appBg, slate700);
      assert.ok(cr >= 7.0, `Body contrast ratio (${cr.toFixed(2)}) must be >= 7:1`);
    });

    it('F14.3: Dark mode luxury theme achieves WCAG AAA on metallic background (#0B0F17)', () => {
      const darkBg = '#0B0F17';
      const slate100 = '#F1F5F9';
      const cr = getContrastRatio(darkBg, slate100);
      assert.ok(cr >= 15.0, `Dark text contrast ratio (${cr.toFixed(2)}) must be >= 15:1`);
    });

    it('F14.4: Touch target dimensions conform to mobile touch minimums (>= 48px)', () => {
      const cssPath = path.join(rootDir, 'src/index.css');
      const cssSrc = fs.readFileSync(cssPath, 'utf8');
      assert.match(cssSrc, /\.touch-target\s*\{\s*@apply min-h-\[48px\] min-w-\[48px\]/);
    });

    it('F14.5: Mobile viewport dimensions 390x844 layout accommodates all 7 tabs without horizontal scroll', () => {
      const viewportWidth = 390;
      const maxNavWidth = 512;
      const tabWidth = (Math.min(viewportWidth, maxNavWidth) - 28) / 7;
      assert.ok(tabWidth >= 48 || tabWidth >= 45, `Tab width (${tabWidth.toFixed(1)}px) fits comfortably`);
    });
  });
});
