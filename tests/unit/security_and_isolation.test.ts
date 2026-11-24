import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnvironment } from '../helpers/mockStorage';
import {
  STORAGE_KEYS,
  setActiveStorageProfileId,
  getActiveStorageProfileId,
  getProfileScopedKey,
  loadSettings,
  saveSettings,
  loadCryptoAssets,
  saveCryptoAssets,
  loadPhysicalGold,
  savePhysicalGold,
  loadGoldBuyLots,
  saveGoldBuyLots,
  loadProperties,
  saveProperties,
  loadVehicles,
  saveVehicles,
  loadDollarHolding,
  saveDollarHolding,
  loadMarketInstruments,
  saveMarketInstruments,
  loadMarketHoldings,
  saveMarketHoldings,
  loadNobitexConfig,
  saveNobitexConfig,
  loadTransactions,
  saveTransactions,
  exportBackupData,
  importBackupData,
  resetAllDataToDefault,
} from '../../src/utils/storage';
import {
  readDeviceVault,
  writeDeviceVault,
  clearDeviceVault,
  flushDeviceVault,
} from '../../src/utils/deviceVault';
import {
  sanitizePlainData,
  safeJsonParse,
  redactSecrets,
  toSafeNumber,
} from '../../src/utils/security';
import { processGoldSale } from '../../src/utils/goldPnlCalculators';
import {
  calculateRebalancedBuys,
  calculateDirectBuys,
  calculatePortfolioAllocation,
  calculateRiskBuckets,
} from '../../src/utils/calculations';
import { calculateOptimalSales } from '../../src/utils/sellCalculator';
import { numberToPersianWords } from '../../src/utils/numberToPersianWords';
import {
  DEFAULT_SETTINGS,
  DEFAULT_CRYPTO_ASSETS,
  DEFAULT_GOLD_HOLDING,
  DEFAULT_PHYSICAL_GOLD_ITEMS,
} from '../../src/constants/defaultData';
import type { PhysicalGoldItem, PhysicalGoldBuyLot, ProfilesVault } from '../../src/types/investment';

describe('Security, Multi-User Profile Isolation, Physical Gold Sell & Stability Regressions', () => {
  let env: ReturnType<typeof setupTestEnvironment>;
  const rootDir = process.cwd();

  beforeEach(() => {
    env = setupTestEnvironment();
    setActiveStorageProfileId(null);
  });

  afterEach(async () => {
    await clearDeviceVault();
    setActiveStorageProfileId(null);
    env.cleanup();
  });

  describe('1. Multi-User Profile Namespacing, Switching & Backup Isolation', () => {
    it('isolates all storage namespaces strictly per profileId without bleed', () => {
      setActiveStorageProfileId('profile_a');
      assert.equal(getActiveStorageProfileId(), 'profile_a');
      assert.ok(
        env.events.some(
          (e) => e.name === 'tarazino_active_profile_changed' && e.detail?.profileId === 'profile_a'
        )
      );

      saveSettings({ ...DEFAULT_SETTINGS, goldPercent: 65, cryptoPercent: 35 }, 'profile_a');
      saveCryptoAssets(
        [{ ...DEFAULT_CRYPTO_ASSETS[0], currentHoldingValue: 90_000_000, currentAmount: 0.01 }],
        'profile_a'
      );
      savePhysicalGold(
        [{ ...DEFAULT_PHYSICAL_GOLD_ITEMS[0], quantity: 12.5 }],
        'profile_a'
      );
      saveProperties(
        [
          {
            id: 'prop_a',
            title: 'آپارتمان سعادت‌آباد',
            type: 'residential',
            areaSquareMeters: 110,
            purchaseDate: '۱۴۰۳/۰۱/۰۱',
            purchasePriceRial: 80_000_000_000,
            currentValuationRial: 120_000_000_000,
            currentValuationUsd: 120_000,
            includeInTotalNetWorth: true,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        'profile_a'
      );
      saveVehicles(
        [
          {
            id: 'veh_a',
            title: 'پژو ۲۰۷',
            vehicleType: 'car',
            model: 'پژو ۲۰۷ اتومات',
            year: '1402',
            purchaseDate: '۱۴۰۲/۰۵/۱۰',
            purchasePriceTomans: 700_000_000,
            currentValuationTomans: 950_000_000,
            includeInTotalNetWorth: true,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        'profile_a'
      );
      saveDollarHolding(
        { amountUsd: 5000, averageBuyPriceTomans: 90000, currentPriceTomans: 95000 },
        'profile_a'
      );
      saveMarketInstruments(
        [
          {
            id: 'inst_a',
            provider: 'tsetmc',
            providerInstrumentId: '34144395039913458',
            symbol: 'عیار',
            name: 'عیار',
            assetType: 'etf',
            createdAt: '1',
            updatedAt: '1',
          },
        ],
        'profile_a'
      );
      saveMarketHoldings(
        [
          {
            id: 'hold_a',
            instrumentId: 'inst_a',
            quantity: 1000,
            updatedAt: '1',
          },
        ],
        'profile_a'
      );
      saveNobitexConfig(
        {
          authType: 'api_key',
          publicKey: 'pk_user_a',
          secretKey: 'sk_secret_a_value',
          token: '',
          autoSyncEnabled: true,
        },
        'profile_a'
      );
      saveTransactions(
        [
          {
            id: 'tx_a',
            date: new Date().toISOString(),
            persianDate: '۱۴۰۴/۰۱/۱۰',
            totalInputAmount: 10_000_000,
            totalSavingsAmount: 3_000_000,
            goldBuyAmount: 2_400_000,
            cryptoBuyAmount: 600_000,
            cryptoBuys: [],
            appliedToHoldings: true,
          },
        ],
        'profile_a'
      );

      // Switch rapidly to profile_b and confirm complete isolation
      setActiveStorageProfileId('profile_b');
      assert.equal(loadSettings('profile_b').goldPercent, DEFAULT_SETTINGS.goldPercent);
      assert.equal(loadCryptoAssets('profile_b')[0].currentHoldingValue, 0);
      assert.equal(loadPhysicalGold('profile_b')[0].quantity, 0);
      assert.equal(loadProperties('profile_b').length, 0);
      assert.equal(loadVehicles('profile_b').length, 0);
      assert.equal(loadDollarHolding('profile_b').amountUsd, 0);
      assert.equal(loadMarketInstruments('profile_b').length, 0);
      assert.equal(loadMarketHoldings('profile_b').length, 0);
      assert.equal(loadNobitexConfig('profile_b').publicKey, '');
      assert.equal(loadNobitexConfig('profile_b').secretKey, '');
      assert.equal(loadTransactions('profile_b').length, 0);

      // Mutate profile_b and delete/reset profile_a; profile_b must remain untouched
      saveProperties(
        [
          {
            id: 'prop_b',
            title: 'زمین شمال',
            type: 'land',
            areaSquareMeters: 300,
            purchaseDate: '۱۴۰۲/۰۲/۰۲',
            purchasePriceRial: 20_000_000_000,
            currentValuationRial: 30_000_000_000,
            currentValuationUsd: 30_000,
            includeInTotalNetWorth: true,
            createdAt: 2,
            updatedAt: 2,
          },
        ],
        'profile_b'
      );
      resetAllDataToDefault('profile_a');

      assert.equal(loadProperties('profile_a').length, 0);
      assert.equal(loadNobitexConfig('profile_a').publicKey, '');
      assert.equal(loadProperties('profile_b').length, 1);
      assert.equal(loadProperties('profile_b')[0].title, 'زمین شمال');
      assert.notEqual(
        getProfileScopedKey('tarazino_settings_v1', 'profile_a'),
        getProfileScopedKey('tarazino_settings_v1', 'profile_b')
      );
    });

    it('redacts secrets on export, restores only target profile, preserves existing secrets, and rolls back on failure', () => {
      saveSettings({ ...DEFAULT_SETTINGS, savingsPercent: 45 }, 'profile_alpha');
      saveNobitexConfig(
        {
          authType: 'api_key',
          publicKey: 'PUB_KEY_ALPHA',
          secretKey: 'SUPER_SECRET_ALPHA',
          token: 'BEARER_TOKEN_SECRET',
          autoSyncEnabled: true,
        },
        'profile_alpha'
      );
      saveProperties(
        [
          {
            id: 'beta_house',
            title: 'ملک بتا',
            type: 'residential',
            areaSquareMeters: 95,
            purchaseDate: '۱۴۰۳/۰۳/۰۳',
            purchasePriceRial: 40_000_000_000,
            currentValuationRial: 50_000_000_000,
            currentValuationUsd: 50_000,
            includeInTotalNetWorth: true,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        'profile_beta'
      );

      const backupJson = exportBackupData('profile_alpha');
      assert.ok(!backupJson.includes('SUPER_SECRET_ALPHA'), 'Exported backup must redact secretKey');
      assert.ok(!backupJson.includes('BEARER_TOKEN_SECRET'), 'Exported backup must redact token');

      // Malformed / polluted backup rejection & zero Object.prototype mutation
      assert.equal(importBackupData('not valid json', 'profile_alpha'), false);
      const pollutedPayload = JSON.stringify({
        __proto__: { pollutedProp: 'evil' },
        settings: { savingsPercent: 55, __proto__: { innerHack: true } },
      });
      assert.equal(importBackupData(pollutedPayload, 'profile_alpha'), true);
      assert.equal(({} as Record<string, unknown>).pollutedProp, undefined);
      assert.equal(({} as Record<string, unknown>).innerHack, undefined);

      // Re-importing exported (redacted) backup preserves matching local secretKey for profile_alpha
      assert.equal(importBackupData(backupJson, 'profile_alpha'), true);
      assert.equal(loadSettings('profile_alpha').savingsPercent, 45);
      assert.equal(loadNobitexConfig('profile_alpha').secretKey, 'SUPER_SECRET_ALPHA');
      // Profile Beta must remain completely unaffected
      assert.equal(loadProperties('profile_beta')[0].title, 'ملک بتا');

      // Atomic rollback on storage write exception mid-import
      saveSettings({ ...DEFAULT_SETTINGS, savingsPercent: 45 }, 'profile_alpha');
      const originalSetItem = env.storage.setItem.bind(env.storage);
      let failAfterFirstWrite = 0;
      env.storage.setItem = (k: string, v: string) => {
        if (k === getProfileScopedKey(STORAGE_KEYS.CRYPTO_ASSETS, 'profile_alpha') && failAfterFirstWrite === 0) {
          failAfterFirstWrite++;
          throw new Error('QuotaExceededError');
        }
        originalSetItem(k, v);
      };
      const modifiedBackup = JSON.stringify({
        settings: { ...DEFAULT_SETTINGS, savingsPercent: 80 },
        cryptoAssets: DEFAULT_CRYPTO_ASSETS,
      });
      assert.equal(importBackupData(modifiedBackup, 'profile_alpha'), false);
      env.storage.setItem = originalSetItem;
      assert.equal(
        loadSettings('profile_alpha').savingsPercent,
        45,
        'Atomic rollback must restore pre-import savingsPercent'
      );
    });
  });

  describe('2. Device Vault Encryption & Serialization', () => {
    it('encrypts secrets at rest with WebCrypto AES-GCM when available and reads back cleanly', async () => {
      const vault: ProfilesVault = {
        version: '1.0.0',
        activeProfileId: 'p1',
        hasCompletedOnboarding: true,
        profiles: [
          {
            id: 'p1',
            name: 'کاربر آزمایشی',
            avatarColor: '#F59E0B',
            createdAt: 100,
            updatedAt: 100,
            settings: { ...DEFAULT_SETTINGS },
            cryptoAssets: [...DEFAULT_CRYPTO_ASSETS],
            goldHolding: { ...DEFAULT_GOLD_HOLDING },
            physicalGold: [...DEFAULT_PHYSICAL_GOLD_ITEMS],
            properties: [],
            vehicles: [],
            transactions: [],
            nobitexConfig: {
              authType: 'api_key',
              publicKey: 'pub_123',
              secretKey: 'my_very_secret_hmac_key',
              token: 'tok_abcdef123456',
              autoSyncEnabled: true,
            },
          },
        ],
      };

      const saved = await writeDeviceVault(vault);
      assert.equal(saved, true);

      const rawStored = env.storage.getItem('tarazino_device_vault_v2') || '';
      if (globalThis.crypto?.subtle) {
        assert.ok(!rawStored.includes('my_very_secret_hmac_key'), 'Secret key must be encrypted in localStorage');
        assert.ok(!rawStored.includes('tok_abcdef123456'), 'Token must be encrypted in localStorage');
        assert.ok(rawStored.includes('enc:v1:'), 'Encrypted payload must use enc:v1 prefix');
      }

      const decrypted = await readDeviceVault();
      assert.ok(decrypted);
      assert.equal(decrypted.profiles[0].nobitexConfig?.secretKey, 'my_very_secret_hmac_key');
      assert.equal(decrypted.profiles[0].nobitexConfig?.token, 'tok_abcdef123456');

      await flushDeviceVault();
    });
  });

  describe('3. Physical Gold Partial Sell, Full Sell & Lot Removal', () => {
    it('processes partial sales, full depletion cleanup, and custom dates accurately', () => {
      const item: PhysicalGoldItem = {
        id: 'gold_18k',
        title: 'طلای ۱۸ عیار گرمی',
        unit: 'گرم',
        quantity: 10,
        unitPriceTomans: 10_000_000,
        isCustomPrice: false,
      };

      const lots: PhysicalGoldBuyLot[] = [
        {
          id: 'lot_1',
          goldType: 'gold_18k',
          quantity: 6,
          purchaseUnitPriceTomans: 6_000_000,
          totalCostTomans: 36_000_000,
          purchaseDate: '۱۴۰۳/۱۰/۰۱',
        },
        {
          id: 'lot_2',
          goldType: 'gold_18k',
          quantity: 4,
          purchaseUnitPriceTomans: 8_000_000,
          totalCostTomans: 32_000_000,
          purchaseDate: '۱۴۰۳/۱۱/۰۱',
        },
      ];

      // Partial sale: 8g @ 10M (consumes all 6g of lot_1 + 2g of lot_2 -> 2g remaining)
      // Total cost = 36M + 16M = 52M; avg unit cost = 6.5M; realized profit = 80M - 52M = 28M
      const partial = processGoldSale(item, 8, 10_000_000, lots, 'فروش بخشی', '۱۴۰۴/۰۲/۱۵');
      assert.equal(partial.saleRecord.totalRevenueTomans, 80_000_000);
      assert.equal(partial.saleRecord.totalCostTomans, 52_000_000);
      assert.equal(partial.saleRecord.realizedProfitTomans, 28_000_000);
      assert.equal(partial.saleRecord.persianDate, '۱۴۰۴/۰۲/۱۵');
      assert.equal(partial.updatedLots.length, 1);
      assert.equal(partial.updatedLots[0].id, 'lot_2');
      assert.equal(partial.updatedLots[0].quantity, 2);

      // Full depletion: sell exact remaining 2g -> all lots must vanish cleanly
      const updatedItem: PhysicalGoldItem = { ...item, quantity: 2 };
      const full = processGoldSale(updatedItem, 2, 11_000_000, partial.updatedLots, 'فروش کامل');
      assert.equal(full.saleRecord.totalRevenueTomans, 22_000_000);
      assert.equal(full.saleRecord.totalCostTomans, 16_000_000);
      assert.equal(full.saleRecord.realizedProfitTomans, 6_000_000);
      assert.equal(full.updatedLots.length, 0, 'Exhausted lots must be completely removed');

      // Storage persistence check for lots deletion on full sell
      saveGoldBuyLots(full.updatedLots, 'profile_gold');
      assert.equal(loadGoldBuyLots('profile_gold').length, 0);
    });

    it('verifies UI & state hooks expose physical gold Sell button, SellPhysicalGoldModal & removal logic', () => {
      const physSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/holdings/PhysicalGoldSection.tsx'),
        'utf8'
      );
      const investSrc = fs.readFileSync(
        path.join(rootDir, 'src/hooks/useInvestmentState.ts'),
        'utf8'
      );
      const appSrc = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');

      assert.ok(
        fs.existsSync(path.join(rootDir, 'src/components/holdings/SellPhysicalGoldModal.tsx')),
        'SellPhysicalGoldModal.tsx must exist'
      );
      assert.match(physSrc, /SellPhysicalGoldModal/, 'PhysicalGoldSection must render SellPhysicalGoldModal');
      assert.match(physSrc, /ConfirmDeleteModal/, 'PhysicalGoldSection must confirm item deletion cleanly');
      assert.match(physSrc, /فروش/, 'PhysicalGoldSection must provide a visible Sell action');
      assert.match(investSrc, /removePhysicalGoldItem/, 'useInvestmentState must expose removePhysicalGoldItem');
      assert.match(investSrc, /kind:\s*'physical_gold_sale'/, 'Sales must be appended to TransactionHistory ledger');
      assert.match(appSrc, /recordGoldSale\(id,\s*quantityToDeduct/, 'App handleDeductPhysicalGold must route through recordGoldSale');
      assert.doesNotMatch(
        appSrc,
        /updatePhysicalGoldQuantity\(id,\s*Math\.max\(0,\s*Number\(\(item\.quantity - quantityToDeduct\)\.toFixed\(2\)\)\)\)/,
        'SellView physical gold deduction must not truncate to 2 decimals or skip lot history'
      );
    });
  });

  describe('4. Security Helpers, Math Stability & Large-Number Persian Formatting', () => {
    it('sanitizes objects, redacts credentials, and rejects NaN/Infinity in calculators', () => {
      const dangerous = safeJsonParse<Record<string, unknown>>(
        '{"__proto__":{"x":1},"constructor":{"y":2},"ok":{"a":42}}'
      );
      assert.ok(dangerous);
      assert.equal(Object.prototype.hasOwnProperty.call(dangerous, 'constructor'), false);
      assert.equal((dangerous.ok as { a: number }).a, 42);
      assert.equal(({} as Record<string, unknown>).x, undefined);

      const scrubbed = redactSecrets(
        'Request failed with Authorization: Token abcdef1234567890 and secretKey="topsecret99"',
        ['topsecret99']
      );
      assert.ok(!scrubbed.includes('abcdef1234567890'));
      assert.ok(!scrubbed.includes('topsecret99'));
      assert.ok(scrubbed.includes('***REDACTED***'));

      assert.equal(toSafeNumber(NaN, 5), 5);
      assert.equal(toSafeNumber(Infinity, 5), 5);

      // NaN / Infinity stress on portfolio calculators
      const rebal = calculateRebalancedBuys(
        [
          { id: 'a', targetWeight: NaN, currentValue: Infinity },
          { id: 'b', targetWeight: 50, currentValue: 100 },
        ],
        NaN
      );
      assert.deepEqual(
        rebal,
        [
          { id: 'a', suggestedBuy: 0 },
          { id: 'b', suggestedBuy: 0 },
        ]
      );

      const direct = calculateDirectBuys([{ id: 'x', targetWeight: 100 }], Infinity);
      assert.deepEqual(direct, [{ id: 'x', suggestedBuy: 0 }]);

      const portfolio = calculatePortfolioAllocation(
        NaN,
        { ...DEFAULT_SETTINGS, savingsPercent: Infinity },
        DEFAULT_CRYPTO_ASSETS,
        DEFAULT_GOLD_HOLDING
      );
      assert.equal(portfolio.totalInputAmount, 0);
      assert.equal(portfolio.goldBuyAmount, 0);
      assert.equal(portfolio.cryptoBuyAmount, 0);

      const buckets = calculateRiskBuckets(NaN, 'moderate');
      assert.equal(buckets.lowRiskPercent + buckets.mediumRiskPercent + buckets.highRiskPercent, 100);

      const saleRes = calculateOptimalSales(
        NaN,
        DEFAULT_CRYPTO_ASSETS,
        [],
        [],
        DEFAULT_SETTINGS
      );
      assert.equal(saleRes.actualTotalSaleTomans, 0);
      assert.ok(Number.isFinite(saleRes.currentPortfolioValue));

      // Quadrillion scale support in numberToPersianWords
      assert.equal(numberToPersianWords(NaN), '');
      assert.ok(!numberToPersianWords(2_000_000_000_000_000).includes('نامشخص'));
      assert.ok(numberToPersianWords(2_000_000_000_000_000).includes('کوادریلیون'));
    });
  });

  describe('5. Startup Flow, PullToRefresh Physics, Theme Transitions & Security Configs', () => {
    it('verifies startup restores profile without forcing profile picker modal', () => {
      const profileHookSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useProfileState.ts'), 'utf8');
      assert.match(
        profileHookSrc,
        /useState<boolean>\(false\)/,
        'showProfileSwitcher must initialize to false on startup'
      );
      assert.match(
        profileHookSrc,
        /loadedVault\.profiles\.some\(\(p\) => p\.id === loadedVault\.activeProfileId\)[\s\S]*loadedVault\.profiles\[0\]\.id/,
        'Startup must restore activeProfileId or gracefully fall back to first valid profile'
      );
      assert.match(
        profileHookSrc,
        /setNeedsOnboarding\(true\)/,
        'Onboarding activates only for true first-launch / empty vault scenarios'
      );
    });

    it('verifies GPU-composited PTR, smooth theme transitions, and production security headers', () => {
      const ptrSrc = fs.readFileSync(
        path.join(rootDir, 'src/components/common/PullToRefreshContainer.tsx'),
        'utf8'
      );
      const themeSrc = fs.readFileSync(path.join(rootDir, 'src/hooks/useTheme.ts'), 'utf8');
      const cssSrc = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');
      const vercelSrc = fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8');
      const capSrc = fs.readFileSync(path.join(rootDir, 'capacitor.config.ts'), 'utf8');
      const manifestSrc = fs.readFileSync(
        path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'),
        'utf8'
      );

      assert.match(ptrSrc, /requestAnimationFrame/, 'PTR must schedule displacement via rAF');
      assert.match(ptrSrc, /translate3d/, 'PTR must use GPU-composited translate3d');
      assert.match(ptrSrc, /data-modal-open/, 'PTR must ignore drags over open modals');

      assert.match(themeSrc, /startViewTransition/, 'useTheme must support View Transitions API');
      assert.match(themeSrc, /prefers-reduced-motion/, 'useTheme must respect prefers-reduced-motion');
      assert.match(themeSrc, /theme-transitioning/, 'useTheme must manage scoped fallback transition class');
      assert.match(cssSrc, /\.theme-transitioning/, 'index.css must style scoped .theme-transitioning class');

      assert.match(vercelSrc, /Content-Security-Policy/, 'vercel.json must configure CSP header');
      assert.match(vercelSrc, /X-Frame-Options/, 'vercel.json must configure clickjacking defense');
      assert.match(capSrc, /allowMixedContent:\s*false/, 'capacitor.config.ts must disallow mixed content');
      assert.match(manifestSrc, /android:usesCleartextTraffic="false"/, 'AndroidManifest must forbid cleartext HTTP traffic');
      assert.match(manifestSrc, /android:allowBackup="false"/, 'AndroidManifest must disable unencrypted ADB backups');
    });
  });
});
