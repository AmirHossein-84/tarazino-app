import { useState, useCallback, useEffect, useRef } from 'react';
import { CryptoAsset } from '../types/investment';
import { NobitexProfile, NobitexConfig } from '../services/nobitex/types';
import { nobitexService } from '../services/nobitex';
import {
  getActiveStorageProfileId,
  loadNobitexConfig,
  saveNobitexConfig,
  sanitizeProfileId,
} from '../utils/storage';
import { redactSecrets } from '../utils/security';

const EMPTY_CONFIG: NobitexConfig = {
  authType: 'api_key',
  publicKey: '',
  secretKey: '',
  token: '',
  autoSyncEnabled: false,
  lastSyncedAt: undefined,
};

function readNormalizedConfig(profileId?: string | null): NobitexConfig {
  const loaded = loadNobitexConfig(profileId);
  return {
    authType: loaded.authType || 'api_key',
    publicKey: loaded.publicKey || (loaded as { apiKey?: string }).apiKey || '',
    secretKey: loaded.secretKey || '',
    token: loaded.token || '',
    autoSyncEnabled: loaded.autoSyncEnabled ?? true,
    lastSyncedAt: loaded.lastSyncedAt,
  };
}

export function useNobitex(profileId?: string | null) {
  const resolvedProfileId =
    profileId !== undefined ? sanitizeProfileId(profileId) : getActiveStorageProfileId();
  const activeProfileRef = useRef<string | null>(resolvedProfileId);
  const requestGenRef = useRef<number>(0);
  const syncAbortRef = useRef<AbortController | null>(null);

  const [config, setConfig] = useState<NobitexConfig>(() =>
    readNormalizedConfig(resolvedProfileId)
  );
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(resolvedProfileId);
  const [profile, setProfile] = useState<NobitexProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tomanCashBalance, setTomanCashBalance] = useState<number>(0);
  const [syncedCoinsCount, setSyncedCoinsCount] = useState<number>(0);
  const [syncedTradesCount, setSyncedTradesCount] = useState<number>(0);

  const resetForProfile = useCallback((nextId: string | null) => {
    syncAbortRef.current?.abort();
    syncAbortRef.current = null;
    requestGenRef.current += 1;
    activeProfileRef.current = nextId;

    setConfig(readNormalizedConfig(nextId));
    setLoadedProfileId(nextId);
    setProfile(null);
    setIsSyncing(false);
    setError(null);
    setTomanCashBalance(0);
    setSyncedCoinsCount(0);
    setSyncedTradesCount(0);
  }, []);

  // Immediately reset runtime state & abort any in-flight requests when switching profiles
  useEffect(() => {
    if (activeProfileRef.current !== resolvedProfileId) {
      resetForProfile(resolvedProfileId);
    }
  }, [resolvedProfileId, resetForProfile]);

  // Also follow global active-profile transitions in un-propped hook instances (e.g. CryptoMarketView, NobitexIntegrationCard)
  useEffect(() => {
    const handleProfileChange = (evt: Event) => {
      const nextId = sanitizeProfileId(
        (evt as CustomEvent<{ profileId?: string | null }>).detail?.profileId ??
          getActiveStorageProfileId()
      );
      if (activeProfileRef.current !== nextId) {
        resetForProfile(nextId);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('tarazino_active_profile_changed', handleProfileChange);
      return () =>
        window.removeEventListener('tarazino_active_profile_changed', handleProfileChange);
    }
  }, [resetForProfile]);

  useEffect(() => {
    return () => {
      syncAbortRef.current?.abort();
    };
  }, []);

  const isConfigured = Boolean(
    (config.authType === 'api_key' && config.publicKey?.trim() && config.secretKey?.trim()) ||
      (config.authType === 'token' && config.token?.trim())
  );

  // Synchronize config when active profile's config event fires
  useEffect(() => {
    const handleSyncConfig = () => {
      const targetId = activeProfileRef.current;
      setConfig(readNormalizedConfig(targetId));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('nobitex_config_updated', handleSyncConfig);
      return () => window.removeEventListener('nobitex_config_updated', handleSyncConfig);
    }
  }, []);

  const saveConfig = useCallback((newConfig: NobitexConfig, expectedProfileId?: string | null) => {
    const targetId =
      expectedProfileId !== undefined ? sanitizeProfileId(expectedProfileId) : activeProfileRef.current;
    activeProfileRef.current = targetId;
    setConfig(newConfig);
    setLoadedProfileId(targetId);
    saveNobitexConfig(newConfig, targetId);
    setError(null);
  }, []);

  const removeConfig = useCallback(() => {
    const targetId = activeProfileRef.current;
    syncAbortRef.current?.abort();
    requestGenRef.current += 1;
    const cleared: NobitexConfig = { ...EMPTY_CONFIG };
    setConfig(cleared);
    saveNobitexConfig(cleared, targetId);
    nobitexService.clearCachedBuyPrices(targetId);
    setProfile(null);
    setIsSyncing(false);
    setTomanCashBalance(0);
    setSyncedCoinsCount(0);
    setSyncedTradesCount(0);
    setError(null);
  }, []);

  /**
   * Sync User Wallets & Live Crypto Market Prices with strict profile & abort guards
   */
  const syncWithNobitex = useCallback(
    async (
      currentAssets: CryptoAsset[],
      onAssetsUpdated: (updatedAssets: CryptoAsset[]) => void,
      overrideConfig?: NobitexConfig
    ): Promise<boolean> => {
      const activeConfig = overrideConfig || config;

      if (
        activeConfig.authType === 'api_key' &&
        (!activeConfig.publicKey?.trim() || !activeConfig.secretKey?.trim())
      ) {
        setError('لطفاً کلید عمومی و کلید خصوصی نوبیتکس خود را وارد کنید.');
        return false;
      }

      if (activeConfig.authType === 'token' && !activeConfig.token?.trim()) {
        setError('لطفاً توکن ورود نوبیتکس را وارد کنید.');
        return false;
      }

      syncAbortRef.current?.abort();
      const controller = new AbortController();
      syncAbortRef.current = controller;
      const gen = ++requestGenRef.current;
      const startedProfileId = activeProfileRef.current;

      setIsSyncing(true);
      setError(null);

      try {
        const result = await nobitexService.syncUserCryptoHoldings(activeConfig, currentAssets, {
          profileId: startedProfileId,
          signal: controller.signal,
        });

        // Guard against profile switch or newer sync superseding this response
        if (
          controller.signal.aborted ||
          gen !== requestGenRef.current ||
          activeProfileRef.current !== startedProfileId
        ) {
          return false;
        }

        onAssetsUpdated(result.updatedAssets);
        setTomanCashBalance(result.tomanBalance);
        setSyncedCoinsCount(result.syncedCount);
        setSyncedTradesCount(result.tradesCount || 0);
        if (result.profile) {
          setProfile(result.profile);
        }

        const updatedConfig: NobitexConfig = {
          ...activeConfig,
          lastSyncedAt: Date.now(),
        };
        setConfig(updatedConfig);
        saveNobitexConfig(updatedConfig, startedProfileId);

        // Background non-blocking profile info fetch (guarded cleanly)
        nobitexService
          .getProfile(activeConfig, controller.signal)
          .then((prof) => {
            if (
              controller.signal.aborted ||
              gen !== requestGenRef.current ||
              activeProfileRef.current !== startedProfileId
            ) {
              return;
            }
            if (prof) setProfile(prof);
          })
          .catch(() => {
            // Silently ignore profile metadata error
          });

        return true;
      } catch (e) {
        if (
          controller.signal.aborted ||
          (e as { name?: string })?.name === 'AbortError' ||
          activeProfileRef.current !== startedProfileId
        ) {
          return false;
        }
        const msg = redactSecrets(
          e instanceof Error ? e.message : 'خطا در همگام‌سازی با صرافی نوبیتکس',
          [activeConfig.secretKey || '', activeConfig.token || '']
        );
        setError(msg);
        return false;
      } finally {
        if (gen === requestGenRef.current && activeProfileRef.current === startedProfileId) {
          setIsSyncing(false);
        }
      }
    },
    [config]
  );

  /**
   * Public Market Price Refresh (Works even without API Keys)
   */
  const refreshCryptoPrices = useCallback(
    async (
      currentAssets: CryptoAsset[],
      onAssetsUpdated: (updatedAssets: CryptoAsset[]) => void,
      signal?: AbortSignal
    ) => {
      if (currentAssets.length === 0) return;
      const startedProfileId = activeProfileRef.current;
      const gen = requestGenRef.current;
      try {
        const symbols = currentAssets.map((a) => a.symbol.toLowerCase());
        const stats = await nobitexService.getMarketStats(symbols, 'rls', signal);

        if (
          signal?.aborted ||
          gen !== requestGenRef.current ||
          activeProfileRef.current !== startedProfileId
        ) {
          return;
        }

        const updated = currentAssets.map((asset) => {
          const sym = asset.symbol.toLowerCase();
          const stat = stats[`${sym}-rls`];
          if (stat && stat.latest) {
            const rawRials = parseFloat(stat.latest);
            if (!Number.isFinite(rawRials) || rawRials <= 0) return asset;
            const priceTomans = Math.round(rawRials / 10);
            const holdingVal =
              asset.currentAmount !== undefined
                ? Math.round(asset.currentAmount * priceTomans)
                : asset.currentHoldingValue;

            return {
              ...asset,
              unitPrice: priceTomans,
              currentHoldingValue: holdingVal,
            };
          }
          return asset;
        });

        onAssetsUpdated(updated);
      } catch (e) {
        if ((e as { name?: string })?.name !== 'AbortError') {
          console.warn('[Nobitex Hook] Market stats refresh failed:', redactSecrets(e));
        }
      }
    },
    []
  );

  return {
    config,
    loadedProfileId,
    isConfigured,
    isSyncing,
    lastSyncedAt: config.lastSyncedAt,
    profile,
    error,
    tomanCashBalance,
    syncedCoinsCount,
    syncedTradesCount,
    saveConfig,
    removeConfig,
    syncWithNobitex,
    refreshCryptoPrices,
  };
}
