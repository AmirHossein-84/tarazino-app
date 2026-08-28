import { useState, useEffect, useCallback } from 'react';
import { nobitexService } from '../services/nobitex/NobitexService';
import { formatToman } from '../utils/formatters';

const STORAGE_KEY = 'investment_app_currency_mode_v1';
const USDT_RATE_STORAGE_KEY = 'investment_app_usdt_rate_v1';
const DEFAULT_USDT_RATE_TOMANS = 93000;

export type CurrencyDisplayMode = 'toman' | 'usd';

export interface FormatCurrencyOptions {
  showUnit?: boolean;
  isUnitPrice?: boolean;
  isTomanSuffix?: boolean; // Use 'ت' instead of 'تومان'
}

export interface UseCurrencyDisplayReturn {
  currencyMode: CurrencyDisplayMode;
  usdtRateTomans: number;
  isFetchingRate: boolean;
  toggleCurrencyMode: () => void;
  setCurrencyMode: (mode: CurrencyDisplayMode) => void;
  formatCurrency: (amountInTomans: number | null | undefined, options?: FormatCurrencyOptions | boolean) => string;
  toDisplayValue: (amountInTomans: number | null | undefined) => number;
  currencyUnitLabel: string;
  refreshUsdtRate: () => Promise<void>;
}

export function useCurrencyDisplay(): UseCurrencyDisplayReturn {
  const [currencyMode, setCurrencyModeState] = useState<CurrencyDisplayMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'usd' ? 'usd' : 'toman';
    } catch {
      return 'toman';
    }
  });

  const [usdtRateTomans, setUsdtRateTomans] = useState<number>(() => {
    try {
      const savedRate = localStorage.getItem(USDT_RATE_STORAGE_KEY);
      if (savedRate) {
        const parsed = parseInt(savedRate, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_USDT_RATE_TOMANS;
  });

  const [isFetchingRate, setIsFetchingRate] = useState<boolean>(false);

  const refreshUsdtRate = useCallback(async () => {
    setIsFetchingRate(true);
    try {
      const stats = await nobitexService.getMarketStats([], 'rls');
      const usdtStat = stats['usdt-rls'];
      if (usdtStat && usdtStat.latest) {
        const rawRials = parseFloat(usdtStat.latest);
        if (!isNaN(rawRials) && rawRials > 0) {
          const rate = Math.round(rawRials / 10);
          setUsdtRateTomans(rate);
          try {
            localStorage.setItem(USDT_RATE_STORAGE_KEY, String(rate));
          } catch {
            // Ignore
          }
        }
      }
    } catch (e) {
      console.warn('[useCurrencyDisplay] Could not fetch live USDT rate:', e);
    } finally {
      setIsFetchingRate(false);
    }
  }, []);

  useEffect(() => {
    refreshUsdtRate();
  }, [refreshUsdtRate]);

  const setCurrencyMode = useCallback((mode: CurrencyDisplayMode) => {
    setCurrencyModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      console.error('Failed to save currency display mode:', e);
    }
  }, []);

  const toggleCurrencyMode = useCallback(() => {
    setCurrencyMode(currencyMode === 'toman' ? 'usd' : 'toman');
  }, [currencyMode, setCurrencyMode]);

  const toDisplayValue = useCallback(
    (amountInTomans: number | null | undefined): number => {
      if (amountInTomans === null || amountInTomans === undefined || isNaN(amountInTomans) || !isFinite(amountInTomans)) {
        return 0;
      }
      if (currencyMode === 'usd') {
        const rate = usdtRateTomans > 0 ? usdtRateTomans : DEFAULT_USDT_RATE_TOMANS;
        return Number((amountInTomans / rate).toFixed(2));
      }
      return amountInTomans;
    },
    [currencyMode, usdtRateTomans]
  );

  const formatCurrency = useCallback(
    (
      amountInTomans: number | null | undefined,
      optionsOrShowUnit?: FormatCurrencyOptions | boolean
    ): string => {
      const opts: FormatCurrencyOptions =
        typeof optionsOrShowUnit === 'boolean'
          ? { showUnit: optionsOrShowUnit }
          : optionsOrShowUnit || { showUnit: true };

      const showUnit = opts.showUnit !== false;

      if (amountInTomans === null || amountInTomans === undefined || isNaN(amountInTomans) || !isFinite(amountInTomans)) {
        return showUnit ? (currencyMode === 'usd' ? '$ 0.00' : '0 تومان') : '0';
      }

      if (currencyMode === 'usd') {
        const rate = usdtRateTomans > 0 ? usdtRateTomans : DEFAULT_USDT_RATE_TOMANS;
        const usdValue = amountInTomans / rate;

        let formatted: string;
        if (opts.isUnitPrice && usdValue > 0 && usdValue < 1) {
          formatted = usdValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          });
        } else {
          formatted = usdValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }

        return showUnit ? `$ ${formatted}` : formatted;
      }

      const tomanFormatted = formatToman(amountInTomans);
      if (!showUnit) return tomanFormatted;
      return opts.isTomanSuffix ? `${tomanFormatted} ت` : `${tomanFormatted} تومان`;
    },
    [currencyMode, usdtRateTomans]
  );

  const currencyUnitLabel = currencyMode === 'usd' ? '$ (تتر)' : 'تومان';

  return {
    currencyMode,
    usdtRateTomans,
    isFetchingRate,
    toggleCurrencyMode,
    setCurrencyMode,
    formatCurrency,
    toDisplayValue,
    currencyUnitLabel,
    refreshUsdtRate,
  };
}
