/**
 * In-memory Mock Storage for self-contained, isolated test runs
 */
export class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

export function setupTestEnvironment(): {
  storage: MemoryStorage;
  events: { name: string; detail?: any }[];
  cleanup: () => void;
} {
  const storage = new MemoryStorage();
  const events: { name: string; detail?: any }[] = [];

  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = (globalThis as any).window;
  const originalDocument = (globalThis as any).document;

  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });

  const mockListeners: Record<string, ((e: any) => void)[]> = {};

  const mockWindow: any = {
    localStorage: storage,
    dispatchEvent: (event: { type: string; detail?: any }) => {
      events.push({ name: event.type, detail: event.detail });
      const listeners = mockListeners[event.type] || [];
      listeners.forEach((l) => l(event));
      return true;
    },
    addEventListener: (type: string, listener: (e: any) => void) => {
      if (!mockListeners[type]) mockListeners[type] = [];
      mockListeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: (e: any) => void) => {
      if (mockListeners[type]) {
        mockListeners[type] = mockListeners[type].filter((l) => l !== listener);
      }
    },
  };

  const mockMeta = {
    content: '',
    setAttribute: (name: string, val: string) => {
      if (name === 'content') mockMeta.content = val;
    },
    getAttribute: (name: string) => {
      if (name === 'content') return mockMeta.content;
      return null;
    },
  };

  const classListSet = new Set<string>();
  const mockDocumentElement = {
    classList: {
      add: (cls: string) => classListSet.add(cls),
      remove: (cls: string) => classListSet.delete(cls),
      contains: (cls: string) => classListSet.has(cls),
      toggle: (cls: string) => {
        if (classListSet.has(cls)) {
          classListSet.delete(cls);
          return false;
        } else {
          classListSet.add(cls);
          return true;
        }
      },
    },
  };

  const mockDocument: any = {
    documentElement: mockDocumentElement,
    querySelector: (selector: string) => {
      if (selector.includes('theme-color')) return mockMeta;
      return null;
    },
  };

  (globalThis as any).window = mockWindow;
  (globalThis as any).document = mockDocument;

  return {
    storage,
    events,
    cleanup: () => {
      if (originalLocalStorage) {
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          writable: true,
          configurable: true,
        });
      }
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
    },
  };
}
