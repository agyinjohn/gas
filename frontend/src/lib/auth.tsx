'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  id: string;
  name: string;
  phone?: string;
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

function clearStorage() {
  localStorage.removeItem('gasgo_token');
  localStorage.removeItem('gasgo_user');
}

function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/about')) return true;
  if (pathname.startsWith('/riders')) return true;
  if (pathname.startsWith('/stations')) return true;
  if (pathname.startsWith('/contact')) return true;
  if (pathname.startsWith('/privacy')) return true;
  if (pathname.startsWith('/terms')) return true;
  return [
    '/', '/login', '/register', '/forgot-password', '/set-password', '/rider/register',
  ].includes(pathname);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // On mount: restore session from localStorage, trust JWT expiry client-side
  useEffect(() => {
    const storedToken = localStorage.getItem('gasgo_token');
    const storedUser  = localStorage.getItem('gasgo_user');

    if (!storedToken || !storedUser) {
      setIsLoading(false);
      return;
    }

    if (isExpired(storedToken)) {
      clearStorage();
      setIsLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsed);
    } catch {
      clearStorage();
    }

    setIsLoading(false);
  }, []);

  // Guard: enforce route access once loading is done
  useEffect(() => {
    if (isLoading) return;
    if (pathname.startsWith('/auth/')) return; // let callback page handle itself

    const isPublic = isPublicPath(pathname);

    if (!user) {
      if (!isPublic) router.replace('/login');
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

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('gasgo:unauthorized', handler);
    return () => window.removeEventListener('gasgo:unauthorized', handler);
  }, []);

  // Never block /auth/* — the callback page must render to process the token
  const isAuthCallback = pathname.startsWith('/auth/');
  const shouldBlock    = !isAuthCallback && (isLoading || (!user && !isPublicPath(pathname)));

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {shouldBlock ? (
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
