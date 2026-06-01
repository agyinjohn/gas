import React, {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from 'react';
import { AppState, AppStateStatus, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import type { AuthUser } from '@getgas/types';
import { ME_ENDPOINTS } from '@getgas/config';
import { isPlaceholderPhone } from '@getgas/domain';
import { loadSession, saveSession, clearSession, api } from '@getgas/mobile-core';
import { authColors } from '@getgas/mobile-ui';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  needsProfile: boolean;
  login: (token: string, user: AuthUser, opts?: { needsProfile?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  markProfileComplete: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const validateSession = useCallback(async () => {
    const session = await loadSession();
    if (!session || session.user.role !== 'user') {
      if (session && session.user.role !== 'user') await clearSession();
      return null;
    }
    try {
      await api.get(ME_ENDPOINTS.user);
      return session;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        await clearSession();
        return null;
      }
      return session;
    }
  }, []);

  useEffect(() => {
    validateSession()
      .then((session) => {
        if (!session) return;
        setToken(session.token);
        setUser(session.user);
        setNeedsProfile(isPlaceholderPhone(session.user.phone));
      })
      .finally(() => setIsLoading(false));
  }, [validateSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        validateSession().then((session) => {
          if (!session) {
            setUser(null);
            setToken(null);
            setNeedsProfile(false);
          }
        });
      }
    });
    return () => sub.remove();
  }, [validateSession]);

  useEffect(() => {
    if (isLoading) return;

    const root = segments[0];
    const inAuth = root === '(auth)';
    const isOAuthCallback = root === 'auth';

    if (!user) {
      if (!inAuth && !isOAuthCallback) router.replace('/(auth)/login');
      return;
    }

    if (needsProfile && segments.join('/') !== '(auth)/complete-profile') {
      router.replace('/(auth)/complete-profile');
      return;
    }

    if ((inAuth || isOAuthCallback) && !needsProfile) {
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, needsProfile]);

  const login = async (newToken: string, newUser: AuthUser, opts?: { needsProfile?: boolean }) => {
    await saveSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
    setNeedsProfile(opts?.needsProfile ?? isPlaceholderPhone(newUser.phone));
  };

  const updateUser = async (patch: Partial<AuthUser>) => {
    if (!user || !token) return;
    const updated = { ...user, ...patch };
    await saveSession(token, updated);
    setUser(updated);
  };

  const markProfileComplete = () => setNeedsProfile(false);

  const logout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
    setNeedsProfile(false);
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={authColors.brand} />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, needsProfile, login, logout, updateUser, markProfileComplete }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
