import type { AuthUser } from '@getgas/types';

export interface UserLoginResponse {
  success: boolean;
  token: string;
  user: { id?: string; _id?: string; name: string; phone: string; role?: string };
  needsPhone?: boolean;
}

export interface RiderLoginResponse {
  success: boolean;
  token: string;
  rider: { id?: string; _id?: string; name: string; phone: string };
}

export function parseUserLogin(data: UserLoginResponse): {
  token: string;
  user: AuthUser;
  needsPhone: boolean;
} {
  return {
    token: data.token,
    user: {
      id: String(data.user.id ?? data.user._id),
      name: data.user.name,
      phone: data.user.phone,
      role: 'user',
    },
    needsPhone: Boolean(data.needsPhone),
  };
}

export function parseRiderLogin(data: RiderLoginResponse): { token: string; user: AuthUser } {
  return {
    token: data.token,
    user: {
      id: String(data.rider.id ?? data.rider._id),
      name: data.rider.name,
      phone: data.rider.phone,
      role: 'rider',
    },
  };
}

/** Decode JWT payload without verifying (client-side metadata only) */
export function decodeJwtPayload<T extends Record<string, unknown>>(token: string): T | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json =
      typeof atob !== 'undefined'
        ? atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        : Buffer.from(part, 'base64url').toString('utf8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function parseOAuthCallbackUrl(url: string): {
  token: string;
  userId: string;
  name: string;
  needsPhone: boolean;
  error?: string;
} | null {
  try {
    const parsed = new URL(url);
    const error = parsed.searchParams.get('error') ?? undefined;
    if (error) return { token: '', userId: '', name: '', needsPhone: false, error };

    const token = parsed.searchParams.get('token');
    const userId = parsed.searchParams.get('userId');
    const name = parsed.searchParams.get('name') ?? 'User';
    if (!token || !userId) return null;

    return {
      token,
      userId,
      name,
      needsPhone: parsed.searchParams.get('needsPhone') === '1',
    };
  } catch {
    return null;
  }
}
