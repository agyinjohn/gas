'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import type { AuthUser } from '@getgas/types';
import { ME_ENDPOINTS, ROLE_ALLOWED_PREFIXES, ROLE_HOME, STORAGE_KEYS, getApiBaseUrl } from '@getgas/config';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearStorage() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const storedUser  = localStorage.getItem(STORAGE_KEYS.USER);

    if (!storedToken || !storedUser) {
      setIsLoading(false);
      return;
    }

    let parsed: AuthUser | null = null;
    try {
      parsed = JSON.parse(storedUser);
    } catch {
      clearStorage();
      setIsLoading(false);
      return;
    }

    // Validate token against backend before trusting it
    const endpoint = ME_ENDPOINTS[parsed!.role];
    const baseURL  = getApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);

    axios.get(`${baseURL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${storedToken}`,
        'ngrok-skip-browser-warning': 'true',
      },
    }).then(() => {
      setToken(storedToken);
      setUser(parsed);
    }).catch((err) => {
      // Only clear session on explicit 401 — not on network errors (e.g. backend down)
      if (err.response?.status === 401) {
        clearStorage();
      } else {
        // Network/server error — trust stored session optimistically
        setToken(storedToken);
        setUser(parsed);
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // Guard: enforce route access once loading is done
  useEffect(() => {
    if (isLoading) return;

    const isRoot         = pathname === '/';
    const isRiderRegister = pathname === '/rider/register';
    const isSetPassword  = pathname === '/set-password';
    const isRegister     = pathname === '/register';
    const isForgotPw     = pathname === '/forgot-password';
    const isAuthCallback = pathname.startsWith('/auth/');
    const isPublic       = isRoot || isRiderRegister || isSetPassword || isRegister || isForgotPw;

    // Let the callback page handle its own navigation
    if (isAuthCallback) return;

    if (!user) {
      if (!isPublic) router.replace('/');
      return;
    }

    if (isPublic) {
      router.replace(ROLE_HOME[user.role] ?? '/user');
      return;
    }

    const allowed   = ROLE_ALLOWED_PREFIXES[user.role] ?? [];
    const onAllowed = allowed.some((prefix) => pathname.startsWith(prefix));
    if (!onAllowed) router.replace(ROLE_HOME[user.role] ?? '/user');
  }, [isLoading, user, pathname]);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    clearStorage();
    setToken(null);
    setUser(null);
    router.replace('/');
  };

  // Keep api.ts 401 interceptor in sync with context logout
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('gasgo:unauthorized', handler);
    return () => window.removeEventListener('gasgo:unauthorized', handler);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading…</p>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
