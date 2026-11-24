import { useState, useEffect, useCallback, useRef } from 'react';
import { nobitexService } from '../services/nobitex/NobitexService';
import { physicalGoldService } from '../services/goldPrice/PhysicalGoldService';
import { formatToman } from '../utils/formatters';
import { getProfileScopedKey, sanitizeProfileId } from '../utils/storage';
import { redactSecrets } from '../utils/security';

const STORAGE_KEY = 'tarazino_currency_mode_v1';
const LEGACY_STORAGE_KEY = 'investment_app_currency_mode_v1';
const USDT_RATE_STORAGE_KEY = 'tarazino_usdt_rate_v1';
const LEGACY_USDT_RATE_STORAGE_KEY = 'investment_app_usdt_rate_v1';
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
  refreshUsdtRate: (signal?: AbortSignal) => Promise<void>;
}

function readModeForProfile(profileId?: string | null): CurrencyDisplayMode {
  try {
    const cleanId = sanitizeProfileId(profileId);
    const scopedKey = getProfileScopedKey(STORAGE_KEY, cleanId);
    const saved = localStorage.getItem(scopedKey) || (!cleanId ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    return saved === 'usd' ? 'usd' : 'toman';
  } catch {
    return 'toman';
  }
}

export function useCurrencyDisplay(profileId?: string | null): UseCurrencyDisplayReturn {
  const activeProfileRef = useRef<string | null>(sanitizeProfileId(profileId));
  const [currencyMode, setCurrencyModeState] = useState<CurrencyDisplayMode>(() =>
    readModeForProfile(profileId)
  );

  // Re-key synchronously when active profile switches so currency display mode never bleeds across users
  useEffect(() => {
    const nextProfileId = sanitizeProfileId(profileId);
    if (activeProfileRef.current !== nextProfileId) {
      activeProfileRef.current = nextProfileId;
      setCurrencyModeState(readModeForProfile(nextProfileId));
    }
  }, [profileId]);

  const [usdtRateTomans, setUsdtRateTomans] = useState<number>(() => {
    try {
      const savedRate =
        localStorage.getItem(USDT_RATE_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_USDT_RATE_STORAGE_KEY);
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
  const rateReqSeqRef = useRef<number>(0);

  const refreshUsdtRate = useCallback(async (signal?: AbortSignal) => {
    const seq = ++rateReqSeqRef.current;
    setIsFetchingRate(true);
    try {
      // 1. Prefer TGJU dollar so «نرخ روز» matches DollarHoldingCard's source.
      try {
        const tgjuDollarTomans = await physicalGoldService.getDollarRateTomans(signal);
        if (signal?.aborted || seq !== rateReqSeqRef.current) return;
        if (tgjuDollarTomans > 0) {
          setUsdtRateTomans(tgjuDollarTomans);
          try {
            localStorage.setItem(USDT_RATE_STORAGE_KEY, String(tgjuDollarTomans));
          } catch {
            // Ignore
          }
          return;
        }
      } catch {
        if (signal?.aborted || seq !== rateReqSeqRef.current) return;
      }

      // 2. Fallback: Nobitex usdt-rls.
      const stats = await nobitexService.getMarketStats([], 'rls', signal);
      if (signal?.aborted || seq !== rateReqSeqRef.current) return;
      const usdtStat = stats['usdt-rls'];
      if (usdtStat && usdtStat.latest) {
        const rawRials = parseFloat(usdtStat.latest);
        if (Number.isFinite(rawRials) && rawRials > 0) {
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
      if ((e as { name?: string })?.name !== 'AbortError') {
        console.warn('[useCurrencyDisplay] Could not fetch live USDT rate:', redactSecrets(e));
      }
    } finally {
      if (seq === rateReqSeqRef.current) {
        setIsFetchingRate(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refreshUsdtRate(controller.signal);
    return () => controller.abort();
  }, [refreshUsdtRate]);

  const setCurrencyMode = useCallback(
    (mode: CurrencyDisplayMode) => {
      const targetProfile = sanitizeProfileId(profileId);
      setCurrencyModeState(mode);
      try {
        localStorage.setItem(getProfileScopedKey(STORAGE_KEY, targetProfile), mode);
      } catch (e) {
        console.error('Failed to save currency display mode:', redactSecrets(e));
      }
    },
    [profileId]
  );

  const toggleCurrencyMode = useCallback(() => {
    setCurrencyMode(currencyMode === 'toman' ? 'usd' : 'toman');
  }, [currencyMode, setCurrencyMode]);

  const toDisplayValue = useCallback(
    (amountInTomans: number | null | undefined): number => {
      if (
        amountInTomans === null ||
        amountInTomans === undefined ||
        isNaN(amountInTomans) ||
        !isFinite(amountInTomans)
      ) {
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

      if (
        amountInTomans === null ||
        amountInTomans === undefined ||
        isNaN(amountInTomans) ||
        !isFinite(amountInTomans)
      ) {
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
