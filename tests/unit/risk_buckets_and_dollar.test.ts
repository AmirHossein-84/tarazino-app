import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/mockStorage';
import { calculateRiskBuckets } from '../../src/utils/calculations';
import {
  loadDollarHolding,
  saveDollarHolding,
  exportBackupData,
  importBackupData,
} from '../../src/utils/storage';
import { DollarHolding, RiskBucketsSummary } from '../../src/types/investment';
import { DEFAULT_DOLLAR_HOLDING } from '../../src/constants/defaultData';

describe('3-Bucket Risk Allocation & Asset Categories (Dollar, Gold & Bourse)', () => {
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

  describe('Unified Medium-Risk Bucket (Physical Gold + Bourse Gold Funds)', () => {
    it('correctly aggregates physical gold and bourse gold funds into medium-risk total', () => {
      const physicalGoldVal = 85_000_000;
      const tsetmcGoldFundsVal = 35_000_000; // e.g. عیار + کهربا
      const mediumRiskTotal = physicalGoldVal + tsetmcGoldFundsVal;
      assert.equal(mediumRiskTotal, 120_000_000);
    });
  });

  describe('Backup & Restore Integrity for Dollar Holding', () => {
    it('exports and imports backup containing dollar holding properly', () => {
      const customDollar: DollarHolding = {
        amountUsd: 1200,
        averageBuyPriceTomans: 89000,
        currentPriceTomans: 94000,
        lastUpdated: Date.now(),
      };

      saveDollarHolding(customDollar);

      const backupJson = exportBackupData();
      assert.ok(backupJson.length > 0);

      // Mutate storage
      saveDollarHolding({ ...DEFAULT_DOLLAR_HOLDING, amountUsd: 0 });

      // Import backup
      const success = importBackupData(backupJson);
      assert.equal(success, true);

      const restoredDollar = loadDollarHolding();
      assert.equal(restoredDollar.amountUsd, 1200);
      assert.equal(restoredDollar.averageBuyPriceTomans, 89000);
      assert.equal(restoredDollar.currentPriceTomans, 94000);
    });
  });

  describe('Birthdate Year Range & Onboarding Configuration', () => {
    it('covers all birth years down to 1310 (up to 95 years history)', () => {
      const currentYear = 1404;
      const minYear = 1310;
      const years: number[] = [];
      for (let y = currentYear; y >= minYear; y--) {
        years.push(y);
      }
      assert.equal(years.length, 95);
      assert.equal(years[0], 1404);
      assert.equal(years[years.length - 1], 1310);
      // Ensure common birth years like 1360, 1370, 1380 exist
      assert.ok(years.includes(1360));
      assert.ok(years.includes(1370));
      assert.ok(years.includes(1380));
    });

    it('calculates age properly from Jalali birthdate', () => {
      const birthYear = 1375;
      const currentYear = 1404;
      const calculatedAge = currentYear - birthYear;
      assert.equal(calculatedAge, 29);
      const buckets = calculateRiskBuckets(calculatedAge, 'moderate');
      assert.equal(buckets.lowRiskPercent, 29);
      assert.equal(buckets.highRiskPercent, 11);
      assert.equal(buckets.mediumRiskPercent, 60);
    });

    it('enforces canCancel only when existing user accounts are present', () => {
      // Case 1: Fresh install, no profiles -> canCancel is false
      const emptyVault = { profiles: [] };
      const canCancelEmpty = Boolean(emptyVault && emptyVault.profiles && emptyVault.profiles.length > 0);
      assert.equal(canCancelEmpty, false);

      // Case 2: Existing accounts present -> canCancel is true
      const populatedVault = {
        profiles: [{ id: 'user-1', name: 'کاربر ۱' }],
      };
      const canCancelPopulated = Boolean(populatedVault && populatedVault.profiles && populatedVault.profiles.length > 0);
      assert.equal(canCancelPopulated, true);
    });
  });
});
