import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createGetGasClient, type GetGasClient } from '@getgas/api-client';
import { STORAGE_KEYS, getApiBaseUrl } from '@getgas/config';
import type { AuthUser } from '@getgas/types';

/**
 * Resolve API base URL at runtime (required for Expo monorepo — env vars are not
 * reliably inlined into pre-built workspace packages).
 */
export function resolveMobileApiUrl(explicit?: string): string {
  if (explicit) return getApiBaseUrl(explicit);

  const fromEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_URL : undefined;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;

  return getApiBaseUrl(fromEnv || fromExtra);
}

export function resolveMobileSocketUrl(explicit?: string): string {
  if (explicit) return getApiBaseUrl(explicit);

  const fromEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_SOCKET_URL : undefined;
  const fromExtra = Constants.expoConfig?.extra?.socketUrl as string | undefined;

  return getApiBaseUrl(fromEnv || fromExtra);
}

let client: GetGasClient | undefined;

function ensureClient(): GetGasClient {
  if (!client) {
    client = createGetGasClient({
      baseURL: resolveMobileApiUrl(),
      getToken: () => SecureStore.getItemAsync(STORAGE_KEYS.TOKEN),
      onUnauthorized: clearMobileSession,
    });
  }
  return client;
}

/** Call after changing API URL (tests) to rebuild the axios client */
export function resetMobileClient(): void {
  client = undefined;
}

async function clearMobileSession() {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
}

function proxyApi<T extends object>(pick: (c: GetGasClient) => T): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      const api = pick(ensureClient());
      const val = (api as Record<string | symbol, unknown>)[prop];
      if (typeof val === 'function') {
        return (val as (...args: unknown[]) => unknown).bind(api);
      }
      return val;
    },
  });
}

export const api = proxyApi((c) => c.api);
export const authApi = proxyApi((c) => c.authApi);
export const stationsApi = proxyApi((c) => c.stationsApi);
export const ordersApi = proxyApi((c) => c.ordersApi);
export const ridersApi = proxyApi((c) => c.ridersApi);
export const usersApi = proxyApi((c) => c.usersApi);
export const notificationsApi = proxyApi((c) => c.notificationsApi);
export const paymentsApi = proxyApi((c) => c.paymentsApi);

export const getGasClient = ensureClient;

export async function saveSession(token: string, user: AuthUser) {
  await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
  await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; user: AuthUser } | null> {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) as AuthUser };
  } catch {
    await clearMobileSession();
    return null;
  }
}

export async function clearSession() {
  await clearMobileSession();
}
