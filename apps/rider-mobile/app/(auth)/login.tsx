import { View, Text, StyleSheet } from 'react-native';
import { DevApiBanner } from '@/components/DevApiBanner';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  AuthScreen, FieldLabel, AuthInput, PrimaryButton, LinkButton,
  PhonePrefixInput, ErrorText,
} from '@getgas/mobile-ui';
import { normalizeGhanaPhone, validateGhanaPhoneLocal } from '@getgas/domain';
import { authApi, parseRiderLogin } from '@getgas/mobile-core';
import { useAuth } from '@/providers/AuthProvider';

export default function RiderLoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!validateGhanaPhoneLocal(phone)) {
      setError('Enter a valid Ghana phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const e164 = normalizeGhanaPhone(phone);
      const res = await authApi.riderLogin(e164, password);
      const { token, user } = parseRiderLogin(res.data);
      await login(token, user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <DevApiBanner />
      <AuthScreen
      title="GetGas Rider"
      subtitle="Deliver gas. Earn on your schedule."
      footer={<Text style={styles.footer}>Web dashboard still available at /rider</Text>}
    >
      <FieldLabel>Phone number</FieldLabel>
      <PhonePrefixInput value={phone} onChangeText={setPhone} />
      <FieldLabel>Password</FieldLabel>
      <AuthInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" />
      <ErrorText message={error} />
      <PrimaryButton label="Sign in" onPress={handleLogin} loading={loading} />
      <LinkButton label="Apply to become a rider" onPress={() => router.push('/(auth)/register')} />
    </AuthScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: 'center', color: '#6B7280', fontSize: 12, marginTop: 24 },
});
