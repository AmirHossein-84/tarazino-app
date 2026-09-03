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

export const STORAGE_KEYS = {
  SETTINGS: 'tarazino_settings_v1',
  CRYPTO_ASSETS: 'tarazino_crypto_assets_v1',
  GOLD_HOLDING: 'tarazino_gold_holding_v1',
  PHYSICAL_GOLD: 'tarazino_physical_gold_v1',
  PROPERTIES: 'tarazino_properties_v1',
  VEHICLES: 'tarazino_vehicles_v1',
  DOLLAR_HOLDING: 'tarazino_dollar_holding_v1',
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
  PHYSICAL_GOLD: 'investment_app_physical_gold_v1',
  PROPERTIES: 'investment_app_properties_v1',
  VEHICLES: 'investment_app_vehicles_v1',
  DOLLAR_HOLDING: 'investment_app_dollar_holding_v1',
  GOLD_BUY_LOTS: 'investment_app_gold_buy_lots_v1',
  PHYSICAL_GOLD_SALES: 'investment_app_physical_gold_sales_v1',
  TRANSACTIONS: 'investment_app_transactions_v1',
  LAST_INPUT: 'investment_app_last_input_v1',
  MARKET_INSTRUMENTS: 'investment_app_market_instruments_v1',
  MARKET_HOLDINGS: 'investment_app_market_holdings_v1',
  NOBITEX_CONFIG: 'investment_app_nobitex_config_v1',
};

function getStorageItem(key: string, legacyKey?: string): string | null {
  try {
    const item = localStorage.getItem(key);
    if (item !== null) return item;
    if (legacyKey) {
      const legacyItem = localStorage.getItem(legacyKey);
      if (legacyItem !== null) {
        try {
          localStorage.setItem(key, legacyItem);
        } catch (_) {}
        return legacyItem;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export interface ExportedBackupData {
  version: string;
  exportDate: string;
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
  nobitexConfig?: NobitexConfig;
}

export function loadSettings(): AppSettings {
  try {
    const data = getStorageItem(STORAGE_KEYS.SETTINGS, LEGACY_STORAGE_KEYS.SETTINGS);
    if (!data) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? { ...DEFAULT_SETTINGS, ...parsed } : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('Failed to load settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadCryptoAssets(): CryptoAsset[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.CRYPTO_ASSETS, LEGACY_STORAGE_KEYS.CRYPTO_ASSETS);
    if (!data) return DEFAULT_CRYPTO_ASSETS;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : DEFAULT_CRYPTO_ASSETS;
  } catch (e) {
    console.error('Failed to load crypto assets:', e);
    return DEFAULT_CRYPTO_ASSETS;
  }
}

export function saveCryptoAssets(assets: CryptoAsset[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CRYPTO_ASSETS, JSON.stringify(assets));
  } catch (e) {
    console.error('Failed to save crypto assets:', e);
  }
}

export function loadGoldHolding(): GoldHolding {
  try {
    const data = getStorageItem(STORAGE_KEYS.GOLD_HOLDING, LEGACY_STORAGE_KEYS.GOLD_HOLDING);
    if (!data) return DEFAULT_GOLD_HOLDING;
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object' ? { ...DEFAULT_GOLD_HOLDING, ...parsed } : DEFAULT_GOLD_HOLDING;
  } catch (e) {
    console.error('Failed to load gold holding:', e);
    return DEFAULT_GOLD_HOLDING;
  }
}

export function saveGoldHolding(holding: GoldHolding): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GOLD_HOLDING, JSON.stringify(holding));
  } catch (e) {
    console.error('Failed to save gold holding:', e);
  }
}

// -------------------------------------------------------------
// PHYSICAL GOLD & COINS PERSISTENCE
// -------------------------------------------------------------

export function loadPhysicalGold(): PhysicalGoldItem[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.PHYSICAL_GOLD, LEGACY_STORAGE_KEYS.PHYSICAL_GOLD);
    if (!data) return DEFAULT_PHYSICAL_GOLD_ITEMS;
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return DEFAULT_PHYSICAL_GOLD_ITEMS;
    
    // Merge with defaults in case new coin items were added
    return DEFAULT_PHYSICAL_GOLD_ITEMS.map((def) => {
      const existing = parsed.find((p) => p.id === def.id);
      return existing ? { ...def, ...existing } : def;
    });
  } catch (e) {
    console.error('Failed to load physical gold:', e);
    return DEFAULT_PHYSICAL_GOLD_ITEMS;
  }
}

export function savePhysicalGold(items: PhysicalGoldItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PHYSICAL_GOLD, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save physical gold:', e);
  }
}

// -------------------------------------------------------------
// REAL ESTATE & PROPERTY MANAGEMENT PERSISTENCE
// -------------------------------------------------------------

export function loadProperties(): PropertyItem[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.PROPERTIES, LEGACY_STORAGE_KEYS.PROPERTIES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load properties:', e);
    return [];
  }
}

export function saveProperties(properties: PropertyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
  } catch (e) {
    console.error('Failed to save properties:', e);
  }
}

// -------------------------------------------------------------
// VEHICLES (CARS & MOTORCYCLES) PERSISTENCE
// -------------------------------------------------------------

export function loadVehicles(): VehicleItem[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.VEHICLES, LEGACY_STORAGE_KEYS.VEHICLES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load vehicles:', e);
    return [];
  }
}

export function saveVehicles(vehicles: VehicleItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  } catch (e) {
    console.error('Failed to save vehicles:', e);
  }
}

// -------------------------------------------------------------
// USD CASH BANKNOTES HOLDING PERSISTENCE
// -------------------------------------------------------------

export function loadDollarHolding(): DollarHolding {
  try {
    const data = getStorageItem(STORAGE_KEYS.DOLLAR_HOLDING, LEGACY_STORAGE_KEYS.DOLLAR_HOLDING);
    if (!data) return DEFAULT_DOLLAR_HOLDING;
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object'
      ? { ...DEFAULT_DOLLAR_HOLDING, ...parsed }
      : DEFAULT_DOLLAR_HOLDING;
  } catch (e) {
    console.error('Failed to load dollar holding:', e);
    return DEFAULT_DOLLAR_HOLDING;
  }
}

export function saveDollarHolding(holding: DollarHolding): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DOLLAR_HOLDING, JSON.stringify(holding));
  } catch (e) {
    console.error('Failed to save dollar holding:', e);
  }
}

// -------------------------------------------------------------
// PHYSICAL GOLD PURCHASE LOTS & REALIZED SALES AUDIT
// -------------------------------------------------------------

export function loadGoldBuyLots(): PhysicalGoldBuyLot[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.GOLD_BUY_LOTS, LEGACY_STORAGE_KEYS.GOLD_BUY_LOTS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load gold buy lots:', e);
    return [];
  }
}

export function saveGoldBuyLots(lots: PhysicalGoldBuyLot[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GOLD_BUY_LOTS, JSON.stringify(lots));
  } catch (e) {
    console.error('Failed to save gold buy lots:', e);
  }
}

export function loadPhysicalGoldSales(): PhysicalGoldSaleRecord[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.PHYSICAL_GOLD_SALES, LEGACY_STORAGE_KEYS.PHYSICAL_GOLD_SALES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load physical gold sales:', e);
    return [];
  }
}

export function savePhysicalGoldSales(sales: PhysicalGoldSaleRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PHYSICAL_GOLD_SALES, JSON.stringify(sales));
  } catch (e) {
    console.error('Failed to save physical gold sales:', e);
  }
}

export function loadTransactions(): TransactionRecord[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.TRANSACTIONS, LEGACY_STORAGE_KEYS.TRANSACTIONS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load transactions:', e);
    return [];
  }
}

export function saveTransactions(transactions: TransactionRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions:', e);
  }
}

export function loadLastInput(): number {
  try {
    const data = getStorageItem(STORAGE_KEYS.LAST_INPUT, LEGACY_STORAGE_KEYS.LAST_INPUT);
    return data ? Number(data) || 0 : 0;
  } catch (e) {
    console.error('Failed to load last input:', e);
    return 0;
  }
}

export function saveLastInput(amount: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_INPUT, String(amount));
  } catch (e) {
    console.error('Failed to save last input:', e);
  }
}

// -------------------------------------------------------------
// BOURSE & ETF MARKET INSTRUMENTS PERSISTENCE
// -------------------------------------------------------------

export function loadMarketInstruments(): MarketInstrument[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.MARKET_INSTRUMENTS, LEGACY_STORAGE_KEYS.MARKET_INSTRUMENTS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load market instruments:', e);
    return [];
  }
}

export function saveMarketInstruments(instruments: MarketInstrument[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MARKET_INSTRUMENTS, JSON.stringify(instruments));
  } catch (e) {
    console.error('Failed to save market instruments:', e);
  }
}

export function loadMarketHoldings(): UserMarketHolding[] {
  try {
    const data = getStorageItem(STORAGE_KEYS.MARKET_HOLDINGS, LEGACY_STORAGE_KEYS.MARKET_HOLDINGS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load market holdings:', e);
    return [];
  }
}

export function saveMarketHoldings(holdings: UserMarketHolding[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MARKET_HOLDINGS, JSON.stringify(holdings));
  } catch (e) {
    console.error('Failed to save market holdings:', e);
  }
}

// -------------------------------------------------------------
// NOBITEX API CONFIG PERSISTENCE
// -------------------------------------------------------------

export function loadNobitexConfig(): NobitexConfig {
  try {
    const data = getStorageItem(STORAGE_KEYS.NOBITEX_CONFIG, LEGACY_STORAGE_KEYS.NOBITEX_CONFIG);
    if (!data) return { authType: 'api_key', publicKey: '', secretKey: '' };
    const parsed = JSON.parse(data);
    return parsed && typeof parsed === 'object'
      ? parsed
      : { authType: 'api_key', publicKey: '', secretKey: '' };
  } catch (e) {
    console.error('Failed to load Nobitex config:', e);
    return { authType: 'api_key', publicKey: '', secretKey: '' };
  }
}

export function saveNobitexConfig(config: NobitexConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOBITEX_CONFIG, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nobitex_config_updated'));
    }
  } catch (e) {
    console.error('Failed to save Nobitex config:', e);
  }
}

export function exportBackupData(): string {
  const nobitex = loadNobitexConfig();
  // Sanitize secret key from plaintext export for security
  const sanitizedNobitex: NobitexConfig = {
    ...nobitex,
    secretKey: '',
  };

  const backup: ExportedBackupData = {
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    settings: loadSettings(),
    cryptoAssets: loadCryptoAssets(),
    goldHolding: loadGoldHolding(),
    physicalGold: loadPhysicalGold(),
    properties: loadProperties(),
    vehicles: loadVehicles(),
    dollarHolding: loadDollarHolding(),
    goldBuyLots: loadGoldBuyLots(),
    physicalGoldSales: loadPhysicalGoldSales(),
    transactions: loadTransactions(),
    marketInstruments: loadMarketInstruments(),
    marketHoldings: loadMarketHoldings(),
    nobitexConfig: sanitizedNobitex,
  };
  return JSON.stringify(backup, null, 2);
}

export function importBackupData(jsonString: string): boolean {
  try {
    const parsed: Partial<ExportedBackupData> = JSON.parse(jsonString);
    if (!parsed || (!parsed.settings && !parsed.cryptoAssets && !parsed.goldHolding)) {
      throw new Error('Invalid backup format: missing core settings or assets');
    }

    if (parsed.settings) {
      saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
    }
    if (Array.isArray(parsed.cryptoAssets)) {
      saveCryptoAssets(parsed.cryptoAssets);
    }
    if (parsed.goldHolding) {
      saveGoldHolding({ ...DEFAULT_GOLD_HOLDING, ...parsed.goldHolding });
    }
    if (Array.isArray(parsed.physicalGold)) {
      savePhysicalGold(parsed.physicalGold);
    }
    if (Array.isArray(parsed.properties)) {
      saveProperties(parsed.properties);
    }
    if (Array.isArray(parsed.vehicles)) {
      saveVehicles(parsed.vehicles);
    }
    if (parsed.dollarHolding) {
      saveDollarHolding({ ...DEFAULT_DOLLAR_HOLDING, ...parsed.dollarHolding });
    }
    if (Array.isArray(parsed.goldBuyLots)) {
      saveGoldBuyLots(parsed.goldBuyLots);
    }
    if (Array.isArray(parsed.physicalGoldSales)) {
      savePhysicalGoldSales(parsed.physicalGoldSales);
    }
    if (Array.isArray(parsed.transactions)) {
      saveTransactions(parsed.transactions);
    }
    if (Array.isArray(parsed.marketInstruments)) {
      saveMarketInstruments(parsed.marketInstruments);
    }
    if (Array.isArray(parsed.marketHoldings)) {
      saveMarketHoldings(parsed.marketHoldings);
    }
    if (parsed.nobitexConfig) {
      saveNobitexConfig(parsed.nobitexConfig);
    }
    return true;
  } catch (e) {
    console.error('Failed to import backup:', e);
    return false;
  }
}

export function resetAllDataToDefault(): void {
  // Clear current keys
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  // Clear legacy keys
  Object.values(LEGACY_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('nobitex_config_updated'));
  }
}
