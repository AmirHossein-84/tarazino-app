import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { ProfilesVault, UserProfile, VehicleItem } from '../types/investment';

const VAULT_DIRECTORY = 'Tarazino';
const LEGACY_VAULT_DIRECTORY = 'InvestmentApp';
const VAULT_FILENAME = `${VAULT_DIRECTORY}/profiles_vault.json`;
const LEGACY_VAULT_FILENAME = `${LEGACY_VAULT_DIRECTORY}/profiles_vault.json`;
const LOCAL_STORAGE_VAULT_KEY = 'tarazino_profiles_vault_v1';
const LEGACY_LOCAL_STORAGE_VAULT_KEY = 'investment_app_profiles_vault_v1';

let saveTimeout: any = null;

/**
 * Check if running in a native Capacitor environment (Android / iOS)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize and ensure the Tarazino directory exists on the device storage
 */
async function ensureDirectoryExists(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Filesystem.mkdir({
      path: VAULT_DIRECTORY,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (e: any) {
    // Directory might already exist, which is fine
  }
}

/**
 * Read vault from persistent device storage (survives app uninstallation on Android)
 */
export async function readDeviceVault(): Promise<ProfilesVault | null> {
  // 1. First attempt to read from native device storage (survives uninstallation)
  if (isNativePlatform()) {
    try {
      await ensureDirectoryExists();
      let fileData: string | null = null;

      try {
        const result = await Filesystem.readFile({
          path: VAULT_FILENAME,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        if (result && typeof result.data === 'string') {
          fileData = result.data;
        }
      } catch {
        // Fallback to legacy path if new file does not exist yet
        try {
          const legacyResult = await Filesystem.readFile({
            path: LEGACY_VAULT_FILENAME,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
          if (legacyResult && typeof legacyResult.data === 'string') {
            fileData = legacyResult.data;
            // Migrate forward to new path
            await Filesystem.writeFile({
              path: VAULT_FILENAME,
              data: fileData,
              directory: Directory.Documents,
              encoding: Encoding.UTF8,
              recursive: true,
            });
          }
        } catch {}
      }

      if (fileData) {
        const parsed = JSON.parse(fileData);
        if (parsed && Array.isArray(parsed.profiles)) {
          // Cache in localStorage as well
          try {
            localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, fileData);
          } catch {}
          return parsed as ProfilesVault;
        }
      }
    } catch (e) {
      // File not created yet or permission pending
    }
  }

  // 2. Fallback to localStorage (web / PWA / fast cache)
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VAULT_KEY) || localStorage.getItem(LEGACY_LOCAL_STORAGE_VAULT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.profiles)) {
        return parsed as ProfilesVault;
      }
    }
  } catch (e) {
    console.warn('Failed to read localStorage vault:', e);
  }

  return null;
}

/**
 * Write vault to persistent device storage and localStorage
 */
export async function writeDeviceVault(vault: ProfilesVault): Promise<boolean> {
  const jsonString = JSON.stringify(vault, null, 2);

  // 1. Immediately save to localStorage for instantaneous offline sync
  try {
    localStorage.setItem(LOCAL_STORAGE_VAULT_KEY, jsonString);
  } catch (e) {
    console.error('Failed to save vault to localStorage:', e);
  }

  // 2. Save to native device Documents directory (survives uninstallation)
  if (isNativePlatform()) {
    try {
      await ensureDirectoryExists();
      await Filesystem.writeFile({
        path: VAULT_FILENAME,
        data: jsonString,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return true;
    } catch (e) {
      console.warn('Failed to write vault to device storage:', e);
      return false;
    }
  }

  return true;
}

/**
 * Debounced background sync to avoid frequent disk I/O on every keystroke
 */
export function debouncedSaveDeviceVault(vault: ProfilesVault, delayMs = 800): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    writeDeviceVault(vault);
  }, delayMs);
}
