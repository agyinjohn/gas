'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: 'user' | 'rider' | 'station' | 'admin';
  stationId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_HOME: Record<string, string> = {
  user:    '/user',
  rider:   '/rider',
  station: '/station',
  admin:   '/admin',
};

const ROLE_ALLOWED: Record<string, string[]> = {
  user:    ['/user', '/notifications', '/user/location'],
  rider:   ['/rider'],
  station: ['/station'],
  admin:   ['/admin'],
};

const ME_ENDPOINTS: Record<string, string> = {
  user:    '/api/v1/users/me',
  rider:   '/api/v1/riders/me',
  station: '/api/v1/users/me',
  admin:   '/api/v1/admin/metrics',
};

function clearStorage() {
  localStorage.removeItem('gasgo_token');
  localStorage.removeItem('gasgo_user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedToken = localStorage.getItem('gasgo_token');
    const storedUser  = localStorage.getItem('gasgo_user');

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
    const baseURL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
    const isPublic       = isRoot || isRiderRegister || isSetPassword || isRegister || isForgotPw;

    if (!user) {
      if (!isPublic) router.replace('/');
      return;
    }

    if (isPublic) {
      router.replace(ROLE_HOME[user.role] ?? '/user');
      return;
    }

    const allowed   = ROLE_ALLOWED[user.role] ?? [];
    const onAllowed = allowed.some((prefix) => pathname.startsWith(prefix));
    if (!onAllowed) router.replace(ROLE_HOME[user.role] ?? '/user');
  }, [isLoading, user, pathname]);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('gasgo_token', newToken);
    localStorage.setItem('gasgo_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      localStorage.setItem('gasgo_user', JSON.stringify(updated));
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
