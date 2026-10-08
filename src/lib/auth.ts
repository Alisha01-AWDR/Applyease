import { KEYS, readJSON, removeKey, writeJSON } from './storage';
import { apiLogin, apiLogout, apiRegister, clearTokens, setTokens } from './api';

export type AuthUser = { email: string; name: string; id?: number };

export function getAuth(): AuthUser | null {
  const a = readJSON<AuthUser | null>(KEYS.auth, null);
  return a && a.email ? a : null;
}
export function isSignedIn(): boolean { return getAuth() !== null; }
export function signIn(user: AuthUser): void { writeJSON(KEYS.auth, user); }
export function signOut(): void { removeKey(KEYS.auth); clearTokens(); }

export async function registerAccount(name: string, email: string, password: string): Promise<AuthUser> {
  const result = await apiRegister(name, email, password); setTokens(result.access_token, result.refresh_token);
  const user = result.user; signIn(user); return user;
}
export async function loginAccount(email: string, password: string): Promise<AuthUser> {
  const result = await apiLogin(email, password); setTokens(result.access_token, result.refresh_token);
  const user = result.user; signIn(user); return user;
}
export async function logoutAccount(): Promise<void> { try { await apiLogout(); } finally { signOut(); } }

export function firstName(name: string | undefined): string { const n=(name||'').trim(); return n ? n.split(/\s+/)[0] : 'there'; }
export function initials(name: string | undefined): string { const parts=(name||'').trim().split(/\s+/).filter(Boolean); if (!parts.length) return 'AE'; return (parts.length===1 ? parts[0].slice(0,2) : parts[0][0]+parts[parts.length-1][0]).toUpperCase(); }
