import { Capacitor } from '@capacitor/core';
import { PhysicalGoldType } from '../../types/investment';
import { toEnglishDigits } from '../../utils/formatters';

export interface LiveGoldRate {
  id: PhysicalGoldType;
  priceTomans: number;
  priceRials: number;
  changePercent: number;
  updatedAt: string;
}

export interface TgjuGoldResponse {
  current?: Record<
    string,
    {
      p?: string; // price in Rials (e.g. "45,800,000")
      h?: string; // high
      l?: string; // low
      d?: string; // diff
      dp?: string | number; // diff percent
      t?: string; // time
      dt?: string; // date time
    }
  >;
}

// TGJU symbol mapping to our physical gold types
const TGJU_KEY_MAP: Record<string, PhysicalGoldType> = {
  geram18: 'gold_18k',
  geram24: 'gold_24k',
  sekee: 'coin_emami',
  sekeb: 'coin_bahar',
  nim: 'coin_half',
  rob: 'coin_quarter',
  gerami: 'coin_gram',
};

// TGJU dollar keys observed in /ajax.json `current` payload.
// `price_dollar_rl` is the most common, but older mirrors use `dollar_rl`
// or plain `dollar` / `price_dollar` — support all of them.
const TGJU_DOLLAR_KEYS = ['price_dollar_rl', 'dollar_rl', 'price_dollar', 'dollar'];

const OFFLINE_RATES_KEY = 'tgju_gold_rates_cache_v1';
const OFFLINE_DOLLAR_RATE_KEY = 'tgju_dollar_rate_cache_v1';

class PhysicalGoldService {
  private cache: Map<PhysicalGoldType, LiveGoldRate> = new Map();
  private lastFetchedAt = 0;
  private readonly cacheTtlMs = 45000; // 45 seconds cache
  private dollarRateTomans = 0;
  private dollarLastFetchedAt = 0;

  constructor() {
    this.loadOfflineCache();
    this.loadOfflineDollarCache();
  }

  private loadOfflineCache(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(OFFLINE_RATES_KEY);
      if (raw) {
        const parsed: Record<string, LiveGoldRate> = JSON.parse(raw);
        Object.entries(parsed).forEach(([key, val]) => {
          this.cache.set(key as PhysicalGoldType, val);
        });
      }
    } catch {
      // Ignore
    }
  }

  private saveOfflineCache(rates: Record<string, LiveGoldRate>): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(OFFLINE_RATES_KEY, JSON.stringify(rates));
    } catch {
      // Ignore
    }
  }

  private loadOfflineDollarCache(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(OFFLINE_DOLLAR_RATE_KEY);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this.dollarRateTomans = parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  private saveOfflineDollarCache(rateTomans: number): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(OFFLINE_DOLLAR_RATE_KEY, String(rateTomans));
    } catch {
      // Ignore
    }
  }

  private getBaseUrl(): string {
    // In native mobile apps (Capacitor Android / iOS), call TGJU directly
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      return 'https://call5.tgju.org';
    }
    // In web browsers (localhost or Vercel), use same-origin proxy
    return '/api/tgju';
  }

  /**
   * Parse TGJU price strings (removes commas, converts Persian digits, and converts Rial to Toman)
   */
  private parseRialPrice(raw?: string): number {
    if (!raw) return 0;
    const clean = toEnglishDigits(raw).replace(/[\s,،]/g, '').trim();
    const rials = parseInt(clean, 10);
    if (isNaN(rials) || rials <= 0) return 0;
    return Math.round(rials / 10); // Convert to Tomans
  }

  /**
   * Extract the USD/IRR (dollar) rate in Tomans from a TGJU `current` payload.
   * Supports `price_dollar_rl`, `dollar_rl`, `price_dollar` and `dollar`
   * keys and reuses parseRialPrice (Rial → Toman).
   */
  private parseDollarFromCurrent(current: NonNullable<TgjuGoldResponse['current']>): number {
    for (const key of TGJU_DOLLAR_KEYS) {
      const item = current[key];
      if (item && item.p) {
        const priceTomans = this.parseRialPrice(item.p);
        if (priceTomans > 0) return priceTomans;
      }
    }
    return 0;
  }

  /**
   * Sync (no-network) accessor for the last known TGJU dollar rate in Tomans.
   * Returns 0 when no rate has been observed yet.
   */
  getCachedDollarRateTomans(): number {
    return this.dollarRateTomans > 0 ? this.dollarRateTomans : 0;
  }

  /**
   * Fetch the live USD/IRR (dollar) rate in Tomans from TGJU /ajax.json.
   * Returns the cached value on failure, or 0 when nothing is known.
   */
  async getDollarRateTomans(): Promise<number> {
    const now = Date.now();
    if (this.dollarRateTomans > 0 && now - this.dollarLastFetchedAt < this.cacheTtlMs) {
      return this.dollarRateTomans;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/ajax.json`, {
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`TGJU HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TgjuGoldResponse = await response.json();
      const dollarRate = this.parseDollarFromCurrent(data.current || {});
      if (dollarRate > 0) {
        this.dollarRateTomans = dollarRate;
        this.dollarLastFetchedAt = Date.now();
        this.saveOfflineDollarCache(dollarRate);
        return dollarRate;
      }
    } catch (error) {
      console.warn('[PhysicalGoldService] Failed to fetch live dollar rate:', error);
    }

    return this.dollarRateTomans > 0 ? this.dollarRateTomans : 0;
  }

  /**
   * Fetch all live physical gold and coin rates
   */
  async fetchLiveRates(): Promise<Record<PhysicalGoldType, LiveGoldRate>> {
    const now = Date.now();
    
    // Return cache if fresh
    if (this.cache.size > 0 && now - this.lastFetchedAt < this.cacheTtlMs) {
      const cachedResult: any = {};
      this.cache.forEach((val, key) => {
        cachedResult[key] = val;
      });
      return cachedResult;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}/ajax.json`;

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
      });

      if (!response.ok) {
        throw new Error(`TGJU HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TgjuGoldResponse = await response.json();
      const current = data.current || {};
      const results: Record<string, LiveGoldRate> = {};

      for (const [tgjuKey, ourType] of Object.entries(TGJU_KEY_MAP)) {
        const item = current[tgjuKey];
        if (item && item.p) {
          const priceTomans = this.parseRialPrice(item.p);
          const rawDp = item.dp ? toEnglishDigits(String(item.dp)).replace(/,/g, '') : '0';
          const changePercent = parseFloat(rawDp) || 0;

          if (priceTomans > 0) {
            const rateObj: LiveGoldRate = {
              id: ourType,
              priceTomans,
              priceRials: priceTomans * 10,
              changePercent,
              updatedAt: item.t || new Date().toLocaleTimeString('fa-IR'),
            };

            results[ourType] = rateObj;
            this.cache.set(ourType, rateObj);
          }
        }
      }

      if (Object.keys(results).length > 0) {
        this.saveOfflineCache(results);
      }

      // Opportunistically refresh the TGJU dollar rate from the same payload
      // so a single /ajax.json round-trip feeds both gold and dollar.
      const dollarRate = this.parseDollarFromCurrent(current);
      if (dollarRate > 0) {
        this.dollarRateTomans = dollarRate;
        this.dollarLastFetchedAt = Date.now();
        this.saveOfflineDollarCache(dollarRate);
      }

      this.lastFetchedAt = Date.now();
      return results as Record<PhysicalGoldType, LiveGoldRate>;
    } catch (error) {
      console.warn('[PhysicalGoldService] Failed to fetch live gold rates:', error);

      // If we have any cached data, return it
      if (this.cache.size > 0) {
        const cachedResult: any = {};
        this.cache.forEach((val, key) => {
          cachedResult[key] = val;
        });
        return cachedResult;
      }

      return {} as Record<PhysicalGoldType, LiveGoldRate>;
    }
  }
}

export const physicalGoldService = new PhysicalGoldService();
