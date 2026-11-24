import {
  AppSettings,
  CryptoAsset,
  GoldHolding,
  PhysicalGoldItem,
  PhysicalGoldBuyLot,
  PhysicalGoldSaleRecord,
  PropertyItem,
  VehicleItem,
  TransactionRecord,
  MarketInstrument,
  UserMarketHolding,
  DollarHolding,
} from '../types/investment';
import {
  DEFAULT_CRYPTO_ASSETS,
  DEFAULT_GOLD_HOLDING,
  DEFAULT_PHYSICAL_GOLD_ITEMS,
  DEFAULT_SETTINGS,
  DEFAULT_DOLLAR_HOLDING,
} from '../constants/defaultData';
import { NobitexConfig } from '../services/nobitex/types';
import { redactSecrets, safeJsonParse, sanitizePlainData, toSafeNumber } from './security';

export const STORAGE_KEYS = {
  SETTINGS: 'tarazino_settings_v1',
  CRYPTO_ASSETS: 'tarazino_crypto_assets_v1',
  GOLD_HOLDING: 'tarazino_gold_holding_v1',
  DOLLAR_HOLDING: 'tarazino_dollar_holding_v1',
  PHYSICAL_GOLD: 'tarazino_physical_gold_v1',
  PROPERTIES: 'tarazino_properties_v1',
  VEHICLES: 'tarazino_vehicles_v1',
  GOLD_BUY_LOTS: 'tarazino_gold_buy_lots_v1',
  PHYSICAL_GOLD_SALES: 'tarazino_physical_gold_sales_v1',
  TRANSACTIONS: 'tarazino_transactions_v1',
  LAST_INPUT: 'tarazino_last_input_v1',
  MARKET_INSTRUMENTS: 'tarazino_market_instruments_v1',
  MARKET_HOLDINGS: 'tarazino_market_holdings_v1',
  NOBITEX_CONFIG: 'tarazino_nobitex_config_v1',
};

export const LEGACY_STORAGE_KEYS = {
  SETTINGS: 'investment_app_settings_v1',
  CRYPTO_ASSETS: 'investment_app_crypto_assets_v1',
  GOLD_HOLDING: 'investment_app_gold_holding_v1',
  DOLLAR_HOLDING: 'investment_app_dollar_holding_v1',
  PHYSICAL_GOLD: 'investment_app_physical_gold_v1',
  PROPERTIES: 'investment_app_properties_v1',
  VEHICLES: 'investment_app_vehicles_v1',
  GOLD_BUY_LOTS: 'investment_app_gold_buy_lots_v1',
  PHYSICAL_GOLD_SALES: 'investment_app_physical_gold_sales_v1',
  TRANSACTIONS: 'investment_app_transactions_v1',
  LAST_INPUT: 'investment_app_last_input_v1',
  MARKET_INSTRUMENTS: 'investment_app_market_instruments_v1',
  MARKET_HOLDINGS: 'investment_app_market_holdings_v1',
  NOBITEX_CONFIG: 'investment_app_nobitex_config_v1',
};

const PROFILE_EXTRA_KEYS = [
  'nobitex_cached_buy_prices_v1',
  'tarazino_currency_mode_v1',
  'tarazino_usdt_rate_v1',
];

let activeStorageProfileId: string | null = null;

export function sanitizeProfileId(profileId?: string | null): string | null {
  if (!profileId || typeof profileId !== 'string') return null;
  const trimmed = profileId.trim();
  if (!trimmed || trimmed === 'default') return null;
  const clean = trimmed.replace(/[^a-zA-Z0-9_-]/g, '_');
  return clean || null;
}

export function setActiveStorageProfileId(profileId: string | null): void {
  const next = sanitizeProfileId(profileId);
  const changed = activeStorageProfileId !== next;
  activeStorageProfileId = next;
  if (changed && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('tarazino_active_profile_changed', { detail: { profileId: next } }));
  }
}

export function getActiveStorageProfileId(): string | null {
  return activeStorageProfileId;
}

export function getProfileScopedKey(baseKey: string, profileId?: string | null): string {
  const effective = profileId !== undefined ? sanitizeProfileId(profileId) : activeStorageProfileId;
  if (!effective) return baseKey;
  return `${baseKey}__profile_${effective}`;
}

export function clearProfileStorageNamespace(profileId: string): void {
  const cleanId = sanitizeProfileId(profileId);
  if (!cleanId) return;
  try {
    const keys = [...Object.values(STORAGE_KEYS), ...PROFILE_EXTRA_KEYS];
    for (const baseKey of keys) {
      localStorage.removeItem(getProfileScopedKey(baseKey, cleanId));
    }
  } catch (e) {
    console.error('Failed to clear profile storage namespace:', redactSecrets(e));
  }
}

export interface ExportedBackupData {
  version: string;
  schemaVersion?: number;
  exportDate: string;
  profileId?: string;
  profileName?: string;
  settings: AppSettings;
  cryptoAssets: CryptoAsset[];
  goldHolding: GoldHolding;
  physicalGold?: PhysicalGoldItem[];
  properties?: PropertyItem[];
  vehicles?: VehicleItem[];
  dollarHolding?: DollarHolding;
  goldBuyLots?: PhysicalGoldBuyLot[];
  physicalGoldSales?: PhysicalGoldSaleRecord[];
  transactions: TransactionRecord[];
  marketInstruments?: MarketInstrument[];
  marketHoldings?: UserMarketHolding[];
  lastInput?: number;
  nobitexConfig?: NobitexConfig;
}

function getStorageItem(primaryKey: string, legacyKey: string, profileId?: string | null): string | null {
  const resolvedId = profileId !== undefined ? sanitizeProfileId(profileId) : activeStorageProfileId;
  const scopedPrimary = getProfileScopedKey(primaryKey, resolvedId);
  const current = localStorage.getItem(scopedPrimary);
  if (current !== null) return current;

  // Migrate legacy global storage keys only for unscoped default namespace
  if (!resolvedId && legacyKey) {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      try {
        localStorage.setItem(scopedPrimary, legacy);
      } catch {
        // Ignore quota write failures during read migration
      }
      return legacy;
    }
  }
  return null;
}

function cloneDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

function cloneDefaultCryptoAssets(): CryptoAsset[] {
  return DEFAULT_CRYPTO_ASSETS.map((item) => ({ ...item }));
}

function cloneDefaultGoldHolding(): GoldHolding {
  return { ...DEFAULT_GOLD_HOLDING };
}

function cloneDefaultDollarHolding(): DollarHolding {
  return { ...DEFAULT_DOLLAR_HOLDING };
}

function cloneDefaultPhysicalGold(): PhysicalGoldItem[] {
  return DEFAULT_PHYSICAL_GOLD_ITEMS.map((item) => ({ ...item }));
}

function sanitizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const base = cloneDefaultSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  const goldPercent = toSafeNumber(raw.goldPercent, base.goldPercent, 0, 100);
  const cryptoPercent = toSafeNumber(raw.cryptoPercent, base.cryptoPercent, 0, 100);
  const savingsPercent = toSafeNumber(raw.savingsPercent, base.savingsPercent, 0, 100);
  const calculationMode = raw.calculationMode === 'direct' ? 'direct' : 'rebalance';
  const currencyUnit = raw.currencyUnit === 'rial' ? 'rial' : 'toman';
  const goldPricePerGram = toSafeNumber(raw.goldPricePerGram, base.goldPricePerGram, 0, 1e15);
  const capitalInputMode =
    raw.capitalInputMode === 'direct'
      ? 'direct'
      : raw.capitalInputMode === 'income'
      ? 'income'
      : base.capitalInputMode;

  return {
    ...base,
    ...raw,
    goldPercent,
    cryptoPercent,
    savingsPercent,
    calculationMode,
    currencyUnit,
    goldPricePerGram,
    capitalInputMode,
  };
}

function sanitizeCryptoAssets(raw: unknown): CryptoAsset[] {
  if (!Array.isArray(raw)) return cloneDefaultCryptoAssets();
  const clean: CryptoAsset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as CryptoAsset;
    if (!rec.id || !rec.symbol) continue;
    clean.push({
      ...rec,
      id: String(rec.id),
      symbol: String(rec.symbol),
      name: String(rec.name || rec.symbol),
      targetPercent: toSafeNumber(rec.targetPercent, 0, 0, 100),
      currentHoldingValue: toSafeNumber(rec.currentHoldingValue, 0, 0, 1e16),
      currentAmount: rec.currentAmount !== undefined ? toSafeNumber(rec.currentAmount, 0, 0, 1e12) : undefined,
      unitPrice: rec.unitPrice !== undefined ? toSafeNumber(rec.unitPrice, 0, 0, 1e15) : undefined,
    });
  }
  return clean;
}

function sanitizePhysicalGold(raw: unknown): PhysicalGoldItem[] {
  const defaults = cloneDefaultPhysicalGold();
  if (!Array.isArray(raw)) return defaults;

  const validItems = raw.filter((item): item is PhysicalGoldItem =>
    Boolean(item && typeof item === 'object' && !Array.isArray(item) && typeof (item as PhysicalGoldItem).id === 'string')
  );

  return defaults.map((def) => {
    const found = validItems.find((p) => p.id === def.id);
    if (!found) return def;
    return {
      ...def,
      ...found,
      quantity: toSafeNumber(found.quantity, 0, 0, 1e9),
      unitPriceTomans: toSafeNumber(found.unitPriceTomans, def.unitPriceTomans, 0, 1e14),
      averageBuyPriceTomans:
        found.averageBuyPriceTomans !== undefined
          ? toSafeNumber(found.averageBuyPriceTomans, 0, 0, 1e14)
          : undefined,
    };
  });
}

function sanitizeNobitexConfig(raw: unknown): NobitexConfig {
  const empty: NobitexConfig = { authType: 'api_key', publicKey: '', secretKey: '' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
  const cfg = raw as Partial<NobitexConfig>;
  return {
    authType: cfg.authType === 'token' ? 'token' : 'api_key',
    publicKey: typeof cfg.publicKey === 'string' ? cfg.publicKey.trim() : '',
    secretKey: typeof cfg.secretKey === 'string' ? cfg.secretKey.trim() : '',
    token: typeof cfg.token === 'string' ? cfg.token.trim() : undefined,
    autoSyncEnabled: cfg.autoSyncEnabled,
    lastSyncedAt: typeof cfg.lastSyncedAt === 'number' && Number.isFinite(cfg.lastSyncedAt) ? cfg.lastSyncedAt : undefined,
  };
}

// -------------------------------------------------------------
// SETTINGS PERSISTENCE
// -------------------------------------------------------------

export function loadSettings(profileId?: string | null): AppSettings {
  try {
    const data = getStorageItem(STORAGE_KEYS.SETTINGS, LEGACY_STORAGE_KEYS.SETTINGS, profileId);
    if (!data) return cloneDefaultSettings();
    const parsed = safeJsonParse<Partial<AppSettings>>(data);
    return sanitizeSettings(parsed);
  } catch (e) {
    console.error('Failed to load settings:', redactSecrets(e));
    return cloneDefaultSettings();
  }
}

export function saveSettings(settings: AppSettings, profileId?: string | null): void {
  try {
    const clean = sanitizeSettings(sanitizePlainData(settings));
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.SETTINGS, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save settings:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// CRYPTO ASSETS PERSISTENCE
// -------------------------------------------------------------

export function loadCryptoAssets(profileId?: string | null): CryptoAsset[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.CRYPTO_ASSETS, LEGACY_STORAGE_KEYS.CRYPTO_ASSETS, profileId);
    if (!data) return cloneDefaultCryptoAssets();
    const parsed = safeJsonParse<unknown>(data);
    if (!Array.isArray(parsed)) return cloneDefaultCryptoAssets();
    return sanitizeCryptoAssets(parsed);
  } catch (e) {
    console.error('Failed to load crypto assets:', redactSecrets(e));
    return cloneDefaultCryptoAssets();
  }
}

export function saveCryptoAssets(assets: CryptoAsset[], profileId?: string | null): void {
  try {
    const clean = sanitizeCryptoAssets(sanitizePlainData(assets));
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.CRYPTO_ASSETS, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save crypto assets:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// GOLD HOLDING PERSISTENCE
// -------------------------------------------------------------

export function loadGoldHolding(profileId?: string | null): GoldHolding {
  try {
    const data = getStorageItem(STORAGE_KEYS.GOLD_HOLDING, LEGACY_STORAGE_KEYS.GOLD_HOLDING, profileId);
    if (!data) return cloneDefaultGoldHolding();
    const parsed = safeJsonParse<Partial<GoldHolding>>(data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return cloneDefaultGoldHolding();
    }
    return {
      ...cloneDefaultGoldHolding(),
      ...parsed,
      currentHoldingValue: toSafeNumber(parsed.currentHoldingValue, 0, 0, 1e16),
      currentGrams:
        parsed.currentGrams !== undefined
          ? toSafeNumber(parsed.currentGrams, 0, 0, 1e12)
          : undefined,
      pricePerGram:
        parsed.pricePerGram !== undefined
          ? toSafeNumber(parsed.pricePerGram, 0, 0, 1e15)
          : undefined,
    };
  } catch (e) {
    console.error('Failed to load gold holding:', redactSecrets(e));
    return cloneDefaultGoldHolding();
  }
}

export function saveGoldHolding(holding: GoldHolding, profileId?: string | null): void {
  try {
    const clean = {
      ...sanitizePlainData(holding),
      currentHoldingValue: toSafeNumber(holding?.currentHoldingValue, 0, 0, 1e16),
    };
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.GOLD_HOLDING, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save gold holding:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// PHYSICAL GOLD & COINS PERSISTENCE
// -------------------------------------------------------------

export function loadPhysicalGold(profileId?: string | null): PhysicalGoldItem[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.PHYSICAL_GOLD, LEGACY_STORAGE_KEYS.PHYSICAL_GOLD, profileId);
    if (!data) return cloneDefaultPhysicalGold();
    const parsed = safeJsonParse<unknown>(data);
    return sanitizePhysicalGold(parsed);
  } catch (e) {
    console.error('Failed to load physical gold:', redactSecrets(e));
    return cloneDefaultPhysicalGold();
  }
}

export function savePhysicalGold(items: PhysicalGoldItem[], profileId?: string | null): void {
  try {
    const clean = sanitizePhysicalGold(sanitizePlainData(items));
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.PHYSICAL_GOLD, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save physical gold:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// REAL ESTATE PROPERTIES PERSISTENCE
// -------------------------------------------------------------

export function loadProperties(profileId?: string | null): PropertyItem[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.PROPERTIES, LEGACY_STORAGE_KEYS.PROPERTIES, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PropertyItem => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load properties:', redactSecrets(e));
    return [];
  }
}

export function saveProperties(properties: PropertyItem[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(properties) ? sanitizePlainData(properties) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.PROPERTIES, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save properties:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// VEHICLES (CARS & MOTORCYCLES) PERSISTENCE
// -------------------------------------------------------------

export function loadVehicles(profileId?: string | null): VehicleItem[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.VEHICLES, LEGACY_STORAGE_KEYS.VEHICLES, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is VehicleItem => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load vehicles:', redactSecrets(e));
    return [];
  }
}

export function saveVehicles(vehicles: VehicleItem[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(vehicles) ? sanitizePlainData(vehicles) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.VEHICLES, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save vehicles:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// DOLLAR / FOREIGN CURRENCY HOLDING PERSISTENCE
// -------------------------------------------------------------

export function loadDollarHolding(profileId?: string | null): DollarHolding {
  try {
    const data = getStorageItem(STORAGE_KEYS.DOLLAR_HOLDING, LEGACY_STORAGE_KEYS.DOLLAR_HOLDING, profileId);
    if (!data) return cloneDefaultDollarHolding();
    const parsed = safeJsonParse<Partial<DollarHolding>>(data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return cloneDefaultDollarHolding();
    }
    return {
      ...cloneDefaultDollarHolding(),
      ...parsed,
      amountUsd: toSafeNumber(parsed.amountUsd, 0, 0, 1e12),
      averageBuyPriceTomans: toSafeNumber(parsed.averageBuyPriceTomans, 0, 0, 1e12),
      currentPriceTomans: toSafeNumber(parsed.currentPriceTomans, DEFAULT_DOLLAR_HOLDING.currentPriceTomans, 0, 1e12),
    };
  } catch (e) {
    console.error('Failed to load dollar holding:', redactSecrets(e));
    return cloneDefaultDollarHolding();
  }
}

export function saveDollarHolding(holding: DollarHolding, profileId?: string | null): void {
  try {
    const clean = {
      ...cloneDefaultDollarHolding(),
      ...sanitizePlainData(holding),
      amountUsd: toSafeNumber(holding?.amountUsd, 0, 0, 1e12),
      averageBuyPriceTomans: toSafeNumber(holding?.averageBuyPriceTomans, 0, 0, 1e12),
      currentPriceTomans: toSafeNumber(holding?.currentPriceTomans, DEFAULT_DOLLAR_HOLDING.currentPriceTomans, 0, 1e12),
    };
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.DOLLAR_HOLDING, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save dollar holding:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// PHYSICAL GOLD BUY LOTS & REALIZED SALES LEDGER
// -------------------------------------------------------------

export function loadGoldBuyLots(profileId?: string | null): PhysicalGoldBuyLot[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.GOLD_BUY_LOTS, LEGACY_STORAGE_KEYS.GOLD_BUY_LOTS, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PhysicalGoldBuyLot => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load gold buy lots:', redactSecrets(e));
    return [];
  }
}

export function saveGoldBuyLots(lots: PhysicalGoldBuyLot[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(lots) ? sanitizePlainData(lots) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.GOLD_BUY_LOTS, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save gold buy lots:', redactSecrets(e));
  }
}

export function loadPhysicalGoldSales(profileId?: string | null): PhysicalGoldSaleRecord[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.PHYSICAL_GOLD_SALES, LEGACY_STORAGE_KEYS.PHYSICAL_GOLD_SALES, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is PhysicalGoldSaleRecord => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load physical gold sales:', redactSecrets(e));
    return [];
  }
}

export function savePhysicalGoldSales(sales: PhysicalGoldSaleRecord[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(sales) ? sanitizePlainData(sales) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.PHYSICAL_GOLD_SALES, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save physical gold sales:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// TRANSACTIONS PERSISTENCE
// -------------------------------------------------------------

export function loadTransactions(profileId?: string | null): TransactionRecord[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.TRANSACTIONS, LEGACY_STORAGE_KEYS.TRANSACTIONS, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is TransactionRecord => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load transactions:', redactSecrets(e));
    return [];
  }
}

export function saveTransactions(transactions: TransactionRecord[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(transactions) ? sanitizePlainData(transactions) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.TRANSACTIONS, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save transactions:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// LAST INPUT AMOUNT PERSISTENCE
// -------------------------------------------------------------

export function loadLastInput(profileId?: string | null): number {
  try {
    const data = getStorageItem(STORAGE_KEYS.LAST_INPUT, LEGACY_STORAGE_KEYS.LAST_INPUT, profileId);
    return data ? toSafeNumber(Number(data), 0, 0, 1e16) : 0;
  } catch (e) {
    console.error('Failed to load last input:', redactSecrets(e));
    return 0;
  }
}

export function saveLastInput(amount: number, profileId?: string | null): void {
  try {
    const safeAmount = toSafeNumber(amount, 0, 0, 1e16);
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.LAST_INPUT, profileId), String(safeAmount));
  } catch (e) {
    console.error('Failed to save last input:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// MARKET INSTRUMENTS & USER HOLDINGS PERSISTENCE (TSETMC / BOURSE)
// -------------------------------------------------------------

export function loadMarketInstruments(profileId?: string | null): MarketInstrument[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.MARKET_INSTRUMENTS, LEGACY_STORAGE_KEYS.MARKET_INSTRUMENTS, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is MarketInstrument => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load market instruments:', redactSecrets(e));
    return [];
  }
}

export function saveMarketInstruments(instruments: MarketInstrument[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(instruments) ? sanitizePlainData(instruments) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.MARKET_INSTRUMENTS, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save market instruments:', redactSecrets(e));
  }
}

export function loadMarketHoldings(profileId?: string | null): UserMarketHolding[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.MARKET_HOLDINGS, LEGACY_STORAGE_KEYS.MARKET_HOLDINGS, profileId);
    if (!data) return [];
    const parsed = safeJsonParse<unknown>(data);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is UserMarketHolding => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
      : [];
  } catch (e) {
    console.error('Failed to load market holdings:', redactSecrets(e));
    return [];
  }
}

export function saveMarketHoldings(holdings: UserMarketHolding[], profileId?: string | null): void {
  try {
    const clean = Array.isArray(holdings) ? sanitizePlainData(holdings) : [];
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.MARKET_HOLDINGS, profileId), JSON.stringify(clean));
  } catch (e) {
    console.error('Failed to save market holdings:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// NOBITEX CONFIG PERSISTENCE
// -------------------------------------------------------------

export function loadNobitexConfig(profileId?: string | null): NobitexConfig {
  try {
    const data = getStorageItem(STORAGE_KEYS.NOBITEX_CONFIG, LEGACY_STORAGE_KEYS.NOBITEX_CONFIG, profileId);
    if (!data) return { authType: 'api_key', publicKey: '', secretKey: '' };
    const parsed = safeJsonParse<unknown>(data);
    return sanitizeNobitexConfig(parsed);
  } catch (e) {
    console.error('Failed to load Nobitex config:', redactSecrets(e));
    return { authType: 'api_key', publicKey: '', secretKey: '' };
  }
}

export function saveNobitexConfig(config: NobitexConfig, profileId?: string | null): void {
  try {
    const clean = sanitizeNobitexConfig(sanitizePlainData(config));
    localStorage.setItem(getProfileScopedKey(STORAGE_KEYS.NOBITEX_CONFIG, profileId), JSON.stringify(clean));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('nobitex_config_updated'));
    }
  } catch (e) {
    console.error('Failed to save Nobitex config:', redactSecrets(e));
  }
}

// -------------------------------------------------------------
// FULL BACKUP & RESTORE
// -------------------------------------------------------------

export function exportBackupData(profileId?: string | null, profileName?: string): string {
  const effectiveId = profileId !== undefined ? sanitizeProfileId(profileId) : activeStorageProfileId;
  const nobitex = loadNobitexConfig(effectiveId);

  // Sanitize secret key and bearer token from plaintext export for security
  const sanitizedNobitex: NobitexConfig = {
    ...nobitex,
    secretKey: '',
    token: '',
  };

  const backup: ExportedBackupData = {
    version: '2.0.0',
    schemaVersion: 2,
    exportDate: new Date().toISOString(),
    ...(effectiveId ? { profileId: effectiveId } : {}),
    ...(profileName ? { profileName } : {}),
    settings: loadSettings(effectiveId),
    cryptoAssets: loadCryptoAssets(effectiveId),
    goldHolding: loadGoldHolding(effectiveId),
    physicalGold: loadPhysicalGold(effectiveId),
    properties: loadProperties(effectiveId),
    vehicles: loadVehicles(effectiveId),
    dollarHolding: loadDollarHolding(effectiveId),
    goldBuyLots: loadGoldBuyLots(effectiveId),
    physicalGoldSales: loadPhysicalGoldSales(effectiveId),
    transactions: loadTransactions(effectiveId),
    marketInstruments: loadMarketInstruments(effectiveId),
    marketHoldings: loadMarketHoldings(effectiveId),
    lastInput: loadLastInput(effectiveId),
    nobitexConfig: sanitizedNobitex,
  };

  return JSON.stringify(backup, null, 2);
}

export function parseValidatedBackupData(jsonString: string): Partial<ExportedBackupData> | null {
  const parsed = safeJsonParse<Partial<ExportedBackupData>>(jsonString);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }

  const hasRecognizedCore =
    Boolean(parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)) ||
    Array.isArray(parsed.cryptoAssets) ||
    Boolean(parsed.goldHolding && typeof parsed.goldHolding === 'object' && !Array.isArray(parsed.goldHolding)) ||
    Boolean(parsed.dollarHolding && typeof parsed.dollarHolding === 'object' && !Array.isArray(parsed.dollarHolding)) ||
    Array.isArray(parsed.physicalGold) ||
    Array.isArray(parsed.properties) ||
    Array.isArray(parsed.vehicles);

  if (!hasRecognizedCore) {
    return null;
  }

  // Reject type-mismatched entity payloads strictly before mutating storage
  if (parsed.settings !== undefined && (typeof parsed.settings !== 'object' || Array.isArray(parsed.settings))) {
    return null;
  }
  if (parsed.cryptoAssets !== undefined && !Array.isArray(parsed.cryptoAssets)) return null;
  if (parsed.physicalGold !== undefined && !Array.isArray(parsed.physicalGold)) return null;
  if (parsed.properties !== undefined && !Array.isArray(parsed.properties)) return null;
  if (parsed.vehicles !== undefined && !Array.isArray(parsed.vehicles)) return null;
  if (parsed.goldBuyLots !== undefined && !Array.isArray(parsed.goldBuyLots)) return null;
  if (parsed.physicalGoldSales !== undefined && !Array.isArray(parsed.physicalGoldSales)) return null;
  if (parsed.transactions !== undefined && !Array.isArray(parsed.transactions)) return null;
  if (parsed.marketInstruments !== undefined && !Array.isArray(parsed.marketInstruments)) return null;
  if (parsed.marketHoldings !== undefined && !Array.isArray(parsed.marketHoldings)) return null;

  return parsed;
}

export function importBackupData(jsonString: string, targetProfileId?: string | null): boolean {
  const parsed = parseValidatedBackupData(jsonString);
  if (!parsed) {
    return false;
  }

  const effectiveId = targetProfileId !== undefined ? sanitizeProfileId(targetProfileId) : activeStorageProfileId;
  const scopedKeys = Object.values(STORAGE_KEYS).map((k) => getProfileScopedKey(k, effectiveId));
  const snapshot = new Map<string, string | null>();

  try {
    for (const k of scopedKeys) {
      snapshot.set(k, localStorage.getItem(k));
    }

    const writeStrict = (baseKey: string, payload: unknown) => {
      localStorage.setItem(getProfileScopedKey(baseKey, effectiveId), JSON.stringify(payload));
    };

    if (parsed.settings) {
      writeStrict(STORAGE_KEYS.SETTINGS, sanitizeSettings(sanitizePlainData(parsed.settings)));
    }
    if (Array.isArray(parsed.cryptoAssets)) {
      writeStrict(STORAGE_KEYS.CRYPTO_ASSETS, sanitizeCryptoAssets(sanitizePlainData(parsed.cryptoAssets)));
    }
    if (parsed.goldHolding && typeof parsed.goldHolding === 'object' && !Array.isArray(parsed.goldHolding)) {
      const gh = sanitizePlainData(parsed.goldHolding);
      writeStrict(STORAGE_KEYS.GOLD_HOLDING, {
        ...cloneDefaultGoldHolding(),
        ...gh,
        currentHoldingValue: toSafeNumber(gh.currentHoldingValue, 0, 0, 1e16),
        currentGrams:
          gh.currentGrams !== undefined ? toSafeNumber(gh.currentGrams, 0, 0, 1e12) : undefined,
        pricePerGram:
          gh.pricePerGram !== undefined ? toSafeNumber(gh.pricePerGram, 0, 0, 1e15) : undefined,
      });
    }
    if (Array.isArray(parsed.physicalGold)) {
      writeStrict(STORAGE_KEYS.PHYSICAL_GOLD, sanitizePhysicalGold(sanitizePlainData(parsed.physicalGold)));
    }
    if (Array.isArray(parsed.properties)) {
      writeStrict(STORAGE_KEYS.PROPERTIES, sanitizePlainData(parsed.properties));
    }
    if (Array.isArray(parsed.vehicles)) {
      writeStrict(STORAGE_KEYS.VEHICLES, sanitizePlainData(parsed.vehicles));
    }
    if (parsed.dollarHolding && typeof parsed.dollarHolding === 'object' && !Array.isArray(parsed.dollarHolding)) {
      const dh = sanitizePlainData(parsed.dollarHolding);
      writeStrict(STORAGE_KEYS.DOLLAR_HOLDING, {
        ...cloneDefaultDollarHolding(),
        ...dh,
        amountUsd: toSafeNumber(dh.amountUsd, 0, 0, 1e12),
        averageBuyPriceTomans: toSafeNumber(dh.averageBuyPriceTomans, 0, 0, 1e12),
        currentPriceTomans: toSafeNumber(dh.currentPriceTomans, DEFAULT_DOLLAR_HOLDING.currentPriceTomans, 0, 1e12),
      });
    }
    if (Array.isArray(parsed.goldBuyLots)) {
      writeStrict(STORAGE_KEYS.GOLD_BUY_LOTS, sanitizePlainData(parsed.goldBuyLots));
    }
    if (Array.isArray(parsed.physicalGoldSales)) {
      writeStrict(STORAGE_KEYS.PHYSICAL_GOLD_SALES, sanitizePlainData(parsed.physicalGoldSales));
    }
    if (Array.isArray(parsed.transactions)) {
      writeStrict(STORAGE_KEYS.TRANSACTIONS, sanitizePlainData(parsed.transactions));
    }
    if (Array.isArray(parsed.marketInstruments)) {
      writeStrict(STORAGE_KEYS.MARKET_INSTRUMENTS, sanitizePlainData(parsed.marketInstruments));
    }
    if (Array.isArray(parsed.marketHoldings)) {
      writeStrict(STORAGE_KEYS.MARKET_HOLDINGS, sanitizePlainData(parsed.marketHoldings));
    }
    if (parsed.lastInput !== undefined) {
      localStorage.setItem(
        getProfileScopedKey(STORAGE_KEYS.LAST_INPUT, effectiveId),
        String(toSafeNumber(parsed.lastInput, 0, 0, 1e16))
      );
    }

    let nobitexUpdated = false;
    if (parsed.nobitexConfig && typeof parsed.nobitexConfig === 'object' && !Array.isArray(parsed.nobitexConfig)) {
      const existingCfg = loadNobitexConfig(effectiveId);
      const incoming = sanitizeNobitexConfig(sanitizePlainData(parsed.nobitexConfig));
      // Do not overwrite working local secrets with redacted empty strings on same public key
      const mergedSecretKey =
        incoming.secretKey ||
        (incoming.publicKey && incoming.publicKey === existingCfg.publicKey ? existingCfg.secretKey : '');
      const mergedToken = incoming.token || '';
      writeStrict(STORAGE_KEYS.NOBITEX_CONFIG, {
        ...incoming,
        secretKey: mergedSecretKey,
        token: mergedToken,
      });
      nobitexUpdated = true;
    }

    if (nobitexUpdated && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('nobitex_config_updated'));
    }

    return true;
  } catch (e) {
    // Atomic rollback: restore exact pre-import keys for target profile namespace only
    try {
      for (const [k, prevVal] of snapshot.entries()) {
        if (prevVal === null) {
          localStorage.removeItem(k);
        } else {
          localStorage.setItem(k, prevVal);
        }
      }
    } catch {
      // Best-effort rollback
    }
    console.error('Failed to import backup:', redactSecrets(e));
    return false;
  }
}

export function resetAllDataToDefault(profileId?: string | null): void {
  const effectiveId = profileId !== undefined ? sanitizeProfileId(profileId) : activeStorageProfileId;
  if (effectiveId) {
    clearProfileStorageNamespace(effectiveId);
    return;
  }

  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  Object.values(LEGACY_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  for (const extraKey of PROFILE_EXTRA_KEYS) {
    localStorage.removeItem(extraKey);
  }
}
