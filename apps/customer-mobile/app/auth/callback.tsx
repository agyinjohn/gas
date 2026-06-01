import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { decodeJwtPayload } from '@getgas/mobile-core';
import { authColors } from '@getgas/mobile-ui';

/** Handles getgas://auth/callback?token=... from Google OAuth */
export default function OAuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    token?: string;
    userId?: string;
    name?: string;
    needsPhone?: string;
    error?: string;
  }>();
  const { login } = useAuth();

  useEffect(() => {
    (async () => {
      if (params.error) {
        router.replace('/(auth)/login');
        return;
      }

      const token = params.token;
      const userId = params.userId;
      const name = params.name ?? 'User';
      if (!token || !userId) {
        router.replace('/(auth)/login');
        return;
      }

      const payload = decodeJwtPayload<{ phone?: string }>(token);
      const needsProfile =
        params.needsPhone === '1' || (payload?.phone?.startsWith('google_') ?? false);

      await login(
        token,
        { id: userId, name, phone: payload?.phone ?? '', role: 'user' },
        { needsProfile },
      );

      if (needsProfile) router.replace('/(auth)/complete-profile');
      else router.replace('/(tabs)');
    })();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={authColors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
