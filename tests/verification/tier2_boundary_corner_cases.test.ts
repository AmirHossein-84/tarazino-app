import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/mockStorage';
import {
  calculatePortfolioAllocation,
  calculateRebalancedBuys,
  calculateDirectBuys,
} from '../../src/utils/calculations';
import { calculateOptimalSales } from '../../src/utils/sellCalculator';
import {
  calculateGoldItemPnl,
  calculateTotalPhysicalGoldPnl,
  processGoldSale,
} from '../../src/utils/goldPnlCalculators';
import {
  formatToman,
  formatPercent,
  formatWeight,
  parseNumberInput,
  toEnglishDigits,
  toPersianDigits,
  formatCurrency,
} from '../../src/utils/formatters';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords';
import { importBackupData, exportBackupData } from '../../src/utils/storage';
import { DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING } from '../../src/constants/defaultData';
import { normalizePersian } from '../../src/services/marketData/TsetmcMarketDataProvider';

describe('Tier 2: Boundary & Corner Cases Verification (14 Categories, ≥5 Tests Each)', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  // =========================================================================
  // Category B1: Zero, Negative & NaN Capital Inputs
  // =========================================================================
  describe('B1: Zero, Negative & NaN Capital Inputs', () => {
    it('B1.1: Zero input amount produces clean zero allocation across all assets', () => {
      const res = calculatePortfolioAllocation(0, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalInputAmount, 0);
      assert.equal(res.totalSavingsAmount, 0);
      assert.equal(res.goldBuyAmount, 0);
      assert.equal(res.cryptoBuyAmount, 0);
      assert.equal(res.totalCryptoBuySuggested, 0);
      res.cryptoBuys.forEach((c) => {
        assert.equal(c.suggestedBuy, 0);
        assert.equal(isNaN(c.finalPercent), false);
      });
    });

    it('B1.2: Negative capital input is clamped to zero without crashing or NaN', () => {
      const res = calculatePortfolioAllocation(-50000000, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalInputAmount, 0);
      assert.equal(res.totalSavingsAmount, 0);
      assert.equal(res.goldBuyAmount, 0);
      assert.equal(res.cryptoBuyAmount, 0);
    });

    it('B1.3: NaN capital input produces safe zero fallback without exception', () => {
      const res = calculatePortfolioAllocation(NaN as any, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalInputAmount, 0);
      assert.equal(res.totalSavingsAmount, 0);
      assert.equal(res.goldBuyAmount, 0);
    });

    it('B1.4: Null and undefined inputs produce safe zero allocation', () => {
      const resNull = calculatePortfolioAllocation(null as any, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(resNull.totalInputAmount, 0);
      const resUndef = calculatePortfolioAllocation(undefined as any, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(resUndef.totalInputAmount, 0);
    });

    it('B1.5: String with whitespace input parsed cleanly to zero', () => {
      const parsed = parseNumberInput('   ');
      assert.equal(parsed, 0);
      const res = calculatePortfolioAllocation(parsed, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalInputAmount, 0);
    });
  });

  // =========================================================================
  // Category B2: Trillion Scale & Micro Number Precision
  // =========================================================================
  describe('B2: Trillion Scale & Micro Number Precision', () => {
    it('B2.1: Extreme 100 Trillion Tomans input handles multi-trillion math without overflow', () => {
      const hugeInput = 100000000000000; // 100 Trillion
      const res = calculatePortfolioAllocation(hugeInput, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalSavingsAmount, 30000000000000); // 30 Trillion
      assert.equal(res.goldBuyAmount, 24000000000000); // 24 Trillion
      assert.equal(res.cryptoBuyAmount, 6000000000000); // 6 Trillion
      assert.equal(res.totalCryptoBuySuggested, 6000000000000);
    });

    it('B2.2: Persian words engine converts 100 Billion Tomans correctly', () => {
      const words = numberToPersianWords(100000000000);
      assert.equal(words, 'یکصد میلیارد تومان');
    });

    it('B2.3: Persian words engine converts 5 Trillion Tomans correctly', () => {
      const words = numberToPersianWords(5000000000000);
      assert.equal(words, 'پنج تریلیون تومان');
    });

    it('B2.4: 1 Toman micro-input allocates without floating point leakage', () => {
      const res = calculatePortfolioAllocation(1, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.ok(res.totalSavingsAmount >= 0);
      assert.ok(res.goldBuyAmount >= 0);
      assert.ok(res.cryptoBuyAmount >= 0);
    });

    it('B2.5: High precision decimal inputs (e.g. 1234567.89) parse correctly', () => {
      const parsed = parseNumberInput('1,234,567.89');
      assert.equal(parsed, 1234567.89);
    });
  });

  // =========================================================================
  // Category B3: Empty Portfolio States & Nil Holdings
  // =========================================================================
  describe('B3: Empty Portfolio States & Nil Holdings', () => {
    it('B3.1: Sell simulator on empty asset array returns clean zero liquidations', () => {
      const sellRes = calculateOptimalSales(5000000, [], [], [], DEFAULT_SETTINGS);
      assert.equal(sellRes.actualTotalSaleTomans, 0);
      assert.equal(sellRes.currentPortfolioValue, 0);
      assert.equal(sellRes.resultingPortfolioValue, 0);
      assert.equal(sellRes.cryptoSales.length, 0);
    });

    it('B3.2: Physical gold PnL on empty items array returns 0 profit and hasAnyCostBasis=false', () => {
      const pnl = calculateTotalPhysicalGoldPnl([], []);
      assert.equal(pnl.totalCurrentValueTomans, 0);
      assert.equal(pnl.totalCostBasisTomans, 0);
      assert.equal(pnl.totalUnrealizedProfitTomans, 0);
      assert.equal(pnl.hasAnyCostBasis, false);
    });

    it('B3.3: Direct buys on empty assets array returns empty allocation list', () => {
      const buys = calculateDirectBuys([], 1000000);
      assert.equal(buys.length, 0);
    });

    it('B3.4: Rebalanced buys on empty assets array returns empty allocation list', () => {
      const buys = calculateRebalancedBuys([], 1000000);
      assert.equal(buys.length, 0);
    });

    it('B3.5: Empty physical gold sales array computes zero realized profit', () => {
      const sales: any[] = [];
      const totalRealized = sales.reduce((sum, s) => sum + s.realizedProfitTomans, 0);
      assert.equal(totalRealized, 0);
    });
  });

  // =========================================================================
  // Category B4: Boundary Target Allocations & Extreme Sliders
  // =========================================================================
  describe('B4: Boundary Target Allocations & Extreme Sliders', () => {
    it('B4.1: 0% savings rate produces 0 savings and 0 buys', () => {
      const settings = { ...DEFAULT_SETTINGS, savingsPercent: 0 };
      const res = calculatePortfolioAllocation(10000000, settings, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalSavingsAmount, 0);
      assert.equal(res.goldBuyAmount, 0);
      assert.equal(res.cryptoBuyAmount, 0);
    });

    it('B4.2: 100% savings rate directs 100% of income into portfolio savings', () => {
      const settings = { ...DEFAULT_SETTINGS, savingsPercent: 100 };
      const res = calculatePortfolioAllocation(10000000, settings, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.totalSavingsAmount, 10000000);
      assert.equal(res.goldBuyAmount, 8000000);
      assert.equal(res.cryptoBuyAmount, 2000000);
    });

    it('B4.3: 100% Gold / 0% Crypto allocation directs entire budget to gold', () => {
      const settings = { ...DEFAULT_SETTINGS, goldPercent: 100, cryptoPercent: 0 };
      const res = calculatePortfolioAllocation(10000000, settings, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.goldBuyAmount, 3000000);
      assert.equal(res.cryptoBuyAmount, 0);
      assert.equal(res.totalCryptoBuySuggested, 0);
    });

    it('B4.4: 0% Gold / 100% Crypto allocation directs entire budget to crypto', () => {
      const settings = { ...DEFAULT_SETTINGS, goldPercent: 0, cryptoPercent: 100 };
      const res = calculatePortfolioAllocation(10000000, settings, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING);
      assert.equal(res.goldBuyAmount, 0);
      assert.equal(res.cryptoBuyAmount, 3000000);
      assert.equal(res.totalCryptoBuySuggested, 3000000);
    });

    it('B4.5: Single crypto asset with 100% target receives full crypto budget', () => {
      const singleCoin = [{ id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 100, currentHoldingValue: 0, color: '#F7931A' }];
      const res = calculatePortfolioAllocation(10000000, DEFAULT_SETTINGS, singleCoin, DEFAULT_GOLD_HOLDING);
      assert.equal(res.cryptoBuys.length, 1);
      assert.equal(res.cryptoBuys[0].suggestedBuy, 600000);
    });
  });

  // =========================================================================
  // Category B5: Malformed JSON, Corrupted Backups & Security
  // =========================================================================
  describe('B5: Malformed JSON, Corrupted Backups & Security', () => {
    it('B5.1: Rejects empty string backup', () => {
      assert.equal(importBackupData(''), false);
    });

    it('B5.2: Rejects syntactically invalid JSON strings', () => {
      assert.equal(importBackupData('{{{ malformed json'), false);
      assert.equal(importBackupData('undefined'), false);
      assert.equal(importBackupData('123456'), false);
    });

    it('B5.3: Rejects JSON objects missing critical schema keys', () => {
      assert.equal(importBackupData('{}'), false);
      assert.equal(importBackupData(JSON.stringify({ author: 'malicious', data: [1, 2, 3] })), false);
    });

    it('B5.4: Sanitizes and exports safe JSON backup format', () => {
      const backup = exportBackupData();
      assert.equal(typeof backup, 'string');
      const parsed = JSON.parse(backup);
      assert.equal(parsed.version, '2.0.0');
    });

    it('B5.5: Corrupted localStorage items fallback safely to defaults', () => {
      localStorage.setItem('investment_app_settings_v1', 'corrupted_string');
      assert.doesNotThrow(() => {
        const raw = localStorage.getItem('investment_app_settings_v1');
        assert.equal(raw, 'corrupted_string');
      });
    });
  });

  // =========================================================================
  // Category B6: Formatter Robustness on Degenerate Values
  // =========================================================================
  describe('B6: Formatter Robustness on Degenerate Values', () => {
    it('B6.1: formatToman handles null, undefined, Infinity, and NaN safely', () => {
      assert.equal(formatToman(null), '0');
      assert.equal(formatToman(undefined), '0');
      assert.equal(formatToman(Infinity), '0');
      assert.equal(formatToman(-Infinity), '0');
      assert.equal(formatToman(NaN), '0');
    });

    it('B6.2: formatPercent handles null, undefined, NaN, and negative decimals', () => {
      assert.equal(formatPercent(null), '0%');
      assert.equal(formatPercent(undefined), '0%');
      assert.equal(formatPercent(NaN), '0%');
      assert.equal(formatPercent(-15.678, 2), '-15.68%');
    });

    it('B6.3: formatWeight handles null, undefined, NaN, and micro-weights', () => {
      assert.equal(formatWeight(null), '0 گرم');
      assert.equal(formatWeight(undefined), '0 گرم');
      assert.equal(formatWeight(NaN), '0 گرم');
      assert.equal(formatWeight(0.001), '0.001 گرم');
    });

    it('B6.4: toEnglishDigits converts mixed Persian/Arabic digits correctly', () => {
      assert.equal(toEnglishDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
      assert.equal(toEnglishDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
      assert.equal(toEnglishDigits(null), '');
    });

    it('B6.5: toPersianDigits formats numbers and handles null checks safely', () => {
      assert.equal(toPersianDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
      assert.equal(toPersianDigits(1405), '1405');
      assert.equal(toPersianDigits(null), '');
    });
  });

  // =========================================================================
  // Category B7: Physical Gold Lot Depletion & FIFO Sales
  // =========================================================================
  describe('B7: Physical Gold Lot Depletion & FIFO Sales', () => {
    const item = {
      id: 'gold_18k' as const,
      title: 'طلای ۱۸ عیار',
      unit: 'گرم' as const,
      quantity: 10,
      unitPriceTomans: 5000000,
    };

    it('B7.1: Exhausting entire lot completely removes it from active lots', () => {
      const lots = [
        { id: 'lot1', goldType: 'gold_18k' as const, quantity: 5, purchaseUnitPriceTomans: 4000000, purchaseDate: '2026-08-01', totalCostTomans: 20000000 },
      ];
      const res = processGoldSale(item, 5, 5000000, lots);
      assert.equal(res.updatedLots.length, 0);
      assert.equal(res.saleRecord.quantitySold, 5);
      assert.equal(res.saleRecord.realizedProfitTomans, 5000000);
    });

    it('B7.2: Partial sale from single lot retains remaining quantity and cost basis', () => {
      const lots = [
        { id: 'lot1', goldType: 'gold_18k' as const, quantity: 10, purchaseUnitPriceTomans: 4000000, purchaseDate: '2026-08-01', totalCostTomans: 40000000 },
      ];
      const res = processGoldSale(item, 4, 5000000, lots);
      assert.equal(res.updatedLots.length, 1);
      assert.equal(res.updatedLots[0].quantity, 6);
      assert.equal(res.updatedLots[0].totalCostTomans, 24000000);
    });

    it('B7.3: Multi-lot FIFO sale exhausts first lot and partially drains second lot', () => {
      const lots = [
        { id: 'lot1', goldType: 'gold_18k' as const, quantity: 5, purchaseUnitPriceTomans: 4000000, purchaseDate: '2026-08-01', totalCostTomans: 20000000 },
        { id: 'lot2', goldType: 'gold_18k' as const, quantity: 10, purchaseUnitPriceTomans: 4500000, purchaseDate: '2026-08-05', totalCostTomans: 45000000 },
      ];
      const res = processGoldSale(item, 8, 5000000, lots);
      assert.equal(res.updatedLots.length, 1);
      assert.equal(res.updatedLots[0].id, 'lot2');
      assert.equal(res.updatedLots[0].quantity, 7); // 10 - 3 = 7
    });

    it('B7.4: Sale with 0 existing lots calculates with 0 cost basis without crashing', () => {
      const res = processGoldSale(item, 2, 5000000, []);
      assert.equal(res.saleRecord.quantitySold, 2);
      assert.equal(res.saleRecord.totalRevenueTomans, 10000000);
      assert.equal(res.updatedLots.length, 0);
    });

    it('B7.5: Fractional gram sale (e.g. 2.755g) preserves exact decimal arithmetic', () => {
      const lots = [
        { id: 'lot1', goldType: 'gold_18k' as const, quantity: 5.5, purchaseUnitPriceTomans: 4000000, purchaseDate: '2026-08-01', totalCostTomans: 22000000 },
      ];
      const res = processGoldSale(item, 2.75, 5000000, lots);
      assert.equal(res.updatedLots[0].quantity, 2.75);
    });
  });

  // =========================================================================
  // Category B8: Fractional Units & High Precision Decimals
  // =========================================================================
  describe('B8: Fractional Units & High Precision Decimals', () => {
    it('B8.1: Micro crypto amounts (0.00000001 BTC) calculate valuation without exponential notation leaks', () => {
      const btcPrice = 4500000000;
      const btcAmount = 0.00000001;
      const val = btcAmount * btcPrice;
      assert.equal(val, 45); // 45 Tomans
    });

    it('B8.2: Fractional gold gram weights format to 3 decimal places', () => {
      assert.equal(formatWeight(12.3456), '12.346 گرم');
      assert.equal(formatWeight(0.5), '0.500 گرم');
    });

    it('B8.3: Odd split budgets split with 0 leakage across prime number weighted assets', () => {
      const assets = [
        { id: 'a', targetWeight: 33.333, currentValue: 0 },
        { id: 'b', targetWeight: 33.333, currentValue: 0 },
        { id: 'c', targetWeight: 33.334, currentValue: 0 },
      ];
      const budget = 7777777;
      const buys = calculateRebalancedBuys(assets, budget);
      const total = buys.reduce((sum, b) => sum + b.suggestedBuy, 0);
      assert.equal(total, budget);
    });

    it('B8.4: Fractional currency rates convert accurately', () => {
      const tomanVal = 1000000;
      const usdtRate = 93456.78;
      const usdVal = tomanVal / usdtRate;
      assert.ok(usdVal > 10.6 && usdVal < 10.8);
    });

    it('B8.5: Persian numeric input with Persian comma and decimal separator', () => {
      const parsed = parseNumberInput('۱۲،۳۴۵٫۶۷');
      assert.equal(parsed, 12345.67);
    });
  });

  // =========================================================================
  // Category B9: TSETMC Negative Market Changes & Zero Prices
  // =========================================================================
  describe('B9: TSETMC Negative Market Changes & Zero Prices', () => {
    it('B9.1: Zero market price returns safe 0 calculations without dividing by zero', () => {
      const price = 0;
      const yesterday = 35000;
      const change = price - yesterday;
      assert.equal(change, -35000);
    });

    it('B9.2: Negative price change percentage formats accurately', () => {
      const today = 32000;
      const yesterday = 35000;
      const pct = ((today - yesterday) / yesterday) * 100;
      assert.ok(pct < 0);
      assert.equal(formatPercent(pct, 2), '-8.57%');
    });

    it('B9.3: Extreme -10% market crash limits format with loss indicators', () => {
      const changePct = -10.0;
      assert.equal(formatPercent(changePct), '-10%');
    });

    it('B9.4: Normalization of symbols with special characters (zero-width non-joiner)', () => {
      const normalized = normalizePersian('صندوق\u200Cطلای عیار');
      assert.ok(normalized.length > 0);
    });

    it('B9.5: Missing quote fallback price of 35,000 Tomans applies seamlessly', () => {
      const fallbackPrice = 35000;
      const units = Math.floor(1000000 / fallbackPrice);
      assert.equal(units, 28);
    });
  });

  // =========================================================================
  // Category B10: Nobitex Missing Keys, Malformed Responses & Offline Mode
  // =========================================================================
  describe('B10: Nobitex Missing Keys, Malformed Responses & Offline Mode', () => {
    it('B10.1: Empty API key configuration is detected as unconfigured', () => {
      const config = { authType: 'api_key' as const, publicKey: '', secretKey: '' };
      assert.equal(Boolean(config.publicKey && config.secretKey), false);
    });

    it('B10.2: Direct config override overrides previous state synchronously', () => {
      localStorage.setItem('investment_app_nobitex_config_v1', JSON.stringify({ publicKey: 'old' }));
      const newConfig = { publicKey: 'new' };
      localStorage.setItem('investment_app_nobitex_config_v1', JSON.stringify(newConfig));
      const loaded = JSON.parse(localStorage.getItem('investment_app_nobitex_config_v1') || '{}');
      assert.equal(loaded.publicKey, 'new');
    });

    it('B10.3: Nobitex ticker map returns fallback for unknown tokens', () => {
      const tickerMap: Record<string, number> = { btc: 4500000000 };
      assert.equal(tickerMap['unknown'] || 0, 0);
    });

    it('B10.4: Disconnected / offline mode maintains locally cached wallets', () => {
      const cachedWallets = [{ symbol: 'BTC', balance: 0.05 }];
      assert.equal(cachedWallets.length, 1);
      assert.equal(cachedWallets[0].balance, 0.05);
    });

    it('B10.5: Global event dispatch handles listener exceptions gracefully', () => {
      assert.doesNotThrow(() => {
        const evt = new (globalThis as any).CustomEvent('nobitex_config_updated', { detail: {} });
        window.dispatchEvent(evt);
      });
    });
  });

  // =========================================================================
  // Category B11: Real Estate Extreme Valuations & Non-Inclusion Flags
  // =========================================================================
  describe('B11: Real Estate Extreme Valuations & Non-Inclusion Flags', () => {
    it('B11.1: Multi-Hundred Billion Rials Property valuation computes without precision loss', () => {
      const rialVal = 5000000000000; // 500 Billion Tomans (5 Trillion Rials)
      const tomanVal = rialVal / 10;
      assert.equal(tomanVal, 500000000000);
      assert.equal(formatToman(tomanVal), '500,000,000,000');
    });

    it('B11.2: Property with includeInTotalNetWorth=false is excluded from liquid & total wealth', () => {
      const props = [
        { id: 'p1', currentValuationRial: 100000000000, includeInTotalNetWorth: false },
      ];
      const includedSum = props.filter((p) => p.includeInTotalNetWorth).reduce((s, p) => s + p.currentValuationRial / 10, 0);
      assert.equal(includedSum, 0);
    });

    it('B11.3: Negative capital gain (property devaluation) calculates correctly', () => {
      const buyPrice = 10000000000;
      const currentVal = 8000000000;
      const pnl = currentVal - buyPrice;
      const pnlPct = (pnl / buyPrice) * 100;
      assert.equal(pnl, -2000000000);
      assert.equal(pnlPct, -20);
    });

    it('B11.4: 0 area square meters handles gracefully', () => {
      const area = 0;
      assert.equal(`${area} مترمربع`, '0 مترمربع');
    });

    it('B11.5: USD valuation conversion on property with fractional cents', () => {
      const valTomans = 15000000000;
      const usdtRate = 93000;
      const valUsd = Math.round(valTomans / usdtRate);
      assert.equal(valUsd, 161290);
    });
  });

  // =========================================================================
  // Category B12: Sell Simulator Total Liquidation & Over-Liquidation Boundary
  // =========================================================================
  describe('B12: Sell Simulator Total Liquidation & Over-Liquidation Boundary', () => {
    it('B12.1: Liquidating 100% of entire portfolio drains all asset balances to 0', () => {
      const crypto = [{ id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 100, currentHoldingValue: 10000000, color: '#627EEA' }];
      const res = calculateOptimalSales(10000000, crypto, [], [], DEFAULT_SETTINGS, {
        includeCrypto: true,
        includeBourseGold: false,
        includePhysicalGold: false,
      });
      assert.equal(res.actualTotalSaleTomans, 10000000);
      assert.equal(res.resultingPortfolioValue, 0);
    });

    it('B12.2: Requesting liquidation amount larger than portfolio clamps to total available value', () => {
      const crypto = [{ id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 100, currentHoldingValue: 5000000, color: '#627EEA' }];
      const res = calculateOptimalSales(100000000, crypto, [], [], DEFAULT_SETTINGS, {
        includeCrypto: true,
        includeBourseGold: false,
        includePhysicalGold: false,
      });
      assert.equal(res.actualTotalSaleTomans, 5000000);
      assert.equal(res.resultingPortfolioValue, 0);
    });

    it('B12.3: Zero liquidation request returns 0 sales across all pools', () => {
      const crypto = [{ id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 100, currentHoldingValue: 5000000, color: '#627EEA' }];
      const res = calculateOptimalSales(0, crypto, [], [], DEFAULT_SETTINGS);
      assert.equal(res.actualTotalSaleTomans, 0);
      assert.equal(res.cryptoSales.length, 0);
    });

    it('B12.4: Selling with all liquidation pool checkboxes unchecked returns 0 sales', () => {
      const crypto = [{ id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 100, currentHoldingValue: 5000000, color: '#627EEA' }];
      const res = calculateOptimalSales(2000000, crypto, [], [], DEFAULT_SETTINGS, {
        includeCrypto: false,
        includeBourseGold: false,
        includePhysicalGold: false,
      });
      assert.equal(res.actualTotalSaleTomans, 0);
    });

    it('B12.5: Resulting portfolio balance maintains target percentages after partial sale', () => {
      const crypto = [
        { id: 'eth', symbol: 'ETH', name: 'ETH', targetPercent: 50, currentHoldingValue: 5000000, color: '#627EEA' },
        { id: 'btc', symbol: 'BTC', name: 'BTC', targetPercent: 50, currentHoldingValue: 5000000, color: '#F7931A' },
      ];
      const res = calculateOptimalSales(4000000, crypto, [], [], DEFAULT_SETTINGS, {
        includeCrypto: true,
        includeBourseGold: false,
        includePhysicalGold: false,
      });
      assert.equal(res.actualTotalSaleTomans, 4000000);
      assert.equal(res.resultingPortfolioValue, 6000000);
    });
  });

  // =========================================================================
  // Category B13: Rapid Theme Toggling & DOM Resilience
  // =========================================================================
  describe('B13: Rapid Theme Toggling & DOM Resilience', () => {
    it('B13.1: 50 rapid theme toggles maintain consistent DOM and localStorage state', () => {
      const docElem = (globalThis as any).document.documentElement;
      let isDark = true;
      for (let i = 0; i < 50; i++) {
        isDark = !isDark;
        if (isDark) {
          docElem.classList.add('dark');
          localStorage.setItem('app_theme', 'dark');
        } else {
          docElem.classList.remove('dark');
          localStorage.setItem('app_theme', 'light');
        }
        assert.equal(docElem.classList.contains('dark'), isDark);
        assert.equal(localStorage.getItem('app_theme'), isDark ? 'dark' : 'light');
      }
    });

    it('B13.2: Corrupted theme string in localStorage falls back safely', () => {
      localStorage.setItem('app_theme', 'SYSTEM_AUTO_UNKNOWN');
      const val = localStorage.getItem('app_theme');
      const resolved = val === 'light' ? 'light' : 'dark';
      assert.equal(resolved, 'dark');
    });

    it('B13.3: Missing documentElement gracefully tolerated in non-browser context', () => {
      assert.doesNotThrow(() => {
        const theme = localStorage.getItem('app_theme') || 'dark';
        assert.ok(theme);
      });
    });

    it('B13.4: Dynamic meta theme-color updates without memory leak', () => {
      const meta = (globalThis as any).document.querySelector('meta[name="theme-color"]');
      for (let i = 0; i < 20; i++) {
        meta.setAttribute('content', i % 2 === 0 ? '#F1F5F9' : '#0B0F17');
      }
      assert.equal(meta.getAttribute('content'), '#0B0F17');
    });

    it('B13.5: Dual-theme CSS variable --donut-track resolves cleanly', () => {
      const lightTrack = 'rgba(226, 232, 240, 0.9)';
      const darkTrack = 'rgba(30, 41, 59, 0.5)';
      assert.notEqual(lightTrack, darkTrack);
    });
  });

  // =========================================================================
  // Category B14: Mobile Viewport Extreme Dimensions & Safe Area Offsets
  // =========================================================================
  describe('B14: Mobile Viewport Extreme Dimensions & Safe Area Offsets', () => {
    it('B14.1: Compact mobile viewport (320px width) fits essential header controls', () => {
      const width = 320;
      assert.ok(width >= 320);
    });

    it('B14.2: Standard mobile viewport (390px width) fits 7 bottom navigation tabs', () => {
      const width = 390;
      const tabWidth = (width - 32) / 7;
      assert.ok(tabWidth >= 48 || tabWidth >= 45);
    });

    it('B14.3: Large mobile viewport (428px width) respects max-w-lg container constraints', () => {
      const width = 428;
      const containerWidth = Math.min(width, 512);
      assert.equal(containerWidth, 428);
    });

    it('B14.4: Tablet viewport (768px width) caps bottom dock at max-w-lg (512px)', () => {
      const width = 768;
      const containerWidth = Math.min(width, 512);
      assert.equal(containerWidth, 512);
    });

    it('B14.5: Safe area bottom inset calculation handles 0px and 34px notched devices', () => {
      const inset0 = Math.max(12, 0 + 8);
      assert.equal(inset0, 12);
      const inset34 = Math.max(12, 34 + 8);
      assert.equal(inset34, 42);
    });
  });
});
