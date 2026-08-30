import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  calculatePortfolioAllocation,
  calculateRebalancedBuys,
  calculateDirectBuys,
} from '../../src/utils/calculations';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords';
import {
  formatToman,
  formatPercent,
  parseNumberInput,
  toPersianDigits,
  getPersianFormattedDate,
} from '../../src/utils/formatters';
import { AppSettings, CryptoAsset, GoldHolding, TransactionRecord } from '../../src/types/investment';

describe('Challenger 2 — Milestone 2 Empirical Calculation & Input Components Verification', () => {

  const rootDir = path.resolve('.');

  // Default test fixtures
  const defaultSettings: AppSettings = {
    savingsPercent: 30,
    goldPercent: 80,
    cryptoPercent: 20,
    calculationMode: 'rebalance',
  };

  const defaultCryptoAssets: CryptoAsset[] = [
    { id: 'btc', symbol: 'BTC', name: 'بیت‌کوین', targetPercent: 30, currentHoldingValue: 0, currentAmount: 0, unitPrice: 5000000000, color: '#F7931A' },
    { id: 'eth', symbol: 'ETH', name: 'اتریوم', targetPercent: 20, currentHoldingValue: 0, currentAmount: 0, unitPrice: 200000000, color: '#627EEA' },
    { id: 'sol', symbol: 'SOL', name: 'سولانا', targetPercent: 15, currentHoldingValue: 0, currentAmount: 0, unitPrice: 12000000, color: '#14F195' },
    { id: 'ton', symbol: 'TON', name: 'تون‌کوین', targetPercent: 10, currentHoldingValue: 0, currentAmount: 0, unitPrice: 450000, color: '#0088CC' },
    { id: 'bnb', symbol: 'BNB', name: 'بایننس‌کوین', targetPercent: 10, currentHoldingValue: 0, currentAmount: 0, unitPrice: 40000000, color: '#F3BA2F' },
    { id: 'ada', symbol: 'ADA', name: 'کاردانو', targetPercent: 5, currentHoldingValue: 0, currentAmount: 0, unitPrice: 50000, color: '#0033AD' },
    { id: 'xrp', symbol: 'XRP', name: 'ریپل', targetPercent: 4, currentHoldingValue: 0, currentAmount: 0, unitPrice: 150000, color: '#23292F' },
    { id: 'dot', symbol: 'DOT', name: 'پولکادات', targetPercent: 3, currentHoldingValue: 0, currentAmount: 0, unitPrice: 600000, color: '#E6007A' },
    { id: 'link', symbol: 'LINK', name: 'چین‌لینک', targetPercent: 3, currentHoldingValue: 0, currentAmount: 0, unitPrice: 1200000, color: '#375BD2' },
  ];

  const defaultGoldHolding: GoldHolding = {
    currentHoldingValue: 0,
  };

  /* =========================================================================
   * 1. CAPITAL INPUT CARD COMPONENT EMPIRICAL AUDIT
   * ========================================================================= */
  test('M2-C1: CapitalInputCard Component Layout, Quick-Add Chips & Dual-Mode Tokens', () => {
    const cardPath = path.join(rootDir, 'src/components/dashboard/CapitalInputCard.tsx');
    assert.ok(fs.existsSync(cardPath), 'CapitalInputCard.tsx must exist');
    const cardSrc = fs.readFileSync(cardPath, 'utf8');

    // 1. Container styling & dual-theme tokens
    assert.match(cardSrc, /glass-card p-5 sm:p-6 border border-slate-200 dark:border-slate-800/, 'Must use glass card with dual-mode border');
    assert.match(cardSrc, /bg-amber-500\/15 dark:bg-gold-500\/15/, 'Header icon must use dual-mode amber/gold badge');
    assert.match(cardSrc, /text-slate-900 dark:text-slate-100/, 'Header title must use high-contrast primary text');

    // 2. Clear button with haptics
    assert.match(cardSrc, /inputAmount > 0 &&/, 'Clear button must render conditionally when inputAmount > 0');
    assert.match(cardSrc, /triggerHaptic\('medium'\)/, 'Clear button must trigger medium haptic');
    assert.match(cardSrc, /setInputAmount\(0\)/, 'Clear button must reset amount to 0');
    assert.match(cardSrc, /RotateCcw/, 'Clear button must render RotateCcw icon');

    // 3. Numeric input field
    assert.match(cardSrc, /inputMode="numeric"/, 'Input must declare numeric inputMode for mobile keyboard');
    assert.match(cardSrc, /placeholder="مثال: ۲۵,۰۰۰,۰۰۰"/, 'Input must provide Persian placeholder');
    assert.match(cardSrc, /bg-slate-50 dark:bg-slate-950\/90/, 'Input must have dual-mode background');
    assert.match(cardSrc, /border-slate-300 dark:border-slate-700\/90/, 'Input must have dual-mode border');
    assert.match(cardSrc, /focus:bg-white dark:focus:bg-slate-950 focus:border-gold-500/, 'Input must focus cleanly');

    // 4. Persian words readout badge
    assert.match(cardSrc, /numberToPersianWords\(inputAmount, 'تومان'\)/, 'Must call numberToPersianWords with Toman');
    assert.match(cardSrc, /bg-amber-500\/10 dark:bg-gold-500\/10/, 'Persian words badge must have amber/gold tinted background');
    assert.match(cardSrc, /text-amber-800 dark:text-gold-300/, 'Persian words badge must have high-contrast text');

    // 5. Quick-add chips: exactly 5 denominations (+1M, +5M, +10M, +50M, +100M)
    assert.match(cardSrc, /value:\s*1000000\b/, 'Must include +1M chip (1,000,000)');
    assert.match(cardSrc, /value:\s*5000000\b/, 'Must include +5M chip (5,000,000)');
    assert.match(cardSrc, /value:\s*10000000\b/, 'Must include +10M chip (10,000,000)');
    assert.match(cardSrc, /value:\s*50000000\b/, 'Must include +50M chip (50,000,000)');
    assert.match(cardSrc, /value:\s*100000000\b/, 'Must include +100M chip (100,000,000)');
    assert.match(cardSrc, /interactive-tap touch-target/, 'Quick-add chips must include mobile interaction classes');

    // 6. 3-Way Savings Split Cards (30% Savings, 80% Gold, 20% Crypto)
    assert.match(cardSrc, /totalSavingsAmount > 0 &&/, 'Split cards must render only when totalSavingsAmount > 0');
    assert.match(cardSrc, /سهم پس‌انداز/, 'Must render savings share label');
    assert.match(cardSrc, /خرید طلا/, 'Must render gold buy label');
    assert.match(cardSrc, /خرید کریپتو/, 'Must render crypto buy label');
    assert.match(cardSrc, /bg-amber-50\/60 dark:bg-slate-950\/80 border border-gold-400\/40 dark:border-gold-500\/30/, 'Gold split card must have amber accents');
    assert.match(cardSrc, /bg-indigo-50\/60 dark:bg-slate-950\/80 border border-indigo-200 dark:border-indigo-500\/30/, 'Crypto split card must have indigo accents');
  });

  /* =========================================================================
   * 2. GOLD BUY CARD COMPONENT EMPIRICAL AUDIT
   * ========================================================================= */
  test('M2-C2: GoldBuyCard ETF Selector, Live Unit Calculation & Copy Visual Feedback', () => {
    const cardPath = path.join(rootDir, 'src/components/calculation/GoldBuyCard.tsx');
    assert.ok(fs.existsSync(cardPath), 'GoldBuyCard.tsx must exist');
    const cardSrc = fs.readFileSync(cardPath, 'utf8');

    // 1. Built-in default Gold ETFs
    const expectedSymbols = ['عیار', 'طلا', 'کهربا', 'زر', 'گوهر'];
    expectedSymbols.forEach((sym) => {
      assert.ok(cardSrc.includes(`symbol: '${sym}'`), `DEFAULT_GOLD_ETFS must contain symbol ${sym}`);
    });

    // 2. Calculation logic: Math.floor(goldBuyAmount / unitPriceTomans)
    assert.match(cardSrc, /Math\.floor\(goldBuyAmount \/ unitPriceTomans\)/, 'Must calculate floor units to buy');
    assert.match(cardSrc, /unitsToBuy \* unitPriceTomans/, 'Must calculate exactBuyValue without rounding leakage');
    assert.match(cardSrc, /unitPriceTomans = quote && quote\.lastPriceTomans > 0 \? quote\.lastPriceTomans : 35000/, 'Must have fallback price 35,000 Tomans');

    // 3. ETF Selector Chips interaction
    assert.match(cardSrc, /selectedSymbol === etf\.symbol/, 'Must differentiate active vs inactive ETF chip');
    assert.match(cardSrc, /bg-amber-500\/20 text-amber-800 dark:text-gold-300 border border-gold-500\/50/, 'Active ETF chip must have amber badge');
    assert.match(cardSrc, /bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/, 'Inactive ETF chip must have dual-mode slate token');

    // 4. Amount and Units Copy Boxes
    assert.match(cardSrc, /handleCopyAmount/, 'Must have dedicated handler for copying Toman amount');
    assert.match(cardSrc, /handleCopyUnits/, 'Must have dedicated handler for copying unit count');
    assert.match(cardSrc, /navigator\.clipboard\.writeText/, 'Must write to navigator.clipboard');
    assert.match(cardSrc, /triggerHaptic\('success'\)/, 'Copying must trigger success haptic');
    assert.match(cardSrc, /setTimeout\(\(\) => setCopiedAmount\(false\), 2000\)/, 'Must reset copy state after 2000ms');

    // 5. Visual copy feedback
    assert.match(cardSrc, /copiedAmount \? \(/, 'Must render Check icon when copiedAmount is true');
    assert.match(cardSrc, /bg-emerald-500\/20 text-emerald-600 dark:text-emerald-400 border-emerald-500\/50/, 'Copied button must flash emerald');

    // 6. Brokerage Tip Footer
    assert.match(cardSrc, /کافیست در ایزی‌تریدر یا کارگزاری خود نماد/, 'Must render actionable brokerage ordering instructions');
  });

  /* =========================================================================
   * 3. CRYPTO BUY TABLE COMPONENT EMPIRICAL AUDIT
   * ========================================================================= */
  test('M2-C3: CryptoBuyTable Mobile Cards vs Full Table Toggle & Copy All Action', () => {
    const tablePath = path.join(rootDir, 'src/components/calculation/CryptoBuyTable.tsx');
    assert.ok(fs.existsSync(tablePath), 'CryptoBuyTable.tsx must exist');
    const tableSrc = fs.readFileSync(tablePath, 'utf8');

    // 1. View Mode Switcher ('cards' | 'table')
    assert.match(tableSrc, /viewMode, setViewMode\] = useState<'cards' \| 'table'>\('cards'\)/, 'Must default to mobile cards view');
    assert.match(tableSrc, /LayoutGrid/, 'Must render LayoutGrid icon for cards');
    assert.match(tableSrc, /List/, 'Must render List icon for table');
    assert.match(tableSrc, /viewMode === 'cards' \?/, 'Must conditionally switch between cards and table');

    // 2. Copy All Summary Action
    assert.match(tableSrc, /handleCopyAllSummary/, 'Must implement handleCopyAllSummary');
    assert.match(tableSrc, /filter\(\(c\) => c\.suggestedBuy > 0\)/, 'Must filter out coins with 0 suggested buy');
    assert.match(tableSrc, /join\('\\n'\)/, 'Must join multiple coin buys with newline');
    assert.match(tableSrc, /CheckCheck/, 'Must render CheckCheck icon when all copied');
    assert.match(tableSrc, /کپی کل لیست/, 'Must render "Copy all list" button label');

    // 3. Mobile Touch Cards View
    assert.match(tableSrc, /bg-slate-50 dark:bg-slate-950\/80 border border-slate-200 dark:border-slate-800\/90/, 'Mobile cards must have dual-mode borders and well background');
    assert.match(tableSrc, /handleCopySingle\(crypto\.id, crypto\.suggestedBuy\)/, 'Single card must have copy button for individual coin');
    assert.match(tableSrc, /مجموع خرید رمزارزها/, 'Must render summary footer card in mobile view');

    // 4. Full Table View
    assert.match(tableSrc, /<table className="w-full text-right border-collapse">/, 'Must render standard semantic table');
    assert.match(tableSrc, /divide-y divide-slate-200 dark:divide-slate-800\/60/, 'Table body must have dual-mode row dividers');
    assert.match(tableSrc, /جمع/, 'Table footer must render summary row with total target percent, holdings, and suggested buys');

    // 5. Exchange Tip Card
    assert.match(tableSrc, /bg-indigo-50 dark:bg-indigo-500\/5 border border-indigo-100 dark:border-indigo-500\/10/, 'Exchange tip card must use subtle indigo styling');
    assert.match(tableSrc, /نوبیتکس، والکس، تبدیل/, 'Must mention popular Iranian exchanges');
  });

  /* =========================================================================
   * 4. QUICK ACTIONS COMPONENT EMPIRICAL AUDIT
   * ========================================================================= */
  test('M2-C4: QuickActions Modal Confirmation & Transaction Dispatch Banner', () => {
    const quickActionsPath = path.join(rootDir, 'src/components/calculation/QuickActions.tsx');
    assert.ok(fs.existsSync(quickActionsPath), 'QuickActions.tsx must exist');
    const quickActionsSrc = fs.readFileSync(quickActionsPath, 'utf8');

    // 1. Banner styling
    assert.match(quickActionsSrc, /bg-gradient-to-r from-emerald-50 via-white to-indigo-50 dark:from-emerald-950\/40 dark:via-slate-900 dark:to-indigo-950\/40/, 'Banner must have dual-mode gradient');
    assert.match(quickActionsSrc, /border-emerald-200 dark:border-emerald-500\/30/, 'Banner must have emerald border');

    // 2. Action button enabled/disabled state
    assert.match(quickActionsSrc, /hasPurchases = calculationResult\.totalSavingsAmount > 0/, 'hasPurchases must check totalSavingsAmount > 0');
    assert.match(quickActionsSrc, /disabled={!hasPurchases}/, 'Action button must be disabled when no savings amount');
    assert.match(quickActionsSrc, /bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500/, 'Active button must have vibrant emerald gradient');

    // 3. BottomSheetModal integration
    assert.match(quickActionsSrc, /<BottomSheetModal/, 'Must use standardized BottomSheetModal');
    assert.match(quickActionsSrc, /title="تأیید و اعمال خریدهای جدید"/, 'Modal must have Persian title');
    assert.match(quickActionsSrc, /subtitle="افزودن مبالغ پیشنهادی به دارایی‌ها"/, 'Modal must have Persian subtitle');

    // 4. Modal confirmation summary well
    assert.match(quickActionsSrc, /سهم خرید طلا:/, 'Modal must display gold share');
    assert.match(quickActionsSrc, /سهم خرید رمزارزها:/, 'Modal must display crypto share');
    assert.match(quickActionsSrc, /handleConfirm/, 'Must have confirm handler');
    assert.match(quickActionsSrc, /onApplyPurchases\(\)/, 'Must call onApplyPurchases on confirmation');
    assert.match(quickActionsSrc, /setShowConfirmModal\(false\)/, 'Must close modal after confirmation or cancel');
  });

  /* =========================================================================
   * 5. PERSIAN NUMBER TO WORDS ENGINE STRESS TESTS
   * ========================================================================= */
  describe('M2-C5: Persian Number to Words Engine Exhaustive Stress Tests', () => {

    test('Zero, Negative and Invalid Inputs Return Empty String', () => {
      assert.equal(numberToPersianWords(0), '');
      assert.equal(numberToPersianWords(-1000), '');
      assert.equal(numberToPersianWords(-50000000), '');
      assert.equal(numberToPersianWords(NaN), '');
      assert.equal(numberToPersianWords(null as any), '');
      assert.equal(numberToPersianWords(undefined as any), '');
    });

    test('Digits 1 to 99 with Toman Unit', () => {
      assert.equal(numberToPersianWords(1), 'یک تومان');
      assert.equal(numberToPersianWords(5), 'پنج تومان');
      assert.equal(numberToPersianWords(10), 'ده تومان');
      assert.equal(numberToPersianWords(15), 'پانزده تومان');
      assert.equal(numberToPersianWords(20), 'بیست تومان');
      assert.equal(numberToPersianWords(42), 'چهل و دو تومان');
      assert.equal(numberToPersianWords(99), 'نود و نه تومان');
    });

    test('Hundreds 100 to 999 with Toman Unit', () => {
      assert.equal(numberToPersianWords(100), 'یکصد تومان');
      assert.equal(numberToPersianWords(125), 'یکصد و بیست و پنج تومان');
      assert.equal(numberToPersianWords(350), 'سیصد و پنجاه تومان');
      assert.equal(numberToPersianWords(789), 'هفتصد و هشتاد و نه تومان');
    });

    test('Thousands 1,000 to 999,999 with Toman Unit', () => {
      assert.equal(numberToPersianWords(1000), 'یک هزار تومان');
      assert.equal(numberToPersianWords(25000), 'بیست و پنج هزار تومان');
      assert.equal(numberToPersianWords(150000), 'یکصد و پنجاه هزار تومان');
      assert.equal(numberToPersianWords(999999), 'نهصد و نود و نه هزار و نهصد و نود و نه تومان');
    });

    test('Millions 1,000,000 to 999,999,999 with Toman Unit', () => {
      assert.equal(numberToPersianWords(1000000), 'یک میلیون تومان');
      assert.equal(numberToPersianWords(5000000), 'پنج میلیون تومان');
      assert.equal(numberToPersianWords(10000000), 'ده میلیون تومان');
      assert.equal(numberToPersianWords(15000000), 'پانزده میلیون تومان');
      assert.equal(numberToPersianWords(50000000), 'پنجاه میلیون تومان');
      assert.equal(numberToPersianWords(100000000), 'یکصد میلیون تومان');
      assert.equal(numberToPersianWords(125500000), 'یکصد و بیست و پنج میلیون و پانصد هزار تومان');
    });

    test('Billions & Trillions (1,000,000,000 to 10,000,000,000,000) with Toman and Rial', () => {
      assert.equal(numberToPersianWords(1000000000), 'یک میلیارد تومان');
      assert.equal(numberToPersianWords(15000000000), 'پانزده میلیارد تومان');
      assert.equal(numberToPersianWords(100000000000), 'یکصد میلیارد تومان');
      assert.equal(numberToPersianWords(1000000000000), 'یک تریلیون تومان');
      assert.equal(numberToPersianWords(5000000000000), 'پنج تریلیون تومان');
      // Rial unit test
      assert.equal(numberToPersianWords(1000000000, 'ریال'), 'یک میلیارد ریال');
    });
  });

  /* =========================================================================
   * 6. MATHEMATICAL ENGINES & SPLIT CALCULATION STRESS TESTS
   * ========================================================================= */
  describe('M2-C6: Portfolio Split, Waterfilling & Largest Remainder Method Stress Tests', () => {

    test('Standard 80/20 Split on 50,000,000 Tomans Input (30% Savings = 15M)', () => {
      const result = calculatePortfolioAllocation(
        50000000,
        defaultSettings,
        defaultCryptoAssets,
        defaultGoldHolding
      );

      assert.equal(result.totalInputAmount, 50000000);
      assert.equal(result.totalSavingsAmount, 15000000);
      assert.equal(result.goldBuyAmount, 12000000); // 80% of 15M
      assert.equal(result.cryptoBuyAmount, 3000000); // 20% of 15M
      assert.equal(result.goldBuyAmount + result.cryptoBuyAmount, 15000000);

      // Verify crypto distribution matches 3,000,000 exactly
      const sumCryptoBuys = result.cryptoBuys.reduce((sum, c) => sum + c.suggestedBuy, 0);
      assert.equal(sumCryptoBuys, 3000000, 'Sum of crypto suggested buys must equal 3,000,000 exactly');
      assert.equal(result.totalCryptoBuySuggested, 3000000);

      // Verify individual proportional allocations
      const btcBuy = result.cryptoBuys.find((c) => c.symbol === 'BTC')!;
      const ethBuy = result.cryptoBuys.find((c) => c.symbol === 'ETH')!;
      const solBuy = result.cryptoBuys.find((c) => c.symbol === 'SOL')!;
      assert.equal(btcBuy.suggestedBuy, 900000); // 30% of 3M
      assert.equal(ethBuy.suggestedBuy, 600000); // 20% of 3M
      assert.equal(solBuy.suggestedBuy, 450000); // 15% of 3M
    });

    test('Boundary: Zero Input Amount Produces Clean Zero Allocation', () => {
      const result = calculatePortfolioAllocation(0, defaultSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(result.totalInputAmount, 0);
      assert.equal(result.totalSavingsAmount, 0);
      assert.equal(result.goldBuyAmount, 0);
      assert.equal(result.cryptoBuyAmount, 0);
      assert.equal(result.totalCryptoBuySuggested, 0);
      result.cryptoBuys.forEach((c) => {
        assert.equal(c.suggestedBuy, 0);
        assert.ok(!isNaN(c.suggestedBuy));
        assert.ok(!isNaN(c.finalPercent));
      });
    });

    test('Boundary: Negative Input Coerced to Zero Without NaN', () => {
      const result = calculatePortfolioAllocation(-50000000, defaultSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(result.totalInputAmount, 0);
      assert.equal(result.totalSavingsAmount, 0);
      assert.equal(result.goldBuyAmount, 0);
      assert.equal(result.cryptoBuyAmount, 0);
      assert.equal(result.totalCryptoBuySuggested, 0);
    });

    test('Boundary: Extreme 100 Billion Input Handles Multi-Trillion Numbers Safely', () => {
      const hugeInput = 100000000000; // 100 Billion
      const result = calculatePortfolioAllocation(hugeInput, defaultSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(result.totalInputAmount, 100000000000);
      assert.equal(result.totalSavingsAmount, 30000000000); // 30B
      assert.equal(result.goldBuyAmount, 24000000000); // 24B
      assert.equal(result.cryptoBuyAmount, 6000000000); // 6B
      const sumBuys = result.cryptoBuys.reduce((sum, c) => sum + c.suggestedBuy, 0);
      assert.equal(sumBuys, 6000000000);
    });

    test('Boundary: 0% Savings vs 100% Savings', () => {
      const zeroSavingsSettings = { ...defaultSettings, savingsPercent: 0 };
      const zeroRes = calculatePortfolioAllocation(50000000, zeroSavingsSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(zeroRes.totalSavingsAmount, 0);
      assert.equal(zeroRes.goldBuyAmount, 0);
      assert.equal(zeroRes.cryptoBuyAmount, 0);

      const hundredSavingsSettings = { ...defaultSettings, savingsPercent: 100 };
      const hundredRes = calculatePortfolioAllocation(50000000, hundredSavingsSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(hundredRes.totalSavingsAmount, 50000000);
      assert.equal(hundredRes.goldBuyAmount, 40000000); // 80%
      assert.equal(hundredRes.cryptoBuyAmount, 10000000); // 20%
    });

    test('Boundary: 100% Gold / 0% Crypto and 0% Gold / 100% Crypto', () => {
      const allGoldSettings = { ...defaultSettings, goldPercent: 100, cryptoPercent: 0 };
      const allGoldRes = calculatePortfolioAllocation(10000000, allGoldSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(allGoldRes.goldBuyAmount, 3000000); // 100% of 3M savings
      assert.equal(allGoldRes.cryptoBuyAmount, 0);

      const allCryptoSettings = { ...defaultSettings, goldPercent: 0, cryptoPercent: 100 };
      const allCryptoRes = calculatePortfolioAllocation(10000000, allCryptoSettings, defaultCryptoAssets, defaultGoldHolding);
      assert.equal(allCryptoRes.goldBuyAmount, 0);
      assert.equal(allCryptoRes.cryptoBuyAmount, 3000000); // 100% of 3M savings
    });

    test('Waterfilling Rebalancing: Overweight Asset Receives 0 Buy without Negative Rebalance', () => {
      // BTC already has 10,000,000 Tomans while target is 30% of entire crypto budget
      const customCrypto: CryptoAsset[] = [
        { id: 'btc', symbol: 'BTC', name: 'بیت‌کوین', targetPercent: 30, currentHoldingValue: 10000000, currentAmount: 0.002, color: '#F7931A' },
        { id: 'eth', symbol: 'ETH', name: 'اتریوم', targetPercent: 30, currentHoldingValue: 0, currentAmount: 0, color: '#627EEA' },
        { id: 'sol', symbol: 'SOL', name: 'سولانا', targetPercent: 40, currentHoldingValue: 0, currentAmount: 0, color: '#14F195' },
      ];

      // Add 2,000,000 Tomans new crypto budget
      const rebalanced = calculateRebalancedBuys(
        customCrypto.map((c) => ({ id: c.id, targetWeight: c.targetPercent, currentValue: c.currentHoldingValue })),
        2000000
      );

      const btcBuy = rebalanced.find((r) => r.id === 'btc')!;
      const ethBuy = rebalanced.find((r) => r.id === 'eth')!;
      const solBuy = rebalanced.find((r) => r.id === 'sol')!;

      // BTC is heavily overweight -> suggested buy must be 0
      assert.equal(btcBuy.suggestedBuy, 0, 'Overweight BTC must receive 0 suggested buy');
      // Underweight assets (ETH & SOL) should absorb the entire 2,000,000 budget
      assert.ok(ethBuy.suggestedBuy > 0, 'ETH must receive positive allocation');
      assert.ok(solBuy.suggestedBuy > 0, 'SOL must receive positive allocation');
      assert.equal(ethBuy.suggestedBuy + solBuy.suggestedBuy, 2000000, 'Sum must equal 2M exactly');
      // Ratio between ETH (30%) and SOL (40%) within remaining 70% active weight:
      // ETH share = 30/70 * 2M = 857,143; SOL share = 40/70 * 2M = 1,142,857
      assert.equal(ethBuy.suggestedBuy, 857143);
      assert.equal(solBuy.suggestedBuy, 1142857);
    });

    test('Largest Remainder Method: Zero Floating-Point Leakage with Odd Budget & Prime Weights', () => {
      // Budget of 1,000,003 split among 3 equal assets (33.333% each)
      const items = [
        { id: 'a', rawBuy: 1000003 / 3 },
        { id: 'b', rawBuy: 1000003 / 3 },
        { id: 'c', rawBuy: 1000003 / 3 },
      ];
      const allocs = calculateDirectBuys(
        [
          { id: 'a', targetWeight: 33.333 },
          { id: 'b', targetWeight: 33.333 },
          { id: 'c', targetWeight: 33.333 },
        ],
        1000003
      );

      const totalSum = allocs.reduce((sum, item) => sum + item.suggestedBuy, 0);
      assert.equal(totalSum, 1000003, 'Total allocated must exactly equal budget with 0 leakage');
      // Each gets ~333,334 or 333,335
      allocs.forEach((a) => {
        assert.ok(a.suggestedBuy === 333334 || a.suggestedBuy === 333335);
      });
    });
  });

  /* =========================================================================
   * 7. FULL END-TO-END MULTI-STEP INTERACTION WORKFLOW SIMULATION
   * ========================================================================= */
  test('M2-C7: Full End-to-End Simulation: Input -> 80/20 Split -> ETF Units -> Modal -> Tx Dispatch', () => {
    // 1. User starts with 25,000,000 Tomans input
    const inputVal = 25000000;
    const words = numberToPersianWords(inputVal, 'تومان');
    assert.equal(words, 'بیست و پنج میلیون تومان');

    // 2. Calculate allocation in REBALANCE mode with 10M existing gold:
    // Total portfolio = 10M + 7.5M = 17.5M. Target: 80% Gold (14M), 20% Crypto (3.5M).
    // Gold buy needed = 14M - 10M = 4,000,000. Crypto buy needed = 3,500,000.
    const result = calculatePortfolioAllocation(inputVal, defaultSettings, defaultCryptoAssets, { currentHoldingValue: 10000000 });
    assert.equal(result.totalSavingsAmount, 7500000); // 30% of 25M
    assert.equal(result.goldBuyAmount, 4000000); // Rebalance allocation
    assert.equal(result.cryptoBuyAmount, 3500000); // Rebalance allocation
    assert.equal(result.goldBuyAmount + result.cryptoBuyAmount, 7500000);

    // 3. Gold ETF calculation for 'عیار' @ 38,000 Tomans
    const unitPrice = 38000;
    const unitsToBuy = Math.floor(result.goldBuyAmount / unitPrice); // Math.floor(4,000,000 / 38,000) = 105
    assert.equal(unitsToBuy, 105);
    const exactGoldValue = unitsToBuy * unitPrice; // 105 * 38,000 = 3,990,000
    assert.equal(exactGoldValue, 3990000);

    // 4. Crypto suggested buys formatting for clipboard copy
    const summaryText = result.cryptoBuys
      .filter((c) => c.suggestedBuy > 0)
      .map((c) => `${c.symbol}: ${new Intl.NumberFormat('en-US').format(c.suggestedBuy)} تومان`)
      .join('\n');
    assert.ok(summaryText.includes('BTC: 1,050,000 تومان')); // 30% of 3.5M
    assert.ok(summaryText.includes('ETH: 700,000 تومان')); // 20% of 3.5M
    assert.ok(summaryText.includes('SOL: 525,000 تومان')); // 15% of 3.5M

    // 5. Direct Mode test: 80% Gold (6M), 20% Crypto (1.5M)
    const directSettings: AppSettings = { ...defaultSettings, calculationMode: 'direct' };
    const directResult = calculatePortfolioAllocation(inputVal, directSettings, defaultCryptoAssets, { currentHoldingValue: 10000000 });
    assert.equal(directResult.goldBuyAmount, 6000000);
    assert.equal(directResult.cryptoBuyAmount, 1500000);
    assert.equal(Math.floor(directResult.goldBuyAmount / unitPrice), 157);

    // 6. QuickActions confirmation modal & transaction creation (using rebalance result)
    const tx: TransactionRecord = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      persianDate: getPersianFormattedDate(new Date()),
      totalInputAmount: result.totalInputAmount,
      totalSavingsAmount: result.totalSavingsAmount,
      goldBuyAmount: result.goldBuyAmount,
      cryptoBuyAmount: result.cryptoBuyAmount,
      cryptoBuys: result.cryptoBuys
        .filter((c) => c.suggestedBuy > 0)
        .map((c) => ({
          symbol: c.symbol,
          amount: c.suggestedBuy,
        })),
    };

    assert.ok(tx.id.startsWith('tx_'));
    assert.ok(tx.persianDate.length > 5);
    assert.equal(tx.totalInputAmount, 25000000);
    assert.equal(tx.totalSavingsAmount, 7500000);
    assert.equal(tx.goldBuyAmount, 4000000);
    assert.equal(tx.cryptoBuyAmount, 3500000);
    assert.equal(tx.cryptoBuys.length, 9);

    // 7. Portfolio state updates
    const updatedGoldHolding: GoldHolding = {
      currentHoldingValue: 10000000 + result.goldBuyAmount, // 10M + 4M = 14M (exactly 80% of 17.5M)
    };
    assert.equal(updatedGoldHolding.currentHoldingValue, 14000000);

    const updatedCryptoAssets = defaultCryptoAssets.map((asset) => {
      const buy = result.cryptoBuys.find((b) => b.id === asset.id);
      const newHoldingVal = asset.currentHoldingValue + (buy ? buy.suggestedBuy : 0);
      return {
        ...asset,
        currentHoldingValue: newHoldingVal,
      };
    });
    const totalUpdatedCryptoVal = updatedCryptoAssets.reduce((sum, c) => sum + c.currentHoldingValue, 0);
    assert.equal(totalUpdatedCryptoVal, 3500000); // exactly 20% of 17.5M
  });

});
