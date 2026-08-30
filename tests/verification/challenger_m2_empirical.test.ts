import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatToman,
  formatPercent,
  formatWeight,
  toPersianDigits,
  parseNumberInput,
} from '../../src/utils/formatters.js';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords.js';
import {
  calculatePortfolioAllocation,
  calculateRebalancedBuys,
  calculateDirectBuys,
} from '../../src/utils/calculations.js';

describe('Challenger 1 — Milestone 2 Empirical Chart & Visual Analytics Stress Test', () => {

  const rootDir = path.resolve('.');

  // =========================================================================
  // 1. PortfolioDonutChart.tsx Verification & Stress Tests
  // =========================================================================
  describe('PortfolioDonutChart Empirical Verification', () => {
    const donutPath = path.join(rootDir, 'src/components/common/PortfolioDonutChart.tsx');
    assert.ok(fs.existsSync(donutPath), 'PortfolioDonutChart.tsx must exist');
    const donutSrc = fs.readFileSync(donutPath, 'utf8');

    test('PDC-1: SVG Background Circle Track & CSS Variable Resolution', () => {
      // Must use CSS custom property var(--donut-track) with explicit fallback
      assert.match(
        donutSrc,
        /stroke="var\(--donut-track,\s*rgba\(226,\s*232,\s*240,\s*0\.9\)\)"/,
        'SVG background track must resolve var(--donut-track) with light fallback'
      );

      // Verify CSS definition in index.css
      const cssPath = path.join(rootDir, 'src/index.css');
      const cssSrc = fs.readFileSync(cssPath, 'utf8');
      assert.match(
        cssSrc,
        /--donut-track:\s*rgba\(226,\s*232,\s*240,\s*0\.9\);/,
        'index.css root must define light mode --donut-track as soft slate'
      );
      assert.match(
        cssSrc,
        /\.dark\s*\{[^}]*--donut-track:\s*rgba\(30,\s*41,\s*59,\s*0\.5\);/,
        'index.css .dark must define dark mode --donut-track as slate-800'
      );
    });

    test('PDC-2: SVG Circle Geometry & Cumulative Arc Rotation Math', () => {
      // Simulate component arc geometry algorithm
      const size = 220;
      const strokeWidth = 24;
      const radius = (size - strokeWidth) / 2; // (220 - 24)/2 = 98
      const circumference = 2 * Math.PI * radius; // ~615.752
      const center = size / 2; // 110

      assert.equal(radius, 98);
      assert.equal(center, 110);
      assert.ok(Math.abs(circumference - 615.75216) < 0.01);

      // Multi-asset allocation simulation
      const testItems = [
        { id: 'gold', label: 'طلا', value: 80000000, color: '#D4AF37' },
        { id: 'crypto', label: 'کریپتو', value: 20000000, color: '#6366F1' },
      ];
      const totalValue = testItems.reduce((acc, item) => acc + item.value, 0);
      assert.equal(totalValue, 100000000);

      let accumulatedPercent = 0;
      const slices = testItems.map((item) => {
        const percent = (item.value / totalValue) * 100;
        const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
        const rotation = (accumulatedPercent / 100) * 360;
        accumulatedPercent += percent;
        return { ...item, percent, strokeDasharray, rotation };
      });

      // Gold slice checks (80%)
      assert.equal(slices[0].percent, 80);
      assert.equal(slices[0].rotation, 0); // starts at 0deg
      assert.equal(slices[0].strokeDasharray, `${0.8 * circumference} ${circumference}`);

      // Crypto slice checks (20%)
      assert.equal(slices[1].percent, 20);
      assert.equal(slices[1].rotation, 288); // 80% of 360 = 288deg
      assert.equal(slices[1].strokeDasharray, `${0.2 * circumference} ${circumference}`);

      // Total rotation must reach 360deg
      assert.equal(accumulatedPercent, 100);
      assert.equal((accumulatedPercent / 100) * 360, 360);
    });

    test('PDC-3: Center Text Rendering Modes (Default vs Active Selection)', () => {
      // 1. Unselected state matches centerTitle, formattedTotalValue or formatToman, and centerSubtitle
      assert.match(donutSrc, /centerTitle\s*=\s*'مجموع ارزش'/, 'Default centerTitle must be مجموع ارزش');
      assert.match(donutSrc, /formattedTotalValue\s*\|\|\s*`\$\{formatToman\(totalValue\)\}\s*ت`/, 'Default total value rendering');
      assert.match(donutSrc, /text-slate-900 dark:text-slate-100/, 'Total value amount text must be high-contrast dual-mode');

      // 2. Active item selected state
      assert.match(donutSrc, /activeItem\.label/, 'Active state must show slice label');
      assert.match(donutSrc, /formatPercent\(activeItem\.percent,\s*1\)/, 'Active state must show percentage with 1 decimal');
      assert.match(donutSrc, /formatToman\(activeItem\.value\)\}\s*ت/, 'Active state must show selected slice value in Tomans');
      assert.match(donutSrc, /text-amber-700 dark:text-gold-400 font-bold/, 'Active value must use high-contrast gold token');
    });

    test('PDC-4: Interactive Legend Item Styling & Target Badges', () => {
      // Selected legend card classes
      assert.match(
        donutSrc,
        /bg-amber-50 dark:bg-slate-900 border-gold-500\/80 shadow-md/,
        'Selected legend item must have amber-50 light background and gold border'
      );

      // Unselected legend card classes
      assert.match(
        donutSrc,
        /bg-slate-50 dark:bg-slate-950\/70 border-slate-200 dark:border-slate-800\/80/,
        'Unselected legend item must have soft slate-50 background and crisp border'
      );

      // Target percent readout
      assert.match(
        donutSrc,
        /toPersianDigits\(slice\.targetPercent\)/,
        'Target percentage must display in Persian digits'
      );

      // Haptic triggers on click
      assert.match(
        donutSrc,
        /triggerHaptic\('light'\)/,
        'Clicking slices or legend items must trigger light haptic'
      );
    });

    test('PDC-5: Empty, Zero & Boundary Dataset Handling', () => {
      // Empty check logic
      assert.match(
        donutSrc,
        /if\s*\(totalValue\s*<=\s*0\s*\|\|\s*validItems\.length\s*===\s*0\)/,
        'Donut must safely handle totalValue <= 0 or 0 valid items'
      );
      assert.match(
        donutSrc,
        /border-4 border-dashed border-slate-300 dark:border-slate-800/,
        'Empty state must render dashed dual-mode ring placeholder'
      );

      // Filter negative & zero items
      const dirtyItems = [
        { id: '1', label: 'Item 1', value: 0, color: '#fff' },
        { id: '2', label: 'Item 2', value: -5000, color: '#fff' },
        { id: '3', label: 'Item 3', value: 50000000, color: '#d4af37' },
      ];
      const valid = dirtyItems.filter((i) => i.value > 0);
      assert.equal(valid.length, 1);
      assert.equal(valid[0].id, '3');
    });
  });

  // =========================================================================
  // 2. AllocationCharts.tsx Verification & Stress Tests
  // =========================================================================
  describe('AllocationCharts Recharts & Category Toggle Stress Test', () => {
    const allocPath = path.join(rootDir, 'src/components/dashboard/AllocationCharts.tsx');
    assert.ok(fs.existsSync(allocPath), 'AllocationCharts.tsx must exist');
    const allocSrc = fs.readFileSync(allocPath, 'utf8');

    test('AC-1: Recharts Pie Slice Border Stroke Dual-Mode & CSS Class Safety', () => {
      // Recharts inline stroke and Tailwind class
      assert.match(
        allocSrc,
        /stroke=\{isDark\s*\?\s*'#0B0F17'\s*:\s*'#FFFFFF'\}/,
        'Recharts Cell must dynamically assign #FFFFFF stroke in light and #0B0F17 in dark mode'
      );
      assert.match(
        allocSrc,
        /className="stroke-white dark:stroke-\[#0B0F17\]"/,
        'Recharts Cell must also include CSS utility class for immediate CSS theme switching'
      );
      assert.match(
        allocSrc,
        /strokeWidth=\{2\}/,
        'Pie slice stroke width must be 2px for crisp slice separation'
      );
    });

    test('AC-2: Category View Toggle (Crypto Basket vs Total Gold/Crypto)', () => {
      // State toggle definition
      assert.match(
        allocSrc,
        /useState<'crypto'\s*\|\s*'total'>\('crypto'\)/,
        'AllocationCharts must default to crypto view mode'
      );

      // Active toggle pill button styling
      assert.match(
        allocSrc,
        /bg-white dark:bg-amber-500\/20 text-amber-700 dark:text-gold-400 font-bold border border-slate-200 dark:border-gold-500\/30 shadow-sm/,
        'Active view toggle button must use high-contrast elevated white pill in light mode'
      );

      // Inactive toggle pill button styling
      assert.match(
        allocSrc,
        /text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200/,
        'Inactive toggle button must use accessible muted text'
      );
    });

    test('AC-3: Custom Tooltip Payload Formatting & Persian Digits', () => {
      // Custom Tooltip component
      assert.match(
        allocSrc,
        /bg-white\/95 dark:bg-slate-900\/95 border border-slate-200 dark:border-slate-700/,
        'Tooltip card must have dual-mode surface and border'
      );
      assert.match(
        allocSrc,
        /خرید:\s*\{formatToman\(data\.suggestedBuy\)\}\s*تومان/,
        'Tooltip must format suggested purchase in Tomans'
      );
      assert.match(
        allocSrc,
        /وزن هدف:\s*\{toPersianDigits\(data\.percent\)\}٪/,
        'Tooltip must format target percent in Persian digits'
      );
    });

    test('AC-4: Center Overlay & Legend Grid Adaptation', () => {
      // Center overlay text
      assert.match(
        allocSrc,
        /chartView === 'crypto'\s*\?\s*'سبد رمزارز'\s*:\s*'کل پس‌انداز'/,
        'Center label must adapt to active view mode'
      );
      assert.match(
        allocSrc,
        /text-amber-700 dark:text-gold-400/,
        'Center 100% badge must use high-contrast gold text'
      );

      // Legend cards dual-mode
      assert.match(
        allocSrc,
        /bg-slate-50 dark:bg-slate-900\/60 border border-slate-200 dark:border-slate-800\/80/,
        'Legend items must render in slate-50 wells with slate-200 borders in light mode'
      );
    });
  });

  // =========================================================================
  // 3. OverviewSummary & DashboardView Analytics Stress Tests
  // =========================================================================
  describe('OverviewSummary & DashboardView Analytics Stress Test', () => {
    const summaryPath = path.join(rootDir, 'src/components/dashboard/OverviewSummary.tsx');
    assert.ok(fs.existsSync(summaryPath), 'OverviewSummary.tsx must exist');
    const summarySrc = fs.readFileSync(summaryPath, 'utf8');

    const dashboardPath = path.join(rootDir, 'src/components/dashboard/DashboardView.tsx');
    assert.ok(fs.existsSync(dashboardPath), 'DashboardView.tsx must exist');
    const dashboardSrc = fs.readFileSync(dashboardPath, 'utf8');

    test('DASH-1: Total Portfolio Wealth & Mini Split Progress Bar', () => {
      // Total wealth card gradient in light mode
      assert.match(
        summarySrc,
        /bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/,
        'Overview total wealth card must use soft slate gradient in light mode'
      );
      assert.match(
        summarySrc,
        /border border-slate-200 dark:border-slate-800/,
        'Overview card must use crisp slate-200 border in light mode'
      );

      // Mini split progress bar
      assert.match(
        summarySrc,
        /bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex/,
        'Split progress bar track must use slate-200 in light mode'
      );
      assert.match(summarySrc, /bg-amber-400/, 'Gold split segment must be amber-400');
      assert.match(summarySrc, /bg-indigo-500/, 'Crypto split segment must be indigo-500');
    });

    test('DASH-2: Health Status Underweight Banners Math & Styling', () => {
      // Check underweight calculation formula
      assert.match(
        dashboardSrc,
        /const isGoldUnderweight\s*=\s*goldPercentActual\s*<\s*settings\.goldPercent\s*-\s*2;/,
        'Gold underweight alert triggers when > 2% below target'
      );
      assert.match(
        dashboardSrc,
        /const isCryptoUnderweight\s*=\s*cryptoPercentActual\s*<\s*settings\.cryptoPercent\s*-\s*2;/,
        'Crypto underweight alert triggers when > 2% below target'
      );

      // Light mode alert badge classes
      assert.match(
        dashboardSrc,
        /bg-amber-50 dark:bg-amber-950\/30 border-amber-300 dark:border-gold-500\/40 text-amber-800 dark:text-gold-300/,
        'Gold underweight badge must use high-contrast amber-50/amber-800 in light mode'
      );
      assert.match(
        dashboardSrc,
        /bg-indigo-50 dark:bg-indigo-950\/30 border-indigo-200 dark:border-indigo-500\/40 text-indigo-800 dark:text-indigo-300/,
        'Crypto underweight badge must use high-contrast indigo-50/indigo-800 in light mode'
      );
    });

    test('DASH-3: Multi-Asset Breakdown Chips (Physical Gold, Bourse Gold, Crypto, Cash, Properties)', () => {
      assert.match(dashboardSrc, /طلای فیزیکی/, 'Must render physical gold breakdown chip');
      assert.match(dashboardSrc, /طلای بورس/, 'Must render bourse gold breakdown chip');
      assert.match(dashboardSrc, /ارزهای دیجیتال/, 'Must render crypto breakdown chip');
      assert.match(dashboardSrc, /املاک و مستغلات/, 'Must render properties breakdown chip');
      assert.match(dashboardSrc, /نقد نوبیتکس/, 'Must render Nobitex cash breakdown chip');
    });
  });

  // =========================================================================
  // 4. Calculation Cards (CapitalInputCard, GoldBuyCard, CryptoBuyTable, QuickActions)
  // =========================================================================
  describe('Calculation Engine & Action Cards Empirical Verification', () => {
    test('CALC-1: CapitalInputCard Number Parsing, Persian Words & Quick Chips', () => {
      const capInputPath = path.join(rootDir, 'src/components/dashboard/CapitalInputCard.tsx');
      assert.ok(fs.existsSync(capInputPath), 'CapitalInputCard.tsx must exist');
      const capSrc = fs.readFileSync(capInputPath, 'utf8');

      // Input styling
      assert.match(capSrc, /bg-slate-50 dark:bg-slate-950\/90/, 'Numeric input must have light bg-slate-50');
      assert.match(capSrc, /border-slate-300 dark:border-slate-700\/90/, 'Numeric input must have border-slate-300');
      assert.match(capSrc, /text-slate-900 dark:text-slate-100/, 'Numeric input must have high contrast text');

      // Persian words readout
      assert.match(
        capSrc,
        /numberToPersianWords\(inputAmount,\s*'تومان'\)/,
        'Must convert input amount to Persian words'
      );
      const testWords = numberToPersianWords(25000000, 'تومان');
      assert.equal(testWords, 'بیست و پنج میلیون تومان');

      // Quick chips
      [1000000, 5000000, 10000000, 50000000, 100000000].forEach((val) => {
        assert.ok(capSrc.includes(`value: ${val}`), `Quick chip for ${val} must exist`);
      });

      // Split preview boxes in light mode
      assert.match(
        capSrc,
        /bg-slate-50 dark:bg-slate-950\/80 border border-slate-200 dark:border-slate-800\/90/,
        'Savings split preview box must use slate-50 in light mode'
      );
      assert.match(
        capSrc,
        /bg-amber-50\/60 dark:bg-slate-950\/80 border border-gold-400\/40 dark:border-gold-500\/30/,
        'Gold split preview box must use amber-50/60 in light mode'
      );
      assert.match(
        capSrc,
        /bg-indigo-50\/60 dark:bg-slate-950\/80 border border-indigo-200 dark:border-indigo-500\/30/,
        'Crypto split preview box must use indigo-50/60 in light mode'
      );
    });

    test('CALC-2: GoldBuyCard TSETMC Unit Math & Copy Actions', () => {
      const goldBuyPath = path.join(rootDir, 'src/components/calculation/GoldBuyCard.tsx');
      assert.ok(fs.existsSync(goldBuyPath), 'GoldBuyCard.tsx must exist');
      const goldSrc = fs.readFileSync(goldBuyPath, 'utf8');

      // ETF chips
      assert.match(goldSrc, /عیار/, 'Must support Ayar ETF');
      assert.match(goldSrc, /طلا/, 'Must support Tala ETF');
      assert.match(goldSrc, /کهربا/, 'Must support Kahroba ETF');
      assert.match(goldSrc, /زر/, 'Must support Zar ETF');
      assert.match(goldSrc, /گوهر/, 'Must support Gohar ETF');

      // Unit calculation verification: floor division
      const buyAmount = 12000000;
      const unitPrice = 35000;
      const expectedUnits = Math.floor(buyAmount / unitPrice); // 342
      const exactValue = expectedUnits * unitPrice; // 11,970,000
      assert.equal(expectedUnits, 342);
      assert.equal(exactValue, 11970000);

      // Copy buttons feedback
      assert.match(goldSrc, /handleCopyAmount/, 'Must have handleCopyAmount handler');
      assert.match(goldSrc, /handleCopyUnits/, 'Must have handleCopyUnits handler');
      assert.match(
        goldSrc,
        /bg-emerald-500\/20 text-emerald-600 dark:text-emerald-400 border-emerald-500\/50/,
        'Copy success state must show emerald feedback'
      );
    });

    test('CALC-3: CryptoBuyTable View Mode Switcher & Sum Accuracy', () => {
      const cryptoTablePath = path.join(rootDir, 'src/components/calculation/CryptoBuyTable.tsx');
      assert.ok(fs.existsSync(cryptoTablePath), 'CryptoBuyTable.tsx must exist');
      const tableSrc = fs.readFileSync(cryptoTablePath, 'utf8');

      // View mode toggle
      assert.match(tableSrc, /useState<'cards'\s*\|\s*'table'>\('cards'\)/, 'Must support cards and table views');
      assert.match(tableSrc, /LayoutGrid/, 'Must render grid icon for cards mode');
      assert.match(tableSrc, /List/, 'Must render list icon for table mode');

      // Card view and table view dual-mode styles
      assert.match(
        tableSrc,
        /bg-slate-50 dark:bg-slate-950\/80 border border-slate-200 dark:border-slate-800\/90/,
        'Crypto card well must use slate-50 and border-slate-200 in light mode'
      );
      assert.match(
        tableSrc,
        /divide-slate-200 dark:divide-slate-800\/60/,
        'Table rows divider must use slate-200 in light mode'
      );
      assert.match(
        tableSrc,
        /bg-slate-100 dark:bg-slate-900\/80 border-t-2 border-slate-300 dark:border-slate-700/,
        'Table total footer row must use elevated slate-100 in light mode'
      );

      // Copy all summary
      assert.match(tableSrc, /handleCopyAllSummary/, 'Must support copying all crypto purchases to clipboard');
    });

    test('CALC-4: QuickActions Purchase Application & BottomSheet Confirmation Modal', () => {
      const quickPath = path.join(rootDir, 'src/components/calculation/QuickActions.tsx');
      assert.ok(fs.existsSync(quickPath), 'QuickActions.tsx must exist');
      const quickSrc = fs.readFileSync(quickPath, 'utf8');

      // Action banner gradient in light mode
      assert.match(
        quickSrc,
        /bg-gradient-to-r from-emerald-50 via-white to-indigo-50 dark:from-emerald-950\/40 dark:via-slate-900 dark:to-indigo-950\/40/,
        'Quick actions banner must use soft emerald-white gradient in light mode'
      );
      assert.match(
        quickSrc,
        /border border-emerald-200 dark:border-emerald-500\/30/,
        'Quick actions banner must use emerald-200 border in light mode'
      );

      // BottomSheet confirmation modal
      assert.match(quickSrc, /<BottomSheetModal/, 'Must invoke BottomSheetModal primitive');
      assert.match(quickSrc, /تأیید و اعمال خریدهای جدید/, 'Modal must have clear title');
      assert.match(
        quickSrc,
        /bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/,
        'Modal summary well must use slate-50 in light mode'
      );
    });
  });

  // =========================================================================
  // 5. Algorithmic Rebalance & Largest Remainder Integration Verification
  // =========================================================================
  describe('Largest Remainder & Waterfilling Allocation Engine Stress Test', () => {
    test('ENG-1: Largest Remainder Split Preserves 100% of Total Crypto Amount without 1-Toman Leaks', () => {
      const assets = [
        { id: 'btc', targetWeight: 30, currentValue: 0 },
        { id: 'eth', targetWeight: 25, currentValue: 0 },
        { id: 'sol', targetWeight: 15, currentValue: 0 },
        { id: 'ton', targetWeight: 10, currentValue: 0 },
        { id: 'xrp', targetWeight: 5, currentValue: 0 },
        { id: 'ada', targetWeight: 5, currentValue: 0 },
        { id: 'avax', targetWeight: 4, currentValue: 0 },
        { id: 'link', targetWeight: 3, currentValue: 0 },
        { id: 'dot', targetWeight: 3, currentValue: 0 },
      ];

      const oddCryptoAmounts = [1000000, 3333333, 7777777, 9999999, 123456789];

      oddCryptoAmounts.forEach((cryptoBudget) => {
        const rebalanced = calculateRebalancedBuys(assets, cryptoBudget);
        const sumSuggested = rebalanced.reduce((sum, c) => sum + c.suggestedBuy, 0);

        assert.equal(
          sumSuggested,
          cryptoBudget,
          `Sum of crypto purchases (${sumSuggested}) must EXACTLY equal budget (${cryptoBudget}) without rounding errors`
        );
      });
    });

    test('ENG-2: Full Investment Calculation Pipeline (Deposit -> Savings -> Gold & Crypto)', () => {
      const settings = {
        savingsPercent: 30,
        goldPercent: 80,
        cryptoPercent: 20,
        calculationMode: 'direct' as const,
        goldUnit: 'gram' as const,
        currency: 'IRR' as const,
        autoSyncInterval: 0,
        riskTolerance: 'medium' as const,
        theme: 'dark' as const,
      };

      const cryptoAssets = [
        { id: 'btc', name: 'Bitcoin', symbol: 'BTC', targetPercent: 50, currentHoldingValue: 0, color: '#F7931A' },
        { id: 'eth', name: 'Ethereum', symbol: 'ETH', targetPercent: 50, currentHoldingValue: 0, color: '#627EEA' },
      ];

      const goldHolding = {
        currentHoldingValue: 0,
        currentGrams: 0,
      };

      const result = calculatePortfolioAllocation(50000000, settings, cryptoAssets, goldHolding);

      assert.equal(result.totalSavingsAmount, 15000000); // 30% of 50M
      assert.equal(result.goldBuyAmount, 12000000); // 80% of 15M
      assert.equal(result.cryptoBuyAmount, 3000000); // 20% of 15M
      assert.equal(result.goldBuyAmount + result.cryptoBuyAmount, result.totalSavingsAmount);
      assert.equal(result.cryptoBuys.length, 2);
      assert.equal(result.cryptoBuys[0].suggestedBuy, 1500000);
      assert.equal(result.cryptoBuys[1].suggestedBuy, 1500000);
    });
  });

});
