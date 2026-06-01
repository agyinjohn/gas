import { View, StyleSheet, Pressable, Text } from 'react-native';
import { DevApiBanner } from '@/components/DevApiBanner';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  AuthScreen,
  FieldLabel,
  PhonePrefixInput,
  PasswordInput,
  PrimaryButton,
  GoogleButton,
  AuthDivider,
  AuthInlineLink,
  ErrorBanner,
  authColors,
} from '@getgas/mobile-ui';
import { normalizeGhanaPhone } from '@getgas/domain';
import { authApi, parseUserLogin, signInWithGoogle, decodeJwtPayload } from '@getgas/mobile-core';
import { useAuth } from '@/providers/AuthProvider';

function validateLogin(phone: string, password: string) {
  const errors: { phone?: string; password?: string } = {};
  const digits = phone.replace(/\D/g, '').replace(/^0/, '');
  if (digits.length !== 9) errors.phone = 'Enter a valid 9-digit Ghana number';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});

  const clearFieldErrors = () => setErrors((e) => ({ ...e, phone: undefined, password: undefined, general: undefined }));

  const handleLogin = async () => {
    const fieldErrors = validateLogin(phone, password);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const e164 = normalizeGhanaPhone(phone);
      const res = await authApi.login(e164, password);
      const { token, user, needsPhone } = parseUserLogin(res.data);
      await login(token, user, { needsProfile: needsPhone });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { code?: string; message?: string; phone?: string } } })?.response?.data;
      if (data?.code === 'PASSWORD_REQUIRED') {
        router.push('/(auth)/forgot-password');
        return;
      }
      setErrors({ general: data?.message ?? 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrors({});
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result) return;
      const payload = decodeJwtPayload<{ phone?: string }>(result.token);
      await login(
        result.token,
        {
          id: result.userId,
          name: result.name,
          phone: payload?.phone ?? '',
          role: 'user',
        },
        { needsProfile: result.needsPhone },
      );
    } catch {
      setErrors({ general: 'Google sign-in failed' });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <DevApiBanner />
      <AuthScreen
        showBrandLogo
        title="Welcome back"
        subtitle="Sign in to your account"
      >
        <ErrorBanner message={errors.general} />

        <FieldLabel>Phone number</FieldLabel>
        <PhonePrefixInput
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            clearFieldErrors();
          }}
          error={errors.phone}
        />

        <FieldLabel>Password</FieldLabel>
        <PasswordInput
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            clearFieldErrors();
          }}
          error={errors.password}
        />
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotWrap}>
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </Pressable>

        <PrimaryButton
          label="Sign In"
          onPress={handleLogin}
          loading={loading}
          disabled={googleLoading}
          showArrow
        />

        <AuthDivider />

        <GoogleButton onPress={handleGoogle} loading={googleLoading} disabled={loading} />

        <View style={styles.footer}>
          <AuthInlineLink
            prefix="Don't have an account?"
            linkLabel="Create one"
            onPress={() => router.push('/(auth)/register')}
          />
        </View>
      </AuthScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: authColors.bg },
  forgotWrap: { alignSelf: 'flex-end', marginTop: 8 },
  forgotLink: { fontSize: 12, color: authColors.brand, fontWeight: '600' },
  footer: { marginTop: 24, gap: 8 },
});
