import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/mockStorage';
import { calculateRiskBuckets } from '../../src/utils/calculations';
import {
  loadDollarHolding,
  saveDollarHolding,
  loadStocks,
  saveStocks,
  exportBackupData,
  importBackupData,
} from '../../src/utils/storage';
import { DollarHolding, StockItem, RiskBucketsSummary } from '../../src/types/investment';
import { DEFAULT_DOLLAR_HOLDING, DEFAULT_STOCKS } from '../../src/constants/defaultData';

describe('3-Bucket Risk Allocation & Asset Categories (Dollar, Stocks)', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('calculateRiskBuckets Mathematical Engine', () => {
    it('calculates exact 3-bucket percentages for 20 years old with moderate risk', () => {
      const result = calculateRiskBuckets(20, 'moderate');
      assert.equal(result.lowRiskPercent, 20);
      assert.equal(result.highRiskPercent, 11);
      assert.equal(result.mediumRiskPercent, 69);
      assert.equal(result.lowRiskPercent + result.mediumRiskPercent + result.highRiskPercent, 100);
    });

    it('calculates conservative risk tolerance (8% crypto)', () => {
      const result = calculateRiskBuckets(25, 'conservative');
      assert.equal(result.lowRiskPercent, 25);
      assert.equal(result.highRiskPercent, 8);
      assert.equal(result.mediumRiskPercent, 67);
      assert.equal(result.lowRiskPercent + result.mediumRiskPercent + result.highRiskPercent, 100);
    });

    it('calculates aggressive risk tolerance (15% crypto)', () => {
      const result = calculateRiskBuckets(30, 'aggressive');
      assert.equal(result.lowRiskPercent, 30);
      assert.equal(result.highRiskPercent, 15);
      assert.equal(result.mediumRiskPercent, 55);
      assert.equal(result.lowRiskPercent + result.mediumRiskPercent + result.highRiskPercent, 100);
    });

    it('clamps age under 5 up to 5', () => {
      const result = calculateRiskBuckets(2, 'moderate');
      assert.equal(result.lowRiskPercent, 5);
      assert.equal(result.highRiskPercent, 11);
      assert.equal(result.mediumRiskPercent, 84);
      assert.equal(result.lowRiskPercent + result.mediumRiskPercent + result.highRiskPercent, 100);
    });

    it('clamps high age so medium risk maintains at least 5%', () => {
      const result = calculateRiskBuckets(90, 'aggressive');
      // High risk = 15%. Max lowRisk is 95 - 15 = 80%.
      assert.equal(result.highRiskPercent, 15);
      assert.equal(result.lowRiskPercent, 80);
      assert.equal(result.mediumRiskPercent, 5);
      assert.equal(result.lowRiskPercent + result.mediumRiskPercent + result.highRiskPercent, 100);
    });
  });

  describe('Dollar Holding Storage & Valuation', () => {
    it('returns DEFAULT_DOLLAR_HOLDING on initial empty storage', () => {
      const holding = loadDollarHolding();
      assert.equal(holding.amountUsd, DEFAULT_DOLLAR_HOLDING.amountUsd);
      assert.equal(holding.currentPriceTomans, DEFAULT_DOLLAR_HOLDING.currentPriceTomans);
    });

    it('saves and reloads updated dollar holding', () => {
      const updated: DollarHolding = {
        amountUsd: 2500,
        averageBuyPriceTomans: 85000,
        currentPriceTomans: 93500,
        lastUpdated: Date.now(),
      };
      saveDollarHolding(updated);
      const reloaded = loadDollarHolding();
      assert.equal(reloaded.amountUsd, 2500);
      assert.equal(reloaded.averageBuyPriceTomans, 85000);
      assert.equal(reloaded.currentPriceTomans, 93500);
    });
  });

  describe('Iranian Bourse Stocks Storage & Valuation', () => {
    it('returns DEFAULT_STOCKS on initial empty storage', () => {
      const stocks = loadStocks();
      assert.deepEqual(stocks, DEFAULT_STOCKS);
    });

    it('saves and reloads list of stock items', () => {
      const stockList: StockItem[] = [
        {
          id: 'stock_1',
          symbol: 'فولاد',
          title: 'فولاد مبارکه اصفهان',
          sharesCount: 10000,
          averageBuyPriceTomans: 550,
          currentPriceTomans: 620,
          updatedAt: Date.now(),
        },
        {
          id: 'stock_2',
          symbol: 'فملی',
          title: 'ملی صنایع مس ایران',
          sharesCount: 5000,
          averageBuyPriceTomans: 700,
          currentPriceTomans: 780,
          updatedAt: Date.now(),
        },
      ];

      saveStocks(stockList);
      const reloaded = loadStocks();
      assert.equal(reloaded.length, 2);
      assert.equal(reloaded[0].symbol, 'فولاد');
      assert.equal(reloaded[0].sharesCount, 10000);
      assert.equal(reloaded[1].symbol, 'فملی');
    });
  });

  describe('Backup & Restore Integrity for Dollar and Stocks', () => {
    it('exports and imports backup containing dollar holding and stocks', () => {
      const customDollar: DollarHolding = {
        amountUsd: 1200,
        averageBuyPriceTomans: 89000,
        currentPriceTomans: 94000,
        lastUpdated: Date.now(),
      };
      const customStocks: StockItem[] = [
        {
          id: 'stk_auto',
          symbol: 'خودرو',
          sharesCount: 20000,
          averageBuyPriceTomans: 310,
          currentPriceTomans: 350,
          updatedAt: Date.now(),
        },
      ];

      saveDollarHolding(customDollar);
      saveStocks(customStocks);

      const backupJson = exportBackupData();
      assert.ok(backupJson.length > 0);

      // Mutate storage
      saveDollarHolding({ ...DEFAULT_DOLLAR_HOLDING, amountUsd: 0 });
      saveStocks([]);

      // Import backup
      const success = importBackupData(backupJson);
      assert.equal(success, true);

      const restoredDollar = loadDollarHolding();
      const restoredStocks = loadStocks();

      assert.equal(restoredDollar.amountUsd, 1200);
      assert.equal(restoredDollar.averageBuyPriceTomans, 89000);
      assert.equal(restoredStocks.length, 1);
      assert.equal(restoredStocks[0].symbol, 'خودرو');
    });
  });
});
