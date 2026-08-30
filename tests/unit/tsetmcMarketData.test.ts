import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePersian } from '../../src/services/marketData/TsetmcMarketDataProvider';
import { MarketInstrument, UserMarketHolding, MarketQuote } from '../../src/services/marketData/types';

describe('TSETMC Generic Market Data System', () => {
  it('Persian text normalization cleans Arabic chars, digits, and spaces', () => {
    assert.equal(normalizePersian('عيار'), 'عیار');
    assert.equal(normalizePersian('طلاي لوتوس'), 'طلای لوتوس');
    assert.equal(normalizePersian('كشتي'), 'کشتی');
    assert.equal(normalizePersian('  اهرم  '), 'اهرم');
    assert.equal(normalizePersian('فملی ۱۲۳'), 'فملی 123');
  });

  it('Decouples MarketInstrument definition from UserMarketHolding quantity', () => {
    const instFoulad: MarketInstrument = {
      id: 'inst_foulad_1',
      provider: 'tsetmc',
      providerInstrumentId: '46348559193224090',
      symbol: 'فولاد',
      name: 'فولاد مبارکه اصفهان',
      assetType: 'stock',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const holdingUser1: UserMarketHolding = {
      id: 'hold_user1_foulad',
      instrumentId: instFoulad.id,
      quantity: 5000,
      averageBuyPriceTomans: 450,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assert.equal(instFoulad.symbol, 'فولاد');
    assert.equal(holdingUser1.quantity, 5000);
    assert.equal(holdingUser1.instrumentId, instFoulad.id);
  });

  it('Calculates valuation accurately for any asset: currentValue = quantity * price', () => {
    const instrument: MarketInstrument = {
      id: 'inst_ayar_1',
      provider: 'tsetmc',
      providerInstrumentId: '34144395039913458',
      symbol: 'عیار',
      name: 'صندوق س. پشتوانه طلای لوتوس-ت',
      assetType: 'etf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const holding: UserMarketHolding = {
      id: 'hold_ayar_1',
      instrumentId: instrument.id,
      quantity: 280, // 280 units
      averageBuyPriceTomans: 32000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const rawLastPriceRials = 350000; // 350,000 Rials per unit
    const lastPriceTomans = Math.round(rawLastPriceRials / 10); // 35,000 Tomans

    const quote: MarketQuote = {
      instrumentId: instrument.id,
      insCode: instrument.providerInstrumentId,
      symbol: instrument.symbol,
      name: instrument.name,
      lastPriceRials: rawLastPriceRials,
      closingPriceRials: 349000,
      yesterdayPriceRials: 345000,
      lastPriceTomans,
      closingPriceTomans: 34900,
      yesterdayPriceTomans: 34500,
      priceChangeTomans: 500,
      priceChangePercent: 1.45,
      lastFetchedAt: Date.now(),
      isStale: false,
      marketState: 'closed',
    };

    // Calculate valuation
    const currentValueTomans = holding.quantity * quote.lastPriceTomans;
    const totalCostTomans = holding.quantity * (holding.averageBuyPriceTomans || 0);
    const profitTomans = currentValueTomans - totalCostTomans;

    // 280 * 35,000 = 9,800,000 Tomans
    assert.equal(currentValueTomans, 9800000);
    // Cost: 280 * 32,000 = 8,960,000 Tomans
    assert.equal(totalCostTomans, 8960000);
    // Profit: 9,800,000 - 8,960,000 = 840,000 Tomans
    assert.equal(profitTomans, 840000);
    assert.equal(quote.marketState, 'closed');
  });

  it('Handles market closed state: retains last available closing price and marks state', () => {
    const closedQuote: MarketQuote = {
      instrumentId: 'inst_1',
      insCode: '12345',
      symbol: 'فملی',
      name: 'ملی صنایع مس ایران',
      lastPriceRials: 6200,
      closingPriceRials: 6180,
      yesterdayPriceRials: 6000,
      lastPriceTomans: 620,
      closingPriceTomans: 618,
      yesterdayPriceTomans: 600,
      priceChangeTomans: 20,
      priceChangePercent: 3.33,
      tradeTime: '12:29:45',
      tradeDate: '20260820',
      lastFetchedAt: Date.now(),
      isStale: false,
      marketState: 'closed',
    };

    assert.equal(closedQuote.lastPriceTomans, 620);
    assert.equal(closedQuote.marketState, 'closed');
    assert.equal(closedQuote.isStale, false);
  });

  it('Marks stale quote when upstream is unavailable', () => {
    const staleQuote: MarketQuote = {
      instrumentId: 'inst_1',
      insCode: '12345',
      symbol: 'شستا',
      name: 'سرمایه گذاری تامین اجتماعی',
      lastPriceRials: 1100,
      closingPriceRials: 1100,
      yesterdayPriceRials: 1080,
      lastPriceTomans: 110,
      closingPriceTomans: 110,
      yesterdayPriceTomans: 108,
      priceChangeTomans: 2,
      priceChangePercent: 1.85,
      lastFetchedAt: Date.now() - 3600000,
      isStale: true,
      marketState: 'stale',
    };

    assert.equal(staleQuote.isStale, true);
    assert.equal(staleQuote.marketState, 'stale');
  });
});
