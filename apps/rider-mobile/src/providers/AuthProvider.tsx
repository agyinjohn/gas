import React, {
  createContext, useContext, useEffect, useState, ReactNode, useCallback,
} from 'react';
import { AppState, AppStateStatus, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import type { AuthUser } from '@getgas/types';
import { ME_ENDPOINTS } from '@getgas/config';
import { loadSession, saveSession, clearSession, api } from '@getgas/mobile-core';
import { authColors } from '@getgas/mobile-ui';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  const validateSession = useCallback(async () => {
    const session = await loadSession();
    if (!session || session.user.role !== 'rider') {
      if (session && session.user.role !== 'rider') await clearSession();
      return null;
    }
    try {
      await api.get(ME_ENDPOINTS.rider);
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
          }
        });
      }
    });
    return () => sub.remove();
  }, [validateSession]);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';

    if (!user && !inAuth) router.replace('/(auth)/login');
    else if (user && inAuth) router.replace('/(tabs)');
  }, [user, segments, isLoading]);

  const login = async (newToken: string, newUser: AuthUser) => {
    await saveSession(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await clearSession();
    setToken(null);
    setUser(null);
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
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
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
