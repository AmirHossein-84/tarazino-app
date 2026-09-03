import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ProfilesVault } from '../types/investment';
import { readDeviceVault, writeDeviceVault, debouncedSaveDeviceVault } from '../utils/deviceVault';
import { DEFAULT_SETTINGS, DEFAULT_CRYPTO_ASSETS, DEFAULT_GOLD_HOLDING, DEFAULT_PHYSICAL_GOLD_ITEMS, DEFAULT_DOLLAR_HOLDING } from '../constants/defaultData';

const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#eab308', // gold/amber
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#06b6d4', // cyan
];

function createEmptyProfile(name: string, color?: string): UserProfile {
  return {
    id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'حساب من',
    avatarColor: color || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: DEFAULT_SETTINGS,
    cryptoAssets: DEFAULT_CRYPTO_ASSETS,
    goldHolding: DEFAULT_GOLD_HOLDING,
    physicalGold: DEFAULT_PHYSICAL_GOLD_ITEMS,
    properties: [],
    vehicles: [],
    dollarHolding: DEFAULT_DOLLAR_HOLDING,
    stocks: [],
    goldBuyLots: [],
    physicalGoldSales: [],
    transactions: [],
    marketInstruments: [],
    marketHoldings: [],
  };
}

export function useProfileState() {
  const [vault, setVault] = useState<ProfilesVault | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState<boolean>(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);

  const isInitializedRef = useRef(false);

  // Initialize vault on startup
  useEffect(() => {
    async function init() {
      try {
        const loadedVault = await readDeviceVault();
        if (loadedVault && loadedVault.profiles && loadedVault.profiles.length > 0) {
          setVault(loadedVault);

          // If only 1 user exists: automatically select it with zero friction
          if (loadedVault.profiles.length === 1) {
            setActiveProfileId(loadedVault.profiles[0].id);
            setShowProfileSwitcher(false);
          } else {
            // If multiple users exist:
            // Check if activeProfileId is valid; if so, default to it, but also allow switcher
            const targetId = loadedVault.activeProfileId || loadedVault.profiles[0].id;
            setActiveProfileId(targetId);
            // Show switcher if multiple profiles exist on fresh startup
            setShowProfileSwitcher(true);
          }

          setNeedsOnboarding(!loadedVault.hasCompletedOnboarding);
        } else {
          // No vault on device: First time installation
          setNeedsOnboarding(true);
        }
      } catch (e) {
        console.error('Error initializing device vault:', e);
        setNeedsOnboarding(true);
      } finally {
        setIsLoading(false);
        isInitializedRef.current = true;
      }
    }

    init();
  }, []);

  const activeProfile = vault?.profiles.find((p) => p.id === activeProfileId) || vault?.profiles[0] || null;

  // Persist changes to vault
  const saveVault = useCallback((newVault: ProfilesVault, immediate = false) => {
    setVault(newVault);
    if (immediate) {
      writeDeviceVault(newVault);
    } else {
      debouncedSaveDeviceVault(newVault);
    }
  }, []);

  // Switch active profile
  const switchProfile = useCallback(
    (profileId: string) => {
      if (!vault) return;
      const target = vault.profiles.find((p) => p.id === profileId);
      if (target) {
        setActiveProfileId(profileId);
        const updatedVault: ProfilesVault = {
          ...vault,
          activeProfileId: profileId,
          lastUpdated: new Date().toISOString(),
        };
        saveVault(updatedVault, true);
        setShowProfileSwitcher(false);
      }
    },
    [vault, saveVault]
  );

  // Create a new profile
  const createProfile = useCallback(
    (name: string, colorOrInitialData?: string | Partial<UserProfile>): UserProfile => {
      const initialData: Partial<UserProfile> =
        typeof colorOrInitialData === 'string'
          ? { avatarColor: colorOrInitialData }
          : (colorOrInitialData || {});

      const newProfile: UserProfile = {
        ...createEmptyProfile(name, typeof colorOrInitialData === 'string' ? colorOrInitialData : initialData.avatarColor),
        ...initialData,
      };

      const existingProfiles = vault?.profiles || [];
      const updatedProfiles = [...existingProfiles, newProfile];

      const newVault: ProfilesVault = {
        version: '2.1.0',
        activeProfileId: newProfile.id,
        profiles: updatedProfiles,
        hasCompletedOnboarding: true,
        lastUpdated: new Date().toISOString(),
      };

      setActiveProfileId(newProfile.id);
      saveVault(newVault, true);
      setShowProfileSwitcher(false);
      setNeedsOnboarding(false);

      return newProfile;
    },
    [vault, saveVault]
  );

  // Complete Onboarding with first profile
  const completeOnboarding = useCallback(
    (profileName: string, initialData?: Partial<UserProfile>) => {
      const firstProfile = createProfile(profileName || 'حساب اصلی', initialData);
      setNeedsOnboarding(false);
      setShowProfileSwitcher(false);
      return firstProfile;
    },
    [createProfile]
  );

  // Update active profile data (assets, vehicles, settings, etc.)
  const updateActiveProfileData = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!vault || !activeProfileId) return;

      const updatedProfiles = vault.profiles.map((p) => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return p;
      });

      const updatedVault: ProfilesVault = {
        ...vault,
        profiles: updatedProfiles,
        lastUpdated: new Date().toISOString(),
      };

      saveVault(updatedVault, false);
    },
    [vault, activeProfileId, saveVault]
  );

  // Delete profile
  const deleteProfile = useCallback(
    (profileId: string) => {
      if (!vault) return;
      if (vault.profiles.length <= 1) {
        alert('امکان حذف تنها حساب کاربری فعال وجود ندارد.');
        return;
      }

      const updatedProfiles = vault.profiles.filter((p) => p.id !== profileId);
      const nextActiveId =
        activeProfileId === profileId ? updatedProfiles[0].id : activeProfileId;

      const updatedVault: ProfilesVault = {
        ...vault,
        activeProfileId: nextActiveId,
        profiles: updatedProfiles,
        lastUpdated: new Date().toISOString(),
      };

      setActiveProfileId(nextActiveId);
      saveVault(updatedVault, true);
    },
    [vault, activeProfileId, saveVault]
  );

  return {
    vault,
    activeProfile,
    activeProfileId,
    isLoading,
    needsOnboarding,
    showProfileSwitcher,
    setShowProfileSwitcher,
    switchProfile,
    createProfile,
    completeOnboarding,
    updateActiveProfileData,
    deleteProfile,
  };
}
