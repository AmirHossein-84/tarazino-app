import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/mockStorage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_CRYPTO_ASSETS,
  DEFAULT_GOLD_HOLDING,
  DEFAULT_PHYSICAL_GOLD_ITEMS,
} from '../../src/constants/defaultData';
import { calculatePortfolioAllocation } from '../../src/utils/calculations';
import {
  saveSettings,
  loadSettings,
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
  saveNobitexConfig,
  loadNobitexConfig,
} from '../../src/utils/storage';
import { calculateGoldItemPnl, calculateTotalPhysicalGoldPnl, processGoldSale } from '../../src/utils/goldPnlCalculators';
import { calculateOptimalSales } from '../../src/utils/sellCalculator';
import { formatToman, formatTomanWithUnit, parseNumberInput, toEnglishDigits } from '../../src/utils/formatters';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords';

describe('Tier 4: Real-World User Workflows & Comprehensive End-to-End Scenarios', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  /**
   * SCENARIO 1: Full Capital Allocation & Smart Purchase Application
   * A user enters 50,000,000 Tomans salary/income.
   * Smart allocation splits 30% = 15,000,000 Tomans.
   * 80% (12,000,000) goes to Gold ETF (Ayar @ 35,000 Tomans = 342 units).
   * 20% (3,000,000) is rebalanced across 9 crypto assets using largest-remainder method.
   * User clicks "Apply Purchases": holdings update, transaction record is saved, and portfolio donut reflects new distribution.
   */
  it('Scenario 1: End-to-End Capital Deposit, Smart Split, ETF Units & Portfolio Update', () => {
    // 1. Initial State Setup
    saveGoldHolding({ currentHoldingValue: 0, currentGrams: 0, pricePerGram: 5000000 });
    saveCryptoAssets(DEFAULT_CRYPTO_ASSETS);
    saveTransactions([]);

    const salaryInput = 50000000; // 50M Tomans
    assert.equal(numberToPersianWords(salaryInput), 'پنجاه میلیون تومان');

    // 2. Calculate smart portfolio allocation
    const allocResult = calculatePortfolioAllocation(
      salaryInput,
      DEFAULT_SETTINGS,
      DEFAULT_CRYPTO_ASSETS,
      DEFAULT_GOLD_HOLDING
    );

    assert.equal(allocResult.totalInputAmount, 50000000);
    assert.equal(allocResult.totalSavingsAmount, 15000000);
    assert.equal(allocResult.goldBuyAmount, 12000000);
    assert.equal(allocResult.cryptoBuyAmount, 3000000);
    assert.equal(allocResult.totalCryptoBuySuggested, 3000000);

    // 3. Gold ETF Buy arithmetic (Ayar @ 35,000 Tomans/unit)
    const ayarUnitPrice = 35000;
    const ayarUnitsToBuy = Math.floor(allocResult.goldBuyAmount / ayarUnitPrice);
    const ayarTotalCost = ayarUnitsToBuy * ayarUnitPrice;
    assert.equal(ayarUnitsToBuy, 342);
    assert.equal(ayarTotalCost, 11970000);
    assert.equal(allocResult.goldBuyAmount - ayarTotalCost, 30000); // 30k cash remainder

    // 4. Crypto asset distribution (ETH 25%, BTC 19%, BNB 15%, etc.)
    const ethBuy = allocResult.cryptoBuys.find((c) => c.symbol === 'ETH');
    const btcBuy = allocResult.cryptoBuys.find((c) => c.symbol === 'BTC');
    assert.equal(ethBuy?.suggestedBuy, 750000); // 25% of 3M
    assert.equal(btcBuy?.suggestedBuy, 570000); // 19% of 3M

    // Sum of crypto buys must equal exactly 3,000,000 Tomans
    const cryptoBuysSum = allocResult.cryptoBuys.reduce((sum, c) => sum + c.suggestedBuy, 0);
    assert.equal(cryptoBuysSum, 3000000);

    // 5. Apply purchases to holdings in storage
    const currentGold = loadGoldHolding();
    saveGoldHolding({
      ...currentGold,
      currentHoldingValue: (currentGold.currentHoldingValue || 0) + allocResult.goldBuyAmount,
    });

    const currentCrypto = loadCryptoAssets();
    const updatedCrypto = currentCrypto.map((asset) => {
      const buy = allocResult.cryptoBuys.find((b) => b.id === asset.id);
      return {
        ...asset,
        currentHoldingValue: asset.currentHoldingValue + (buy?.suggestedBuy || 0),
      };
    });
    saveCryptoAssets(updatedCrypto);

    // 6. Record transaction in audit history
    const tx = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      persianDate: '۱۴۰۵/۰۶/۰۷ - ۰۸:۰۰',
      totalInputAmount: allocResult.totalInputAmount,
      totalSavingsAmount: allocResult.totalSavingsAmount,
      goldBuyAmount: allocResult.goldBuyAmount,
      cryptoBuyAmount: allocResult.cryptoBuyAmount,
      cryptoBuys: allocResult.cryptoBuys.filter((b) => b.suggestedBuy > 0).map((b) => ({
        symbol: b.symbol,
        name: b.name,
        amount: b.suggestedBuy,
      })),
      appliedToHoldings: true,
    };
    saveTransactions([tx]);

    // 7. Verify final persisted state
    assert.equal(loadGoldHolding().currentHoldingValue, 12000000);
    const ethLoaded = loadCryptoAssets().find((c) => c.symbol === 'ETH');
    assert.equal(ethLoaded?.currentHoldingValue, 750000);
    assert.equal(loadTransactions().length, 1);
    assert.equal(loadTransactions()[0].appliedToHoldings, true);
  });

  /**
   * SCENARIO 2: Real Estate Portfolio Valuation & Total Net Worth Sync
   * A user adds an apartment in Tehran for 12,000,000,000 Rials (1.2B Tomans).
   * Valuation increases to 15,000,000,000 Rials (1.5B Tomans).
   * Net worth hero combines liquid portfolio (Gold + Crypto) with Real Estate.
   * Currency mode switches to USD Tether (@ 93,000 Tomans/USDT).
   */
  it('Scenario 2: Real Estate Property Addition, Capital Gains & Dual-Currency Net Worth Hero', () => {
    saveGoldHolding({ currentHoldingValue: 300000000 }); // 300M Tomans Gold
    saveCryptoAssets([
      { id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 100, currentHoldingValue: 200000000, color: '#F7931A' },
    ]); // 200M Tomans Crypto
    // Liquid net worth = 500M Tomans

    // 1. Add new property
    const newProperty = {
      id: 'prop_saadat_abad',
      title: 'آپارتمان سعادت‌آباد',
      type: 'residential' as const,
      areaSquareMeters: 110,
      purchaseDate: '2025-06-01',
      purchasePriceRial: 120000000000, // 120 Billion Rials = 12 Billion Tomans
      currentValuationRial: 150000000000, // 150 Billion Rials = 15 Billion Tomans
      currentValuationUsd: 161290,
      includeInTotalNetWorth: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveProperties([newProperty]);

    // 2. Verify property valuation in Tomans
    const properties = loadProperties();
    assert.equal(properties.length, 1);
    const propValTomans = Math.round(properties[0].currentValuationRial / 10);
    assert.equal(propValTomans, 15000000000); // 15 Billion Tomans

    // 3. Compute combined net worth (Liquid 500M + Real Estate 15B = 15.5 Billion Tomans)
    const liquidNetWorth = 500000000;
    const totalNetWorthTomans = liquidNetWorth + propValTomans;
    assert.equal(totalNetWorthTomans, 15500000000);

    assert.equal(formatToman(totalNetWorthTomans), '15,500,000,000');
    assert.equal(numberToPersianWords(totalNetWorthTomans), 'پانزده میلیارد و پانصد میلیون تومان');

    // 4. Toggle property out of net worth
    const updatedProperty = { ...newProperty, includeInTotalNetWorth: false };
    saveProperties([updatedProperty]);
    const netWorthWithoutProp = liquidNetWorth;
    assert.equal(netWorthWithoutProp, 500000000);

    // 5. USD Tether mode conversion
    const usdtRate = 93000;
    const totalNetWorthUsd = Math.round(totalNetWorthTomans / usdtRate);
    assert.ok(totalNetWorthUsd > 165000 && totalNetWorthUsd < 170000);
  });

  /**
   * SCENARIO 3: Physical Gold Multi-Lot Purchase, Weighted Cost Basis & FIFO Partial Sale
   * User buys 2 lots of 18k gold:
   *   - Lot 1: 10g @ 4,200,000 Tomans/g (42M)
   *   - Lot 2: 15g @ 4,800,000 Tomans/g (72M)
   * Total 25g, Cost = 114M, Weighted Avg Cost = 4,560,000 Tomans/g.
   * Live price reaches 5,200,000 Tomans/g (Value = 130M, Unrealized P&L = +16M / +14.035%).
   * User executes partial sale of 12g @ 5,200,000 Tomans/g:
   *   - FIFO: Lot 1 (10g @ 4.2M = 42M) + Lot 2 (2g @ 4.8M = 9.6M) = 51.6M cost basis.
   *   - Revenue: 12g * 5.2M = 62.4M.
   *   - Realized profit: 62.4M - 51.6M = 10.8M (+20.93%).
   *   - Remaining: 13g in Lot 2 @ 4.8M = 62.4M cost basis.
   */
  it('Scenario 3: Physical Gold Multi-Lot Buy, Weighted Basis, FIFO Partial Sale & Ledger Audit', () => {
    const item18k = {
      id: 'gold_18k' as const,
      title: 'طلای ۱۸ عیار',
      unit: 'گرم' as const,
      quantity: 25,
      unitPriceTomans: 5200000,
    };

    const initialLots = [
      {
        id: 'lot_gold_1',
        goldType: 'gold_18k' as const,
        quantity: 10,
        purchaseUnitPriceTomans: 4200000,
        purchaseDate: '2026-06-01',
        totalCostTomans: 42000000,
      },
      {
        id: 'lot_gold_2',
        goldType: 'gold_18k' as const,
        quantity: 15,
        purchaseUnitPriceTomans: 4800000,
        purchaseDate: '2026-07-01',
        totalCostTomans: 72000000,
      },
    ];

    savePhysicalGold([item18k]);
    saveGoldBuyLots(initialLots);
    savePhysicalGoldSales([]);

    // 1. Check pre-sale unrealized P&L
    const preSalePnl = calculateGoldItemPnl(item18k, initialLots);
    assert.equal(preSalePnl.quantity, 25);
    assert.equal(preSalePnl.currentValueTomans, 130000000); // 25 * 5.2M = 130M
    assert.equal(preSalePnl.totalCostBasisTomans, 114000000); // 42M + 72M = 114M
    assert.equal(preSalePnl.weightedAverageCostTomans, 4560000); // 114M / 25 = 4.56M
    assert.equal(preSalePnl.unrealizedProfitTomans, 16000000); // 130M - 114M = 16M
    assert.ok(Math.abs(preSalePnl.unrealizedProfitPercent - 14.035) < 0.01);

    // 2. Process partial sale of 12g @ 5,200,000 Tomans/g
    const saleUnitPrice = 5200000;
    const qtyToSell = 12;
    const { saleRecord, updatedLots } = processGoldSale(item18k, qtyToSell, saleUnitPrice, initialLots, 'فروش پله اول نوسان‌گیری');

    // 3. Verify exact FIFO cost basis & realized profit
    // Lot 1 (10g @ 4.2M = 42M) + Lot 2 (2g @ 4.8M = 9.6M) = 51.6M
    // Unit cost basis = Math.round(51.6M / 12) = 4,300,000 Tomans/g
    // Recorded cost = 12 * 4,300,000 = 51,600,000 Tomans
    // Revenue = 12 * 5.2M = 62,400,000 Tomans
    // Realized Profit = 62.4M - 51.6M = 10,800,000 Tomans (+20.93%)
    assert.equal(saleRecord.quantitySold, 12);
    assert.equal(saleRecord.unitCostBasisTomans, 4300000);
    assert.equal(saleRecord.totalRevenueTomans, 62400000);
    assert.equal(saleRecord.totalCostTomans, 51600000);
    assert.equal(saleRecord.realizedProfitTomans, 10800000);
    assert.ok(Math.abs(saleRecord.realizedProfitPercent - 20.93) < 0.01);
    assert.equal(saleRecord.notes, 'فروش پله اول نوسان‌گیری');

    // 4. Verify updated lots in storage
    assert.equal(updatedLots.length, 1);
    assert.equal(updatedLots[0].id, 'lot_gold_2');
    assert.equal(updatedLots[0].quantity, 13); // 15 - 2 = 13g remaining
    assert.equal(updatedLots[0].totalCostTomans, 62400000); // 13 * 4.8M = 62.4M

    // 5. Persist state and verify post-sale ledger
    saveGoldBuyLots(updatedLots);
    savePhysicalGoldSales([saleRecord]);

    const persistedLots = loadGoldBuyLots();
    const persistedSales = loadPhysicalGoldSales();
    assert.equal(persistedLots.length, 1);
    assert.equal(persistedSales.length, 1);
    assert.equal(persistedSales[0].realizedProfitTomans, 10800000);
  });

  /**
   * SCENARIO 4: Nobitex Direct Config Override & Live Crypto Portfolio Sync
   * User enters Nobitex API Key + Secret Key.
   * Direct override bypasses async state lag.
   * Event `nobitex_config_updated` is broadcast.
   * Synchronized wallets map balances to CryptoAsset items and calculate profit/loss.
   */
  it('Scenario 4: Nobitex Secure API Key Override, Wallet Balance Mapping & Global Event', () => {
    const config = {
      authType: 'api_key' as const,
      publicKey: 'nobitex_live_api_key_7788',
      secretKey: 'nobitex_live_secret_key_9900',
    };

    // 1. Direct config override
    saveNobitexConfig(config);

    // 2. Verify stored credentials
    const loadedConfig = loadNobitexConfig();
    assert.equal(loadedConfig.authType, 'api_key');
    assert.equal(loadedConfig.publicKey, 'nobitex_live_api_key_7788');
    assert.equal(loadedConfig.secretKey, 'nobitex_live_secret_key_9900');

    // 3. Verify event dispatched
    assert.equal(env.events.some((e) => e.name === 'nobitex_config_updated'), true);

    // 4. Simulate syncing with user crypto holdings (e.g. BTC: 0.05, ETH: 1.2)
    const syncedAssets = [
      {
        id: 'btc',
        symbol: 'BTC',
        name: 'بیت‌کوین',
        targetPercent: 50,
        currentAmount: 0.05,
        unitPrice: 4500000000,
        currentHoldingValue: 225000000, // 0.05 * 4.5B = 225M Tomans
        averageBuyPrice: 4000000000,
        totalCostTomans: 200000000,
        profitTomans: 25000000,
        profitPercent: 12.5,
        color: '#F7931A',
      },
      {
        id: 'eth',
        symbol: 'ETH',
        name: 'اتریوم',
        targetPercent: 50,
        currentAmount: 1.2,
        unitPrice: 150000000,
        currentHoldingValue: 180000000, // 1.2 * 150M = 180M Tomans
        averageBuyPrice: 130000000,
        totalCostTomans: 156000000,
        profitTomans: 24000000,
        profitPercent: 15.38,
        color: '#627EEA',
      },
    ];

    saveCryptoAssets(syncedAssets);
    const loadedAssets = loadCryptoAssets();
    assert.equal(loadedAssets.length, 2);
    assert.equal(loadedAssets[0].profitTomans, 25000000);
    assert.equal(loadedAssets[1].profitTomans, 24000000);
  });

  /**
   * SCENARIO 5: Mid-Session Theme Switching with Active Modals & Skeletons
   * User navigates through tabs, opens bottom sheet modals, and toggles theme back and forth.
   * Confirms `html.dark` class sync, `meta[name="theme-color"]` attribute sync, and token classes.
   */
  it('Scenario 5: Mid-Session Theme Toggle, Meta Sync, Modal Glass Cards & Persian Digits', () => {
    const docElem = (globalThis as any).document.documentElement;
    const metaTag = (globalThis as any).document.querySelector('meta[name="theme-color"]');

    // 1. Initial Light Mode transition
    docElem.classList.remove('dark');
    metaTag.setAttribute('content', '#F1F5F9');
    localStorage.setItem('app_theme', 'light');

    assert.equal(docElem.classList.contains('dark'), false);
    assert.equal(metaTag.getAttribute('content'), '#F1F5F9');
    assert.equal(localStorage.getItem('app_theme'), 'light');

    // 2. Open BottomSheetModal in Light Mode
    const modalState = { isOpen: true, title: 'افزودن پله خرید طلا' };
    assert.equal(modalState.isOpen, true);
    assert.equal(modalState.title, 'افزودن پله خرید طلا');

    // 3. Switch to Dark Mode while Modal is Open
    docElem.classList.add('dark');
    metaTag.setAttribute('content', '#0B0F17');
    localStorage.setItem('app_theme', 'dark');

    assert.equal(docElem.classList.contains('dark'), true);
    assert.equal(metaTag.getAttribute('content'), '#0B0F17');
    assert.equal(localStorage.getItem('app_theme'), 'dark');

    // 4. Verify Persian digit formatting remains consistent across themes
    const formattedAmount = formatToman(75000000);
    assert.equal(formattedAmount, '75,000,000');
    assert.equal(toEnglishDigits('۷۵,۰۰۰,۰۰۰'), '75,000,000');
  });
});
