'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: 'user' | 'rider' | 'station' | 'admin';
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ROLE_HOME: Record<string, string> = {
  user:    '/user',
  rider:   '/rider',
  station: '/station',
  admin:   '/admin',
};

// Routes each role is allowed to access (prefix match)
const ROLE_ALLOWED: Record<string, string[]> = {
  user:    ['/user'],
  rider:   ['/rider'],
  station: ['/station'],
  admin:   ['/admin'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router   = useRouter();
  const pathname = usePathname();

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('gasgo_token');
    const storedUser  = localStorage.getItem('gasgo_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('gasgo_token');
        localStorage.removeItem('gasgo_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Guard: once loading is done, enforce route access
  useEffect(() => {
    if (isLoading) return;

    const isRoot = pathname === '/';
    const isRiderRegister = pathname === '/rider/register';
    const isRiderLogin = pathname === '/rider/login';
    const isAdminLogin = pathname === '/admin/login';
    const isPublic = isRoot || isRiderRegister || isRiderLogin || isAdminLogin;

    if (!user) {
      if (!isPublic) router.replace('/');
      return;
    }

    // Logged in on a public/login page → redirect to their portal
    if (isPublic) {
      router.replace(ROLE_HOME[user.role] ?? '/user');
      return;
    }

    // Logged in but accessing wrong portal → redirect to their own
    const allowed = ROLE_ALLOWED[user.role] ?? [];
    const onAllowed = allowed.some((prefix) => pathname.startsWith(prefix));
    if (!onAllowed) router.replace(ROLE_HOME[user.role] ?? '/user');
  }, [isLoading, user, pathname]);

  const login = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem('gasgo_token', newToken);
    localStorage.setItem('gasgo_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('gasgo_token');
    localStorage.removeItem('gasgo_user');
    setToken(null);
    setUser(null);
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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
