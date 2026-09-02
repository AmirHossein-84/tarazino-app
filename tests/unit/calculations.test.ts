import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePortfolioAllocation,
  calculateRebalancedBuys,
  calculateDirectBuys,
} from '../../src/utils/calculations';
import { AppSettings, CryptoAsset, GoldHolding } from '../../src/types/investment';
import { DEFAULT_CRYPTO_ASSETS, DEFAULT_SETTINGS } from '../../src/constants/defaultData';

describe('Portfolio Calculations & Allocation Engine', () => {
  const sampleSettings: AppSettings = {
    savingsPercent: 30,
    goldPercent: 80,
    cryptoPercent: 20,
    calculationMode: 'rebalance',
    currencyUnit: 'toman',
    goldPricePerGram: 5000000,
  };

  const sampleCrypto: CryptoAsset[] = [
    { id: 'eth', symbol: 'ETH', name: 'Ethereum', targetPercent: 50, currentHoldingValue: 0, color: '#627EEA' },
    { id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 50, currentHoldingValue: 0, color: '#F7931A' },
  ];

  const emptyGold: GoldHolding = {
    currentHoldingValue: 0,
    currentGrams: 0,
    pricePerGram: 5000000,
  };

  it('calculates 30% savings and 80/20 split on clean initial deposit', () => {
    const inputAmount = 10000000; // 10 Million Tomans
    const result = calculatePortfolioAllocation(inputAmount, sampleSettings, sampleCrypto, emptyGold);

    // 30% of 10M = 3M
    assert.equal(result.totalInputAmount, 10000000);
    assert.equal(result.totalSavingsAmount, 3000000);

    // 80% of 3M = 2.4M Gold, 20% of 3M = 600K Crypto
    assert.equal(result.goldBuyAmount, 2400000);
    assert.equal(result.cryptoBuyAmount, 600000);
    assert.equal(result.totalCryptoBuySuggested, 600000);

    // Crypto split 50/50 -> 300k each
    const ethBuy = result.cryptoBuys.find((c) => c.id === 'eth');
    const btcBuy = result.cryptoBuys.find((c) => c.id === 'btc');
    assert.equal(ethBuy?.suggestedBuy, 300000);
    assert.equal(btcBuy?.suggestedBuy, 300000);

    // Total portfolio value after buys = 3M
    assert.equal(result.newTotalPortfolioValue, 3000000);
  });

  it('rebalances intelligently when portfolio is overweight in gold', () => {
    // Existing holdings: Gold = 9M, Crypto = 0 (Total = 9M, Gold is 100%, target is 80%)
    // New savings = 3M (Target total portfolio = 12M -> Target Gold = 9.6M, Target Crypto = 2.4M)
    // Desired: Gold gets 600K (bringing it to 9.6M), Crypto gets 2.4M (bringing it to 2.4M)
    const existingGold: GoldHolding = { currentHoldingValue: 9000000 };
    const result = calculatePortfolioAllocation(10000000, sampleSettings, sampleCrypto, existingGold);

    assert.equal(result.totalSavingsAmount, 3000000);
    assert.equal(result.goldBuyAmount, 600000);
    assert.equal(result.cryptoBuyAmount, 2400000);
    assert.equal(result.totalCryptoBuySuggested, 2400000);
    assert.equal(result.newTotalPortfolioValue, 12000000);
  });

  it('guarantees buy-only waterfilling with zero negative buys when asset is heavily overweight', () => {
    // Existing: Gold = 10M, Crypto = 0. New Savings = 1M. Total target = 11M.
    // Target Gold = 8.8M (already at 10M, overweight!).
    // Buy-only algorithm locks Gold at 0 buy and directs full 1M budget to Crypto.
    const heavyGold: GoldHolding = { currentHoldingValue: 10000000 };
    const result = calculatePortfolioAllocation(3333333, sampleSettings, sampleCrypto, heavyGold);

    // Savings = round(3333333 * 0.3) = 1000000
    assert.equal(result.totalSavingsAmount, 1000000);
    assert.equal(result.goldBuyAmount, 0);
    assert.equal(result.cryptoBuyAmount, 1000000);
    assert.equal(result.totalCryptoBuySuggested, 1000000);
  });

  it('direct split mode allocates strictly according to target percentages regardless of current balance', () => {
    const directSettings: AppSettings = {
      ...sampleSettings,
      calculationMode: 'direct',
    };

    const existingGold: GoldHolding = { currentHoldingValue: 100000000 };
    const result = calculatePortfolioAllocation(10000000, directSettings, sampleCrypto, existingGold);

    assert.equal(result.totalSavingsAmount, 3000000);
    assert.equal(result.goldBuyAmount, 2400000);
    assert.equal(result.cryptoBuyAmount, 600000);
  });

  it('largest remainder method eliminates all floating-point rounding errors and matches budget exactly', () => {
    const assets = [
      { id: 'a', targetWeight: 33.3333, currentValue: 0 },
      { id: 'b', targetWeight: 33.3333, currentValue: 0 },
      { id: 'c', targetWeight: 33.3334, currentValue: 0 },
    ];
    const budget = 1000000;
    const buys = calculateRebalancedBuys(assets, budget);

    const sum = buys.reduce((acc, b) => acc + b.suggestedBuy, 0);
    assert.equal(sum, budget, 'Total sum of buys must exactly match integer budget');
    for (const b of buys) {
      assert.equal(Number.isInteger(b.suggestedBuy), true, 'Each buy must be an integer Toman amount');
    }
  });

  it('handles default crypto assets array with 9 coins correctly', () => {
    const result = calculatePortfolioAllocation(20000000, DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, emptyGold);
    // 30% of 20M = 6M savings
    assert.equal(result.totalSavingsAmount, 6000000);
    // 80% = 4.8M Gold, 20% = 1.2M Crypto
    assert.equal(result.goldBuyAmount, 4800000);
    assert.equal(result.cryptoBuyAmount, 1200000);
    assert.equal(result.cryptoBuys.length, DEFAULT_CRYPTO_ASSETS.length);
    assert.equal(result.totalCryptoBuySuggested, 1200000);

    const cryptoSum = result.cryptoBuys.reduce((sum, c) => sum + c.suggestedBuy, 0);
    assert.equal(cryptoSum, 1200000);
  });

  it('allocates 100% of input directly between Gold and Crypto when capitalInputMode is direct', () => {
    const directSettings = {
      ...DEFAULT_SETTINGS,
      capitalInputMode: 'direct' as const,
    };
    // 5M Tomans input directly
    const result = calculatePortfolioAllocation(5000000, directSettings, DEFAULT_CRYPTO_ASSETS, emptyGold);
    // 100% of 5M = 5M savings
    assert.equal(result.totalSavingsAmount, 5000000);
    // 80% = 4M Gold, 20% = 1M Crypto
    assert.equal(result.goldBuyAmount, 4000000);
    assert.equal(result.cryptoBuyAmount, 1000000);
    assert.equal(result.totalCryptoBuySuggested, 1000000);
    assert.equal(result.goldBuyAmount + result.cryptoBuyAmount, 5000000);
  });
});
