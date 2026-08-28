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

const OFFLINE_RATES_KEY = 'tgju_gold_rates_cache_v1';

class PhysicalGoldService {
  private cache: Map<PhysicalGoldType, LiveGoldRate> = new Map();
  private lastFetchedAt = 0;
  private readonly cacheTtlMs = 45000; // 45 seconds cache

  constructor() {
    this.loadOfflineCache();
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
