import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ProfilesVault } from '../types/investment';
import {
  readDeviceVault,
  writeDeviceVault,
  debouncedSaveDeviceVault,
  flushDeviceVault,
} from '../utils/deviceVault';
import {
  clearProfileStorageNamespace,
  setActiveStorageProfileId,
  saveSettings,
  saveCryptoAssets,
  saveGoldHolding,
  savePhysicalGold,
  saveProperties,
  saveVehicles,
  saveDollarHolding,
  saveGoldBuyLots,
  savePhysicalGoldSales,
  saveTransactions,
  saveMarketInstruments,
  saveMarketHoldings,
  saveNobitexConfig,
  saveLastInput,
} from '../utils/storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_CRYPTO_ASSETS,
  DEFAULT_GOLD_HOLDING,
  DEFAULT_PHYSICAL_GOLD_ITEMS,
  DEFAULT_DOLLAR_HOLDING,
} from '../constants/defaultData';
import { nobitexService } from '../services/nobitex/NobitexService';
import { sanitizePlainData } from '../utils/security';

const AVATAR_COLORS = [
  '#F59E0B', // Amber Gold
  '#3B82F6', // Royal Blue
  '#10B981', // Emerald Green
  '#8B5CF6', // Violet Purple
  '#EC4899', // Rose Pink
  '#06B6D4', // Cyan Teal
];

function deepClone<T>(val: T): T {
  if (val === undefined) return val;
  return sanitizePlainData(JSON.parse(JSON.stringify(val))) as T;
}

export function createEmptyProfile(name: string, color?: string): UserProfile {
  return {
    id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'حساب من',
    avatarColor: color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: deepClone(DEFAULT_SETTINGS),
    cryptoAssets: deepClone(DEFAULT_CRYPTO_ASSETS),
    goldHolding: deepClone(DEFAULT_GOLD_HOLDING),
    physicalGold: deepClone(DEFAULT_PHYSICAL_GOLD_ITEMS),
    properties: [],
    vehicles: [],
    dollarHolding: deepClone(DEFAULT_DOLLAR_HOLDING),
    goldBuyLots: [],
    physicalGoldSales: [],
    transactions: [],
    marketInstruments: [],
    marketHoldings: [],
    nobitexConfig: {
      authType: 'api_key',
      publicKey: '',
      secretKey: '',
      token: '',
      autoSyncEnabled: false,
    },
    lastInput: 0,
  };
}

function seedScopedStorageFromProfile(profile: UserProfile): void {
  const pid = profile.id;
  clearProfileStorageNamespace(pid);
  saveSettings(deepClone(profile.settings || DEFAULT_SETTINGS), pid);
  saveCryptoAssets(deepClone(profile.cryptoAssets || DEFAULT_CRYPTO_ASSETS), pid);
  saveGoldHolding(deepClone(profile.goldHolding || DEFAULT_GOLD_HOLDING), pid);
  savePhysicalGold(deepClone(profile.physicalGold || DEFAULT_PHYSICAL_GOLD_ITEMS), pid);
  saveProperties(deepClone(profile.properties || []), pid);
  saveVehicles(deepClone(profile.vehicles || []), pid);
  saveDollarHolding(deepClone(profile.dollarHolding || DEFAULT_DOLLAR_HOLDING), pid);
  saveGoldBuyLots(deepClone(profile.goldBuyLots || []), pid);
  savePhysicalGoldSales(deepClone(profile.physicalGoldSales || []), pid);
  saveTransactions(deepClone(profile.transactions || []), pid);
  saveMarketInstruments(deepClone(profile.marketInstruments || []), pid);
  saveMarketHoldings(deepClone(profile.marketHoldings || []), pid);
  if (profile.nobitexConfig) {
    saveNobitexConfig(deepClone(profile.nobitexConfig), pid);
  } else {
    saveNobitexConfig(
      { authType: 'api_key', publicKey: '', secretKey: '', token: '', autoSyncEnabled: false },
      pid
    );
  }
  if (profile.lastInput !== undefined) {
    saveLastInput(profile.lastInput, pid);
  }
}

export function useProfileState() {
  const [vault, setVault] = useState<ProfilesVault | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState<boolean>(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [profileSwitchEpoch, setProfileSwitchEpoch] = useState<number>(0);

  const vaultRef = useRef<ProfilesVault | null>(null);
  const activeProfileIdRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  // Persist vault synchronously into ref + React state + device storage
  const commitVault = useCallback(
    (updater: ProfilesVault | ((prev: ProfilesVault | null) => ProfilesVault | null), immediate = false) => {
      const next = typeof updater === 'function' ? updater(vaultRef.current) : updater;
      if (!next) return null;
      vaultRef.current = next;
      setVault(next);
      if (immediate) {
        void writeDeviceVault(next);
      } else {
        debouncedSaveDeviceVault(next);
      }
      return next;
    },
    []
  );

  // Initialize vault on startup: auto-restore active/primary profile cleanly, NEVER force multi-user picker
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const urlParams =
          typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const forceOnboarding =
          urlParams?.has('onboarding') ||
          urlParams?.has('new_user') ||
          urlParams?.get('test') === 'onboarding';

        const loadedVault = await readDeviceVault();
        if (cancelled) return;

        if (loadedVault && Array.isArray(loadedVault.profiles) && loadedVault.profiles.length > 0) {
          const validSavedActive = loadedVault.activeProfileId
            ? loadedVault.profiles.some((p) => p.id === loadedVault.activeProfileId)
            : false;
          const targetId = validSavedActive
            ? loadedVault.activeProfileId!
            : loadedVault.profiles[0].id;

          let normalizedVault = loadedVault;
          if (!validSavedActive || !loadedVault.hasCompletedOnboarding) {
            normalizedVault = {
              ...loadedVault,
              activeProfileId: targetId,
              hasCompletedOnboarding: true,
              lastUpdated: new Date().toISOString(),
            };
            void writeDeviceVault(normalizedVault);
          }

          setActiveStorageProfileId(targetId);
          vaultRef.current = normalizedVault;
          activeProfileIdRef.current = targetId;
          setVault(normalizedVault);
          setActiveProfileId(targetId);
          // Bug 2 Fix: NEVER force profile picker on startup
          setShowProfileSwitcher(false);
          setNeedsOnboarding(Boolean(forceOnboarding));
        } else {
          // Genuine first-ever launch with no valid profiles
          setActiveStorageProfileId(null);
          vaultRef.current = null;
          activeProfileIdRef.current = '';
          setShowProfileSwitcher(false);
          setNeedsOnboarding(true);
        }
      } catch (e) {
        console.error('Failed to initialize device vault:', e);
        if (!cancelled) {
          setShowProfileSwitcher(false);
          setNeedsOnboarding(true);
        }
      } finally {
        if (!cancelled) {
          isInitializedRef.current = true;
          setIsLoading(false);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeProfile: UserProfile | null =
    vault && activeProfileId
      ? vault.profiles.find((p) => p.id === activeProfileId) || null
      : null;

  // Switch active profile cleanly with pending save flush + namespace re-key
  const switchProfile = useCallback(
    (profileId: string) => {
      const currentVault = vaultRef.current;
      if (!currentVault) return;
      const target = currentVault.profiles.find((p) => p.id === profileId);
      if (!target) return;

      void flushDeviceVault();
      setActiveStorageProfileId(profileId);
      activeProfileIdRef.current = profileId;
      setActiveProfileId(profileId);
      setProfileSwitchEpoch((e) => e + 1);
      setShowProfileSwitcher(false);

      commitVault(
        (prev) =>
          prev
            ? {
                ...prev,
                activeProfileId: profileId,
                lastUpdated: new Date().toISOString(),
              }
            : null,
        true
      );
    },
    [commitVault]
  );

  // Create a new strictly isolated profile
  const createProfile = useCallback(
    (name: string, colorOrInitialData?: string | Partial<UserProfile>): UserProfile => {
      void flushDeviceVault();

      const initialData: Partial<UserProfile> =
        typeof colorOrInitialData === 'string'
          ? { avatarColor: colorOrInitialData }
          : colorOrInitialData || {};

      const base = createEmptyProfile(
        name,
        typeof colorOrInitialData === 'string' ? colorOrInitialData : initialData.avatarColor
      );

      const newProfile: UserProfile = {
        ...base,
        ...deepClone(initialData),
        id: base.id,
        name: (name || base.name).trim() || 'حساب من',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: initialData.settings ? deepClone(initialData.settings) : base.settings,
        cryptoAssets: initialData.cryptoAssets
          ? deepClone(initialData.cryptoAssets)
          : base.cryptoAssets,
        goldHolding: initialData.goldHolding
          ? deepClone(initialData.goldHolding)
          : base.goldHolding,
        physicalGold: initialData.physicalGold
          ? deepClone(initialData.physicalGold)
          : base.physicalGold,
        properties: initialData.properties ? deepClone(initialData.properties) : [],
        vehicles: initialData.vehicles ? deepClone(initialData.vehicles) : [],
        dollarHolding: initialData.dollarHolding
          ? deepClone(initialData.dollarHolding)
          : base.dollarHolding,
        goldBuyLots: initialData.goldBuyLots ? deepClone(initialData.goldBuyLots) : [],
        physicalGoldSales: initialData.physicalGoldSales
          ? deepClone(initialData.physicalGoldSales)
          : [],
        transactions: initialData.transactions ? deepClone(initialData.transactions) : [],
        marketInstruments: initialData.marketInstruments
          ? deepClone(initialData.marketInstruments)
          : [],
        marketHoldings: initialData.marketHoldings
          ? deepClone(initialData.marketHoldings)
          : [],
        nobitexConfig: initialData.nobitexConfig
          ? deepClone(initialData.nobitexConfig)
          : base.nobitexConfig,
        lastInput: initialData.lastInput ?? 0,
      };

      // Initialize strict profile-scoped storage namespace for the new user
      setActiveStorageProfileId(newProfile.id);
      seedScopedStorageFromProfile(newProfile);

      activeProfileIdRef.current = newProfile.id;
      setActiveProfileId(newProfile.id);
      setProfileSwitchEpoch((e) => e + 1);
      setShowProfileSwitcher(false);
      setNeedsOnboarding(false);

      commitVault(
        (prev) => ({
          version: prev?.version || '1.0.0',
          activeProfileId: newProfile.id,
          hasCompletedOnboarding: true,
          profiles: [...(prev?.profiles || []), newProfile],
          lastUpdated: new Date().toISOString(),
        }),
        true
      );

      return newProfile;
    },
    [commitVault]
  );

  const startNewUserOnboarding = useCallback(() => {
    setShowProfileSwitcher(false);
    setNeedsOnboarding(true);
  }, []);

  const completeOnboarding = useCallback(
    (profileName: string, initialData?: Partial<UserProfile>) => {
      const newProfile = createProfile(profileName || 'حساب کاربری', initialData);
      setNeedsOnboarding(false);
      setShowProfileSwitcher(false);

      if (typeof window !== 'undefined' && window.history?.replaceState) {
        try {
          const url = new URL(window.location.href);
          if (
            url.searchParams.has('onboarding') ||
            url.searchParams.has('new_user') ||
            url.searchParams.has('test')
          ) {
            url.searchParams.delete('onboarding');
            url.searchParams.delete('new_user');
            url.searchParams.delete('test');
            window.history.replaceState(
              {},
              '',
              url.pathname + (url.search ? '?' + url.search : '')
            );
          }
        } catch {
          // ignore
        }
      }

      return newProfile;
    },
    [createProfile]
  );

  const canCancelOnboarding = Boolean(vault && vault.profiles && vault.profiles.length > 0);

  const cancelOnboarding = useCallback(() => {
    const currentVault = vaultRef.current;
    if (!currentVault || !currentVault.profiles || currentVault.profiles.length === 0) return;
    setNeedsOnboarding(false);
    setShowProfileSwitcher(false);

    if (!activeProfileIdRef.current || !currentVault.profiles.some((p) => p.id === activeProfileIdRef.current)) {
      const fallbackId = currentVault.profiles[0].id;
      setActiveStorageProfileId(fallbackId);
      activeProfileIdRef.current = fallbackId;
      setActiveProfileId(fallbackId);
    }

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        if (
          url.searchParams.has('onboarding') ||
          url.searchParams.has('new_user') ||
          url.searchParams.has('test')
        ) {
          url.searchParams.delete('onboarding');
          url.searchParams.delete('new_user');
          url.searchParams.delete('test');
          window.history.replaceState(
            {},
            '',
            url.pathname + (url.search ? '?' + url.search : '')
          );
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Safely update a specific (or current active) profile without stale closures
  const updateActiveProfileData = useCallback(
    (updates: Partial<UserProfile>, targetProfileId?: string) => {
      const targetId = targetProfileId || activeProfileIdRef.current;
      if (!targetId || !vaultRef.current) return;

      const cleanUpdates = deepClone(updates);
      commitVault((prev) => {
        if (!prev) return null;
        const found = prev.profiles.some((p) => p.id === targetId);
        if (!found) return prev;
        return {
          ...prev,
          profiles: prev.profiles.map((p) =>
            p.id === targetId
              ? {
                  ...p,
                  ...cleanUpdates,
                  id: p.id,
                  updatedAt: Date.now(),
                }
              : p
          ),
          lastUpdated: new Date().toISOString(),
        };
      }, false);
    },
    [commitVault]
  );

  // Delete profile — clears its isolated namespace and falls back safely if active
  const deleteProfile = useCallback(
    (profileId: string): boolean => {
      const currentVault = vaultRef.current;
      if (!currentVault || currentVault.profiles.length <= 1) {
        return false;
      }

      const exists = currentVault.profiles.some((p) => p.id === profileId);
      if (!exists) return false;

      clearProfileStorageNamespace(profileId);
      nobitexService.clearCachedBuyPrices(profileId);

      const updatedProfiles = currentVault.profiles.filter((p) => p.id !== profileId);
      const deletingActive = activeProfileIdRef.current === profileId;
      const nextActiveId = deletingActive ? updatedProfiles[0].id : activeProfileIdRef.current;

      if (deletingActive) {
        setActiveStorageProfileId(nextActiveId);
        activeProfileIdRef.current = nextActiveId;
        setActiveProfileId(nextActiveId);
        setProfileSwitchEpoch((e) => e + 1);
      }

      commitVault(
        (prev) =>
          prev
            ? {
                ...prev,
                activeProfileId: nextActiveId,
                profiles: prev.profiles.filter((p) => p.id !== profileId),
                lastUpdated: new Date().toISOString(),
              }
            : null,
        true
      );

      return true;
    },
    [commitVault]
  );

  return {
    vault,
    activeProfile,
    activeProfileId,
    profileSwitchEpoch,
    isLoading,
    needsOnboarding,
    showProfileSwitcher,
    setShowProfileSwitcher,
    switchProfile,
    createProfile,
    completeOnboarding,
    startNewUserOnboarding,
    canCancelOnboarding,
    cancelOnboarding,
    updateActiveProfileData,
    deleteProfile,
  };
}
