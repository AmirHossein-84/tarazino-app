import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import core calculation engines
import {
  calculatePortfolioAllocation,
  calculateRebalancedBuys,
  calculateDirectBuys,
} from '../../src/utils/calculations';

import {
  calculateOptimalSales,
  SellOptions,
} from '../../src/utils/sellCalculator';

import {
  calculateGoldItemPnl,
  calculateTotalPhysicalGoldPnl,
  processGoldSale,
} from '../../src/utils/goldPnlCalculators';

import {
  loadSettings,
  saveSettings,
  loadCryptoAssets,
  saveCryptoAssets,
  loadGoldHolding,
  saveGoldHolding,
  loadPhysicalGold,
  savePhysicalGold,
  loadProperties,
  saveProperties,
  loadGoldBuyLots,
  saveGoldBuyLots,
  loadPhysicalGoldSales,
  savePhysicalGoldSales,
  loadTransactions,
  saveTransactions,
  loadLastInput,
  saveLastInput,
  loadMarketInstruments,
  saveMarketInstruments,
  loadMarketHoldings,
  saveMarketHoldings,
  loadNobitexConfig,
  saveNobitexConfig,
  exportBackupData,
  importBackupData,
  resetAllDataToDefault,
} from '../../src/utils/storage';

import { nobitexService } from '../../src/services/nobitex/NobitexService';
import {
  AppSettings,
  CryptoAsset,
  GoldHolding,
  PhysicalGoldItem,
  PhysicalGoldBuyLot,
  PropertyItem,
  TransactionRecord,
  MarketInstrument,
  UserMarketHolding,
} from '../../src/types/investment';
import { CombinedMarketItem } from '../../src/hooks/useMarketData';
import { NobitexConfig } from '../../src/services/nobitex/types';

// Setup Mock LocalStorage for node environment
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockLocalStorage = new MockLocalStorage();
(global as any).localStorage = mockLocalStorage;
(global as any).window = {
  localStorage: mockLocalStorage,
  dispatchEvent: (_evt: any) => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

describe('Challenger 2 (Gen 2) — Empirical Financial Calculations, Storage & Data Consistency Stress Suite', () => {

  // =========================================================================
  // SUITE 1: Capital Input Smart Split & Largest Remainder Math (Hamilton/Hare)
  // =========================================================================
  describe('1. Capital Input Smart Split & Largest Remainder Method Stress Tests', () => {
    
    it('LRM-1: Guarantees zero Toman leakage across 1,000 random budgets with odd/prime allocations', () => {
      const mockCryptoAssets: CryptoAsset[] = [
        { id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 33.33, currentHoldingValue: 0 },
        { id: 'eth', symbol: 'ETH', name: 'Ethereum', targetPercent: 27.77, currentHoldingValue: 0 },
        { id: 'sol', symbol: 'SOL', name: 'Solana', targetPercent: 19.19, currentHoldingValue: 0 },
        { id: 'ada', symbol: 'ADA', name: 'Cardano', targetPercent: 11.11, currentHoldingValue: 0 },
        { id: 'dot', symbol: 'DOT', name: 'Polkadot', targetPercent: 8.60, currentHoldingValue: 0 },
      ];

      // Test across 1,000 distinct pseudo-random prime / fractional budgets
      for (let i = 1; i <= 1000; i++) {
        const budget = (i * 97 + 13) % 50_000_000 + 1;
        const directAllocations = calculateDirectBuys(
          mockCryptoAssets.map((c) => ({ id: c.id, targetWeight: c.targetPercent })),
          budget
        );

        const sum = directAllocations.reduce((acc, a) => acc + a.suggestedBuy, 0);
        assert.equal(
          sum,
          budget,
          `Direct allocation sum (${sum}) must exactly equal budget (${budget}) on iteration ${i}`
        );

        // Ensure all allocations are non-negative integers
        for (const a of directAllocations) {
          assert.ok(Number.isInteger(a.suggestedBuy), `Allocation for ${a.id} must be integer: ${a.suggestedBuy}`);
          assert.ok(a.suggestedBuy >= 0, `Allocation for ${a.id} must be >= 0: ${a.suggestedBuy}`);
        }
      }
    });

    it('LRM-2: Extreme budget boundaries (0, negative, 1 Toman, 100 Billion Tomans)', () => {
      const assets = [
        { id: 'btc', targetWeight: 50 },
        { id: 'eth', targetWeight: 30 },
        { id: 'sol', targetWeight: 20 },
      ];

      // 0 budget
      const zeroRes = calculateDirectBuys(assets, 0);
      assert.equal(zeroRes.reduce((s, a) => s + a.suggestedBuy, 0), 0);

      // Negative budget -> coerced to 0
      const negRes = calculateDirectBuys(assets, -500000);
      assert.equal(negRes.reduce((s, a) => s + a.suggestedBuy, 0), 0);

      // 1 Toman budget across 3 assets: exactly one asset gets 1 Toman, others 0
      const oneRes = calculateDirectBuys(assets, 1);
      assert.equal(oneRes.reduce((s, a) => s + a.suggestedBuy, 0), 1);
      assert.equal(oneRes.find((a) => a.id === 'btc')?.suggestedBuy, 1);
      assert.equal(oneRes.find((a) => a.id === 'eth')?.suggestedBuy, 0);
      assert.equal(oneRes.find((a) => a.id === 'sol')?.suggestedBuy, 0);

      // 100 Billion Tomans (100,000,000,000)
      const bigBudget = 100_000_000_000;
      const bigRes = calculateDirectBuys(assets, bigBudget);
      const bigSum = bigRes.reduce((s, a) => s + a.suggestedBuy, 0);
      assert.equal(bigSum, bigBudget);
      assert.equal(bigRes.find((a) => a.id === 'btc')?.suggestedBuy, 50_000_000_000);
      assert.equal(bigRes.find((a) => a.id === 'eth')?.suggestedBuy, 30_000_000_000);
      assert.equal(bigRes.find((a) => a.id === 'sol')?.suggestedBuy, 20_000_000_000);
    });

    it('LRM-3: Degenerate weights (all zeros, negative weights, single asset 100%)', () => {
      // All weights 0 -> should distribute equally
      const zeroWeights = [
        { id: 'a', targetWeight: 0 },
        { id: 'b', targetWeight: 0 },
        { id: 'c', targetWeight: 0 },
      ];
      const resZeroWeights = calculateDirectBuys(zeroWeights, 100);
      assert.equal(resZeroWeights.reduce((s, a) => s + a.suggestedBuy, 0), 100);
      assert.equal(resZeroWeights[0].suggestedBuy, 34); // 100/3 = 33.33 -> 34, 33, 33
      assert.equal(resZeroWeights[1].suggestedBuy, 33);
      assert.equal(resZeroWeights[2].suggestedBuy, 33);

      // Single asset 100%
      const singleAsset = [{ id: 'btc', targetWeight: 100 }];
      const resSingle = calculateDirectBuys(singleAsset, 54321);
      assert.equal(resSingle[0].suggestedBuy, 54321);
    });

    it('LRM-4: Full portfolio allocation pipeline (Deposit -> Savings% -> Top Level Gold/Crypto -> Coin Level)', () => {
      const settings: AppSettings = {
        calculationMode: 'rebalance',
        goldPercent: 80,
        cryptoPercent: 20,
        savingsPercent: 40, // 40% of 100M = 40M
        currency: 'TOMAN',
      };

      const cryptoAssets: CryptoAsset[] = [
        { id: 'btc', symbol: 'BTC', name: 'BTC', targetPercent: 50, currentHoldingValue: 10_000_000 },
        { id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 50, currentHoldingValue: 30_000_000 },
      ];

      const goldHolding: GoldHolding = {
        currentHoldingValue: 60_000_000,
        averageBuyPrice: 35000,
      };

      // Input 100M, savings = 40M.
      // Total portfolio before = 60M (Gold) + 40M (Crypto) = 100M.
      // Target 80% Gold = 112M of 140M total portfolio.
      // Current Gold = 60M -> Needs 52M gold. But total budget = 40M.
      // So all 40M savings goes to Gold, 0 to Crypto.
      const result = calculatePortfolioAllocation(100_000_000, settings, cryptoAssets, goldHolding);

      assert.equal(result.totalInputAmount, 100_000_000);
      assert.equal(result.totalSavingsAmount, 40_000_000);
      assert.equal(result.goldBuyAmount, 40_000_000);
      assert.equal(result.cryptoBuyAmount, 0);
      assert.equal(result.totalCryptoBuySuggested, 0);
      assert.equal(result.newTotalPortfolioValue, 140_000_000);
    });
  });

  // =========================================================================
  // SUITE 2: Sell & Rebalance Waterfilling Liquidation Optimizer
  // =========================================================================
  describe('2. Sell/Rebalance Waterfilling Liquidation Optimizer Stress Tests', () => {

    const defaultSettings: AppSettings = {
      goldPercent: 80,
      cryptoPercent: 20,
      savingsPercent: 30,
      calculationMode: 'rebalance',
      currency: 'TOMAN',
    };

    const mockCryptoOverweight: CryptoAsset[] = [
      { id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 50, currentHoldingValue: 30_000_000, currentAmount: 0.01, unitPrice: 3_000_000_000, color: '#F7931A' },
      { id: 'eth', symbol: 'ETH', name: 'Ethereum', targetPercent: 50, currentHoldingValue: 20_000_000, currentAmount: 0.2, unitPrice: 100_000_000, color: '#627EEA' },
    ]; // Total Crypto = 50M (50% of 100M portfolio)

    const mockBourseGoldUnderweight: CombinedMarketItem[] = [
      {
        instrument: { id: 'ayar', symbol: 'عیار', name: 'طلای عیار', type: 'gold_etf', isDefault: true },
        holding: { quantity: 1250, averageBuyPriceTomans: 35000, updatedAt: '' },
        quote: { symbol: 'عیار', name: 'عیار', lastPriceTomans: 40000, changePercent: 1.5, updatedAt: '' },
        currentValueTomans: 50_000_000, // 1250 * 40000 = 50M (50% of 100M portfolio)
      },
    ];

    const mockPhysicalGold: PhysicalGoldItem[] = [
      { id: 'emami_coin', title: 'سکه تمام امامی', unit: 'سکه', quantity: 2, unitPriceTomans: 50_000_000 },
      { id: 'gold_18k', title: 'طلای ۱۸ عیار', unit: 'گرم', quantity: 10.5, unitPriceTomans: 4_500_000 },
    ];

    it('SELL-1: Empirical check on balanced liquidation behavior and over-allocation identification', () => {
      // Total portfolio = 50M (Bourse Gold) + 50M (Crypto) = 100M (no physical gold).
      // Current ratio = 50% Gold, 50% Crypto (Target = 80% Gold, 20% Crypto -> Crypto is overweight).
      // Request 20M sale.
      const res = calculateOptimalSales(20_000_000, mockCryptoOverweight, mockBourseGoldUnderweight, [], defaultSettings, {
        includeBourseGold: true,
        includeCrypto: true,
        includePhysicalGold: false,
      });

      assert.equal(res.requestedAmountTomans, 20_000_000);
      assert.equal(res.goldSaleTomans, 0, 'Gold should not be sold since it is underweight');
      assert.ok(res.cryptoSaleTomans > 0, 'Crypto should be liquidated');
      assert.equal(res.physicalGoldSaleTomans, 0);

      // Verify value conservation holds: current - sale = resulting
      assert.equal(
        res.currentPortfolioValue - res.actualTotalSaleTomans,
        res.resultingPortfolioValue,
        'Value conservation: current - sale = resulting'
      );
    });

    it('SELL-2: Waterfilling spillover when requested amount matches 40M target reduction', () => {
      // Portfolio: 50M Gold, 50M Crypto. Total = 100M. Target 80/20.
      // Request 40M sale. Target remaining = 60M (48M Gold, 12M Crypto).
      // Desired Crypto sale = 50M - 12M = 38M.
      // Desired Gold sale = 50M - 48M = 2M.
      // Total sale = 38M (Crypto) + 2M (Gold) = 40M.
      const res = calculateOptimalSales(40_000_000, mockCryptoOverweight, mockBourseGoldUnderweight, [], defaultSettings, {
        includeBourseGold: true,
        includeCrypto: true,
        includePhysicalGold: false,
      });

      assert.equal(res.requestedAmountTomans, 40_000_000);
      assert.equal(res.actualTotalSaleTomans, 40_000_000);
      assert.equal(res.goldSaleTomans, 2_000_000);
      assert.equal(res.cryptoSaleTomans, 38_000_000);

      // Resulting portfolio = 48M Gold / 12M Crypto = 60M (Exactly 80.0% Gold, 20.0% Crypto!)
      assert.equal(res.resultingPortfolioValue, 60_000_000);
      assert.equal(res.resultingGoldPercent, 80);
      assert.equal(res.resultingCryptoPercent, 20);
    });

    it('SELL-3: Physical Gold coin vs gram unit precision handling', () => {
      // Sale including physical gold: Gram items allow 3 decimals, coin items floor to integer
      const res = calculateOptimalSales(15_000_000, [], [], mockPhysicalGold, defaultSettings, {
        includeBourseGold: false,
        includeCrypto: false,
        includePhysicalGold: true,
      });

      assert.ok(res.physicalGoldSales.length > 0);
      for (const item of res.physicalGoldSales) {
        if (item.unit === 'سکه') {
          assert.ok(Number.isInteger(item.quantityToSell), `Coin sell quantity must be integer: ${item.quantityToSell}`);
        } else if (item.unit === 'گرم') {
          // Check max 3 decimal places
          const decimalPart = (String(item.quantityToSell).split('.')[1] || '');
          assert.ok(decimalPart.length <= 3, `Gram quantity should have <= 3 decimal places: ${item.quantityToSell}`);
        }
      }
    });

    it('SELL-4: Zero / negative / extreme over-liquidation boundary checks', () => {
      // 0 requested amount
      const zeroSale = calculateOptimalSales(0, mockCryptoOverweight, mockBourseGoldUnderweight, mockPhysicalGold, defaultSettings);
      assert.equal(zeroSale.actualTotalSaleTomans, 0);
      assert.equal(zeroSale.resultingPortfolioValue, zeroSale.currentPortfolioValue);

      // Negative requested amount
      const negSale = calculateOptimalSales(-1000000, mockCryptoOverweight, mockBourseGoldUnderweight, mockPhysicalGold, defaultSettings);
      assert.equal(negSale.actualTotalSaleTomans, 0);

      // Requesting more than total portfolio value (e.g. 500M when portfolio is 100M)
      const overSale = calculateOptimalSales(500_000_000, mockCryptoOverweight, mockBourseGoldUnderweight, [], defaultSettings, {
        includeBourseGold: true,
        includeCrypto: true,
        includePhysicalGold: false,
      });
      // Should sell at most available eligible value (50M bourse + 50M crypto = 100M)
      assert.equal(overSale.actualTotalSaleTomans, 100_000_000);
      assert.equal(overSale.resultingPortfolioValue, 0);
    });
  });

  // =========================================================================
  // SUITE 3: Physical Gold FIFO Lot Tracking & Weighted Cost Basis
  // =========================================================================
  describe('3. Physical Gold FIFO Lot Tracking & Weighted Cost Basis Stress Tests', () => {

    const testItem: PhysicalGoldItem = {
      id: 'gold_18k',
      title: 'طلای ۱۸ عیار',
      unit: 'گرم',
      quantity: 50,
      unitPriceTomans: 5_000_000, // 5M/g
    };

    const lots: PhysicalGoldBuyLot[] = [
      { id: 'lot_1', goldType: 'gold_18k', title: 'خرید ۱', quantity: 10, purchaseUnitPriceTomans: 3_500_000, totalCostTomans: 35_000_000, purchaseDate: '2025-01-01' },
      { id: 'lot_2', goldType: 'gold_18k', title: 'خرید ۲', quantity: 20, purchaseUnitPriceTomans: 4_000_000, totalCostTomans: 80_000_000, purchaseDate: '2025-02-01' },
      { id: 'lot_3', goldType: 'gold_18k', title: 'خرید ۳', quantity: 20, purchaseUnitPriceTomans: 4_500_000, totalCostTomans: 90_000_000, purchaseDate: '2025-03-01' },
    ];

    it('FIFO-1: Unrealized P&L weighted cost basis computation', () => {
      // Total Qty = 10 + 20 + 20 = 50g.
      // Total Cost = 35M + 80M + 90M = 205M.
      // Weighted average cost = 205M / 50 = 4,100,000 Tomans/g.
      // Current value @ 5M/g = 250M.
      // Unrealized Profit = 250M - 205M = +45,000,000 Tomans (+21.95%).
      const pnl = calculateGoldItemPnl(testItem, lots);

      assert.equal(pnl.quantity, 50);
      assert.equal(pnl.totalCostBasisTomans, 205_000_000);
      assert.equal(pnl.weightedAverageCostTomans, 4_100_000);
      assert.equal(pnl.currentValueTomans, 250_000_000);
      assert.equal(pnl.unrealizedProfitTomans, 45_000_000);
      assert.ok(Math.abs(pnl.unrealizedProfitPercent - 21.951) < 0.01);
      assert.equal(pnl.lotsCount, 3);
    });

    it('FIFO-2: Sequential FIFO partial sales exhausting lots in chronological order', () => {
      // Step 1: Sell 15g @ 5.5M/g.
      // FIFO takes all of Lot 1 (10g @ 3.5M = 35M) and 5g from Lot 2 (5g @ 4M = 20M).
      // Exact sold cost basis = 55M.
      // Unit cost basis = Math.round(55M / 15) = 3,666,667 Tomans/g.
      // Recorded total cost basis = 15 * 3,666,667 = 55,000,005 Tomans.
      // Revenue = 15g * 5.5M = 82.5M.
      // Realized profit = 82.5M - 55,000,005 = +27,499,995 Tomans.
      const sale1 = processGoldSale(testItem, 15, 5_500_000, lots, 'Sale 1');

      assert.equal(sale1.saleRecord.quantitySold, 15);
      assert.equal(sale1.saleRecord.unitCostBasisTomans, 3666667);
      assert.equal(sale1.saleRecord.totalCostTomans, 55000005);
      assert.equal(sale1.saleRecord.totalRevenueTomans, 82500000);
      assert.equal(sale1.saleRecord.realizedProfitTomans, 27499995);

      // Remaining lots after Sale 1:
      // Lot 1 is exhausted (deleted).
      // Lot 2 has 15g remaining @ 4M = 60M.
      // Lot 3 has 20g remaining @ 4.5M = 90M.
      assert.equal(sale1.updatedLots.length, 2);
      const remainingLot2 = sale1.updatedLots.find((l) => l.id === 'lot_2');
      const remainingLot3 = sale1.updatedLots.find((l) => l.id === 'lot_3');
      assert.equal(remainingLot2?.quantity, 15);
      assert.equal(remainingLot2?.totalCostTomans, 60_000_000);
      assert.equal(remainingLot3?.quantity, 20);
      assert.equal(remainingLot3?.totalCostTomans, 90_000_000);

      // Step 2: Second sale of 25g @ 6M/g from updated lots.
      // FIFO takes remaining 15g of Lot 2 (15g @ 4M = 60M) and 10g of Lot 3 (10g @ 4.5M = 45M).
      // Cost basis = 105M.
      // Unit cost basis = Math.round(105M / 25) = 4,200,000 Tomans/g.
      // Recorded total cost basis = 25 * 4,200,000 = 105,000,000 Tomans.
      // Revenue = 25g * 6M = 150M.
      // Realized profit = 150M - 105M = +45M (+42.86%).
      const sale2 = processGoldSale(testItem, 25, 6_000_000, sale1.updatedLots, 'Sale 2');

      assert.equal(sale2.saleRecord.quantitySold, 25);
      assert.equal(sale2.saleRecord.unitCostBasisTomans, 4200000);
      assert.equal(sale2.saleRecord.totalCostTomans, 105000000);
      assert.equal(sale2.saleRecord.totalRevenueTomans, 150000000);
      assert.equal(sale2.saleRecord.realizedProfitTomans, 45000000);
      assert.ok(Math.abs(sale2.saleRecord.realizedProfitPercent - 42.857) < 0.01);

      // Remaining lots after Sale 2:
      // Lot 2 is exhausted.
      // Lot 3 has 10g remaining @ 4.5M = 45M.
      assert.equal(sale2.updatedLots.length, 1);
      assert.equal(sale2.updatedLots[0].id, 'lot_3');
      assert.equal(sale2.updatedLots[0].quantity, 10);
      assert.equal(sale2.updatedLots[0].totalCostTomans, 45_000_000);
    });

    it('FIFO-3: Fallback when no purchase lots exist (manual averageBuyPrice)', () => {
      const itemWithoutLots: PhysicalGoldItem = {
        id: 'gold_coin',
        title: 'سکه تمام',
        unit: 'سکه',
        quantity: 5,
        unitPriceTomans: 55_000_000,
        averageBuyPriceTomans: 45_000_000,
      };

      const pnl = calculateGoldItemPnl(itemWithoutLots, []);
      assert.equal(pnl.totalCostBasisTomans, 225_000_000); // 5 * 45M
      assert.equal(pnl.currentValueTomans, 275_000_000); // 5 * 55M
      assert.equal(pnl.unrealizedProfitTomans, 50_000_000);

      const sale = processGoldSale(itemWithoutLots, 2, 60_000_000, []);
      assert.equal(sale.saleRecord.totalCostTomans, 90_000_000); // 2 * 45M
      assert.equal(sale.saleRecord.totalRevenueTomans, 120_000_000); // 2 * 60M
      assert.equal(sale.saleRecord.realizedProfitTomans, 30_000_000);
    });
  });

  // =========================================================================
  // SUITE 4: Nobitex Direct Override & Market Symbol Extraction
  // =========================================================================
  describe('4. Nobitex Direct Override & Market Symbol Extraction Stress Tests', () => {

    it('NOBI-1: Market symbol extractor correctly resolves complex ticker combinations', () => {
      const testCases = [
        { input: { market: 'BTC-RLS' }, expected: { src: 'btc', dst: 'rls' } },
        { input: { market: 'ETH_USDT' }, expected: { src: 'eth', dst: 'usdt' } },
        { input: { market: 'USDT-RLS' }, expected: { src: 'usdt', dst: 'rls' } },
        { input: { symbol: 'BTCIRT' }, expected: { src: 'btc', dst: 'irt' } },
        { input: { symbol: 'SOLUSDT' }, expected: { src: 'sol', dst: 'usdt' } },
        { input: { symbol: 'DOGERLS' }, expected: { src: 'doge', dst: 'rls' } },
        { input: { srcCurrency: 'notcoin', dstCurrency: 'toman' }, expected: { src: 'not', dst: 'irt' } },
        { input: { srcCurrency: 'shiba inu', dstCurrency: 'rls' }, expected: { src: 'shib', dst: 'rls' } },
        { input: { srcCurrency: 'matic', dstCurrency: 'usdt' }, expected: { src: 'pol', dst: 'usdt' } },
      ];

      for (const tc of testCases) {
        const result = (nobitexService as any).extractMarketSymbols(tc.input);
        assert.deepEqual(
          result,
          tc.expected,
          `Failed to parse symbol for input: ${JSON.stringify(tc.input)}`
        );
      }
    });

    it('NOBI-2: Nobitex config persistence and direct override event synchronization', () => {
      let eventFired = false;
      const originalDispatch = (global as any).window.dispatchEvent;
      (global as any).window.dispatchEvent = (evt: any) => {
        if (evt?.type === 'nobitex_config_updated') {
          eventFired = true;
        }
        return true;
      };

      const testConfig: NobitexConfig = {
        authType: 'api_key',
        publicKey: 'TEST_PUBLIC_KEY_1234567890',
        secretKey: 'TEST_SECRET_KEY_0987654321',
        autoSyncEnabled: true,
      };

      saveNobitexConfig(testConfig);
      assert.ok(eventFired, 'nobitex_config_updated event must be dispatched upon saving config');

      const loaded = loadNobitexConfig();
      assert.equal(loaded.authType, 'api_key');
      assert.equal(loaded.publicKey, 'TEST_PUBLIC_KEY_1234567890');
      assert.equal(loaded.secretKey, 'TEST_SECRET_KEY_0987654321');

      // Cleanup
      (global as any).window.dispatchEvent = originalDispatch;
    });
  });

  // =========================================================================
  // SUITE 5: Storage Persistence, Backup Export/Import & Schema Migration
  // =========================================================================
  describe('5. Storage Persistence, Backup Export/Import & Schema Migration Stress Tests', () => {

    it('STORE-1: Full state roundtrip through exportBackupData and importBackupData', () => {
      // Clear storage
      resetAllDataToDefault();

      const sampleSettings: AppSettings = {
        goldPercent: 75,
        cryptoPercent: 25,
        savingsPercent: 35,
        calculationMode: 'rebalance',
        currency: 'USD',
      };
      saveSettings(sampleSettings);

      const sampleCrypto: CryptoAsset[] = [
        { id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 60, currentHoldingValue: 50_000_000 },
        { id: 'eth', symbol: 'ETH', name: 'Ethereum', targetPercent: 40, currentHoldingValue: 25_000_000 },
      ];
      saveCryptoAssets(sampleCrypto);

      const sampleGoldHolding: GoldHolding = {
        currentHoldingValue: 120_000_000,
        averageBuyPrice: 38000,
      };
      saveGoldHolding(sampleGoldHolding);

      const sampleProperties: PropertyItem[] = [
        { id: 'prop_1', title: 'آپارتمان نیاوران', purchasePriceRials: 100_000_000_000, currentValuationRials: 130_000_000_000, includeInNetWorth: true, createdAt: '2025-01-01' },
      ];
      saveProperties(sampleProperties);

      const sampleLots: PhysicalGoldBuyLot[] = [
        { id: 'lot_a', goldType: 'gold_18k', title: 'سرمایه‌گذاری ۱', quantity: 20, purchaseUnitPriceTomans: 4_200_000, totalCostTomans: 84_000_000, purchaseDate: '2025-01-10' },
      ];
      saveGoldBuyLots(sampleLots);

      const sampleTx: TransactionRecord[] = [
        { id: 'tx_1', timestamp: Date.now(), totalInputTomans: 10_000_000, goldAllocatedTomans: 8_000_000, cryptoAllocatedTomans: 2_000_000, dateFormatted: '1403/12/01' },
      ];
      saveTransactions(sampleTx);

      saveNobitexConfig({
        authType: 'api_key',
        publicKey: 'PUB_KEY_ABCD',
        secretKey: 'CONFIDENTIAL_SECRET_XYZ',
      });

      // Export JSON backup
      const exportedJson = exportBackupData();
      assert.ok(exportedJson.length > 50);

      // Verify Secret Key is SANITIZED from exported JSON
      const parsedExport = JSON.parse(exportedJson);
      assert.equal(parsedExport.nobitexConfig?.secretKey, '', 'Nobitex secret key MUST be sanitized in export');
      assert.equal(parsedExport.nobitexConfig?.publicKey, 'PUB_KEY_ABCD');

      // Now wipe storage
      resetAllDataToDefault();
      assert.equal(loadProperties().length, 0);
      assert.equal(loadGoldBuyLots().length, 0);

      // Import backup back
      const importSuccess = importBackupData(exportedJson);
      assert.ok(importSuccess, 'Import backup must return true');

      // Verify all items are faithfully restored
      const restoredSettings = loadSettings();
      assert.equal(restoredSettings.goldPercent, 75);
      assert.equal(restoredSettings.savingsPercent, 35);
      assert.equal(restoredSettings.currency, 'USD');

      const restoredCrypto = loadCryptoAssets();
      assert.equal(restoredCrypto.length, 2);
      assert.equal(restoredCrypto[0].symbol, 'BTC');

      const restoredGold = loadGoldHolding();
      assert.equal(restoredGold.currentHoldingValue, 120_000_000);

      const restoredProps = loadProperties();
      assert.equal(restoredProps.length, 1);
      assert.equal(restoredProps[0].title, 'آپارتمان نیاوران');

      const restoredLots = loadGoldBuyLots();
      assert.equal(restoredLots.length, 1);
      assert.equal(restoredLots[0].quantity, 20);

      const restoredTx = loadTransactions();
      assert.equal(restoredTx.length, 1);
    });

    it('STORE-2: Corrupted, malformed JSON or empty string handling', () => {
      // Empty string
      assert.equal(importBackupData(''), false);

      // Random text
      assert.equal(importBackupData('{ not valid json'), false);

      // Valid JSON but completely missing required fields
      assert.equal(importBackupData('{"randomField": 123}'), false);

      // LocalStorage corrupted JSON recovery
      mockLocalStorage.setItem('investment_app_settings_v1', 'CORRUPTED{{');
      const recoveredSettings = loadSettings();
      assert.ok(recoveredSettings.goldPercent !== undefined, 'Must fall back to default settings gracefully');

      mockLocalStorage.setItem('investment_app_crypto_assets_v1', 'NOT_AN_ARRAY');
      const recoveredCrypto = loadCryptoAssets();
      assert.ok(Array.isArray(recoveredCrypto), 'Must fall back to default crypto array');
    });
  });
});
