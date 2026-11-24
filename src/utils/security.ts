const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively clones decoded JSON data onto fresh standard objects/arrays while
 * stripping prototype-pollution keys (`__proto__`, `constructor`, `prototype`).
 */
export function sanitizePlainData<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      out.push(sanitizePlainData(value[i]));
    }
    return out as unknown as T;
  }

  const record = value as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  const keys = Object.keys(record);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (FORBIDDEN_KEYS.has(k)) continue;
    clean[k] = sanitizePlainData(record[k]);
  }
  return clean as T;
}

/**
 * Parses JSON safely and prevents prototype pollution.
 */
export function safeJsonParse<T>(raw: string | null | undefined, maxBytes = 5 * 1024 * 1024): T | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return sanitizePlainData(parsed) as T;
  } catch {
    return null;
  }
}

/**
 * Redacts API tokens, HMAC signatures, and secret keys from logs or surfaced error messages.
 */
export function redactSecrets(input: unknown, knownSecrets: string[] = []): string {
  let text: string;
  if (input instanceof Error) {
    text = input.message || 'خطای نامشخص';
  } else if (typeof input === 'string') {
    text = input;
  } else {
    try {
      text = JSON.stringify(input) ?? String(input);
    } catch {
      text = String(input);
    }
  }

  for (const secret of knownSecrets) {
    if (secret && secret.trim().length >= 4) {
      const escaped = secret.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(escaped, 'gi'), '***REDACTED***');
    }
  }

  // Mask common credential headers and key/token patterns
  text = text
    .replace(/(authorization\s*[:=]\s*)(?:token|bearer)?\s*[a-z0-9._\-+/=]+/gi, '$1***REDACTED***')
    .replace(/((?:secretKey|secret_key|token|apiKey|publicKey|x-api-key|x-signature)\s*[:=]\s*["']?)[a-z0-9._\-+/=]{6,}(["']?)/gi, '$1***REDACTED***$2')
    .replace(/\b(?:Token|Bearer)\s+[A-Za-z0-9._\-+/=]{12,}/g, 'Bearer ***REDACTED***');

  return text;
}

/**
 * Normalizes a numeric input to a finite number within optional bounds.
 */
export function toSafeNumber(val: unknown, fallback = 0, min = -Infinity, max = Infinity): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

/**
 * Executes fetch() with a combined timeout + external AbortSignal guard.
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 10000, signal: externalSignal, ...fetchInit } = init;
  const controller = new AbortController();

  const onExternalAbort = () => {
    controller.abort(externalSignal?.reason);
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    controller.abort(new DOMException('Request timeout', 'AbortError'));
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
