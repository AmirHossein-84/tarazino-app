import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { ProfilesVault, UserProfile } from '../types/investment';
import { redactSecrets, safeJsonParse, sanitizePlainData } from './security';

const DEVICE_VAULT_FILE = 'tarazino_profiles_vault.json';
const LOCAL_FALLBACK_KEY = 'tarazino_device_vault_v2';
const DEVICE_KEY_STORAGE = 'tarazino_vault_dk_v1';
const ENCRYPTED_PREFIX = 'enc:v1:';

const isNative = (): boolean => {
  try {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') return btoa(binary);
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function getOrCreateDeviceCryptoKey(): Promise<CryptoKey | null> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle || typeof localStorage === 'undefined') return null;

    let storedB64 = localStorage.getItem(DEVICE_KEY_STORAGE);
    let rawBytes: Uint8Array;

    if (!storedB64) {
      rawBytes = new Uint8Array(32);
      globalThis.crypto.getRandomValues(rawBytes);
      storedB64 = bytesToBase64(rawBytes);
      localStorage.setItem(DEVICE_KEY_STORAGE, storedB64);
    } else {
      rawBytes = base64ToBytes(storedB64);
      if (rawBytes.length !== 32) return null;
    }

    return await subtle.importKey(
      'raw',
      rawBytes.buffer.slice(rawBytes.byteOffset, rawBytes.byteOffset + rawBytes.byteLength) as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

async function encryptSecretString(plain: string, key: CryptoKey | null): Promise<string> {
  if (!plain || !plain.trim()) return '';
  if (plain.startsWith(ENCRYPTED_PREFIX) || !key || !globalThis.crypto?.subtle) {
    return plain;
  }
  try {
    const iv = new Uint8Array(12);
    globalThis.crypto.getRandomValues(iv);
    const encoded = new TextEncoder().encode(plain);
    const cipherBuf = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const payload = `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipherBuf))}`;
    return `${ENCRYPTED_PREFIX}${payload}`;
  } catch {
    return plain;
  }
}

async function decryptSecretString(stored: string | undefined, key: CryptoKey | null): Promise<string> {
  if (!stored || typeof stored !== 'string') return '';
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored;
  }
  if (!key || !globalThis.crypto?.subtle) return '';
  try {
    const body = stored.slice(ENCRYPTED_PREFIX.length);
    const [ivB64, cipherB64] = body.split('.');
    if (!ivB64 || !cipherB64) return '';
    const iv = base64ToBytes(ivB64);
    const cipherBytes = base64ToBytes(cipherB64);
    const plainBuf = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
      },
      key,
      cipherBytes.buffer.slice(cipherBytes.byteOffset, cipherBytes.byteOffset + cipherBytes.byteLength) as ArrayBuffer
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    return '';
  }
}

async function protectVaultSecretsForDisk(vault: ProfilesVault): Promise<ProfilesVault> {
  const key = await getOrCreateDeviceCryptoKey();
  const protectedProfiles: UserProfile[] = await Promise.all(
    vault.profiles.map(async (profile) => {
      if (!profile.nobitexConfig) return profile;
      const cfg = profile.nobitexConfig;
      const secretKey = cfg.secretKey ? await encryptSecretString(cfg.secretKey, key) : '';
      const token = cfg.token ? await encryptSecretString(cfg.token, key) : '';
      return {
        ...profile,
        nobitexConfig: {
          ...cfg,
          secretKey,
          token,
        },
      };
    })
  );

  return {
    ...vault,
    profiles: protectedProfiles,
  };
}

async function unprotectVaultSecretsFromDisk(vault: ProfilesVault): Promise<ProfilesVault> {
  const key = await getOrCreateDeviceCryptoKey();
  const unlockedProfiles: UserProfile[] = await Promise.all(
    vault.profiles.map(async (profile) => {
      if (!profile.nobitexConfig) return profile;
      const cfg = profile.nobitexConfig;
      const secretKey = cfg.secretKey ? await decryptSecretString(cfg.secretKey, key) : '';
      const token = cfg.token ? await decryptSecretString(cfg.token, key) : '';
      return {
        ...profile,
        nobitexConfig: {
          ...cfg,
          secretKey,
          token,
        },
      };
    })
  );

  return {
    ...vault,
    profiles: unlockedProfiles,
  };
}

function isValidVault(parsed: unknown): parsed is ProfilesVault {
  return Boolean(
    parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      Array.isArray((parsed as ProfilesVault).profiles)
  );
}

/**
 * Reads the persisted profiles vault from persistent Device Filesystem (Documents/Data)
 * or localStorage fallback in browser mode. Transparently decrypts stored API credentials.
 */
export async function readDeviceVault(): Promise<ProfilesVault | null> {
  let rawVault: ProfilesVault | null = null;

  // 1. Try native persistent device filesystem first (Android / iOS)
  if (isNative()) {
    try {
      const result = await Filesystem.readFile({
        path: DEVICE_VAULT_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      if (result && typeof result.data === 'string') {
        const parsed = safeJsonParse<ProfilesVault>(result.data);
        if (isValidVault(parsed)) {
          rawVault = parsed;
        }
      }
    } catch {
      try {
        const dataResult = await Filesystem.readFile({
          path: DEVICE_VAULT_FILE,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });
        if (dataResult && typeof dataResult.data === 'string') {
          const parsed = safeJsonParse<ProfilesVault>(dataResult.data);
          if (isValidVault(parsed)) {
            rawVault = parsed;
          }
        }
      } catch {
        // File does not exist yet
      }
    }
  }

  // 2. Try localStorage fallback (Web/PWA or migrated Android data)
  if (!rawVault) {
    try {
      const localRaw = localStorage.getItem(LOCAL_FALLBACK_KEY);
      if (localRaw) {
        const parsed = safeJsonParse<ProfilesVault>(localRaw);
        if (isValidVault(parsed)) {
          rawVault = parsed;
        }
      }
    } catch (err) {
      console.warn('Error reading localStorage fallback vault:', redactSecrets(err));
    }
  }

  if (!rawVault) return null;
  return unprotectVaultSecretsFromDisk(rawVault);
}

let writeQueue: Promise<boolean> = Promise.resolve(true);
let latestWriteSeq = 0;

/**
 * Persists the entire profiles vault atomically via serialized async writes to native
 * Device Filesystem and Web localStorage fallback, protecting API secrets at rest.
 */
export async function writeDeviceVault(vault: ProfilesVault): Promise<boolean> {
  const seq = ++latestWriteSeq;
  const cleanSnapshot = sanitizePlainData(vault);

  const performWrite = async (): Promise<boolean> => {
    // Drop superseded queued writes if a newer vault mutation already arrived
    if (seq < latestWriteSeq) {
      return true;
    }

    const diskVault = await protectVaultSecretsForDisk(cleanSnapshot);
    const jsonPayload = JSON.stringify(diskVault, null, 2);
    let savedAtLeastOnce = false;

    try {
      localStorage.setItem(LOCAL_FALLBACK_KEY, jsonPayload);
      savedAtLeastOnce = true;
    } catch (e) {
      console.warn('Could not save vault to localStorage:', redactSecrets(e));
    }

    if (isNative()) {
      try {
        await Filesystem.writeFile({
          path: DEVICE_VAULT_FILE,
          data: jsonPayload,
          directory: Directory.Data,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        savedAtLeastOnce = true;
      } catch (e) {
        console.warn('Could not write vault to Directory.Data:', redactSecrets(e));
      }

      try {
        await Filesystem.writeFile({
          path: DEVICE_VAULT_FILE,
          data: jsonPayload,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        savedAtLeastOnce = true;
      } catch (e) {
        console.warn('Could not write vault to Directory.Documents (permission or scoped storage):', redactSecrets(e));
      }
    }

    return savedAtLeastOnce;
  };

  writeQueue = writeQueue.then(performWrite, performWrite);
  return writeQueue;
}

/**
 * Deletes the device vault completely (Factory Reset).
 */
export async function clearDeviceVault(): Promise<void> {
  cancelPendingDeviceVaultSave();
  latestWriteSeq++;
  try {
    localStorage.removeItem(LOCAL_FALLBACK_KEY);
  } catch {
    // ignore
  }
  if (isNative()) {
    try {
      await Filesystem.deleteFile({ path: DEVICE_VAULT_FILE, directory: Directory.Documents });
    } catch {
      // ignore
    }
    try {
      await Filesystem.deleteFile({ path: DEVICE_VAULT_FILE, directory: Directory.Data });
    } catch {
      // ignore
    }
  }
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDebounceVault: ProfilesVault | null = null;

export function cancelPendingDeviceVaultSave(): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  pendingDebounceVault = null;
}

export async function flushDeviceVault(): Promise<boolean> {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (pendingDebounceVault) {
    const v = pendingDebounceVault;
    pendingDebounceVault = null;
    return writeDeviceVault(v);
  }
  return writeQueue;
}

export function debouncedSaveDeviceVault(vault: ProfilesVault, delayMs = 600): void {
  pendingDebounceVault = sanitizePlainData(vault);
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    const toWrite = pendingDebounceVault;
    saveDebounceTimer = null;
    pendingDebounceVault = null;
    if (toWrite) {
      void writeDeviceVault(toWrite);
    }
  }, delayMs);
}
