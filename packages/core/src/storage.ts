import type { Progress, StorageAdapter } from './types';

export function memoryStorage(): StorageAdapter {
  const entries = new Map<string, Progress>();
  return {
    get: (key) => (entries.has(key) ? { ...entries.get(key)! } : null),
    set: (key, value) => {
      entries.set(key, { ...value });
    },
    remove: (key) => {
      entries.delete(key);
    },
  };
}

function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Progress;
  return (
    ['running', 'completed', 'skipped'].includes(p.status) &&
    Number.isInteger(p.stepIndex) &&
    p.stepIndex >= 0 &&
    Number.isFinite(p.version) &&
    Number.isFinite(p.updatedAt)
  );
}

/** Storage can be disabled or full in private browsing; tours still work in memory. */
export function localStorageAdapter(prefix = 'onboarding'): StorageAdapter {
  const fallback = memoryStorage();
  let unavailable = false;
  return {
    get(key) {
      if (unavailable) return fallback.get(key);
      let raw: string | null | undefined;
      try {
        raw = globalThis.localStorage?.getItem(`${prefix}:${key}`);
      } catch {
        unavailable = true;
        return fallback.get(key);
      }
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (isProgress(parsed)) {
          fallback.set(key, parsed);
          return parsed;
        }
        return fallback.get(key);
      } catch {
        return fallback.get(key);
      }
    },
    set(key, value) {
      fallback.set(key, value);
      if (unavailable) return;
      try {
        globalThis.localStorage?.setItem(`${prefix}:${key}`, JSON.stringify(value));
      } catch {
        unavailable = true;
      }
    },
    remove(key) {
      fallback.remove(key);
      if (unavailable) return;
      try {
        globalThis.localStorage?.removeItem(`${prefix}:${key}`);
      } catch {
        unavailable = true;
      }
    },
  };
}
