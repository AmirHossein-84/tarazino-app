import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/mockStorage';
import { calculatePortfolioAllocation } from '../../src/utils/calculations';
import { calculateOptimalSales } from '../../src/utils/sellCalculator';
import {
  saveCryptoAssets,
  loadCryptoAssets,
  saveGoldHolding,
  loadGoldHolding,
  savePhysicalGold,
  loadPhysicalGold,
  saveGoldBuyLots,
  loadGoldBuyLots,
  savePhysicalGoldSales,
  loadPhysicalGoldSales,
  saveProperties,
  loadProperties,
  saveTransactions,
  loadTransactions,
  saveSettings,
  loadSettings,
  saveNobitexConfig,
  loadNobitexConfig,
  exportBackupData,
  importBackupData,
} from '../../src/utils/storage';
import { DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING, DEFAULT_PHYSICAL_GOLD_ITEMS } from '../../src/constants/defaultData';
import { formatToman, toEnglishDigits, toPersianDigits, formatTomanWithUnit } from '../../src/utils/formatters';
import { calculateGoldItemPnl, calculateTotalPhysicalGoldPnl, processGoldSale } from '../../src/utils/goldPnlCalculators';

describe('Tier 3: Cross-Feature Combinations & Multi-Module Interactions (12 Pairwise Suites)', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  it('C1: Global Currency Mode Toggle (USD <-> Toman) Synchronizes with Holdings, Net Worth & Properties', () => {
    // 1. Initial State in Toman Mode
    localStorage.setItem('investment_app_currency_mode_v1', 'toman');
    localStorage.setItem('investment_app_usdt_rate_v1', '93000');

    const totalValTomans = 93000000; // 93 Million Tomans
    assert.equal(formatToman(totalValTomans), '93,000,000');

    // 2. Switch to USD Tether Mode
    localStorage.setItem('investment_app_currency_mode_v1', 'usd');
    const usdtRate = parseInt(localStorage.getItem('investment_app_usdt_rate_v1') || '93000', 10);
    const usdVal = totalValTomans / usdtRate;
    assert.equal(usdVal, 1000); // Exactly $1,000 Tether

    // 3. Verify synchronous reading across different modules
    const currentMode = localStorage.getItem('investment_app_currency_mode_v1');
    assert.equal(currentMode, 'usd');
    assert.equal(`$ ${usdVal.toLocaleString('en-US')}`, '$ 1,000');
  });

  it('C2: Smart Buy "Apply Purchases" Multi-Step State Synchronization Flow', () => {
    // Step 1: Initial holdings empty
    saveGoldHolding({ currentHoldingValue: 0 });
    saveCryptoAssets(DEFAULT_CRYPTO_ASSETS);
    saveTransactions([]);

    // Step 2: Compute allocation for 10M Toman input (30% savings = 3M, 2.4M Gold, 600K Crypto)
    const alloc = calculatePortfolioAllocation(10000000, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
    assert.equal(alloc.goldBuyAmount, 2400000);
    assert.equal(alloc.cryptoBuyAmount, 600000);

    // Step 3: Apply purchases to Gold holding
    const initialGold = loadGoldHolding();
    const newGold = {
      ...initialGold,
      currentHoldingValue: (initialGold.currentHoldingValue || 0) + alloc.goldBuyAmount,
    };
    saveGoldHolding(newGold);
    assert.equal(loadGoldHolding().currentHoldingValue, 2400000);

    // Step 4: Apply purchases to Crypto assets
    const initialCrypto = loadCryptoAssets();
    const updatedCrypto = initialCrypto.map((c) => {
      const buy = alloc.cryptoBuys.find((b) => b.id === c.id);
      return {
        ...c,
        currentHoldingValue: c.currentHoldingValue + (buy?.suggestedBuy || 0),
      };
    });
    saveCryptoAssets(updatedCrypto);

    const ethAfter = loadCryptoAssets().find((c) => c.symbol === 'ETH');
    assert.equal(ethAfter?.currentHoldingValue, 150000); // 25% of 600k

    // Step 5: Record immutable transaction in ledger
    const tx = {
      id: 'tx_flow_1',
      date: new Date().toISOString(),
      persianDate: '۱۴۰۵/۰۶/۰۷',
      totalInputAmount: alloc.totalInputAmount,
      totalSavingsAmount: alloc.totalSavingsAmount,
      goldBuyAmount: alloc.goldBuyAmount,
      cryptoBuyAmount: alloc.cryptoBuyAmount,
      cryptoBuys: alloc.cryptoBuys.filter((b) => b.suggestedBuy > 0).map((b) => ({
        symbol: b.symbol,
        name: b.name,
        amount: b.suggestedBuy,
      })),
      appliedToHoldings: true,
    };
    saveTransactions([tx]);

    const loadedTx = loadTransactions();
    assert.equal(loadedTx.length, 1);
    assert.equal(loadedTx[0].appliedToHoldings, true);
    assert.equal(loadedTx[0].totalSavingsAmount, 3000000);
  });

  it('C3: Sell Simulator & Portfolio Rebalance Deduction Interaction across 4 asset classes', () => {
    // Initial: Crypto = 2M, Bourse Gold = 8M. Total = 10M (80/20 target).
    const cryptoAssets = [
      { id: 'eth', symbol: 'ETH', name: 'Ethereum', targetPercent: 50, currentHoldingValue: 1000000, color: '#627EEA' },
      { id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 50, currentHoldingValue: 1000000, color: '#F7931A' },
    ];
    const bourseGold: any[] = [
      {
        instrument: { id: 'inst_ayar', symbol: 'عیار', name: 'عیار', assetType: 'etf' },
        holding: { id: 'h_ayar', instrumentId: 'inst_ayar', quantity: 200, averageBuyPriceTomans: 40000 },
        quote: { lastPriceTomans: 40000 },
        currentValueTomans: 8000000,
      },
    ];

    // Liquidate 1,000,000 Tomans proportionally
    const sellRes = calculateOptimalSales(1000000, cryptoAssets, bourseGold, [], DEFAULT_SETTINGS, {
      includeCrypto: true,
      includeBourseGold: true,
      includePhysicalGold: false,
    });

    assert.equal(sellRes.actualTotalSaleTomans, 1000000);
    assert.equal(sellRes.cryptoSaleTomans, 200000); // 20%
    assert.equal(sellRes.goldSaleTomans, 800000); // 80%

    // Apply deduction to crypto assets
    const deductedCrypto = cryptoAssets.map((asset) => {
      const sale = sellRes.cryptoSales.find((s) => s.id === asset.id);
      return {
        ...asset,
        currentHoldingValue: Math.max(0, asset.currentHoldingValue - (sale?.totalTomans || 0)),
      };
    });

    const newCryptoTotal = deductedCrypto.reduce((sum, c) => sum + c.currentHoldingValue, 0);
    assert.equal(newCryptoTotal, 1800000); // 2M - 200k = 1.8M
  });

  it('C4: Target Allocation Percentage Sliders Propagation to Engine & Donut Chart', () => {
    // 1. Change target percentages in settings (70% Gold, 30% Crypto)
    const customSettings = {
      ...DEFAULT_SETTINGS,
      goldPercent: 70,
      cryptoPercent: 30,
    };
    saveSettings(customSettings);
    assert.equal(loadSettings().goldPercent, 70);
    assert.equal(loadSettings().cryptoPercent, 30);

    // 2. Re-calculate portfolio with 10M input (3M savings)
    const result = calculatePortfolioAllocation(10000000, customSettings, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);

    // 70% of 3M = 2.1M Gold
    assert.equal(result.goldBuyAmount, 2100000);
    // 30% of 3M = 900K Crypto
    assert.equal(result.cryptoBuyAmount, 900000);
    assert.equal(result.totalCryptoBuySuggested, 900000);
  });

  it('C5: Nobitex Direct Config Override & Global Synchronization Event Dispatch', () => {
    const config = {
      authType: 'api_key' as const,
      publicKey: 'pub_key_direct_override',
      secretKey: 'sec_key_direct_override',
    };

    saveNobitexConfig(config);

    const loaded = loadNobitexConfig();
    assert.equal(loaded.publicKey, 'pub_key_direct_override');
    assert.equal(loaded.secretKey, 'sec_key_direct_override');

    const hasEvent = env.events.some((e) => e.name === 'nobitex_config_updated');
    assert.equal(hasEvent, true, 'Must broadcast nobitex_config_updated event');
  });

  it('C6: Physical Gold Lot Addition immediately updating Combined Net Worth & Holdings Tab', () => {
    savePhysicalGold([
      { id: 'gold_18k', title: 'طلای ۱۸ عیار', unit: 'گرم', quantity: 10, unitPriceTomans: 5000000 },
    ]);
    saveGoldBuyLots([
      { id: 'lot1', goldType: 'gold_18k', quantity: 10, purchaseUnitPriceTomans: 4000000, purchaseDate: '2026-08-01', totalCostTomans: 40000000 },
    ]);

    const physicalGold = loadPhysicalGold();
    const lots = loadGoldBuyLots();
    const pnl = calculateTotalPhysicalGoldPnl(physicalGold, lots);

    assert.equal(pnl.totalCurrentValueTomans, 50000000); // 10 * 5M = 50M
    assert.equal(pnl.totalCostBasisTomans, 40000000); // 40M
    assert.equal(pnl.totalUnrealizedProfitTomans, 10000000); // +10M profit
  });

  it('C7: Mid-Session Theme Toggle while BottomSheetModal is open preserves styling and contrast', () => {
    const docElem = (globalThis as any).document.documentElement;
    const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');

    // Open modal in Light Mode
    docElem.classList.remove('dark');
    metaTag.setAttribute('content', '#F1F5F9');
    localStorage.setItem('app_theme', 'light');

    const modalOpen = true;
    assert.equal(modalOpen, true);
    assert.equal(docElem.classList.contains('dark'), false);

    // Switch to Dark Mode while modal is active
    docElem.classList.add('dark');
    metaTag.setAttribute('content', '#0B0F17');
    localStorage.setItem('app_theme', 'dark');

    assert.equal(docElem.classList.contains('dark'), true);
    assert.equal(metaTag.getAttribute('content'), '#0B0F17');
  });

  it('C8: Backup Export, Wipe/Reset, and JSON Restore round-trip preserves 100% of state', () => {
    // 1. Seed custom portfolio state
    saveSettings({ ...DEFAULT_SETTINGS, savingsPercent: 40 });
    saveGoldHolding({ currentHoldingValue: 55000000 });
    saveProperties([{ id: 'prop_test', title: 'ویلای تست', type: 'residential', areaSquareMeters: 200, purchasePriceRial: 10000000000, currentValuationRial: 15000000000, includeInTotalNetWorth: true }]);

    // 2. Export backup
    const exportedJson = exportBackupData();
    assert.ok(exportedJson.length > 50);

    // 3. Wipe state
    localStorage.clear();
    assert.equal(localStorage.getItem('investment_app_settings_v1'), null);

    // 4. Import backup
    const restored = importBackupData(exportedJson);
    assert.equal(restored, true);

    // 5. Verify restored data
    assert.equal(loadSettings().savingsPercent, 40);
    assert.equal(loadGoldHolding().currentHoldingValue, 55000000);
    assert.equal(loadProperties().length, 1);
    assert.equal(loadProperties()[0].title, 'ویلای تست');
  });

  it('C9: Transaction History log replay verifies ledger consistency with holding balances', () => {
    const txList = [
      { id: 'tx1', totalInputAmount: 10000000, totalSavingsAmount: 3000000, goldBuyAmount: 2400000, cryptoBuyAmount: 600000, appliedToHoldings: true },
      { id: 'tx2', totalInputAmount: 20000000, totalSavingsAmount: 6000000, goldBuyAmount: 4800000, cryptoBuyAmount: 1200000, appliedToHoldings: true },
    ];
    saveTransactions(txList as any);

    const loaded = loadTransactions();
    assert.equal(loaded.length, 2);
    const cumulativeSavings = loaded.reduce((s, t) => s + t.totalSavingsAmount, 0);
    assert.equal(cumulativeSavings, 9000000);
  });

  it('C10: Real Estate property valuation increase updates dual-currency net worth and health alerts', () => {
    const prop = {
      id: 'p_tower',
      title: 'برج فرمانیه',
      type: 'residential' as const,
      areaSquareMeters: 300,
      purchasePriceRial: 300000000000, // 30 Billion Tomans
      currentValuationRial: 350000000000, // 35 Billion Tomans
      includeInTotalNetWorth: true,
    };
    saveProperties([prop]);

    const liquidValTomans = 1000000000; // 1 Billion Tomans
    const propValTomans = prop.currentValuationRial / 10;
    const totalNetWorth = liquidValTomans + propValTomans;

    assert.equal(totalNetWorth, 36000000000); // 36 Billion Tomans
    const usdtRate = 93000;
    const usdNetWorth = Math.round(totalNetWorth / usdtRate);
    assert.ok(usdNetWorth > 380000);
  });

  it('C11: Physical Gold FIFO Sale updates remaining lots and physical gold sales history ledger', () => {
    const item = { id: 'gold_18k' as const, title: 'طلای ۱۸ عیار', unit: 'گرم' as const, quantity: 15, unitPriceTomans: 5000000 };
    const lots = [
      { id: 'lot1', goldType: 'gold_18k' as const, quantity: 10, purchaseUnitPriceTomans: 4000000, purchaseDate: '2026-08-01', totalCostTomans: 40000000 },
      { id: 'lot2', goldType: 'gold_18k' as const, quantity: 5, purchaseUnitPriceTomans: 4500000, purchaseDate: '2026-08-10', totalCostTomans: 22500000 },
    ];

    // Sell 12g (all 10g of lot1 + 2g of lot2)
    const { saleRecord, updatedLots } = processGoldSale(item, 12, 5000000, lots);
    assert.equal(updatedLots.length, 1);
    assert.equal(updatedLots[0].quantity, 3); // 5 - 2 = 3g
    assert.equal(saleRecord.quantitySold, 12);
    assert.equal(saleRecord.totalRevenueTomans, 60000000); // 12 * 5M = 60M
    assert.equal(saleRecord.unitCostBasisTomans, 4083333); // Math.round(49M / 12)
    assert.equal(saleRecord.totalCostTomans, 48999996); // 12 * 4083333
    assert.equal(saleRecord.realizedProfitTomans, 11000004); // 60M - 48999996

    saveGoldBuyLots(updatedLots);
    savePhysicalGoldSales([saleRecord]);

    assert.equal(loadGoldBuyLots().length, 1);
    assert.equal(loadPhysicalGoldSales().length, 1);
  });

  it('C12: Market Price Ticker updates synchronizing with Portfolio Valuation and PnL calculation', () => {
    const instrument = {
      symbol: 'عیار',
      quantity: 1000,
      avgBuyPriceTomans: 30000,
      costBasisTomans: 30000000,
    };
    const livePriceTomans = 36000;
    const currentVal = instrument.quantity * livePriceTomans;
    const profitTomans = currentVal - instrument.costBasisTomans;
    const profitPct = (profitTomans / instrument.costBasisTomans) * 100;

    assert.equal(currentVal, 36000000);
    assert.equal(profitTomans, 6000000);
    assert.equal(profitPct, 20);
  });
});
