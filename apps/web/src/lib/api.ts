import { createGetGasClient } from '@getgas/api-client';
import { STORAGE_KEYS, getApiBaseUrl } from '@getgas/config';

function clearWebSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  window.dispatchEvent(new Event('gasgo:unauthorized'));
}

const client = createGetGasClient({
  baseURL: getApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  },
  onUnauthorized: clearWebSession,
});

export const api = client.api;
export const authApi = {
  ...client.authApi,
  /** Web-only: redirect browser to Google OAuth */
  googleLogin: () => {
    window.location.href = `${getApiBaseUrl(process.env.NEXT_PUBLIC_API_URL)}/api/v1/auth/google`;
  },
};
export const stationsApi = client.stationsApi;
export const ordersApi = client.ordersApi;
export const ridersApi = client.ridersApi;
export const usersApi = client.usersApi;
export const notificationsApi = client.notificationsApi;
export const paymentsApi = client.paymentsApi;
export const stationAuthApi = client.stationAuthApi;
export const adminAuthApi = client.adminAuthApi;
export const adminApi = client.adminApi;
