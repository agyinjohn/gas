import type { UserRole } from '@getgas/types';

/** Shared localStorage / SecureStore keys */
export const STORAGE_KEYS = {
  TOKEN: 'gasgo_token',
  USER: 'gasgo_user',
  LAT: 'gasgo_lat',
  LNG: 'gasgo_lng',
  LOCATION_LABEL: 'gasgo_location_label',
  THEME: 'gasgo_theme',
} as const;

export const BRAND = {
  primary: '#E87722',
  primaryDark: '#C9610F',
  name: 'GetGas',
} as const;

export const API_PREFIX = '/api/v1';

export const ROLE_HOME: Record<UserRole, string> = {
  user: '/user',
  rider: '/rider',
  station: '/station',
  admin: '/admin',
};

/** Web route prefixes allowed per role (client-side guard) */
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  user: ['/user', '/notifications', '/user/location'],
  rider: ['/rider'],
  station: ['/station'],
  admin: ['/admin'],
};

/** Backend endpoints used to validate session on app load */
export const ME_ENDPOINTS: Record<UserRole, string> = {
  user: `${API_PREFIX}/users/me`,
  rider: `${API_PREFIX}/riders/me`,
  station: `${API_PREFIX}/users/me`,
  admin: `${API_PREFIX}/admin/metrics`,
};

export const DEFAULT_API_URL = 'http://localhost:4000';

export function getApiBaseUrl(envUrl?: string): string {
  return envUrl || DEFAULT_API_URL;
}
