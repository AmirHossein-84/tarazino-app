import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupTestEnvironment } from '../helpers/mockStorage';
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
  loadMarketInstruments,
  saveMarketInstruments,
  loadNobitexConfig,
  saveNobitexConfig,
  exportBackupData,
  importBackupData,
  resetAllDataToDefault,
  loadLastInput,
} from '../../src/utils/storage';
import { DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_PHYSICAL_GOLD_ITEMS } from '../../src/constants/defaultData';

describe('Storage & Backup System', () => {
  let env: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  afterEach(() => {
    env.cleanup();
  });

  it('loads default settings when storage is empty', () => {
    const settings = loadSettings();
    assert.deepEqual(settings, DEFAULT_SETTINGS);
  });

  it('saves and retrieves modified settings', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      savingsPercent: 40,
      goldPercent: 70,
      cryptoPercent: 30,
    };
    saveSettings(customSettings);
    const loaded = loadSettings();
    assert.equal(loaded.savingsPercent, 40);
    assert.equal(loaded.goldPercent, 70);
    assert.equal(loaded.cryptoPercent, 30);
  });

  it('persists and loads physical gold and buy lots', () => {
    const customGold = DEFAULT_PHYSICAL_GOLD_ITEMS.map((item) => {
      if (item.id === 'gold_18k') return { ...item, quantity: 15, unitPriceTomans: 5000000 };
      return item;
    });
    savePhysicalGold(customGold);
    const loadedGold = loadPhysicalGold();
    const g18k = loadedGold.find((g) => g.id === 'gold_18k');
    assert.equal(g18k?.quantity, 15);
    assert.equal(g18k?.unitPriceTomans, 5000000);

    const lots = [
      {
        id: 'lot_test_1',
        goldType: 'gold_18k' as const,
        quantity: 15,
        purchaseUnitPriceTomans: 4800000,
        purchaseDate: '2026-08-20',
        totalCostTomans: 72000000,
      },
    ];
    saveGoldBuyLots(lots);
    const loadedLots = loadGoldBuyLots();
    assert.equal(loadedLots.length, 1);
    assert.equal(loadedLots[0].id, 'lot_test_1');
  });

  it('persists real estate properties and valuations', () => {
    const properties = [
      {
        id: 'prop_1',
        title: 'آپارتمان سعادت‌آباد',
        type: 'residential' as const,
        areaSquareMeters: 120,
        purchaseDate: '2025-01-01',
        purchasePriceRial: 120000000000,
        currentValuationRial: 150000000000,
        currentValuationUsd: 160000,
        includeInTotalNetWorth: true,
      },
    ];
    saveProperties(properties);
    const loaded = loadProperties();
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, 'آپارتمان سعادت‌آباد');
    assert.equal(loaded[0].currentValuationRial, 150000000000);
  });

  it('persists Nobitex configuration and dispatches global event', () => {
    const config = {
      authType: 'api_key' as const,
      publicKey: 'pub_test_123',
      secretKey: 'sec_test_456',
    };
    saveNobitexConfig(config);

    const loaded = loadNobitexConfig();
    assert.equal(loaded.publicKey, 'pub_test_123');
    assert.equal(loaded.secretKey, 'sec_test_456');
    assert.equal(env.events.some((e) => e.name === 'nobitex_config_updated'), true);
  });

  it('exports JSON backup sanitizing sensitive secret keys', () => {
    saveNobitexConfig({
      authType: 'api_key',
      publicKey: 'pub_key_xyz',
      secretKey: 'super_secret_raw_key',
    });

    const jsonStr = exportBackupData();
    assert.equal(typeof jsonStr, 'string');
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.version, '2.0.0');
    assert.equal(parsed.nobitexConfig?.publicKey, 'pub_key_xyz');
    assert.equal(parsed.nobitexConfig?.secretKey, '', 'Secret key must be redacted in backup export');
  });

  it('imports valid JSON backup and updates all entities', () => {
    const backupJson = JSON.stringify({
      version: '2.0.0',
      exportDate: '2026-08-29T00:00:00Z',
      settings: { ...DEFAULT_SETTINGS, savingsPercent: 50 },
      cryptoAssets: [{ id: 'btc', symbol: 'BTC', name: 'Bitcoin', targetPercent: 100, currentHoldingValue: 5000000, color: '#F7931A' }],
      goldHolding: { currentHoldingValue: 10000000 },
      properties: [],
    });

    const success = importBackupData(backupJson);
    assert.equal(success, true);
    const loadedSettings = loadSettings();
    assert.equal(loadedSettings.savingsPercent, 50);
    const loadedCrypto = loadCryptoAssets();
    assert.equal(loadedCrypto.length, 1);
    assert.equal(loadedCrypto[0].symbol, 'BTC');
  });

  it('rejects corrupted or invalid JSON backup safely', () => {
    assert.equal(importBackupData('{ invalid json'), false);
    assert.equal(importBackupData('{"random": 123}'), false);
  });

  it('resets all data to factory defaults and removes custom keys', () => {
    saveSettings({ ...DEFAULT_SETTINGS, savingsPercent: 99 });
    saveProperties([{ id: 'p1', title: 'test', type: 'land', areaSquareMeters: 500, purchaseDate: '', purchasePriceRial: 1, currentValuationRial: 1, currentValuationUsd: 1, includeInTotalNetWorth: true }]);
    resetAllDataToDefault();

    const loadedSettings = loadSettings();
    assert.equal(loadedSettings.savingsPercent, 30);
    assert.equal(loadProperties().length, 0);
  });

  it('migrates legacy investment_app_* storage keys to tarazino_* keys automatically', () => {
    localStorage.setItem('investment_app_settings_v1', JSON.stringify({ ...DEFAULT_SETTINGS, savingsPercent: 42 }));
    localStorage.setItem('investment_app_last_input_v1', '123456');

    const loadedSettings = loadSettings();
    assert.equal(loadedSettings.savingsPercent, 42);
    assert.equal(localStorage.getItem('tarazino_settings_v1') !== null, true);

    const loadedInput = loadLastInput();
    assert.equal(loadedInput, 123456);
    assert.equal(localStorage.getItem('tarazino_last_input_v1'), '123456');
  });
});
