/**
 * Safe localStorage helpers.
 * localStorage can throw (private mode, quota, blocked cookies), so every
 * access in the app goes through these functions and never crashes the UI.
 */
export const KEYS = {
  auth: 'applyease:auth',
  profile: 'applyease:profile',
  accessibility: 'applyease:accessibility',
  shortcuts: 'applyease:shortcuts',
  submissions: 'applyease:submissions',
  draftPrefix: 'applyease:draft:',
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function keysWithPrefix(prefix: string): string[] {
  try {
    return Object.keys(localStorage).filter((k) => k.startsWith(prefix));
  } catch {
    return [];
  }
}
