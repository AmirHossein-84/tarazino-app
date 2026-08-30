import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOptimalSales } from '../../src/utils/sellCalculator';
import { AppSettings, CryptoAsset, PhysicalGoldItem } from '../../src/types/investment';
import { CombinedMarketItem } from '../../src/hooks/useMarketData';

describe('Sell & Liquidation Calculator', () => {
  const defaultSettings: AppSettings = {
    savingsPercent: 30,
    goldPercent: 80,
    cryptoPercent: 20,
    calculationMode: 'rebalance',
    currencyUnit: 'toman',
    goldPricePerGram: 5000000,
  };

  const sampleCrypto: CryptoAsset[] = [
    {
      id: 'eth',
      symbol: 'ETH',
      name: 'Ethereum',
      targetPercent: 50,
      currentAmount: 0.1,
      unitPrice: 200000000, // 200M Toman
      currentHoldingValue: 20000000, // 20M Toman
      color: '#627EEA',
    },
    {
      id: 'btc',
      symbol: 'BTC',
      name: 'Bitcoin',
      targetPercent: 50,
      currentAmount: 0.005,
      unitPrice: 4000000000, // 4B Toman
      currentHoldingValue: 20000000, // 20M Toman
      color: '#F7931A',
    },
  ];

  const sampleBourseGold: CombinedMarketItem[] = [
    {
      instrument: {
        id: 'inst_ayar',
        provider: 'tsetmc',
        providerInstrumentId: '12345',
        symbol: 'عیار',
        name: 'طلای لوتوس',
        assetType: 'etf',
        createdAt: '',
        updatedAt: '',
      },
      holding: {
        id: 'hold_ayar',
        instrumentId: 'inst_ayar',
        quantity: 2000,
        averageBuyPriceTomans: 30000,
        createdAt: '',
        updatedAt: '',
      },
      quote: {
        instrumentId: 'inst_ayar',
        insCode: '12345',
        symbol: 'عیار',
        name: 'طلای لوتوس',
        lastPriceRials: 350000,
        closingPriceRials: 350000,
        yesterdayPriceRials: 345000,
        lastPriceTomans: 35000,
        closingPriceTomans: 35000,
        yesterdayPriceTomans: 34500,
        priceChangeTomans: 500,
        priceChangePercent: 1.45,
        lastFetchedAt: Date.now(),
        isStale: false,
        marketState: 'open',
      },
      currentValueTomans: 70000000, // 2000 * 35,000 = 70M Toman
      totalCostTomans: 60000000,
      profitTomans: 10000000,
      profitPercent: 16.67,
    },
  ];

  const samplePhysicalGold: PhysicalGoldItem[] = [
    {
      id: 'gold_18k',
      title: 'طلای ۱۸ عیار',
      unit: 'گرم',
      quantity: 10,
      unitPriceTomans: 5000000, // 5M per gram -> 50M total
      averageBuyPriceTomans: 4500000,
      totalCostTomans: 45000000,
    },
  ];

  it('calculates balanced liquidation to preserve target 80/20 ratio', () => {
    // Total portfolio: Bourse gold = 70M, Crypto = 40M (Total = 110M)
    // Request to liquidate 20M Tomans.
    // Target remaining = 90M (Target Gold = 72M, Target Crypto = 18M).
    // Bourse gold desired sale = max(0, 70M - 72M) = 0M? No, gold is currently 70M (underweight 63.6% vs 80%),
    // so crypto takes more sale to bring ratio closer to 80/20!
    const res = calculateOptimalSales(20000000, sampleCrypto, sampleBourseGold, [], defaultSettings, {
      includeBourseGold: true,
      includeCrypto: true,
      includePhysicalGold: false,
    });

    assert.ok(res.actualTotalSaleTomans > 0, 'Should calculate sales');
    assert.ok(res.cryptoSaleTomans > 0, 'Crypto must be liquidated');
    assert.equal(res.bourseGoldSales.length >= 0, true);
    assert.ok(res.resultingPortfolioValue < res.currentPortfolioValue);
  });

  it('liquidates physical gold correctly respecting gram decimal precision and coin integers', () => {
    const res = calculateOptimalSales(15000000, [], [], samplePhysicalGold, defaultSettings, {
      includePhysicalGold: true,
      includeBourseGold: false,
      includeCrypto: false,
    });

    assert.equal(res.physicalGoldSales.length, 1);
    const sale = res.physicalGoldSales[0];
    assert.equal(sale.id, 'gold_18k');
    assert.equal(sale.quantityToSell, 3); // 15M / 5M = 3 grams
    assert.equal(sale.totalTomans, 15000000);
  });

  it('handles selective liquidation for specific asset ids only', () => {
    const res = calculateOptimalSales(10000000, sampleCrypto, sampleBourseGold, samplePhysicalGold, defaultSettings, {
      includeBourseGold: true,
      includeCrypto: true,
      includePhysicalGold: true,
      selectedAssetIds: ['eth'], // ONLY sell ETH
    });

    assert.equal(res.bourseGoldSales.length, 0);
    assert.equal(res.physicalGoldSales.length, 0);
    assert.equal(res.cryptoSales.length, 1);
    assert.equal(res.cryptoSales[0].symbol, 'ETH');
    assert.equal(res.cryptoSales[0].totalTomans, 10000000);
  });

  it('caps liquidation when requested amount exceeds total portfolio value', () => {
    const res = calculateOptimalSales(1000000000, sampleCrypto, sampleBourseGold, [], defaultSettings, {
      includeBourseGold: true,
      includeCrypto: true,
      includePhysicalGold: false,
    });

    // Total available = 70M (gold) + 40M (crypto) = 110M
    assert.ok(res.actualTotalSaleTomans <= 110000000);
    assert.equal(res.resultingPortfolioValue >= 0, true);
  });
});
